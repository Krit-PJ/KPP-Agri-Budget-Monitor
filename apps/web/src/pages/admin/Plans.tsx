import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatBaht, normalizeKey, splitByWeight, splitEqual,
  type PlanActivityState, type PlanDetail, type PlanItem, type SessionUser,
} from '@kpp/domain';
import { ApiError, call } from '../../api/client';
import { Async, Empty, ErrorBox, Sheet, bahtInputToSatang, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import PlanImport from './PlanImport';

/**
 * แผนและผู้รับผิดชอบ (ADR-006): หน้าเดียว ไม่มีชั้นซ้อน
 * - เปิดแผนของปีปัจจุบันทันที
 * - แต่ละกิจกรรมย่อย: เลือกกลุ่มงานได้ในแถว (เปลี่ยนกลุ่มได้ถ้ายังไม่เบิกจ่าย) และกำหนดหน่วยดำเนินการ (สนง.เกษตรจังหวัด/อำเภอ) พร้อมแบ่งงบ
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

type Filter = 'all' | 'noGroup' | 'noUnit' | 'mine';

function PlanBoard({ id, user, onChanged }: { id: string; user: SessionUser; onChanged: () => void }) {
  const s = useApi('plans.get', { id }, [id]);
  return <Async s={s} lines={10}>{(d) => <Board d={d} user={user} reload={() => { s.reload(); onChanged(); }} />}</Async>;
}

function Board({ d, user, reload }: { d: PlanDetail; user: SessionUser; reload: () => void }) {
  const l = useLookups();
  const n = useNames();
  const toast = useToast();
  const { busy, error, run, setError } = useSubmit();
  const allGroups = user.workgroupIds === null;
  const myGroups = l.workgroups.filter((g) => allGroups || user.workgroupIds!.includes(g.id));
  const [filter, setFilter] = useState<Filter>(user.role === 'admin' ? 'mine' : 'all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [bulkGroup, setBulkGroup] = useState('');

  const bySeq = useMemo(() => new Map(d.items.map((i) => [i.seq, i])), [d.items]);
  const leaves = useMemo(() => d.items.filter((i) => i.isLeaf), [d.items]);
  const stateOf = (i: PlanItem): PlanActivityState | undefined => (i.activityId ? d.activities[i.activityId] : undefined);
  const mine = (i: PlanItem) => !!i.workgroupId && (allGroups || user.workgroupIds!.includes(i.workgroupId));
  const key = normalizeKey(q);
  const visible = (i: PlanItem) =>
    (filter === 'all' || (filter === 'noGroup' && !i.workgroupId) || (filter === 'noUnit' && !!i.workgroupId && !stateOf(i)?.units.length) || (filter === 'mine' && mine(i))) &&
    (!key || normalizeKey(pathOf(i, bySeq).map((x) => `${x.number} ${x.name}`).join(' ')).includes(key));
  const shown = leaves.filter(visible);
  const projects = d.items.filter((i) => i.kind === 'PROJECT' || (i.kind === 'ACTIVITY' && i.projectSeq === i.seq));
  const assigned = leaves.filter((i) => i.workgroupId).length;
  const withUnits = leaves.filter((i) => stateOf(i)?.units.length).length;
  const pickedItems = leaves.filter((i) => picked.has(i.id));

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
  const bulkAssign = () => {
    if (!bulkGroup) return setError(new ApiError('VALIDATION_FAILED', 'เลือกกลุ่มงานก่อน'));
    void run(async () => {
      const r = await call('plans.assign', { itemIds: [...picked], workgroupId: bulkGroup, reassign: true });
      toast(`กำหนดกลุ่มงานแล้ว ${r.assigned} รายการ${r.skipped.length ? ` ข้าม ${r.skipped.length} รายการ (${r.skipped[0].reason})` : ''}`);
      setPicked(new Set());
      reload();
    });
  };
  const bulkUnits = (unitIds: string[], label: string) => void run(async () => {
    const acts = pickedItems.filter((i) => i.activityId).map((i) => i.activityId);
    if (!acts.length) throw new ApiError('VALIDATION_FAILED', 'รายการที่เลือกยังไม่มีกลุ่มงาน — กำหนดกลุ่มงานก่อน');
    const r = await call('activities.setUnitsBulk', { activityIds: acts, unitIds });
    toast(`กำหนดหน่วยเป็น${label}แล้ว ${r.updated} รายการ${r.skipped.length ? ` ข้าม ${r.skipped.length} รายการ` : ''}`);
    setPicked(new Set());
    reload();
  });
  const districts = l.units.filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
  const pao = l.units.find((u) => u.kind === 'PROVINCE')?.id ?? '';

  return (
    <>
      <p className="muted small" style={{ marginTop: 0 }}>
        {d.doc.title} — {n.fund(d.doc.fundingSourceId)} ครั้งที่ {d.doc.round}{d.doc.docNo && ` หนังสือ ${d.doc.docNo}`} รวม {formatBaht(d.doc.totalSatang)} บาท
      </p>
      <div className="progress-pair">
        <Progress label="มีกลุ่มงานรับผิดชอบ" done={assigned} total={leaves.length} />
        <Progress label="ระบุหน่วยดำเนินการแล้ว" done={withUnits} total={leaves.length} hint="ยังไม่ระบุ = สนง.เกษตรจังหวัดดำเนินการทั้งหมด" />
      </div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="แสดงรายการ">
          {user.workgroupIds !== null && <button aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>ของกลุ่มฉัน ({leaves.filter(mine).length})</button>}
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด ({leaves.length})</button>
          <button aria-pressed={filter === 'noGroup'} onClick={() => setFilter('noGroup')}>ยังไม่มีกลุ่ม ({leaves.length - assigned})</button>
          <button aria-pressed={filter === 'noUnit'} onClick={() => setFilter('noUnit')}>ยังไม่ระบุหน่วย ({assigned - withUnits})</button>
        </div>
        <label className="field" style={{ flex: '1 1 220px' }}><span className="sr-only">ค้นหา</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหากิจกรรม โครงการ หรือเลขลำดับ" /></label>
      </div>
      {error && <ErrorBox error={error} />}
      {!shown.length && <Empty title="ไม่มีรายการตามตัวกรองนี้" />}
      {projects.map((p) => {
        const rows = shown.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq);
        if (!rows.length) return null;
        const free = rows.map((i) => i.id);
        const allPicked = free.every((x) => picked.has(x));
        return (
          <section key={p.id} className="ob-project">
            <div className="ob-project-head">
              <label className="ob-check">
                <input type="checkbox" checked={allPicked} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); for (const x of free) { if (e.target.checked) nx.add(x); else nx.delete(x); } return nx; })} aria-label={`เลือกทุกรายการใน ${p.name}`} />
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
                return (
                  <li key={i.id} className={`ob-row ${picked.has(i.id) ? 'is-picked' : ''}`}>
                    <label className="ob-check"><input type="checkbox" checked={picked.has(i.id)} onChange={(e) => setPicked((s0) => { const nx = new Set(s0); if (e.target.checked) nx.add(i.id); else nx.delete(i.id); return nx; })} aria-label={`เลือก ${i.name}`} /></label>
                    <div className="ob-name">
                      <span className="muted">{i.number}</span> {i.name}
                      {trail.length > 0 && <span className="ob-trail">{trail.join(' › ')}</span>}
                    </div>
                    <span className="ob-qty small muted">{i.quantity ? `${i.quantity.toLocaleString('th-TH')} ${i.unit}` : i.unit || '–'}</span>
                    <span className="ob-amt num">{formatBaht(i.amountSatang)}</span>
                    <label className="ob-group">
                      <span className="sr-only">กลุ่มงานที่รับผิดชอบ</span>
                      {canEdit ? (
                        <select value={i.workgroupId} disabled={busy || locked} onChange={(e) => setGroup(i, e.target.value)} title={locked ? 'มีรายการเบิกจ่ายแล้ว เปลี่ยนกลุ่มไม่ได้' : undefined} className={i.workgroupId ? '' : 'is-empty'}>
                          <option value="">— เลือกกลุ่มงาน —</option>
                          {(i.workgroupId && !myGroups.some((g) => g.id === i.workgroupId) ? [...myGroups, l.workgroups.find((g) => g.id === i.workgroupId)!] : myGroups)
                            .map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      ) : <span className="badge">{n.group(i.workgroupId)}</span>}
                    </label>
                    <span className="ob-units">
                      {!i.workgroupId ? <span className="xs muted">เลือกกลุ่มงานก่อน</span> : (
                        <button className={`unit-chip ${st?.units.length ? '' : 'is-default'}`} onClick={() => setEditing(i)} disabled={!canEdit}>
                          {unitLabel(st, l.units)}
                        </button>
                      )}
                      {mine(i) && i.projectId && <Link className="xs" to={`/admin/projects/${i.projectId}`}>บันทึกเบิกจ่าย</Link>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {picked.size > 0 && (
        <div className="panel plan-bar">
          <strong>เลือก {picked.size} รายการ รวม {formatBaht(pickedItems.reduce((a, i) => a + i.amountSatang, 0))} บาท</strong>
          <span className="bar-group">
            <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} aria-label="กลุ่มงาน" style={{ width: 'auto' }}>
              <option value="">กลุ่มงาน…</option>
              {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="btn btn-sm" onClick={bulkAssign} disabled={busy}>กำหนดกลุ่มงาน</button>
          </span>
          <span className="bar-group">
            <span className="small">หน่วยดำเนินการ:</span>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkUnits(districts, 'ทั้ง 11 อำเภอ')} disabled={busy}>ทั้ง 11 อำเภอ (แบ่งเท่ากัน)</button>
            <button className="btn btn-ghost btn-sm" onClick={() => bulkUnits([pao], 'สนง.เกษตรจังหวัด')} disabled={busy}>สนง.เกษตรจังหวัด</button>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPicked(new Set())}>ล้าง</button>
        </div>
      )}
      <Sheet open={!!editing} title="หน่วยดำเนินการและการแบ่งงบ" onClose={() => setEditing(null)}>
        {editing && stateOf(editing) && (
          <UnitEditor item={editing} st={stateOf(editing)!} onDone={() => { setEditing(null); reload(); }} />
        )}
      </Sheet>
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

function unitLabel(st: PlanActivityState | undefined, units: Array<{ id: string; shortName: string; kind: string }>): string {
  const ids = st?.units.map((u) => u.unitId) ?? [];
  if (!ids.length) return 'สนง.เกษตรจังหวัด';
  const districts = units.filter((u) => u.kind === 'DISTRICT');
  const nDist = ids.filter((x) => districts.some((u) => u.id === x)).length;
  const hasPao = ids.some((x) => units.find((u) => u.id === x)?.kind === 'PROVINCE');
  if (nDist === districts.length) return `ทั้ง 11 อำเภอ${hasPao ? ' + จังหวัด' : ''}`;
  const names = ids.map((x) => units.find((u) => u.id === x)?.shortName ?? '?');
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} และอีก ${names.length - 2} หน่วย`;
}

/* ------------------------------ แผงกำหนดหน่วย ------------------------------ */

type Split = 'equal' | 'qty' | 'manual';
const toBaht = (s: number) => (s / 100).toFixed(2).replace(/\.00$/, '');

function UnitEditor({ item, st, onDone }: { item: PlanItem; st: PlanActivityState; onDone: () => void }) {
  const l = useLookups();
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const pao = l.units.find((u) => u.kind === 'PROVINCE')!;
  const districts = l.units.filter((u) => u.kind === 'DISTRICT');
  const initial = st.units.length ? st.units.map((u) => u.unitId) : [pao.id];
  const [sel, setSel] = useState<string[]>(initial);
  const [split, setSplit] = useState<Split>(st.units.length > 1 && new Set(st.units.map((u) => u.budgetSatang)).size > 2 ? 'manual' : 'equal');
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(st.units.map((u) => [u.unitId, String(u.targetQty || '')])));
  const [money, setMoney] = useState<Record<string, string>>(() => Object.fromEntries(st.units.map((u) => [u.unitId, toBaht(u.budgetSatang)])));
  const q0 = st.planQuarters ? st.planQuarters.split(',').map((v) => toBaht(Number(v))) : ['', '', '', ''];
  const [plan, setPlan] = useState<string[]>(q0);
  const [showPlan, setShowPlan] = useState(!!st.planQuarters);

  const ordered = l.units.filter((u) => sel.includes(u.id));
  const qtyNums = ordered.map((u) => Number(qty[u.id] || 0));
  const amounts: number[] = split === 'equal' ? splitEqual(st.budget, ordered.length)
    : split === 'qty' ? splitByWeight(st.budget, qtyNums)
    : ordered.map((u) => bahtInputToSatang(money[u.id] ?? '') ?? 0);
  const qtys = split === 'equal' && !Object.values(qty).some(Boolean) ? splitEqual(Math.round(item.quantity || 0), ordered.length) : qtyNums;
  const sum = amounts.reduce((a, v) => a + v, 0);
  const planSat = plan.map((v) => (v.trim() ? bahtInputToSatang(v) : 0));
  const planSum = planSat.reduce((a: number, v) => a + (v ?? 0), 0);
  const planOn = showPlan && plan.some((v) => v.trim());
  const ok = ordered.length > 0 && sum === st.budget && (!planOn || (planSat.every((v) => v !== null) && planSum === st.budget));

  useEffect(() => {
    if (split !== 'manual') setMoney(Object.fromEntries(ordered.map((u, i) => [u.id, toBaht(amounts[i])])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, sel.join(','), JSON.stringify(qty)]);

  const toggle = (id: string, on: boolean) => setSel((s0) => (on ? [...new Set([...s0, id])] : s0.filter((x) => x !== id)));
  const allDist = districts.every((u) => sel.includes(u.id));
  const save = () => void run(async () => {
    const onlyPao = ordered.length === 1 && ordered[0].id === pao.id;
    await call('activities.setUnits', {
      activityId: st.activityId,
      units: onlyPao && !qtys[0] ? [] : ordered.map((u, i) => ({ unitId: u.id, budgetSatang: amounts[i], targetQty: qtys[i] || 0 })),
      planQuarters: planOn ? (planSat as number[]) : null,
    });
    toast('บันทึกหน่วยดำเนินการแล้ว');
    onDone();
  });
  const fillPlanEven = () => setPlan(splitEqual(st.budget, 4).reverse().map(toBaht));

  return (
    <div className="unit-editor">
      <p style={{ marginTop: 0 }}><strong>{item.number} {item.name}</strong></p>
      <p className="small muted">งบกิจกรรม {formatBaht(st.budget)} บาท{item.quantity ? `, เป้าหมาย ${item.quantity.toLocaleString('th-TH')} ${item.unit}` : ''}{st.hasDisbursement ? ' — มีรายการเบิกจ่ายแล้ว หน่วยที่เบิกแล้วเอาออกไม่ได้' : ''}</p>
      {error && <ErrorBox error={error} />}

      <fieldset className="unit-pick">
        <legend>ใครดำเนินการ</legend>
        <label className="unit-opt"><input type="checkbox" checked={sel.includes(pao.id)} onChange={(e) => toggle(pao.id, e.target.checked)} /> {pao.name}</label>
        <label className="unit-opt unit-all"><input type="checkbox" checked={allDist} onChange={(e) => setSel((s0) => (e.target.checked ? [...new Set([...s0, ...districts.map((u) => u.id)])] : s0.filter((x) => !districts.some((u) => u.id === x))))} /> ทั้ง 11 อำเภอ</label>
        <div className="unit-grid">
          {districts.map((u) => (
            <label key={u.id} className="unit-opt"><input type="checkbox" checked={sel.includes(u.id)} onChange={(e) => toggle(u.id, e.target.checked)} /> {u.shortName}</label>
          ))}
        </div>
      </fieldset>

      {ordered.length > 1 && (
        <div className="segmented" role="group" aria-label="วิธีแบ่งงบ" style={{ margin: 'var(--s3) 0' }}>
          <button aria-pressed={split === 'equal'} onClick={() => setSplit('equal')}>แบ่งเท่ากัน</button>
          <button aria-pressed={split === 'qty'} onClick={() => setSplit('qty')}>ตามปริมาณงาน</button>
          <button aria-pressed={split === 'manual'} onClick={() => setSplit('manual')}>กำหนดเอง</button>
        </div>
      )}
      {ordered.length > 0 && (
        <table className="data unit-table">
          <thead><tr><th>หน่วย</th><th className="r">ปริมาณ{item.unit ? ` (${item.unit})` : ''}</th><th className="r">งบ (บาท)</th></tr></thead>
          <tbody>
            {ordered.map((u, i) => (
              <tr key={u.id}>
                <td>{u.shortName}</td>
                <td className="r"><input inputMode="numeric" value={qty[u.id] ?? (qtys[i] ? String(qtys[i]) : '')} onChange={(e) => setQty({ ...qty, [u.id]: e.target.value.replace(/[^\d]/g, '') })} aria-label={`ปริมาณ ${u.shortName}`} /></td>
                <td className="r">
                  {split === 'manual'
                    ? <input inputMode="decimal" value={money[u.id] ?? ''} onChange={(e) => setMoney({ ...money, [u.id]: e.target.value })} aria-label={`งบ ${u.shortName}`} />
                    : <span className="num">{formatBaht(amounts[i])}</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>รวม</td>
              <td className="r num">{qtys.reduce((a, v) => a + v, 0).toLocaleString('th-TH')}</td>
              <td className="r num" style={{ color: sum === st.budget ? undefined : 'var(--clay)' }}>{formatBaht(sum)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {sum !== st.budget && ordered.length > 0 && <p className="small" style={{ color: 'var(--clay)' }}>ผลรวมต้องเท่างบกิจกรรม {formatBaht(st.budget)} บาท (ต่างกัน {formatBaht(st.budget - sum)})</p>}
      {split === 'qty' && qtyNums.every((v) => !v) && <p className="small muted">กรอกปริมาณงานของแต่ละหน่วย ระบบแบ่งงบตามสัดส่วนให้</p>}

      <details open={showPlan} onToggle={(e) => setShowPlan((e.target as HTMLDetailsElement).open)} className="plan-q">
        <summary>แผนการใช้จ่ายรายไตรมาส (ไม่บังคับ)</summary>
        <p className="xs muted">เว้นว่าง = ใช้เป้ามาตรฐานของโครงการ ผลรวมต้องเท่างบกิจกรรม</p>
        <div className="q-grid">
          {['ไตรมาส 1 (ต.ค.–ธ.ค.)', 'ไตรมาส 2 (ม.ค.–มี.ค.)', 'ไตรมาส 3 (เม.ย.–มิ.ย.)', 'ไตรมาส 4 (ก.ค.–ก.ย.)'].map((lab, i) => (
            <label key={lab} className="field"><span className="xs">{lab}</span><input inputMode="decimal" value={plan[i]} onChange={(e) => setPlan(plan.map((v, k) => (k === i ? e.target.value : v)))} /></label>
          ))}
        </div>
        <div className="btn-row">
          <button type="button" className="linkish xs" onClick={fillPlanEven}>แบ่งเท่ากัน 4 ไตรมาส</button>
          <button type="button" className="linkish xs" onClick={() => setPlan(['', '', '', ''])}>ล้าง (ใช้ค่ามาตรฐาน)</button>
          {planOn && <span className="xs" style={{ color: planSum === st.budget ? 'var(--forest)' : 'var(--clay)' }}>รวม {formatBaht(planSum)} บาท</span>}
        </div>
      </details>

      <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn" onClick={save} disabled={!ok || busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
      </div>
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
