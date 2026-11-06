import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  formatBaht, normalizeKey, toCsv, type PlanDetail, type PlanDocSummary, type PlanItem, type PlanPreview, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, DEMO, fileToBase64 } from '../../api/client';
import { Async, Empty, ErrorBox, Sheet, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';

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
            <p>{canImport ? 'นำเข้าแผนจากไฟล์ Excel/CSV, ลิงก์ Google Sheets หรือ PDF ของหนังสือจัดสรร' : 'รอ Super Admin นำเข้าแผนงบประมาณของปีนี้'}</p>
            {canImport && <button className="btn" onClick={() => setImporting(true)}>นำเข้าแผนงบประมาณ</button>}
          </Empty>
        )}
      </Async>
      <Sheet open={importing} title="นำเข้าแผนงบประมาณ" onClose={() => setImporting(false)}>
        <ImportPlan fy={fy} onDone={(id) => { setImporting(false); plans.reload(); setOpenId(id); }} />
      </Sheet>
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

/* ------------------------------------ import ------------------------------------ */

function ImportPlan({ fy, onDone }: { fy: number; onDone: (id: string) => void }) {
  const l = useLookups();
  const toast = useToast();
  const [pv, setPv] = useState<PlanPreview | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [meta, setMeta] = useState({ fiscalYear: fy, fundingSourceId: l.fundingSources.find((f) => f.code === 'DOAE')?.id ?? '', round: 1, title: '', docNo: '', docDate: '' });
  const [accept, setAccept] = useState(false);
  const { busy, error, run } = useSubmit();

  const read = (file?: File) => file && void run(async () => {
    setPv(await call('plans.preview', { fileName: file.name, mimeType: file.type, base64: await fileToBase64(file) }));
    setAccept(false);
  });
  const fromSheet = () => void run(async () => setPv(await call('plans.preview', { fileName: 'Google Sheets', sheetUrl })));
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const doc = await call('plans.commit', { ...meta, table: pv!.table, sourceFileId: pv!.sourceFileId, sourceFileName: pv!.sourceFileName, acceptWarnings: accept });
      toast(`บันทึกแผนแล้ว ${doc.leafCount} กิจกรรมย่อย`);
      onDone(doc.id);
    });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(pv!.table)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แผนงบประมาณ-แก้ไข.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pv) {
    return (
      <>
        {error && <ErrorBox error={error} />}
        <label className="dropzone" style={{ display: 'block' }}>
          <strong>{busy ? 'กำลังอ่านไฟล์…' : 'เลือกไฟล์แผนงบประมาณ'}</strong>
          <span className="small muted">Excel หรือ CSV ที่มีคอลัมน์ รายการ, หน่วยนับ, ปริมาณงาน, งบประมาณ{DEMO ? '' : ' หรือ PDF หนังสือจัดสรร (ระบบอ่านเป็นร่างให้ตรวจ)'}</span>
          <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.tsv,.pdf,image/jpeg,image/png" onChange={(e) => read(e.target.files?.[0])} disabled={busy} />
        </label>
        <div className="toolbar" style={{ marginTop: 'var(--s4)' }}>
          <label className="field" style={{ flex: 1 }}><span>หรือวางลิงก์ Google Sheets</span><input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} /></label>
          <button className="btn btn-ghost" onClick={fromSheet} disabled={!sheetUrl || busy}>อ่านข้อมูล</button>
        </div>
        <p className="hint">ระดับของแต่ละรายการอ่านจากเลขลำดับ (1, 1.1, 1), 1.1), (1), -) จึงไม่ต้องจัดย่อหน้า</p>
      </>
    );
  }
  const p = pv.parsed;
  const errors = p.issues.filter((i) => i.level === 'ERROR');
  const warnings = p.issues.filter((i) => i.level === 'WARNING');
  const totalOk = p.declaredTotal === null || p.declaredTotal === p.computedTotal;
  return (
    <form onSubmit={save}>
      {error && <ErrorBox error={error} />}
      <div className={`notice ${errors.length ? 'notice-error' : 'notice-ok'}`}>
        <div>
          <strong>{errors.length ? `พบข้อผิดพลาด ${errors.length} รายการ` : 'ยอดเงินทุกระดับถูกต้อง'}</strong>
          <div className="small">
            รวม {formatBaht(p.computedTotal)} บาท{p.declaredTotal !== null && (totalOk ? ' ตรงกับยอดรวมทั้งสิ้นในเอกสาร' : ` แต่เอกสารระบุ ${formatBaht(p.declaredTotal)} บาท`)}
            {' '}มีกิจกรรมย่อยให้กลุ่มงานเลือก {p.leafCount} รายการ
          </div>
        </div>
      </div>
      {pv.fromOcr && <div className="notice notice-warn">อ่านจากภาพเอกสาร — ดาวน์โหลดเป็น CSV ตรวจแก้ใน Excel แล้วนำเข้าใหม่จะแม่นยำที่สุด</div>}
      {!!p.issues.length && (
        <details style={{ marginBottom: 'var(--s4)' }} open={errors.length > 0}>
          <summary className="small">ผลการตรวจ {p.issues.length} รายการ</summary>
          <ul className="row-list small">
            {p.issues.slice(0, 50).map((i, k) => (
              <li key={k} style={{ color: i.level === 'ERROR' ? 'var(--clay)' : undefined }}>{i.rowNo ? `แถว ${i.rowNo}: ` : ''}{i.message}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="form-grid">
        <label className="field"><span>ปีงบประมาณ</span>
          <select value={meta.fiscalYear} onChange={(e) => setMeta({ ...meta, fiscalYear: Number(e.target.value) })}>{l.fiscalYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <label className="field"><span>แหล่งงบ</span>
          <select value={meta.fundingSourceId} onChange={(e) => setMeta({ ...meta, fundingSourceId: e.target.value })} required>
            {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="field"><span>งวดที่ / ครั้งที่</span><input type="number" min={1} max={20} value={meta.round} onChange={(e) => setMeta({ ...meta, round: Number(e.target.value) })} /></label>
        <label className="field"><span>เลขที่หนังสือ</span><input value={meta.docNo} onChange={(e) => setMeta({ ...meta, docNo: e.target.value })} placeholder="เช่น กษ 1004/ว 1594" /></label>
        <label className="field wide"><span>ชื่อแผน (เว้นว่างให้ระบบตั้งชื่อ)</span><input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></label>
      </div>
      {warnings.length > 0 && (
        <label className="field" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 'var(--s3)' }}>
          <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>ตรวจรายการที่ต้องตรวจ {warnings.length} รายการแล้ว</span>
        </label>
      )}
      <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn" disabled={busy || errors.length > 0 || (warnings.length > 0 && !accept)}>{busy ? 'กำลังบันทึก…' : 'บันทึกแผน'}</button>
        <button type="button" className="btn btn-ghost" onClick={download}>ดาวน์โหลดเป็น CSV เพื่อแก้ไข</button>
        <button type="button" className="btn btn-ghost" onClick={() => setPv(null)}>เลือกไฟล์อื่น</button>
      </div>
    </form>
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
  const [open, setOpen] = useState<Set<number>>(new Set());
  const { busy, error, run, setError } = useSubmit();

  const bySeq = useMemo(() => new Map(d.items.map((i) => [i.seq, i])), [d.items]);
  const leaves = d.items.filter((i) => i.isLeaf);
  const mine = (i: PlanItem) => !!i.workgroupId && (user.workgroupIds === null || user.workgroupIds.includes(i.workgroupId));
  const key = normalizeKey(q);
  const leafVisible = (i: PlanItem) =>
    (filter === 'all' || (filter === 'open' && !i.workgroupId) || (filter === 'mine' && mine(i))) &&
    (!key || normalizeKey(pathOf(i, bySeq).map((x) => x.name).join(' ')).includes(key));
  const visibleLeaves = new Set(leaves.filter(leafVisible).map((i) => i.seq));
  // แสดงเฉพาะสายบรรพบุรุษของรายการย่อยที่ผ่านตัวกรอง
  const visible = new Set<number>();
  for (const seq of visibleLeaves) for (const x of pathOf(bySeq.get(seq)!, bySeq)) visible.add(x.seq);
  const projects = d.items.filter((i) => (i.kind === 'PROJECT' || (i.kind === 'ACTIVITY' && i.projectSeq === i.seq)) && visible.has(i.seq));
  const plans = d.items.filter((i) => i.kind === 'PLAN' && visible.has(i.seq));
  const pickedSum = leaves.filter((i) => picked.has(i.id)).reduce((a, i) => a + i.amountSatang, 0);

  const toggle = (i: PlanItem) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(i.id)) next.delete(i.id); else next.add(i.id);
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
    const items = d.items.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq && i.seq !== p.seq && visible.has(i.seq));
    const pl = leaves.filter((i) => i.planIndex === p.planIndex && i.projectSeq === p.seq);
    const taken = pl.filter((i) => i.workgroupId).length;
    const isOpen = open.has(p.seq) || !!key;
    return (
      <li key={p.id} style={{ padding: 0 }}>
        <button className="plan-row plan-project" aria-expanded={isOpen} onClick={() => setOpen((s) => { const x = new Set(s); if (x.has(p.seq)) x.delete(p.seq); else x.add(p.seq); return x; })}>
          <span className="plan-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
          <span style={{ flex: 1 }}>{p.number} {p.name}</span>
          <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{taken}/{pl.length} รายการ</span>
          <span className="num" style={{ whiteSpace: 'nowrap' }}>{formatBaht(pl.reduce((a, i) => a + i.amountSatang, 0))}</span>
        </button>
        {isOpen && (
          <ul className="plan-list">
            {items.map((i) => i.isLeaf ? (
              <li key={i.id} className="plan-row plan-leaf" style={{ paddingLeft: indent(i, p) }}>
                {!i.workgroupId ? (
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: 20, minHeight: 20, marginTop: 3 }} checked={picked.has(i.id)} onChange={() => toggle(i)} aria-label={`เลือก ${i.name}`} />
                    <span><span className="muted">{i.number}</span> {i.name}</span>
                  </label>
                ) : (
                  <span style={{ flex: 1, paddingLeft: 30 }}><span className="muted">{i.number}</span> {i.name}</span>
                )}
                <span className="small muted plan-qty">{i.quantity ? `${i.quantity.toLocaleString('th-TH')} ${i.unit}` : ''}</span>
                <span className="num plan-amt">{formatBaht(i.amountSatang)}</span>
                <span className="plan-owner">
                  {i.workgroupId ? (
                    <>
                      <span className={`badge ${mine(i) ? 'b-ok' : ''}`}>{n.group(i.workgroupId)}</span>
                      {mine(i) && <> <Link className="xs" to={`/admin/projects/${i.projectId}`}>เปิด</Link> <button className="linkish xs" onClick={() => unassign(i)} disabled={busy}>ยกเลิก</button></>}
                    </>
                  ) : <span className="xs muted">ยังไม่มีผู้รับผิดชอบ</span>}
                </span>
              </li>
            ) : (
              <li key={i.id} className="plan-row plan-node" style={{ paddingLeft: indent(i, p) }}>
                <span style={{ flex: 1 }}><span className="muted">{i.number}</span> {i.name}</span>
                {i.amountSatang > 0 && <span className="num small muted">{formatBaht(i.amountSatang)}</span>}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <h1>{d.doc.title}</h1>
      <p className="muted small">{n.fund(d.doc.fundingSourceId)} ปีงบประมาณ {d.doc.fiscalYear} งวดที่ {d.doc.round}{d.doc.docNo && ` หนังสือ ${d.doc.docNo}`} รวม {formatBaht(d.doc.totalSatang)} บาท</p>
      <div className="notice notice-info">ติ๊กเลือกกิจกรรมย่อยที่กลุ่มงานรับผิดชอบ แล้วกด "บันทึกผู้รับผิดชอบ" ระบบจะสร้างโครงการและงบประมาณให้ทันที กิจกรรมหลักเดียวกันหลายกลุ่มเลือกได้ แต่กิจกรรมย่อยแต่ละรายการมีผู้รับผิดชอบได้กลุ่มเดียว</div>
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="แสดงรายการ">
          <button aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>ยังไม่มีผู้รับผิดชอบ ({leaves.filter((i) => !i.workgroupId).length})</button>
          <button aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>{user.workgroupIds === null ? 'มีผู้รับผิดชอบแล้ว' : 'ของกลุ่มฉัน'} ({leaves.filter(mine).length})</button>
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด ({leaves.length})</button>
        </div>
        <label className="field" style={{ flex: '1 1 220px' }}><span className="sr-only">ค้นหา</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโครงการหรือกิจกรรม" /></label>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(new Set(projects.map((p) => p.seq)))}>เปิดทั้งหมด</button>
      </div>
      {error && <ErrorBox error={error} />}
      {plans.length === 0 && <Empty title="ไม่มีรายการตามตัวกรองนี้" />}
      {plans.map((pl) => (
        <section key={pl.id} className="section" style={{ marginTop: 'var(--s5)' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>{pl.name}</h2>
          <ul className="plan-list panel" style={{ padding: 0 }}>{projects.filter((p) => p.planIndex === pl.planIndex).map(projectBlock)}</ul>
        </section>
      ))}
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

function indent(i: PlanItem, project: PlanItem): string {
  return `calc(var(--s4) + ${Math.max(0, i.depth - project.depth - 1) * 18}px)`;
}
