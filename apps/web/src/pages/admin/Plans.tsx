import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  areaName, areaSummary, formatBaht, normalizeKey, splitEqual, splitMoney,
  type PlanActivityState, type PlanDetail, type PlanItem, type SessionUser,
} from '@kpp/domain';
import { ApiError, call } from '../../api/client';
import { Async, Empty, ErrorBox, bahtInputToSatang, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import PlanImport from './PlanImport';

/**
 * แผนและผู้รับผิดชอบ (ADR-006): หน้าเดียว ไม่มีชั้นซ้อน
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
        <h1 style={{ margin: 0 }}>แผนและผู้รับผิดชอบ</h1>
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
  const myGroups = ownerGroups.filter((g) => allGroups || user.workgroupIds!.includes(g.id));
  const [filter, setFilter] = useState<Filter>(user.role === 'admin' ? 'mine' : 'all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<null | { label: string; unitIds?: string[]; group?: string }>(null);

  const bySeq = useMemo(() => new Map(d.items.map((i) => [i.seq, i])), [d.items]);
  const leaves = useMemo(() => d.items.filter((i) => i.isLeaf), [d.items]);
  const stateOf = (i: PlanItem): PlanActivityState | undefined => (i.activityId ? d.activities[i.activityId] : undefined);
  const mine = (i: PlanItem) => !!i.workgroupId && (allGroups || user.workgroupIds!.includes(i.workgroupId));
  const confirmed = (i: PlanItem) => !!stateOf(i)?.units.length;
  const key = normalizeKey(q);
  const visible = (i: PlanItem) =>
    (filter === 'all' || (filter === 'noGroup' && !i.workgroupId) || (filter === 'noArea' && !!i.workgroupId && !confirmed(i)) || (filter === 'mine' && mine(i))) &&
    (!key || normalizeKey(pathOf(i, bySeq).map((x) => `${x.number} ${x.name}`).join(' ')).includes(key));
  const shown = leaves.filter(visible);
  const projects = d.items.filter((i) => i.kind === 'PROJECT' || (i.kind === 'ACTIVITY' && i.projectSeq === i.seq));
  const assigned = leaves.filter((i) => i.workgroupId).length;
  const done = leaves.filter(confirmed).length;
  const pickedItems = leaves.filter((i) => picked.has(i.id));
  const districts = l.units.filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
  const pao = l.units.find((u) => u.kind === 'PROVINCE')?.id ?? '';

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
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="แสดงรายการ">
          {user.workgroupIds !== null && <button aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>ของกลุ่มฉัน ({leaves.filter(mine).length})</button>}
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด ({leaves.length})</button>
          <button aria-pressed={filter === 'noGroup'} onClick={() => setFilter('noGroup')}>ยังไม่มีกลุ่ม ({leaves.length - assigned})</button>
          <button aria-pressed={filter === 'noArea'} onClick={() => setFilter('noArea')}>ยังไม่ยืนยันพื้นที่ ({assigned - leaves.filter((i) => i.workgroupId && confirmed(i)).length})</button>
        </div>
        <label className="field" style={{ flex: '1 1 220px' }}><span className="sr-only">ค้นหา</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากิจกรรม โครงการ หรือเลขลำดับ" /></label>
      </div>
      {error && <ErrorBox error={error} />}
      {!shown.length && <Empty title="ไม่มีรายการตามตัวกรองนี้" />}
      <div className="pb-head" aria-hidden="true">
        <span /><span>กิจกรรม</span><span className="r">เป้าหมาย (ทั้งสิ้น)</span><span className="r">งบประมาณ (ทั้งสิ้น)</span><span>กลุ่มที่รับผิดชอบ</span><span>พื้นที่ดำเนินการ</span>
      </div>
      {projects.map((p) => {
        const rows = shown.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq);
        if (!rows.length) return null;
        const ids = rows.map((i) => i.id);
        const allPicked = ids.every((x) => picked.has(x));
        return (
          <section key={p.id} className="ob-project">
            <div className="ob-project-head">
              <label className="ob-check">
                <input type="checkbox" checked={allPicked} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); for (const x of ids) { if (e.target.checked) nx.add(x); else nx.delete(x); } return nx; })} aria-label={`เลือกทุกรายการใน ${p.name}`} />
              </label>
              <h2>{p.number} {p.name}</h2>
              <span className="num small muted">{formatBaht(rows.reduce((a, i) => a + i.amountSatang, 0))} บาท</span>
            </div>
            <ul className="ob-rows">
              {rows.map((i) => {
                const st = stateOf(i);
                const trail = pathOf(i, bySeq).filter((x) => x.depth > p.depth && x.seq !== i.seq).map((x) => x.name);
                const locked = !!st?.hasDisbursement;
                const canEdit = !i.workgroupId || mine(i);
                const isOpen = editing === i.id;
                return (
                  <li key={i.id} className={`pb-row ${picked.has(i.id) ? 'is-picked' : ''} ${isOpen ? 'is-open' : ''}`}>
                    <label className="ob-check"><input type="checkbox" checked={picked.has(i.id)} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); if (e.target.checked) nx.add(i.id); else nx.delete(i.id); return nx; })} aria-label={`เลือก ${i.name}`} /></label>
                    <div className="ob-name">
                      <span className="muted">{i.number}</span> {i.name}
                      {trail.length > 0 && <span className="ob-trail">{trail.join(' › ')}</span>}
                    </div>
                    <span className="pb-qty" data-label="เป้าหมาย">{i.quantity ? `${i.quantity.toLocaleString('th-TH')} ${i.unit}` : '–'}</span>
                    <span className="pb-amt num" data-label="งบประมาณ">{formatBaht(i.amountSatang)}</span>
                    <label className="ob-group">
                      <span className="sr-only">กลุ่มที่รับผิดชอบ</span>
                      {canEdit ? (
                        <select value={i.workgroupId} disabled={busy || locked} onChange={(e) => setGroup(i, e.target.value)} title={locked ? 'มีรายการเบิกจ่ายแล้ว เปลี่ยนกลุ่มไม่ได้' : undefined} className={i.workgroupId ? '' : 'is-empty'}>
                          <option value="">— เลือกกลุ่มงาน —</option>
                          {(i.workgroupId && !myGroups.some((g) => g.id === i.workgroupId) ? [...myGroups, l.workgroups.find((g) => g.id === i.workgroupId)!] : myGroups)
                            .map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      ) : <span className="badge">{n.group(i.workgroupId)}</span>}
                    </label>
                    <div className="pb-area">
                      {!i.workgroupId ? <span className="small muted">เลือกกลุ่มงานก่อน</span> : (
                        <>
                          <span className={`area-sum ${confirmed(i) ? 'is-ok' : ''}`}>
                            {areaSummary(st?.units.map((u) => u.unitId) ?? [], l.units)}
                            <span className="area-state">{confirmed(i) ? '✓ ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</span>
                          </span>
                          <span className="area-actions">
                            {canEdit && st && !isOpen && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(i.id)}>กำหนดพื้นที่</button>}
                            {mine(i) && i.projectId && <Link className="xs" to={`/admin/projects/${i.projectId}`}>บันทึกเบิกจ่าย</Link>}
                          </span>
                        </>
                      )}
                    </div>
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
                  {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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

type Mode = 'province' | 'all' | 'some';
const toBaht = (s: number) => (s / 100).toFixed(2).replace(/\.00$/, '');

function AreaEditor({ item, st, onCancel, onDone }: { item: PlanItem; st: PlanActivityState; onCancel: () => void; onDone: () => void }) {
  const l = useLookups();
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const pao = l.units.find((u) => u.kind === 'PROVINCE')!;
  const districts = l.units.filter((u) => u.kind === 'DISTRICT');
  const saved = st.units.map((u) => u.unitId);
  const savedDistricts = saved.filter((x) => districts.some((u) => u.id === x));
  const [mode, setMode] = useState<Mode>(!saved.length || (saved.length === 1 && saved[0] === pao.id) ? 'province' : savedDistricts.length === districts.length && saved.length === districts.length ? 'all' : 'some');
  const [some, setSome] = useState<string[]>(mode === 'some' ? saved : []);
  const sel = mode === 'province' ? [pao.id] : mode === 'all' ? districts.map((u) => u.id) : l.units.filter((u) => some.includes(u.id)).map((u) => u.id);
  const total = Math.round(item.quantity || 0);
  const hasTarget = total > 0;

  // ค่าในตาราง: ใช้ค่าที่บันทึกไว้ถ้าพื้นที่ชุดเดิม ไม่เช่นนั้นเป็น "ร่าง" แบ่งเท่ากัน
  const draft = () => {
    const m = splitMoney(st.budget, sel.length);
    const qty = splitEqual(total, sel.length);
    return Object.fromEntries(sel.map((id, k) => {
      const old = st.units.find((u) => u.unitId === id);
      const sameSet = sel.length === saved.length && sel.every((x) => saved.includes(x));
      return [id, sameSet && old ? { q: String(old.targetQty || ''), b: toBaht(old.budgetSatang) } : { q: hasTarget ? String(qty[k]) : '', b: toBaht(m[k]) }];
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
  const reDraft = () => {
    const m = splitMoney(st.budget, sel.length);
    const qty = splitEqual(total, sel.length);
    setVals(Object.fromEntries(sel.map((id, k) => [id, { q: hasTarget ? String(qty[k]) : '', b: toBaht(m[k]) }])));
  };

  const rows = sel.map((id) => ({ id, unit: l.units.find((u) => u.id === id)!, q: Number(vals[id]?.q || 0), b: bahtInputToSatang(vals[id]?.b ?? '') }));
  const sumQ = rows.reduce((a, r) => a + r.q, 0);
  const sumB = rows.reduce((a, r) => a + (r.b ?? 0), 0);
  const badMoney = rows.some((r) => r.b === null);
  const qOk = !hasTarget || sumQ === total;
  const bOk = !badMoney && sumB === st.budget;
  const ok = rows.length > 0 && qOk && bOk;

  const save = () => void run(async () => {
    await call('activities.setUnits', { activityId: st.activityId, units: rows.map((r) => ({ unitId: r.id, budgetSatang: r.b ?? 0, targetQty: r.q })) });
    toast('บันทึกพื้นที่ดำเนินการแล้ว');
    onDone();
  });
  const diff = (v: number, t: number, unit: string, money = false) =>
    v === t ? <span className="sum-ok">✓ ครบ</span> : <span className="sum-bad">{v < t ? 'ขาด' : 'เกิน'} {money ? formatBaht(Math.abs(t - v)) : Math.abs(t - v).toLocaleString('th-TH')} {unit}</span>;

  return (
    <div className="area-editor">
      {error && <ErrorBox error={error} />}
      <fieldset className="area-mode">
        <legend>พื้นที่ดำเนินการ</legend>
        {([['province', 'ระดับจังหวัด (ไม่ลงอำเภอ)'], ['all', `ทั้ง ${districts.length} อำเภอ`], ['some', 'บางอำเภอ']] as Array<[Mode, string]>).map(([m, label]) => (
          <label key={m} className="area-opt"><input type="radio" name={`mode-${item.id}`} checked={mode === m} onChange={() => setMode(m)} /> {label}</label>
        ))}
      </fieldset>
      {mode === 'some' && (
        <div className="unit-grid area-pick">
          <label className="unit-opt"><input type="checkbox" checked={some.includes(pao.id)} onChange={(e) => setSome((s0) => (e.target.checked ? [...s0, pao.id] : s0.filter((x) => x !== pao.id)))} /> ระดับจังหวัด</label>
          {districts.map((u) => (
            <label key={u.id} className="unit-opt"><input type="checkbox" checked={some.includes(u.id)} onChange={(e) => setSome((s0) => (e.target.checked ? [...s0, u.id] : s0.filter((x) => x !== u.id)))} /> {areaName(u)}</label>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <table className="data area-table">
          <thead><tr><th>พื้นที่</th><th className="r">เป้าหมาย{item.unit ? ` (${item.unit})` : ''}</th><th className="r">งบประมาณ (บาท)</th></tr></thead>
          <tbody>
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
              <td className="r">{hasTarget ? <>{sumQ.toLocaleString('th-TH')} / {total.toLocaleString('th-TH')} {diff(sumQ, total, item.unit)}</> : '–'}</td>
              <td className="r">{formatBaht(sumB)} / {formatBaht(st.budget)} {badMoney ? <span className="sum-bad">ตัวเลขไม่ถูกต้อง</span> : diff(sumB, st.budget, 'บาท', true)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {!rows.length && <p className="small" style={{ color: 'var(--clay)' }}>เลือกอย่างน้อย 1 พื้นที่</p>}
      {st.hasDisbursement && <p className="xs muted">กิจกรรมนี้มีการเบิกจ่ายแล้ว: พื้นที่ที่เบิกแล้วเอาออกไม่ได้ และงบต้องไม่ต่ำกว่ายอดที่เบิก</p>}
      {asking ? (
        <div className="confirm-box" role="alertdialog" aria-label="ยืนยันการบันทึก">
          <p><strong>ยืนยันบันทึกพื้นที่ดำเนินการ</strong></p>
          <p className="small">
            {areaSummary(sel, l.units, 11)}
            {hasTarget && <> — เป้าหมายรวม {sumQ.toLocaleString('th-TH')} {item.unit}</>} งบรวม {formatBaht(sumB)} บาท
          </p>
          <div className="btn-row">
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'ยืนยันและบันทึก'}</button>
            <button className="btn btn-ghost" onClick={() => setAsking(false)}>กลับไปแก้ไข</button>
          </div>
        </div>
      ) : (
        <div className="btn-row">
          <button className="btn" onClick={() => setAsking(true)} disabled={!ok}>บันทึก</button>
          {rows.length > 1 && <button className="btn btn-ghost" onClick={reDraft}>แบ่งเท่ากันใหม่</button>}
          <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          {!ok && rows.length > 0 && <span className="small" style={{ color: 'var(--clay)' }}>ผลรวมต้องเท่ายอดทั้งสิ้นก่อนบันทึก</span>}
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
