import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ALLOCATION_TYPE_LABEL, areaName, areaSummary, DISBURSEMENT_STATUS_LABEL, formatThaiDate, formatThaiDateTime, PROJECT_STATUSES, PROJECT_STATUS_LABEL,
  todayBangkok, type AllocationType, type Disbursement, type ProjectDetail as Detail, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, newKey } from '../../api/client';
import {
  Async, auditLabel, Baht, bahtInputToSatang, BudgetStrip, Empty, ErrorBox, Pct, PlanVsActual, RiskBadges, Sheet, StatusBadge,
  useApi, useNames, useSubmit, useToast,
  useLookups,
} from '../../components/ui';
import { monthsElapsed } from '../public/Home';
import DisbursementForm from './DisbursementForm';

const TABS = ['ภาพรวม', 'กิจกรรม', 'งบประมาณ', 'เบิกจ่าย', 'ผลการดำเนินงาน', 'เอกสาร', 'ประวัติแก้ไข'] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetail({ user }: { user: SessionUser }) {
  const { id = '' } = useParams();
  const s = useApi('projects.get', { id }, [id]);
  const [tab, setTab] = useState<Tab>('ภาพรวม');
  return (
    <Async s={s} lines={8}>
      {(d) => (
        <>
          <p className="small"><Link to="/admin/projects">กลับไปรายการโครงการ</Link></p>
          <h1>{d.project.name}</h1>
          <p className="muted small">{d.project.projectCode} ปีงบ {d.project.fiscalYear} <StatusBadge s={d.project.status} /> <RiskBadges flags={d.risks} /></p>
          <div className="tabs" role="tablist" aria-label="ข้อมูลโครงการ">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div role="tabpanel" aria-label={tab}>
            {tab === 'ภาพรวม' && <OverviewTab d={d} reload={s.reload} />}
            {tab === 'กิจกรรม' && <ActivitiesTab d={d} reload={s.reload} />}
            {tab === 'งบประมาณ' && <BudgetTab d={d} reload={s.reload} user={user} />}
            {tab === 'เบิกจ่าย' && <DisbursementsTab d={d} reload={s.reload} user={user} />}
            {tab === 'ผลการดำเนินงาน' && <ProgressTab d={d} reload={s.reload} />}
            {tab === 'เอกสาร' && <FilesTab d={d} />}
            {tab === 'ประวัติแก้ไข' && <AuditTab d={d} />}
          </div>
        </>
      )}
    </Async>
  );
}

