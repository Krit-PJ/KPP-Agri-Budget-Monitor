import { useWork } from '../../components/WorkContext';
import { useEffect, useMemo, useState } from 'react';
import { computeAreaShares, type AreaMode } from './areaShares';
import { Link } from 'react-router-dom';
import {
  MEETING_DUE_MONTH, MEETING_RE, areaName, areaSummary, fiscalYearRange, formatBaht, formatThaiDate, normalizeKey, splitEqual, splitMoney, todayBangkok,
  type PlanActivityState, type PlanDetail, type PlanItem, type SessionUser,
} from '@kpp/domain';
import { ApiError, call } from '../../api/client';
import { Async, Empty, ErrorBox, bahtInputToSatang, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import PlanImport from './PlanImport';
import { StickyFinder } from '../../components/StickyFinder';
import { ThaiDatePicker } from '../../components/ThaiDatePicker';

/**
 * บันทึกแผนงานและผู้รับผิดชอบ (ADR-006): หน้าเดียว ไม่มีชั้นซ้อน
 * - เปิดแผนของปีปัจจุบันทันที
 * - แต่ละกิจกรรมย่อย: เลือกกลุ่มงานได้ในแถว (เปลี่ยนกลุ่มได้ถ้ายังไม่เบิกจ่าย) และกำหนดพื้นที่ดำเนินการ (ระดับจังหวัด/อำเภอ) พร้อมเป้าหมายและงบรายพื้นที่
 * - ติ๊กหลายแถวเพื่อกำหนดกลุ่ม/หน่วยพร้อมกัน
 */
export default function Plans({ user }: { user: SessionUser }) {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [planId, setPlanId] = useState('');
  const [importing, setImporting] = useState(false);
  const plans = useApi('plans.list', { fiscalYear: fy }, [fy]);
  const canImport = user.role !== 'admin';
  const n = useNames();

  if (importing) return <PlanImport fy={fy} onCancel={() => setImporting(false)} onDone={(id) => { setImporting(false); plans.reload(); setPlanId(id); }} />;
  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>บันทึกแผนงานและผู้รับผิดชอบ</h1>
        {canImport && <button className="btn btn-ghost" onClick={() => setImporting(true)}>นำเข้าแผนงบประมาณ</button>}
      </div>
      <Async s={plans}>
        {(list) => {
          const current = list.find((p) => p.id === planId) ?? list[0];
          return (
            <>
              <div className="toolbar">
                <FiscalYearPicker value={fy} onChange={(y) => { setFy(y); setPlanId(''); }} />
                {list.length > 1 && (
                  <label className="field">
                    <span>แผน</span>
                    <select value={current?.id} onChange={(e) => setPlanId(e.target.value)}>
                      {list.map((p) => <option key={p.id} value={p.id}>{n.fundShort(p.fundingSourceId)} ครั้งที่ {p.round}: {p.title}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {current ? <PlanBoard key={current.id} id={current.id} user={user} onChanged={plans.reload} /> : (
                <Empty title={`ยังไม่มีแผนงบประมาณปี ${fy}`}>
                  <p>{canImport ? 'นำเข้าแผนจากไฟล์ Excel แบบ คง.2, CSV, ลิงก์ Google Sheets หรือ PDF ของหนังสือจัดสรร' : 'รอผู้ดูแลระบบนำเข้าแผนงบประมาณของปีนี้'}</p>
                  {canImport && <button className="btn" onClick={() => setImporting(true)}>นำเข้าแผนงบประมาณ</button>}
                </Empty>
              )}
            </>
          );
        }}
      </Async>
    </>
  );
}

type Filter = 'all' | 'noGroup' | 'noArea' | 'mine';

function PlanBoard({ id, user, onChanged }: { id: string; user: SessionUser; onChanged: () => void }) {
  const s = useApi('plans.get', { id }, [id]);
  return <Async s={s} lines={10}>{(d) => <Board d={d} user={user} reload={() => { s.reload(); onChanged(); }} />}</Async>;
}

/**
 * ตารางจากซ้ายไปขวา: กิจกรรม → เป้าหมาย (ทั้งสิ้น) → งบประมาณ (ทั้งสิ้น) → กลุ่มที่รับผิดชอบ → พื้นที่ดำเนินการ
 * กด "กำหนดพื้นที่" ที่แถวใด แถวนั้นกางเป็นตารางรายอำเภอ (เป้าหมาย/งบ) — กางได้ทีละแถว และต้องยืนยันก่อนบันทึก
 */
function Board({ d, user, reload }: { d: PlanDetail; user: SessionUser; reload: () => void }) {
  const l = useLookups();
  const n = useNames();
  const toast = useToast();
  const { busy, error, run, setError } = useSubmit();
  const allGroups = user.workgroupIds === null;
  const ownerGroups = l.workgroups.filter((g) => !g.noActivities);
  // ADR-011: ย้าย/กำหนดกลุ่มงานได้ทุกกลุ่มอย่างอิสระ; แก้รายละเอียด/ปรับงบได้เฉพาะรายการของกลุ่มตนหรือที่ยังไม่มีกลุ่ม
  const access = (i: PlanItem) => !i.workgroupId || allGroups || user.workgroupIds!.includes(i.workgroupId);
  const w = useWork();
  const [filter, setFilter] = useState<Filter>(w.g ? 'mine' : 'all');
  useEffect(() => { setFilter((f) => (w.g ? 'mine' : f === 'mine' ? 'all' : f)); }, [w.g]);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [detail, setDetail] = useState<null | { id: string; mode: 'edit' | 'adjust' }>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<null | { label: string; unitIds?: string[]; group?: string }>(null);

  const bySeq = useMemo(() => new Map(d.items.map((i) => [i.seq, i])), [d.items]);
  const leaves = useMemo(() => d.items.filter((i) => i.isLeaf), [d.items]);
  const stateOf = (i: PlanItem): PlanActivityState | undefined => (i.activityId ? d.activities[i.activityId] : undefined);
  // "ของกลุ่มที่เลือก" ตามแถบ "กำลังทำงาน"; เลือกพื้นที่ = เฉพาะกิจกรรมที่มีงบในพื้นที่นั้น
  const mine = (i: PlanItem) => !!i.workgroupId && i.workgroupId === w.g;
  const inUnit = (i: PlanItem) => !w.u || !!stateOf(i)?.units.some((x) => x.unitId === w.u);
  const confirmed = (i: PlanItem) => !!stateOf(i)?.units.length;
  const key = normalizeKey(q);
  const visible = (i: PlanItem) =>
    (filter === 'all' || (filter === 'noGroup' && !i.workgroupId) || (filter === 'noArea' && !!i.workgroupId && !confirmed(i)) || (filter === 'mine' && mine(i))) && inUnit(i) &&
    (!key || normalizeKey(pathOf(i, bySeq).map((x) => `${x.number} ${x.name}`).join(' ')).includes(key));
  const shown = leaves.filter(visible);
  const projects = d.items.filter((i) => i.kind === 'PROJECT' || (i.kind === 'ACTIVITY' && i.projectSeq === i.seq));
  const visibleProjects = projects.filter((p) => shown.some((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq));
  const setDue = (i: PlanItem, v: { dueDate?: string; dueMonth?: number }) => void run(async () => {
    await call('activities.setDue', { activityId: i.activityId, ...v });
    toast(v.dueDate ? `กำหนดเบิกครบภายใน ${formatThaiDate(v.dueDate)} แล้ว (ใช้เตือน)` : v.dueMonth === 0 && MEETING_RE.test(i.name) ? 'ใช้ค่าเริ่มต้น: เบิกครบภายใน 30 มิ.ย. แล้ว' : 'ยกเลิกกำหนดเบิกครบแล้ว');
    reload();
  });
  const assigned = leaves.filter((i) => i.workgroupId).length;
  const done = leaves.filter(confirmed).length;
  const pickedItems = leaves.filter((i) => picked.has(i.id));
  const districts = l.units.filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
  const pao = l.units.find((u) => u.kind === 'PROVINCE')?.id ?? '';
  const removeItem = (i: PlanItem) => void run(async () => {
    if (!window.confirm(`ลบกิจกรรมที่เพิ่มเอง "${i.name}"?`)) return;
    await call('plans.deleteItem', { id: i.id });
    toast('ลบกิจกรรมแล้ว');
    reload();
  });

  const setGroup = (i: PlanItem, workgroupId: string) => void run(async () => {
    if (!workgroupId) {
      const r = await call('plans.unassign', { itemIds: [i.id] });
      if (r.skipped.length) throw new ApiError('VALIDATION_FAILED', r.skipped[0].reason);
      toast('ยกเลิกกลุ่มงานแล้ว');
    } else {
      const r = await call('plans.assign', { itemIds: [i.id], workgroupId, reassign: true });
      if (r.skipped.length) throw new ApiError('VALIDATION_FAILED', r.skipped[0].reason);
      toast(`กำหนดให้${n.group(workgroupId)}แล้ว`);
    }
    reload();
  });
  const runBulk = () => {
    const c = bulkConfirm;
    if (!c) return;
    void run(async () => {
      if (c.group) {
        const r = await call('plans.assign', { itemIds: [...picked], workgroupId: c.group, reassign: true });
        toast(`กำหนดกลุ่มงานแล้ว ${r.assigned} รายการ${r.skipped.length ? ` ข้าม ${r.skipped.length} รายการ (${r.skipped[0].reason})` : ''}`);
      } else if (c.unitIds) {
        const acts = pickedItems.filter((i) => i.activityId).map((i) => i.activityId);
        const r = await call('activities.setUnitsBulk', { activityIds: acts, unitIds: c.unitIds });
        toast(`บันทึกพื้นที่ดำเนินการแล้ว ${r.updated} รายการ${r.skipped.length ? ` ข้าม ${r.skipped.length} รายการ (${r.skipped[0].reason})` : ''}`);
      }
      setBulkConfirm(null);
      setPicked(new Set());
      reload();
    });
  };
  const askBulkArea = (unitIds: string[], label: string) => {
    if (!pickedItems.some((i) => i.activityId)) return setError(new ApiError('VALIDATION_FAILED', 'รายการที่เลือกยังไม่มีกลุ่มงาน — กำหนดกลุ่มงานก่อน'));
    setBulkConfirm({ label, unitIds });
  };

  return (
    <>
      <p className="muted small" style={{ marginTop: 0 }}>
        {d.doc.title} — {n.fund(d.doc.fundingSourceId)} ครั้งที่ {d.doc.round}{d.doc.docNo && ` หนังสือ ${d.doc.docNo}`} รวม {formatBaht(d.doc.totalSatang)} บาท
      </p>
      <div className="progress-pair">
        <Progress label="มีกลุ่มงานรับผิดชอบ" done={assigned} total={leaves.length} />
        <Progress label="ยืนยันพื้นที่ดำเนินการแล้ว" done={done} total={leaves.length} hint="ยังไม่ยืนยัน = นับเป็นระดับจังหวัดไปก่อน" />
      </div>
      <StickyFinder<Filter>
        q={q} onQ={setQ} placeholder="ค้นหากิจกรรม โครงการ หรือเลขลำดับ"
        jump={visibleProjects.map((p) => ({ id: `pj-${p.id}`, label: `${p.number} ${p.name}` }))}
        count={shown.length}
        filters={[
          ...(w.g ? [{ key: 'mine' as Filter, label: `ของ${w.groupName(w.g)}`, count: leaves.filter((i) => mine(i) && inUnit(i)).length }] : []),
          { key: 'all', label: 'ทั้งหมด', count: leaves.length },
          { key: 'noGroup', label: 'ยังไม่มีกลุ่ม', count: leaves.length - assigned },
          { key: 'noArea', label: 'ยังไม่ยืนยันพื้นที่', count: assigned - leaves.filter((i) => i.workgroupId && confirmed(i)).length },
        ]}
        filter={filter} onFilter={setFilter}
      />
      {error && <ErrorBox error={error} />}
      {!shown.length && <Empty title="ไม่มีรายการตามตัวกรองนี้" />}
      <div className="pb-head" aria-hidden="true">
        <span /><span>กิจกรรม</span><span className="r nowrap">งบประมาณ / เป้าหมาย<br />(ทั้งสิ้น)</span><span>กลุ่มที่รับผิดชอบและพื้นที่ดำเนินการ</span>
      </div>
      {projects.map((p) => {
        const rows = shown.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq);
        if (!rows.length && adding !== p.id) return null;
        const ids = rows.map((i) => i.id);
        const allPicked = ids.every((x) => picked.has(x));
        return (
          <section key={p.id} id={`pj-${p.id}`} className="ob-project">
            <div className="ob-project-head">
              <label className="ob-check">
                <input type="checkbox" checked={allPicked} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); for (const x of ids) { if (e.target.checked) nx.add(x); else nx.delete(x); } return nx; })} aria-label={`เลือกทุกรายการใน ${p.name}`} />
              </label>
              <h2>{p.number} {p.name}</h2>
              <span className="num small muted">{formatBaht(rows.reduce((a, i) => a + i.amountSatang, 0))} บาท</span>
              {adding !== p.id && <button className="btn btn-ghost btn-sm pb-add" onClick={() => setAdding(p.id)}>+ เพิ่มกิจกรรม</button>}
            </div>
            {adding === p.id && (
              <AddItemForm
                parents={d.items.filter((x) => !x.isLeaf && x.planIndex === p.planIndex && (x.seq === p.seq || x.projectSeq === p.seq))}
                defaultParent={p.id} groups={ownerGroups} defaultGroup={w.g || (allGroups ? '' : user.workgroupIds![0] ?? '')}
                onCancel={() => setAdding(null)} onDone={() => { setAdding(null); reload(); }}
              />
            )}
            <ul className="ob-rows">
              {rows.map((i) => {
                const st = stateOf(i);
                const trail = pathOf(i, bySeq).filter((x) => x.depth > p.depth && x.seq !== i.seq).map((x) => x.name);
                const locked = !!st?.hasDisbursement;
                const canEdit = access(i);
                const isOpen = editing === i.id;
                const det = detail?.id === i.id ? detail.mode : null;
                const changed = !!st && st.budget !== i.amountSatang;
                return (
                  <li key={i.id} className={`pb-row ${picked.has(i.id) ? 'is-picked' : ''} ${isOpen ? 'is-open' : ''}`}>
                    <label className="ob-check"><input type="checkbox" checked={picked.has(i.id)} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); if (e.target.checked) nx.add(i.id); else nx.delete(i.id); return nx; })} aria-label={`เลือก ${i.name}`} /></label>
                    <div className="ob-name">
                      <span className="muted">{i.number}</span> {i.name}
                      {i.manual && <span className="badge badge-manual">เพิ่มเอง</span>}
                      {trail.length > 0 && <span className="ob-trail">{trail.join(' › ')}</span>}
                      {i.note && <span className="ob-trail">หมายเหตุ: {i.note}</span>}
                      {canEdit && !det && (
                        <span className="pb-tools">
                          <button className="link-btn" onClick={() => setDetail({ id: i.id, mode: 'edit' })}>แก้ไขรายละเอียด</button>
                          {st && <button className="link-btn" onClick={() => setDetail({ id: i.id, mode: 'adjust' })}>ปรับงบ</button>}
                          {i.manual && !locked && <button className="link-btn is-danger" disabled={busy} onClick={() => removeItem(i)}>ลบ</button>}
                        </span>
                      )}
                    </div>
                    <div className="pb-nums">
                      <span className="pb-amt num"><span className="sr-only">งบประมาณ </span>{formatBaht(changed ? st!.budget : i.amountSatang)}<small> บาท</small></span>
                      {changed && <span className="pb-plan xs">ตามแผน {formatBaht(i.amountSatang)}</span>}
                      <span className="pb-qty"><span className="pb-qty-l">เป้าหมาย </span>{i.quantity ? `${i.quantity.toLocaleString('th-TH')} ${i.unit}` : '–'}</span>
                    </div>
                    <div className="pb-owner">
                      <label className="ob-group">
                        <span className="pb-owner-l">กลุ่มที่รับผิดชอบ</span>
                        {(
                          <select value={i.workgroupId} disabled={busy || locked} onChange={(e) => setGroup(i, e.target.value)} title={locked ? 'มีรายการเบิกจ่ายแล้ว เปลี่ยนกลุ่มไม่ได้' : undefined} className={i.workgroupId ? '' : 'is-empty'}>
                            <option value="">— เลือกกลุ่มงาน —</option>
                            {(i.workgroupId && !ownerGroups.some((g) => g.id === i.workgroupId) ? [...ownerGroups, l.workgroups.find((g) => g.id === i.workgroupId)!] : ownerGroups)
                              .map((g) => <option key={g.id} value={g.id}>{g.name}{g.hidePublic ? ' (ยังไม่เผยแพร่)' : ''}</option>)}
                          </select>
                        )}
                      </label>
                      {!i.workgroupId ? <span className="small muted">เลือกกลุ่มงานก่อน แล้วจึงกำหนดพื้นที่</span> : (
                        <div className="pb-area">
                          <span className="pb-owner-l">พื้นที่ดำเนินการ</span>
                          <span className={`area-sum ${confirmed(i) ? 'is-ok' : ''}`}>
                            <span className="area-name">{areaSummary(st?.units.map((u) => u.unitId) ?? [], l.units)}</span>
                            <span className="area-state">{confirmed(i) ? '✓ ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</span>
                          </span>
                          <span className="area-actions">
                            {canEdit && st && !isOpen && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(i.id)}>กำหนดพื้นที่</button>}
                            {st && <DuePicker name={i.name} fy={d.doc.fiscalYear} st={st} disabled={!canEdit || busy} onSet={(v) => setDue(i, v)} />}
                          </span>
                          {st && <DueAlert name={i.name} fy={d.doc.fiscalYear} st={st} />}
                          {mine(i) && i.projectId && <Link className="xs pb-rec" to={`/admin/record?a=${i.activityId}`}>บันทึกผลการเบิกจ่าย ›</Link>}
                        </div>
                      )}
                    </div>
                    {det && (
                      <div className="pb-editor">
                        {det === 'edit'
                          ? <ItemEditor item={i} onCancel={() => setDetail(null)} onDone={() => { setDetail(null); reload(); }} />
                          : <BudgetAdjuster item={i} st={st!} onCancel={() => setDetail(null)} onDone={() => { setDetail(null); reload(); }} />}
                      </div>
                    )}
                    {isOpen && st && (
                      <div className="pb-editor">
                        <AreaEditor item={i} st={st} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {picked.size > 0 && (
        <div className="panel plan-bar">
          {bulkConfirm ? (
            <>
              <strong>ยืนยัน: {bulkConfirm.label} ให้ {picked.size} รายการ{bulkConfirm.unitIds ? ' (แบ่งเป้าหมายและงบเท่ากัน)' : ''}?</strong>
              <button className="btn btn-sm" onClick={runBulk} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'ยืนยัน'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setBulkConfirm(null)}>กลับ</button>
            </>
          ) : (
            <>
              <strong>เลือก {picked.size} รายการ รวม {formatBaht(pickedItems.reduce((a, i) => a + i.amountSatang, 0))} บาท</strong>
              <span className="bar-group">
                <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} aria-label="กลุ่มงาน" style={{ width: 'auto' }}>
                  <option value="">กลุ่มงาน…</option>
                  {ownerGroups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.hidePublic ? ' (ยังไม่เผยแพร่)' : ''}</option>)}
                </select>
                <button className="btn btn-sm" disabled={!bulkGroup} onClick={() => setBulkConfirm({ label: `กำหนดเป็น${n.group(bulkGroup)}`, group: bulkGroup })}>กำหนดกลุ่มงาน</button>
              </span>
              <span className="bar-group">
                <span className="small">พื้นที่:</span>
                <button className="btn btn-ghost btn-sm" onClick={() => askBulkArea(districts, 'พื้นที่ทั้ง 11 อำเภอ')}>ทั้ง 11 อำเภอ</button>
                <button className="btn btn-ghost btn-sm" onClick={() => askBulkArea([pao], 'พื้นที่ระดับจังหวัด')}>ระดับจังหวัด</button>
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set())}>ล้าง</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/** วันที่กำหนดเบิกครบที่มีผล: วันที่ที่ตั้ง > สิ้นเดือนที่ตั้ง (ข้อมูลเดิม) > อบรม/ประชุม = 30 มิ.ย. */
function effectiveDue(name: string, fy: number, st: PlanActivityState): { date: string; isDefault: boolean } {
  if (st.dueDate) return { date: st.dueDate, isDefault: false };
  const m = st.dueMonth > 0 ? st.dueMonth : st.dueMonth === 0 && MEETING_RE.test(name) ? MEETING_DUE_MONTH : 0;
  if (!m) return { date: '', isDefault: false };
  const ce = fy - 543 - (m <= 3 ? 1 : 0);
  const month = ((m + 8) % 12) + 1;
  const last = new Date(Date.UTC(ce, month, 0)).getUTCDate();
  return { date: `${ce}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`, isDefault: st.dueMonth === 0 };
}

/**
 * กำหนดเบิกครบ (ใช้เตือน ไม่เปลี่ยนเป้าบนแถบ): ไอคอนปฏิทิน → ปฏิทินภาษาไทย เลือก วัน-เดือน-ปี ในปีงบประมาณ
 * ค่าเริ่มต้นของอบรม/ประชุม/สัมมนา = 30 มิ.ย. ตามมาตรการเร่งรัดฯ
 */
function DuePicker({ name, fy, st, disabled, onSet }: { name: string; fy: number; st: PlanActivityState; disabled: boolean; onSet: (v: { dueDate?: string; dueMonth?: number }) => void }) {
  const meeting = MEETING_RE.test(name);
  const { start, end } = fiscalYearRange(fy);
  const due = effectiveDue(name, fy, st);
  return (
    <ThaiDatePicker
      value={due.date} min={start} max={end} today={todayBangkok()} disabled={disabled}
      buttonClass={due.date ? 'is-set' : ''}
      buttonText={due.date ? <>เบิกครบ {formatThaiDate(due.date)}{due.isDefault && <small> (ค่าเริ่มต้น)</small>}</> : 'กำหนดเบิกครบ'}
      onPick={(v) => onSet({ dueDate: v })}
      footer={(close) => (
        <>
          {meeting && !due.isDefault && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onSet({ dueMonth: 0 }); close(); }}>ค่าเริ่มต้น 30 มิ.ย.</button>}
          {due.date && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onSet({ dueMonth: meeting ? -1 : 0 }); close(); }}>ไม่กำหนด</button>}
        </>
      )}
    />
  );
}

/** เตือนเมื่อเหลือไม่เกิน 30 วัน หรือเลยกำหนดแล้วยังเบิกไม่ครบ */
function DueAlert({ name, fy, st }: { name: string; fy: number; st: PlanActivityState }) {
  const due = effectiveDue(name, fy, st).date;
  const left = st.budget - st.disbursed;
  if (!due || left <= 0) return null;
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${todayBangkok()}T00:00:00Z`)) / 86_400_000);
  if (days > 30) return null;
  return <span className={`due-alert ${days < 0 ? 'is-late' : ''}`}>{days < 0 ? `เลยกำหนด ${-days} วัน` : days === 0 ? 'ครบกำหนดวันนี้' : `อีก ${days} วันครบกำหนด`} — ยังไม่เบิก {formatBaht(left)} บาท</span>;
}

function Progress({ label, done, total, hint }: { label: string; done: number; total: number; hint?: string }) {
  const p = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress-card">
      <span className="small">{label}</span>
      <strong className="num">{done}/{total}</strong>
      <div className="mini-strip" aria-hidden="true"><div style={{ width: `${p}%`, background: 'var(--paddy)' }} /></div>
      {hint && <span className="xs muted">{hint}</span>}
    </div>
  );
}

/* ------------------------------ ตัวแก้ไขพื้นที่ดำเนินการ (กางในแถว) ------------------------------ */

type Mode = AreaMode;
const toBaht = (s: number) => (s / 100).toFixed(2).replace(/\.00$/, '');

/**
 * แบบ "ทั้ง 11 อำเภอ" / "บางอำเภอ" มีแถวระดับจังหวัดเสมอ = ส่วนที่เหลือ (ยอดทั้งสิ้น − ผลรวมของอำเภอ)
 * ผู้ใช้แก้เฉพาะตัวเลขของอำเภอ ส่วนจังหวัดคำนวณให้เอง จึงไม่ต้องคิดเลขให้ยอดรวมพอดี
 */
function AreaEditor({ item, st, onCancel, onDone }: { item: PlanItem; st: PlanActivityState; onCancel: () => void; onDone: () => void }) {
  const l = useLookups();
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const pao = l.units.find((u) => u.kind === 'PROVINCE')!;
  const districts = l.units.filter((u) => u.kind === 'DISTRICT');
  const saved = st.units.map((u) => u.unitId);
  const savedDistricts = districts.filter((u) => saved.includes(u.id)).map((u) => u.id);
  const [mode, setMode] = useState<Mode>(!savedDistricts.length ? 'province' : savedDistricts.length === districts.length ? 'all' : 'some');
  const [some, setSome] = useState<string[]>(savedDistricts.length < districts.length ? savedDistricts : []);
  const sel = mode === 'province' ? [] : mode === 'all' ? districts.map((u) => u.id) : districts.filter((u) => some.includes(u.id)).map((u) => u.id);
  const total = Math.round(item.quantity || 0);
  const hasTarget = total > 0;

  // ค่าในตาราง: ใช้ค่าที่บันทึกไว้ถ้าเป็นอำเภอชุดเดิม ไม่เช่นนั้นเป็น "ร่าง" แบ่งเท่ากันเฉพาะอำเภอ (จังหวัด = 0)
  const equal = () => {
    const m = splitMoney(st.budget, sel.length);
    const qty = splitEqual(total, sel.length);
    return Object.fromEntries(sel.map((id, k) => [id, { q: hasTarget ? String(qty[k]) : '', b: toBaht(m[k]) }]));
  };
  const draft = () => {
    const sameSet = sel.length > 0 && sel.length === savedDistricts.length && sel.every((x) => savedDistricts.includes(x));
    if (!sameSet) return equal();
    return Object.fromEntries(sel.map((id) => {
      const old = st.units.find((u) => u.unitId === id)!;
      return [id, { q: hasTarget ? String(old.targetQty || 0) : '', b: toBaht(old.budgetSatang) }];
    }));
  };
  const [vals, setVals] = useState<Record<string, { q: string; b: string }>>(draft);
  const [asking, setAsking] = useState(false);
  const selKey = sel.join(',');
  useEffect(() => {
    setVals(draft());
    setAsking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  const rows = sel.map((id) => ({ id, unit: l.units.find((u) => u.id === id)!, q: Number(vals[id]?.q || 0), b: bahtInputToSatang(vals[id]?.b ?? '') }));
  // ส่วนของจังหวัด = ส่วนที่เหลือ
  const { restQty: restQ, restBudget: restB, badMoney, ok, shares } = computeAreaShares({
    mode, provinceId: pao.id, totalQty: total, totalBudget: st.budget,
    districts: rows.map((r) => ({ unitId: r.id, targetQty: r.q, budgetSatang: r.b })),
  });
  const qOk = restQ >= 0;
  const bOk = !badMoney && restB >= 0;

  const save = () => void run(async () => {
    await call('activities.setUnits', { activityId: st.activityId, units: shares });
    toast('บันทึกพื้นที่ดำเนินการแล้ว');
    onDone();
  });
  const over = (v: number, unit: string, money = false) =>
    v >= 0 ? <span className="sum-ok">✓ ครบ</span> : <span className="sum-bad">เกิน {money ? formatBaht(-v) : (-v).toLocaleString('th-TH')} {unit}</span>;
  const qtyText = (v: number) => (hasTarget ? v.toLocaleString('th-TH') : '–');

  return (
    <div className="area-editor">
      {error && <ErrorBox error={error} />}
      <fieldset className="area-mode">
        <legend>พื้นที่ดำเนินการ</legend>
        {([['province', 'ระดับจังหวัดอย่างเดียว'], ['all', `จังหวัด + ทั้ง ${districts.length} อำเภอ`], ['some', 'จังหวัด + บางอำเภอ']] as Array<[Mode, string]>).map(([m, label]) => (
          <label key={m} className="area-opt"><input type="radio" name={`mode-${item.id}`} checked={mode === m} onChange={() => setMode(m)} /> {label}</label>
        ))}
      </fieldset>
      {mode === 'some' && (
        <div className="unit-grid area-pick">
          {districts.map((u) => (
            <label key={u.id} className="unit-opt"><input type="checkbox" checked={some.includes(u.id)} onChange={(e) => setSome((s0) => (e.target.checked ? [...s0, u.id] : s0.filter((x) => x !== u.id)))} /> {areaName(u)}</label>
          ))}
        </div>
      )}
      <table className="data area-table">
        <thead><tr><th>พื้นที่</th><th className="r">เป้าหมาย{item.unit ? ` (${item.unit})` : ''}</th><th className="r">งบประมาณ (บาท)</th></tr></thead>
        <tbody>
          <tr className={`area-pao ${mode !== 'province' && (!qOk || !bOk) ? 'is-bad' : ''}`}>
            <td>ระดับจังหวัด{mode !== 'province' && <div className="xs muted">ส่วนที่เหลือ คำนวณให้อัตโนมัติ</div>}</td>
            <td className="r num">{qtyText(mode === 'province' ? total : restQ)}</td>
            <td className="r num">{badMoney && mode !== 'province' ? '–' : formatBaht(mode === 'province' ? st.budget : restB)}</td>
          </tr>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{areaName(r.unit)}</td>
              <td className="r">{hasTarget ? <input inputMode="numeric" value={vals[r.id]?.q ?? ''} onChange={(e) => setVals({ ...vals, [r.id]: { ...vals[r.id], q: e.target.value.replace(/[^\d]/g, '') } })} aria-label={`เป้าหมาย ${areaName(r.unit)}`} /> : <span className="muted">–</span>}</td>
              <td className="r"><input inputMode="decimal" value={vals[r.id]?.b ?? ''} onChange={(e) => setVals({ ...vals, [r.id]: { ...vals[r.id], b: e.target.value } })} aria-label={`งบประมาณ ${areaName(r.unit)}`} className={r.b === null ? 'is-invalid' : ''} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>รวม</td>
            <td className="r">{hasTarget ? <>{total.toLocaleString('th-TH')} {mode === 'province' ? <span className="sum-ok">✓ ครบ</span> : over(restQ, item.unit)}</> : '–'}</td>
            <td className="r">{formatBaht(st.budget)} {mode === 'province' ? <span className="sum-ok">✓ ครบ</span> : badMoney ? <span className="sum-bad">ตัวเลขไม่ถูกต้อง</span> : over(restB, 'บาท', true)}</td>
          </tr>
        </tfoot>
      </table>
      {mode === 'some' && !rows.length && <p className="small" style={{ color: 'var(--clay)' }}>ติ๊กเลือกอย่างน้อย 1 อำเภอ</p>}
      {st.hasDisbursement && <p className="xs muted">กิจกรรมนี้มีการเบิกจ่ายแล้ว: พื้นที่ที่เบิกแล้วเอาออกไม่ได้ และงบต้องไม่ต่ำกว่ายอดที่เบิก</p>}
      {asking ? (
        <div className="confirm-box" role="alertdialog" aria-label="ยืนยันการบันทึก">
          <p><strong>ยืนยันบันทึกพื้นที่ดำเนินการ</strong></p>
          <p className="small">
            {areaSummary(shares.map((x) => x.unitId), l.units, 11)}
            {hasTarget && <> — เป้าหมายรวม {total.toLocaleString('th-TH')} {item.unit}</>} งบรวม {formatBaht(st.budget)} บาท
            {mode !== 'province' && restB > 0 && <> (ระดับจังหวัด {formatBaht(restB)} บาท)</>}
          </p>
          <div className="btn-row">
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'ยืนยันและบันทึก'}</button>
            <button className="btn btn-ghost" onClick={() => setAsking(false)}>กลับไปแก้ไข</button>
          </div>
        </div>
      ) : (
        <div className="btn-row">
          <button className="btn" onClick={() => setAsking(true)} disabled={!ok}>บันทึก</button>
          {rows.length > 1 && <button className="btn btn-ghost" onClick={() => setVals(equal())}>แบ่งเท่ากันใหม่</button>}
          <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          {!ok && (mode === 'province' || rows.length > 0) && <span className="small" style={{ color: 'var(--clay)' }}>ยอดของอำเภอรวมกันเกินยอดทั้งสิ้น</span>}
        </div>
      )}
    </div>
  );
}

function pathOf(i: PlanItem, bySeq: Map<number, PlanItem>): PlanItem[] {
  const out: PlanItem[] = [];
  let cur: PlanItem | undefined = i;
  while (cur) {
    out.unshift(cur);
    cur = cur.parentSeq ? bySeq.get(cur.parentSeq) : undefined;
  }
  return out;
}

/* ------------------------------ แก้รายละเอียด / ปรับงบ / เพิ่มกิจกรรม (ADR-011) ------------------------------ */

function ItemEditor({ item, onCancel, onDone }: { item: PlanItem; onCancel: () => void; onDone: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [qty, setQty] = useState(item.quantity ? String(item.quantity) : '');
  const [note, setNote] = useState(item.note ?? '');
  const save = () => void run(async () => {
    await call('plans.updateItem', { id: item.id, version: item.version, name, unit, quantity: Number(qty || 0), note });
    toast('บันทึกรายละเอียดกิจกรรมแล้ว');
    onDone();
  });
  return (
    <div className="item-form">
      <h3 className="h-sm">แก้ไขรายละเอียดกิจกรรม</h3>
      {error && <ErrorBox error={error} />}
      <label className="field"><span>ชื่อกิจกรรม</span><textarea rows={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="form-row">
        <label className="field"><span>เป้าหมาย (ทั้งสิ้น)</span><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} /></label>
        <label className="field"><span>หน่วยนับ</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="เช่น ราย, ครั้ง, แปลง" /></label>
      </div>
      <label className="field"><span>หมายเหตุ</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ไม่บังคับ" /></label>
      <p className="xs muted">ยอดงบประมาณแก้ที่ "ปรับงบ" (บันทึกเป็นรายการปรับพร้อมเหตุผล ยอดตามแผนของกรมยังคงเดิม)</p>
      <div className="btn-row">
        <button className="btn btn-sm" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}

function BudgetAdjuster({ item, st, onCancel, onDone }: { item: PlanItem; st: PlanActivityState; onCancel: () => void; onDone: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [dir, setDir] = useState<1 | -1>(1);
  const [amt, setAmt] = useState('');
  const [reason, setReason] = useState('');
  const [docNo, setDocNo] = useState('');
  const [key] = useState(() => `${item.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`);
  const delta = dir * (bahtInputToSatang(amt) ?? 0);
  const after = st.budget + delta;
  const tooLow = after < st.disbursed;
  const save = () => void run(async () => {
    const r = await call('plans.adjustBudget', { id: item.id, deltaSatang: delta, reason, docNo, idempotencyKey: key });
    toast(`ปรับงบแล้ว งบปัจจุบัน ${formatBaht(r.budget)} บาท`);
    onDone();
  });
  return (
    <div className="item-form">
      <h3 className="h-sm">ปรับงบประมาณกิจกรรม</h3>
      {error && <ErrorBox error={error} />}
      <p className="small" style={{ margin: 0 }}>ตามแผน {formatBaht(item.amountSatang)} บาท · งบปัจจุบัน <b>{formatBaht(st.budget)}</b> บาท · เบิกจ่ายแล้ว {formatBaht(st.disbursed)} บาท</p>
      <div className="segmented" role="group" aria-label="ประเภทการปรับ">
        <button type="button" aria-pressed={dir === 1} onClick={() => setDir(1)}>+ เพิ่มงบ</button>
        <button type="button" aria-pressed={dir === -1} onClick={() => setDir(-1)}>− ลดงบ</button>
      </div>
      <div className="form-row">
        <label className="field"><span>จำนวนเงิน (บาท)</span><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
        <label className="field"><span>เลขที่หนังสือ (ถ้ามี)</span><input value={docNo} onChange={(e) => setDocNo(e.target.value)} /></label>
      </div>
      <label className="field"><span>เหตุผลการปรับ</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น โอนเปลี่ยนแปลงตามหนังสือกรม, ปรับลดเพื่อใช้กิจกรรมอื่น" /></label>
      {delta !== 0 && <p className={`small ${tooLow ? 'sum-bad' : ''}`} style={{ margin: 0 }}>หลังปรับ: {formatBaht(after)} บาท{tooLow ? ' — น้อยกว่ายอดที่เบิกจ่ายแล้ว' : ''}</p>}
      <div className="btn-row">
        <button className="btn btn-sm" onClick={save} disabled={busy || !delta || tooLow || reason.trim().length < 3}>{busy ? 'กำลังบันทึก…' : 'บันทึกการปรับงบ'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}

function AddItemForm({ parents, defaultParent, groups, defaultGroup, onCancel, onDone }: {
  parents: PlanItem[]; defaultParent: string; groups: Array<{ id: string; name: string }>; defaultGroup: string; onCancel: () => void; onDone: () => void;
}) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [parentId, setParentId] = useState(defaultParent);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [group, setGroup] = useState(defaultGroup);
  const save = () => void run(async () => {
    await call('plans.addItem', { parentId, name, unit, quantity: Number(qty || 0), amountSatang: (bahtInputToSatang(amt) ?? 0), note, workgroupId: group || undefined });
    toast('เพิ่มกิจกรรมแล้ว');
    onDone();
  });
  return (
    <div className="item-form pb-add-form">
      <h3 className="h-sm">เพิ่มกิจกรรม (นอกแผนที่นำเข้า)</h3>
      {error && <ErrorBox error={error} />}
      {parents.length > 1 && (
        <label className="field"><span>อยู่ภายใต้</span>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            {parents.map((x) => <option key={x.id} value={x.id}>{x.number} {x.name}</option>)}
          </select>
        </label>
      )}
      <label className="field"><span>ชื่อกิจกรรม</span><textarea rows={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="form-row">
        <label className="field"><span>งบประมาณ (บาท)</span><input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
        <label className="field"><span>เป้าหมาย</span><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} /></label>
        <label className="field"><span>หน่วยนับ</span><input value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      </div>
      <div className="form-row">
        <label className="field"><span>กลุ่มที่รับผิดชอบ</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">— ยังไม่กำหนด —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>หมายเหตุ</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น แหล่งที่มาของงบ" /></label>
      </div>
      <p className="xs muted">รายการนี้จะแสดงป้าย "เพิ่มเอง" และลบได้ถ้ายังไม่มีการเบิกจ่าย</p>
      <div className="btn-row">
        <button className="btn btn-sm" onClick={save} disabled={busy || name.trim().length < 3 || (bahtInputToSatang(amt) ?? 0) <= 0}>{busy ? 'กำลังบันทึก…' : 'เพิ่มกิจกรรม'}</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}
