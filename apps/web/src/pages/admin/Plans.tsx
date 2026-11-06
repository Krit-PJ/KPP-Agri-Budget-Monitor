import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBaht, normalizeKey, type PlanDetail, type PlanDocSummary, type PlanItem, type SessionUser } from '@kpp/domain';
import { ApiError, call } from '../../api/client';
import { Async, Empty, ErrorBox, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import PlanImport from './PlanImport';

/**
 * แผนงบประมาณ: นำเข้าแผนที่ได้รับจัดสรร (Super/Mini Super) และให้แต่ละกลุ่มงานเลือกกิจกรรมย่อยที่รับผิดชอบ
 * กิจกรรมหลักเลือกร่วมกันได้ แต่กิจกรรมย่อยสุดท้าย 1 รายการ = 1 กลุ่มงาน
 */
export default function Plans({ user }: { user: SessionUser }) {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const plans = useApi('plans.list', { fiscalYear: fy }, [fy]);
  const canImport = user.role !== 'admin';

  if (importing) return <PlanImport fy={fy} onCancel={() => setImporting(false)} onDone={(id) => { setImporting(false); plans.reload(); setOpenId(id); }} />;
  if (openId) return <PlanView id={openId} user={user} onBack={() => { setOpenId(null); plans.reload(); }} />;
  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>แผนงบประมาณ</h1>
        {canImport && <button className="btn" onClick={() => setImporting(true)}>นำเข้าแผนงบประมาณ</button>}
      </div>
      <p className="muted" style={{ maxWidth: '70ch' }}>
        แผนที่ได้รับจัดสรรแยกตามปีงบประมาณ กลุ่มงานเลือกกิจกรรมย่อยที่รับผิดชอบได้ที่นี่ ระบบจะสร้างโครงการและงบประมาณของกลุ่มให้อัตโนมัติ
      </p>
      <div className="toolbar"><FiscalYearPicker value={fy} onChange={setFy} /></div>
      <Async s={plans}>
        {(list) => list.length ? (
          <div className="grid grid-2">
            {list.map((p) => <PlanCard key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
          </div>
        ) : (
          <Empty title={`ยังไม่มีแผนงบประมาณปี ${fy}`}>
            <p>{canImport ? 'นำเข้าแผนจากไฟล์ Excel แบบ คง.2, CSV, ลิงก์ Google Sheets หรือ PDF ของหนังสือจัดสรร ระบบตรวจยอดทุกระดับและให้แก้ก่อนนำเข้า' : 'รอ Super Admin นำเข้าแผนงบประมาณของปีนี้'}</p>
            {canImport && <button className="btn" onClick={() => setImporting(true)}>นำเข้าแผนงบประมาณ</button>}
          </Empty>
        )}
      </Async>
    </>
  );
}

function PlanCard({ p, onOpen }: { p: PlanDocSummary; onOpen: () => void }) {
  const n = useNames();
  const pct = p.leafCount ? Math.round((p.assignedCount / p.leafCount) * 100) : 0;
  return (
    <article className="panel">
      <h2 style={{ fontSize: 'var(--fs-lg)' }}>{p.title}</h2>
      <p className="small muted">{n.fund(p.fundingSourceId)} งวดที่ {p.round}{p.docNo && ` หนังสือ ${p.docNo}`}</p>
      <p className="num" style={{ fontSize: 'var(--fs-xl)', margin: 0 }}>{formatBaht(p.totalSatang)} <span className="small muted">บาท</span></p>
      <p className="small">มีผู้รับผิดชอบแล้ว {p.assignedCount} จาก {p.leafCount} กิจกรรมย่อย ({pct}%)</p>
      <div className="mini-strip" aria-hidden="true"><div style={{ width: `${pct}%`, background: 'var(--paddy)' }} /></div>
      <button className="btn" style={{ marginTop: 'var(--s4)' }} onClick={onOpen}>เปิดแผนและเลือกกิจกรรม</button>
    </article>
  );
}

/* ------------------------------------- tree ------------------------------------- */

type Filter = 'all' | 'open' | 'mine';

function PlanView({ id, user, onBack }: { id: string; user: SessionUser; onBack: () => void }) {
  const s = useApi('plans.get', { id }, [id]);
  return (
    <>
      <p className="small"><button className="btn btn-ghost btn-sm" onClick={onBack}>กลับไปรายการแผน</button></p>
      <Async s={s} lines={8}>{(d) => <PlanTree d={d} user={user} reload={s.reload} />}</Async>
    </>
  );
}

function PlanTree({ d, user, reload }: { d: PlanDetail; user: SessionUser; reload: () => void }) {
  const l = useLookups();
  const n = useNames();
  const toast = useToast();
  const myGroups = l.workgroups.filter((g) => user.workgroupIds === null || user.workgroupIds.includes(g.id));
  const [group, setGroup] = useState(myGroups.length === 1 ? myGroups[0].id : '');
  const [filter, setFilter] = useState<Filter>(user.role === 'admin' ? 'open' : 'all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const { busy, error, run, setError } = useSubmit();

  const bySeq = useMemo(() => new Map(d.items.map((i) => [i.seq, i])), [d.items]);
  const leaves = useMemo(() => d.items.filter((i) => i.isLeaf), [d.items]);
  const mine = (i: PlanItem) => !!i.workgroupId && (user.workgroupIds === null || user.workgroupIds.includes(i.workgroupId));
  const key = normalizeKey(q);
  const leafVisible = (i: PlanItem) =>
    (filter === 'all' || (filter === 'open' && !i.workgroupId) || (filter === 'mine' && mine(i))) &&
    (!key || normalizeKey(pathOf(i, bySeq).map((x) => `${x.number} ${x.name}`).join(' ')).includes(key));
  // โครงการ (หรือกิจกรรมหลักที่ไม่มีโครงการครอบ) = หน่วยที่เปิดดูทีละอัน
  const projects = d.items.filter((i) => i.kind === 'PROJECT' || (i.kind === 'ACTIVITY' && i.projectSeq === i.seq));
  const leavesOf = (p: PlanItem) => leaves.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq);
  const plans = d.items.filter((i) => i.kind === 'PLAN');
  const pickedSum = leaves.filter((i) => picked.has(i.id)).reduce((a, i) => a + i.amountSatang, 0);
  const assigned = leaves.filter((i) => i.workgroupId).length;

  const toggle = (ids: string[], on: boolean) => setPicked((s) => {
    const next = new Set(s);
    for (const id of ids) if (on) next.add(id); else next.delete(id);
    return next;
  });
  const assign = () => {
    if (!group) return setError(new ApiError('VALIDATION_FAILED', 'เลือกกลุ่มงานที่รับผิดชอบก่อน'));
    void run(async () => {
      const r = await call('plans.assign', { itemIds: [...picked], workgroupId: group });
      toast(`บันทึกผู้รับผิดชอบแล้ว ${r.assigned} รายการ${r.skipped.length ? ` ข้าม ${r.skipped.length} รายการ (มีกลุ่มอื่นเลือกแล้ว)` : ''}`);
      setPicked(new Set());
      reload();
    });
  };
  const unassign = (i: PlanItem) => void run(async () => {
    const r = await call('plans.unassign', { itemIds: [i.id] });
    if (r.skipped.length) setError(new ApiError('VALIDATION_FAILED', r.skipped[0].reason));
    else toast('ยกเลิกการเลือกแล้ว');
    reload();
  });

  const projectBlock = (p: PlanItem) => {
    const all = leavesOf(p);
    const shown = all.filter(leafVisible);
    if (!shown.length) return null;
    const taken = all.filter((i) => i.workgroupId).length;
    const isOpen = open === p.seq || !!key;
    const free = shown.filter((i) => !i.workgroupId).map((i) => i.id);
    const allPicked = free.length > 0 && free.every((id) => picked.has(id));
    return (
      <li key={p.id} className="pl-project">
        <button className="pl-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen && !key ? null : p.seq)}>
          <span className="plan-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
          <span className="pl-title">{p.number} {p.name}</span>
          <span className="pl-meta small muted">มีผู้รับผิดชอบ {taken}/{all.length}</span>
          <span className="num pl-sum">{formatBaht(all.reduce((a, i) => a + i.amountSatang, 0))}</span>
          <span className="mini-strip pl-bar" aria-hidden="true"><span style={{ width: `${all.length ? (taken / all.length) * 100 : 0}%` }} /></span>
        </button>
        {isOpen && (
          <ul className="pl-leaves">
            {free.length > 1 && (
              <li className="pl-leaf pl-all">
                <label className="pl-check">
                  <input type="checkbox" checked={allPicked} onChange={(e) => toggle(free, e.target.checked)} />
                  <span className="small">เลือกทุกรายการที่ยังว่างในโครงการนี้ ({free.length})</span>
                </label>
              </li>
            )}
            {shown.map((i) => {
              const trail = pathOf(i, bySeq).filter((x) => x.depth > p.depth && x.seq !== i.seq).map((x) => x.name);
              return (
                <li key={i.id} className={`pl-leaf ${picked.has(i.id) ? 'is-picked' : ''}`}>
                  <label className="pl-check">
                    {!i.workgroupId
                      ? <input type="checkbox" checked={picked.has(i.id)} onChange={(e) => toggle([i.id], e.target.checked)} aria-label={`เลือก ${i.name}`} />
                      : <span className="pl-check-gap" aria-hidden="true" />}
                    <span>
                      <span className="muted">{i.number}</span> {i.name}
                      {trail.length > 0 && <span className="pl-trail xs muted">{trail.join(' › ')}</span>}
                    </span>
                  </label>
                  <span className="small muted pl-qty">{i.quantity ? `${i.quantity.toLocaleString('th-TH')} ${i.unit}` : i.unit}</span>
                  <span className="num pl-amt">{formatBaht(i.amountSatang)}</span>
                  <span className="pl-owner">
                    {i.workgroupId ? (
                      <>
                        <span className={`badge ${mine(i) ? 'b-ok' : ''}`}>{n.group(i.workgroupId)}</span>
                        {mine(i) && <> <Link className="xs" to={`/admin/projects/${i.projectId}`}>เปิด</Link> <button className="linkish xs" onClick={() => unassign(i)} disabled={busy}>ยกเลิก</button></>}
                      </>
                    ) : <span className="xs muted">ยังว่าง</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <h1>{d.doc.title}</h1>
      <p className="muted small">
        {n.fund(d.doc.fundingSourceId)} ปีงบประมาณ {d.doc.fiscalYear} ครั้งที่ {d.doc.round}{d.doc.docNo && ` หนังสือ ${d.doc.docNo}`} รวม {formatBaht(d.doc.totalSatang)} บาท
        {d.doc.editCount > 0 && `, แก้จากต้นฉบับ ${d.doc.editCount} ช่องตอนนำเข้า`}
      </p>
      <div className="notice notice-info">
        เปิดโครงการ ติ๊กกิจกรรมย่อยที่กลุ่มงานรับผิดชอบ แล้วกด "บันทึกผู้รับผิดชอบ" ระบบสร้างโครงการและงบประมาณให้ทันที
        กิจกรรมหลักเดียวกันหลายกลุ่มเลือกได้ แต่กิจกรรมย่อยแต่ละรายการมีผู้รับผิดชอบได้กลุ่มเดียว
        (มีผู้รับผิดชอบแล้ว {assigned} จาก {leaves.length} รายการ)
      </div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="แสดงรายการ">
          <button aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>ยังว่าง ({leaves.length - assigned})</button>
          <button aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>{user.workgroupIds === null ? 'มีผู้รับผิดชอบแล้ว' : 'ของกลุ่มฉัน'} ({leaves.filter(mine).length})</button>
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด ({leaves.length})</button>
        </div>
        <label className="field" style={{ flex: '1 1 220px' }}><span className="sr-only">ค้นหา</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโครงการ กิจกรรม หรือเลขลำดับ" /></label>
      </div>
      {error && <ErrorBox error={error} />}
      {!leaves.some(leafVisible) && <Empty title="ไม่มีรายการตามตัวกรองนี้" />}
      {plans.map((pl) => {
        const blocks = projects.filter((p) => p.planIndex === pl.planIndex).map(projectBlock).filter(Boolean);
        if (!blocks.length) return null;
        return (
          <section key={pl.id} className="section" style={{ marginTop: 'var(--s5)' }}>
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>{pl.name}</h2>
            <ul className="pl-projects panel">{blocks}</ul>
          </section>
        );
      })}
      {picked.size > 0 && (
        <div className="panel plan-bar">
          <strong>เลือก {picked.size} รายการ รวม {formatBaht(pickedSum)} บาท</strong>
          {myGroups.length > 1 ? (
            <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="กลุ่มงานที่รับผิดชอบ" style={{ width: 'auto' }}>
              <option value="">เลือกกลุ่มงาน</option>
              {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          ) : <span className="small">ให้ {myGroups[0]?.name}</span>}
          <button className="btn" onClick={assign} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกผู้รับผิดชอบ'}</button>
          <button className="btn btn-ghost" onClick={() => setPicked(new Set())}>ล้าง</button>
        </div>
      )}
    </>
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