function OverviewTab({ d, reload }: { d: Detail; reload: () => void }) {
  const n = useNames();
  const toast = useToast();
  const m = monthsElapsed(d.project.fiscalYear);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ ...d.project });
  const { busy, error, run } = useSubmit();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('projects.update', {
        id: d.project.id, version: d.project.version,
        patch: { name: f.name, projectCode: f.projectCode, ownerName: f.ownerName, startDate: f.startDate, endDate: f.endDate, status: f.status, description: f.description, quarterTargets: f.quarterTargets, published: f.published },
      });
      toast('บันทึกการแก้ไขแล้ว');
      setEdit(false);
      reload();
    });
  };
  return (
    <>
      <div className="strip-wrap" style={{ marginBottom: 'var(--s5)' }}>
        <div className="strip-figures">
          <div className="strip-big"><Pct v={d.budget.spendingPct} /><small>เบิกจ่าย</small></div>
          <div className="stat"><span className="v"><Baht v={d.budget.currentBudget} /></span><span className="l">งบหลังโอนเปลี่ยนแปลง</span></div>
          <div className="stat"><span className="v"><Baht v={d.budget.remaining} /></span><span className="l">คงเหลือ</span></div>
          <div className="stat"><span className="v"><Pct v={d.project.physicalProgress} /></span><span className="l">ผลการดำเนินงาน</span></div>
        </div>
        <BudgetStrip b={d.budget} targetPct={m ? d.monthly.targetPct[m - 1] : undefined} />
      </div>
      <div className="grid grid-2">
        <section className="panel">
          <div className="section-head"><h2 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>ข้อมูลโครงการ</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => { setF({ ...d.project }); setEdit(true); }}>แก้ไข</button>
          </div>
          <dl className="kv">
            <dt>แหล่งงบ</dt><dd>{n.fund(d.project.fundingSourceId)}</dd>
            <dt>กลุ่มงาน</dt><dd>{n.group(d.project.workgroupId)}</dd>
            <dt>ผู้รับผิดชอบ</dt><dd>{d.project.ownerName || '–'}</dd>
            <dt>ระยะเวลา</dt><dd>{formatThaiDate(d.project.startDate)} ถึง {formatThaiDate(d.project.endDate)}</dd>
            <dt>เป้าหมายเบิกจ่ายรายไตรมาส</dt><dd>{d.project.quarterTargets.split(',').map((x) => `${x}%`).join(', ')}</dd>
            <dt>หน้าสาธารณะ</dt><dd>{d.project.published ? 'เผยแพร่' : 'ไม่เผยแพร่'}</dd>
          </dl>
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>เบิกจ่ายสะสมเทียบแผน</h2>
          <PlanVsActual cumulative={d.monthly.disbursedCumulative} targetPct={d.monthly.targetPct} budget={d.budget.currentBudget} upToMonth={m} />
        </section>
      </div>
      <Sheet open={edit} title="แก้ไขข้อมูลโครงการ" onClose={() => setEdit(false)}>
        <form onSubmit={save}>
          {error && <ErrorBox error={error} onRetry={error.code === 'VERSION_CONFLICT' ? () => { setEdit(false); reload(); } : undefined} />}
          <div className="form-grid">
            <label className="field wide"><span>ชื่อโครงการ</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="field"><span>รหัสโครงการ</span><input value={f.projectCode} onChange={(e) => setF({ ...f, projectCode: e.target.value })} /></label>
            <label className="field"><span>สถานะ</span>
              <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as typeof f.status })}>
                {PROJECT_STATUSES.map((x) => <option key={x} value={x}>{PROJECT_STATUS_LABEL[x]}</option>)}
              </select>
            </label>
            <label className="field"><span>ผู้รับผิดชอบ</span><input value={f.ownerName} onChange={(e) => setF({ ...f, ownerName: e.target.value })} /></label>
            <label className="field"><span>เป้าหมายรายไตรมาส (%)</span><input value={f.quarterTargets} onChange={(e) => setF({ ...f, quarterTargets: e.target.value })} /><span className="hint">4 ค่าคั่นด้วยจุลภาค เช่น 30,55,80,100</span></label>
            <label className="field"><span>วันเริ่มต้น</span><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
            <label className="field"><span>วันสิ้นสุด</span><input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></label>
            <label className="field wide"><span>รายละเอียด (แสดงบนหน้าสาธารณะ)</span><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label className="field wide" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
              <span>เผยแพร่บนหน้าสาธารณะ</span>
            </label>
          </div>
          <button className="btn" style={{ marginTop: 'var(--s4)' }} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
        </form>
      </Sheet>
    </>
  );
}

