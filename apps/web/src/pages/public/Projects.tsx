import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeKey, PROJECT_STATUSES, PROJECT_STATUS_LABEL, type ProjectStatus } from '@kpp/domain';
import { Async, Baht, Empty, MiniStrip, Pct, RiskBadges, StatusBadge, useApi, useLookups, useNames } from '../../components/ui';
import { FiscalYearPicker } from './Home';

type Sort = 'code' | 'budget' | 'spending' | 'risk';

export default function Projects() {
  const l = useLookups();
  const n = useNames();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [q, setQ] = useState('');
  const [fund, setFund] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [sort, setSort] = useState<Sort>('code');
  const s = useApi('public.projects', { fiscalYear: fy }, [fy]);

  const rows = useMemo(() => {
    const key = normalizeKey(q);
    const list = (s.data ?? []).filter((p) =>
      (!key || normalizeKey(`${p.projectCode}${p.name}`).includes(key)) &&
      (!fund || p.fundingSourceId === fund) && (!group || p.workgroupId === group) && (!status || p.status === status));
    const by: Record<Sort, (a: typeof list[0], b: typeof list[0]) => number> = {
      code: (a, b) => a.projectCode.localeCompare(b.projectCode, 'th'),
      budget: (a, b) => b.budget.currentBudget - a.budget.currentBudget,
      spending: (a, b) => a.budget.spendingPct - b.budget.spendingPct,
      risk: (a, b) => b.risks.length - a.risks.length,
    };
    return [...list].sort(by[sort]);
  }, [s.data, q, fund, group, status, sort]);

  return (
    <>
      <h1>โครงการ</h1>
      <div className="toolbar" role="search">
        <FiscalYearPicker value={fy} onChange={setFy} />
        <label className="field" style={{ flex: '1 1 220px' }}>
          <span>ค้นหา</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="รหัสหรือชื่อโครงการ" />
        </label>
        <label className="field"><span>แหล่งงบ</span>
          <select value={fund} onChange={(e) => setFund(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="field"><span>กลุ่มงาน</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {l.workgroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>สถานะ</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}>
            <option value="">ทั้งหมด</option>
            {PROJECT_STATUSES.map((st) => <option key={st} value={st}>{PROJECT_STATUS_LABEL[st]}</option>)}
          </select>
        </label>
        <label className="field"><span>เรียงตาม</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="code">รหัสโครงการ</option>
            <option value="budget">งบประมาณมากไปน้อย</option>
            <option value="spending">เบิกจ่ายน้อยไปมาก</option>
            <option value="risk">ต้องติดตามก่อน</option>
          </select>
        </label>
      </div>
      <Async s={s}>
        {() => rows.length ? (
          <div className="table-wrap">
            <p className="small muted" aria-live="polite">พบ {rows.length} โครงการ</p>
            <table className="data stack">
              <thead>
                <tr><th>โครงการ</th><th>แหล่งงบ</th><th>กลุ่มงาน</th><th className="r">งบประมาณ (บาท)</th><th>การเบิกจ่าย</th><th className="r">ผลงาน</th><th>สถานะ</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="primary"><Link to={`/projects/${p.id}`}>{p.name}</Link><div className="xs muted">{p.projectCode}</div></td>
                    <td data-label="แหล่งงบ">{n.fundShort(p.fundingSourceId)}</td>
                    <td data-label="กลุ่มงาน">{n.group(p.workgroupId)}</td>
                    <td data-label="งบประมาณ" className="r"><Baht v={p.budget.currentBudget} /></td>
                    <td data-label="เบิกจ่าย" style={{ minWidth: 140 }}><Pct v={p.budget.spendingPct} /><MiniStrip b={p.budget} /></td>
                    <td data-label="ผลการดำเนินงาน" className="r"><Pct v={p.physicalProgress} /></td>
                    <td data-label="สถานะ"><StatusBadge s={p.status} /> <RiskBadges flags={p.risks} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="ไม่พบโครงการตามเงื่อนไข"><p>ลองล้างคำค้นหาหรือเปลี่ยนตัวกรอง</p></Empty>}
      </Async>
    </>
  );
}
