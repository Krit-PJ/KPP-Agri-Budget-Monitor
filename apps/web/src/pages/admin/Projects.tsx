import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeKey, type SessionUser } from '@kpp/domain';
import { ApiError, call, newKey } from '../../api/client';
import {
  Async, Baht, bahtInputToSatang, Empty, ErrorBox, MiniStrip, Pct, RiskBadges, Sheet, StatusBadge, useApi, useLookups, useNames, useSubmit, useToast,
} from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';

export default function ProjectsAdmin({ user }: { user: SessionUser }) {
  const l = useLookups();
  const n = useNames();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const s = useApi('projects.list', { fiscalYear: fy }, [fy]);
  const rows = useMemo(() => {
    const k = normalizeKey(q);
    return (s.data ?? []).filter((p) => !k || normalizeKey(`${p.projectCode}${p.name}`).includes(k));
  }, [s.data, q]);
  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>รายโครงการ</h1>
          <p className="small muted" style={{ margin: 0 }}>โครงการ › กิจกรรม › พื้นที่ดำเนินการ — เปิดโครงการเพื่อดูรายละเอียดและผลการดำเนินงาน (บันทึกการเบิกจ่ายที่เมนู &ldquo;บันทึกผลการเบิกจ่าย&rdquo;)</p>
        </div>
        <div className="btn-row">
          <Link className="btn btn-ghost" to="/admin/plans">บันทึกแผนงานและผู้รับผิดชอบ</Link>
          <button className="btn btn-ghost" onClick={() => setOpen(true)}>เพิ่มโครงการนอกแผน</button>
        </div>
      </div>
      <div className="toolbar">
        <FiscalYearPicker value={fy} onChange={setFy} />
        <label className="field" style={{ flex: '1 1 240px' }}><span>ค้นหา</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="รหัสหรือชื่อโครงการ" />
        </label>
      </div>
      <Async s={s}>
        {() => rows.length ? (
          <table className="data stack">
            <thead><tr><th>โครงการ</th><th>แหล่งงบ</th><th className="r">งบประมาณ</th><th className="r">คงเหลือ</th><th>เบิกจ่าย</th><th>สถานะ</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="primary"><Link to={`/admin/projects/${p.id}`}>{p.name}</Link><div className="xs muted">{p.projectCode} {n.group(p.workgroupId)}{!p.published && ' (ไม่เผยแพร่)'}</div></td>
                  <td data-label="แหล่งงบ">{n.fundShort(p.fundingSourceId)}</td>
                  <td data-label="งบประมาณ" className="r"><Baht v={p.budget.currentBudget} /></td>
                  <td data-label="คงเหลือ" className="r" style={{ color: p.budget.remaining < 0 ? 'var(--clay)' : undefined }}><Baht v={p.budget.remaining} /></td>
                  <td data-label="เบิกจ่าย" style={{ minWidth: 130 }}><Pct v={p.budget.spendingPct} /><MiniStrip b={p.budget} /></td>
                  <td data-label="สถานะ"><StatusBadge s={p.status} /> <RiskBadges flags={p.risks} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title={`ยังไม่มีโครงการในปีงบ ${fy}`}>
            <p>เริ่มจากเลือกกิจกรรมที่กลุ่มงานรับผิดชอบในแผนงบประมาณ ระบบจะสร้างโครงการและงบให้อัตโนมัติ</p>
            <div className="btn-row"><Link className="btn" to="/admin/plans">ไปที่บันทึกแผนงานและผู้รับผิดชอบ</Link><button className="btn btn-ghost" onClick={() => setOpen(true)}>เพิ่มโครงการนอกแผน</button></div>
          </Empty>
        )}
      </Async>
      <Sheet open={open} title="เพิ่มโครงการนอกแผน" onClose={() => setOpen(false)}>
        <NewProjectForm user={user} fy={fy} onDone={() => { setOpen(false); s.reload(); }} />
      </Sheet>
    </>
  );
}

function NewProjectForm({ user, fy, onDone }: { user: SessionUser; fy: number; onDone: () => void }) {
  const l = useLookups();
  const nav = useNavigate();
  const toast = useToast();
  const groups = l.workgroups.filter((g) => user.workgroupIds === null || user.workgroupIds.includes(g.id));
  const [key] = useState(() => newKey('proj'));
  const [f, setF] = useState({
    fiscalYear: fy, fundingSourceId: '', workgroupId: groups.length === 1 ? groups[0].id : '', projectCode: '', name: '',
    budget: '', startDate: '', endDate: '', ownerName: '', published: true,
  });
  const { busy, error, run, setError } = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const satang = f.budget ? bahtInputToSatang(f.budget) : 0;
    if (satang === null) {
      setError(new ApiError('VALIDATION_FAILED', 'จำนวนเงินไม่ถูกต้อง'));
      return;
    }
    void run(async () => {
      const p = await call('projects.create', {
        idempotencyKey: key, fiscalYear: Number(f.fiscalYear), fundingSourceId: f.fundingSourceId, workgroupId: f.workgroupId,
        projectCode: f.projectCode, name: f.name, startDate: f.startDate, endDate: f.endDate, ownerName: f.ownerName,
        published: f.published, originalBudgetSatang: satang || undefined, status: 'PLANNED',
      });
      toast('เพิ่มโครงการแล้ว');
      onDone();
      nav(`/admin/projects/${p.id}`);
    });
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit}>
      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        <label className="field wide"><span className="req">ชื่อโครงการ</span><input value={f.name} onChange={set('name')} required /></label>
        <label className="field"><span className="req">รหัสโครงการ</span><input value={f.projectCode} onChange={set('projectCode')} required /></label>
        <label className="field"><span className="req">แหล่งงบ</span>
          <select value={f.fundingSourceId} onChange={set('fundingSourceId')} required>
            <option value="">เลือก</option>
            {l.fundingSources.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="field"><span className="req">กลุ่มงาน</span>
          <select value={f.workgroupId} onChange={set('workgroupId')} required>
            <option value="">เลือก</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>ปีงบประมาณ</span>
          <select value={f.fiscalYear} onChange={set('fiscalYear')}>{l.fiscalYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <label className="field"><span>งบที่ได้รับจัดสรร (บาท)</span><input inputMode="decimal" value={f.budget} onChange={set('budget')} placeholder="เช่น 1,250,000" /></label>
        <label className="field"><span>ผู้รับผิดชอบ</span><input value={f.ownerName} onChange={set('ownerName')} /><span className="hint">ไม่แสดงต่อสาธารณะ</span></label>
        <label className="field"><span>วันเริ่มต้น</span><input type="date" value={f.startDate} onChange={set('startDate')} /></label>
        <label className="field"><span>วันสิ้นสุด</span><input type="date" value={f.endDate} onChange={set('endDate')} /></label>
        <label className="field wide" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
          <span>เผยแพร่บนหน้าสาธารณะ</span>
        </label>
      </div>
      <div className="btn-row" style={{ marginTop: 'var(--s5)' }}>
        <button className="btn" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'เพิ่มโครงการ'}</button>
      </div>
    </form>
  );
}