function ActivitiesTab({ d, reload }: { d: Detail; reload: () => void }) {
  const l = useLookups();
  const [name, setName] = useState('');
  const [key, setKey] = useState(() => newKey('act'));
  const { busy, error, run } = useSubmit();
  const add = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('activities.create', { projectId: d.project.id, name, idempotencyKey: key });
      setName('');
      setKey(newKey('act'));
      reload();
    });
  };
  return (
    <>
      <form onSubmit={add} className="toolbar">
        <label className="field" style={{ flex: '1 1 260px' }}><span>เพิ่มกิจกรรม</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อกิจกรรม" required /></label>
        <button className="btn" disabled={busy || !name}>เพิ่มกิจกรรม</button>
      </form>
      {error && <ErrorBox error={error} />}
      {d.activities.length ? (
        <table className="data stack">
          <thead><tr><th>กิจกรรม</th><th className="r">เป้าหมาย</th><th className="r">งบประมาณ</th><th className="r">เบิกจ่าย</th><th className="r">ผลงาน</th><th>สถานะ</th></tr></thead>
          <tbody>
            {d.activities.map((a) => (
              <tr key={a.id}>
                <td className="primary">
                  {a.name}
                  <div className="xs muted">
                    {a.planItemId ? `แผน: ${a.activityCode}` : a.activityCode}
                    {' · '}{areaSummary(a.units.map((u) => u.unitId), l.units)}
                  </div>
                </td>
                <td data-label="เป้าหมาย" className="r">{a.targetQty ? `${a.targetQty.toLocaleString('th-TH')} ${a.unit}` : '–'}</td>
                <td data-label="งบประมาณ" className="r"><Baht v={a.budget.currentBudget} /></td>
                <td data-label="เบิกจ่าย" className="r"><Baht v={a.budget.disbursed} /></td>
                <td data-label="ผลงาน" className="r"><Pct v={a.progressPct} /></td>
                <td data-label="สถานะ"><StatusBadge s={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty title="ยังไม่มีกิจกรรม"><p>โครงการที่ไม่แยกกิจกรรม บันทึกงบและการเบิกจ่ายที่ระดับโครงการได้เลย</p></Empty>}
    </>
  );
}

function BudgetTab({ d, reload, user }: { d: Detail; reload: () => void; user: SessionUser }) {
  const toast = useToast();
  const [type, setType] = useState<AllocationType>(d.budget.originalBudget ? 'TRANSFER_IN' : 'ORIGINAL');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [activityId, setActivityId] = useState('');
  const [key, setKey] = useState(() => newKey('alloc'));
  const { busy, error, run, setError } = useSubmit();
  const add = (e: FormEvent) => {
    e.preventDefault();
    const satang = bahtInputToSatang(amount);
    if (!satang) return setError(new ApiError('VALIDATION_FAILED', 'กรอกจำนวนเงินเป็นตัวเลข เช่น 150000 หรือ 150,000.50'));
    void run(async () => {
      await call('allocations.create', { projectId: d.project.id, activityId: activityId || undefined, type, amountSatang: satang, note, idempotencyKey: key });
      toast(`บันทึก${ALLOCATION_TYPE_LABEL[type]}แล้ว`);
      setAmount(''); setNote(''); setKey(newKey('alloc'));
      reload();
    });
  };
  const voidIt = (id: string) => {
    const reason = window.prompt('เหตุผลการยกเลิกรายการงบนี้');
    if (!reason) return;
    void run(async () => { await call('allocations.void', { id, reason }); reload(); });
  };
  return (
    <>
      <dl className="kv panel" style={{ marginBottom: 'var(--s5)' }}>
        <dt>งบที่ได้รับจัดสรร</dt><dd><Baht v={d.budget.originalBudget} /></dd>
        <dt>โอนเพิ่ม</dt><dd><Baht v={d.budget.transferIn} /></dd>
        <dt>โอนลด</dt><dd><Baht v={d.budget.transferOut} /></dd>
        <dt><strong>งบหลังโอนเปลี่ยนแปลง</strong></dt><dd><strong><Baht v={d.budget.currentBudget} /></strong></dd>
      </dl>
      <form onSubmit={add} className="panel">
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>บันทึกงบประมาณ</h2>
        {error && <ErrorBox error={error} />}
        <div className="form-grid">
          <label className="field"><span>ประเภท</span>
            <select value={type} onChange={(e) => setType(e.target.value as AllocationType)}>
              {(Object.keys(ALLOCATION_TYPE_LABEL) as AllocationType[]).map((t) => <option key={t} value={t}>{ALLOCATION_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="field"><span className="req">จำนวนเงิน (บาท)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
          {!!d.activities.length && (
            <label className="field"><span>กิจกรรม</span>
              <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">ระดับโครงการ</option>
                {d.activities.map((a) => <option key={a.id} value={a.id}>{a.activityCode} {a.name}</option>)}
              </select>
            </label>
          )}
          <label className="field"><span>หมายเหตุ / เลขที่หนังสือ</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <button className="btn" style={{ marginTop: 'var(--s4)' }} disabled={busy}>บันทึก</button>
      </form>
      <h2 className="section" style={{ fontSize: 'var(--fs-lg)' }}>รายการงบประมาณ</h2>
      <table className="data stack">
        <thead><tr><th>วันที่</th><th>ประเภท</th><th className="r">จำนวนเงิน</th><th>หมายเหตุ</th><th /></tr></thead>
        <tbody>
          {d.allocations.map((a) => (
            <tr key={a.id} style={a.isDeleted ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
              <td className="primary">{formatThaiDate(a.date)}</td>
              <td data-label="ประเภท">{ALLOCATION_TYPE_LABEL[a.type]}</td>
              <td data-label="จำนวนเงิน" className="r"><Baht v={a.amountSatang} /></td>
              <td data-label="หมายเหตุ">{a.note}{a.source.startsWith('IMPORT') && <span className="badge" style={{ marginLeft: 6 }}>นำเข้า</span>}</td>
              <td>{user.role === 'superadmin' && !a.isDeleted && <button className="btn btn-ghost btn-sm" onClick={() => voidIt(a.id)}>ยกเลิก</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DisbursementsTab({ d, reload, user }: { d: Detail; reload: () => void; user: SessionUser }) {
  const l = useLookups();
  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState<Disbursement | null>(null);
  const { error, run } = useSubmit();
  const advance = (x: Disbursement) => void run(async () => {
    await call('disbursements.setStatus', { id: x.id, version: x.version, status: x.status === 'COMMITTED' ? 'APPROVED' : 'PAID' });
    reload();
  });
  return (
    <>
      <div className="section-head">
        <p className="muted" style={{ margin: 0 }}>เบิกจ่ายแล้ว <Baht v={d.budget.disbursed} /> บาท จ่ายแล้วจริง <Baht v={d.budget.paid} /> บาท คงเหลือ <Baht v={d.budget.remaining} /> บาท</p>
        <button className="btn" onClick={() => setOpen(true)}>บันทึกการเบิกจ่าย</button>
      </div>
      {error && <ErrorBox error={error} />}
      {d.disbursements.length ? (
        <table className="data stack">
          <thead><tr><th>วันที่</th><th>รายการ</th><th className="r">จำนวนเงิน</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {d.disbursements.map((x) => (
              <tr key={x.id} style={x.status === 'VOID' ? { opacity: 0.55 } : undefined}>
                <td className="primary">{formatThaiDate(x.date)}{x.unitId && <div className="xs muted">{areaName(l.units.find((u) => u.id === x.unitId))}</div>}</td>
                <td data-label="รายการ">
                  {x.description || '–'}
                  <div className="xs muted">
                    {x.docNo && `เลขที่ ${x.docNo} `}{x.attachmentId && 'มีหนังสือปะหน้า '}{x.source.startsWith('ADJUST') && 'ปรับยอดจากไฟล์นำเข้า '}
                    {x.voidReason && `ยกเลิก: ${x.voidReason}`}
                  </div>
                </td>
                <td data-label="จำนวนเงิน" className="r" style={x.status === 'VOID' ? { textDecoration: 'line-through' } : undefined}><Baht v={x.amountSatang} /></td>
                <td data-label="สถานะ"><span className={`badge ${x.status === 'PAID' ? 'b-ok' : x.status === 'VOID' ? '' : 'b-run'}`}>{DISBURSEMENT_STATUS_LABEL[x.status]}</span></td>
                <td>
                  <div className="btn-row">
                    {(x.status === 'COMMITTED' || x.status === 'APPROVED') && <button className="btn btn-ghost btn-sm" onClick={() => advance(x)}>{x.status === 'COMMITTED' ? 'อนุมัติเบิก' : 'จ่ายแล้ว'}</button>}
                    {x.status !== 'VOID' && (x.status === 'COMMITTED' || user.role === 'superadmin') && <button className="btn btn-ghost btn-sm" onClick={() => setVoiding(x)}>ยกเลิก/แก้ไข</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Empty title="ยังไม่มีรายการเบิกจ่าย"><p>บันทึกทีละรายการ แนบรูปหนังสือปะหน้าเพื่อให้ระบบกรอกข้อมูลให้ หรือนำเข้าจากไฟล์</p></Empty>}
      <Sheet open={open} title="บันทึกการเบิกจ่าย" onClose={() => setOpen(false)}>
        <DisbursementForm d={d} user={user} onDone={() => { setOpen(false); reload(); }} />
      </Sheet>
      <Sheet open={!!voiding} title="ยกเลิกหรือแก้ไขรายการ" onClose={() => setVoiding(null)}>
        {voiding && <VoidForm x={voiding} onDone={() => { setVoiding(null); reload(); }} />}
      </Sheet>
    </>
  );
}

function VoidForm({ x, onDone }: { x: Disbursement; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [replace, setReplace] = useState(false);
  const [amount, setAmount] = useState(String(x.amountSatang / 100));
  const [date, setDate] = useState(x.date);
  const { busy, error, run, setError } = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const satang = bahtInputToSatang(amount);
    if (replace && !satang) return setError(new ApiError('VALIDATION_FAILED', 'จำนวนเงินไม่ถูกต้อง'));
    void run(async () => {
      await call('disbursements.void', { id: x.id, reason, replacement: replace ? { amountSatang: satang!, date, docNo: x.docNo, description: x.description, status: x.status === 'VOID' ? 'APPROVED' : x.status } : undefined });
      toast(replace ? 'ยกเลิกรายการเดิมและบันทึกรายการใหม่แล้ว' : 'ยกเลิกรายการแล้ว');
      onDone();
    });
  };
  return (
    <form onSubmit={submit}>
      <div className="notice notice-info">ระบบไม่แก้จำนวนเงินของรายการเดิม แต่จะยกเลิกรายการเดิมและบันทึกรายการใหม่แทน เพื่อให้ตรวจสอบย้อนหลังได้</div>
      {error && <ErrorBox error={error} />}
      <label className="field"><span className="req">เหตุผล</span><input value={reason} onChange={(e) => setReason(e.target.value)} required /></label>
      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'var(--s3)' }}>
        <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        <span>บันทึกรายการใหม่ที่ถูกต้องแทน</span>
      </label>
      {replace && (
        <div className="form-grid" style={{ marginTop: 'var(--s3)' }}>
          <label className="field"><span>จำนวนเงินที่ถูกต้อง (บาท)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label className="field"><span>วันที่</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayBangkok()} /></label>
        </div>
      )}
      <button className="btn btn-danger" style={{ marginTop: 'var(--s4)' }} disabled={busy || reason.length < 3}>{replace ? 'ยกเลิกและบันทึกใหม่' : 'ยกเลิกรายการ'}</button>
    </form>
  );
}

function ProgressTab({ d, reload }: { d: Detail; reload: () => void }) {
  const toast = useToast();
  const [pct, setPct] = useState(String(d.project.physicalProgress || ''));
  const [activityId, setActivityId] = useState('');
  const [detail, setDetail] = useState('');
  const [issues, setIssues] = useState('');
  const [key, setKey] = useState(() => newKey('prog'));
  const { busy, error, run } = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('progress.create', { projectId: d.project.id, activityId: activityId || undefined, progressPct: Number(pct), detail, issues, idempotencyKey: key });
      toast('บันทึกผลการดำเนินงานแล้ว');
      setDetail(''); setIssues(''); setKey(newKey('prog'));
      reload();
    });
  };
  return (
    <>
      <form onSubmit={submit} className="panel">
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>รายงานผลการดำเนินงาน</h2>
        {error && <ErrorBox error={error} />}
        <div className="form-grid">
          {!!d.activities.length && (
            <label className="field"><span>กิจกรรม</span>
              <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">ทั้งโครงการ</option>
                {d.activities.map((a) => <option key={a.id} value={a.id}>{a.activityCode} {a.name}</option>)}
              </select>
            </label>
          )}
          <label className="field"><span className="req">ความก้าวหน้า (%)</span><input type="number" min={0} max={100} step="1" value={pct} onChange={(e) => setPct(e.target.value)} required /></label>
          <label className="field wide"><span>ผลที่ได้</span><textarea value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
          <label className="field wide"><span>ปัญหาอุปสรรค</span><textarea value={issues} onChange={(e) => setIssues(e.target.value)} /></label>
        </div>
        <p className="hint">ระบบคำนวณความก้าวหน้าของโครงการจากกิจกรรมให้อัตโนมัติ และเปลี่ยนสถานะเป็นเสร็จสิ้นเมื่อถึง 100%</p>
        <button className="btn" disabled={busy || pct === ''}>บันทึกผล</button>
      </form>
      <ul className="row-list section">
        {d.progress.map((r) => (
          <li key={r.id}>
            <strong><Pct v={r.progressPct} /></strong> <span className="muted small">{formatThaiDate(r.reportDate)}</span>
            {r.detail && <p className="small" style={{ margin: '4px 0 0' }}>{r.detail}</p>}
            {r.issues && <p className="small" style={{ margin: '4px 0 0', color: 'var(--clay)' }}>ปัญหา: {r.issues}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

function FilesTab({ d }: { d: Detail }) {
  return d.attachments.length ? (
    <table className="data stack">
      <thead><tr><th>ไฟล์</th><th>ประเภท</th><th>ขนาด</th><th>วันที่แนบ</th></tr></thead>
      <tbody>
        {d.attachments.map((f) => (
          <tr key={f.id}>
            <td className="primary">{f.fileName}</td>
            <td data-label="ประเภท">{f.kind === 'COVER_LETTER' ? 'หนังสือปะหน้านำส่ง' : 'หลักฐาน'}</td>
            <td data-label="ขนาด">{(f.sizeBytes / 1024).toFixed(0)} KB</td>
            <td data-label="วันที่แนบ">{formatThaiDateTime(f.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : <Empty title="ยังไม่มีเอกสาร"><p>แนบรูปหนังสือปะหน้าได้ตอนบันทึกการเบิกจ่าย ไฟล์เก็บใน Google Drive ของสำนักงานและไม่เผยแพร่สาธารณะ</p></Empty>;
}

function AuditTab({ d }: { d: Detail }) {
  return (
    <ul className="row-list">
      {d.audit.map((a) => (
        <li key={a.id} className="small">
          <strong>{auditLabel(a.action)}</strong> โดย {a.actorName} <span className="muted">{formatThaiDateTime(a.at)}</span>
          {a.reason && <div className="muted">เหตุผล: {a.reason}</div>}
        </li>
      ))}
      {!d.audit.length && <li className="muted">ยังไม่มีประวัติ</li>}
    </ul>
  );
}
