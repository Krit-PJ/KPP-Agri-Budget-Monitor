import { Link, useParams } from 'react-router-dom';
import { formatThaiDate } from '@kpp/domain';
import { Async, Baht, BudgetStrip, Pct, PlanVsActual, RiskBadges, StatusBadge, useApi, useNames } from '../../components/ui';
import { monthsElapsed } from './Home';

export default function PublicProject() {
  const { id = '' } = useParams();
  const n = useNames();
  const s = useApi('public.project', { id }, [id]);
  return (
    <Async s={s} lines={8}>
      {(p) => {
        const m = monthsElapsed(p.fiscalYear);
        return (
          <article>
            <p className="small"><Link to="/projects">กลับไปรายการโครงการ</Link></p>
            <h1>{p.name}</h1>
            <p className="muted">
              รหัส {p.projectCode} ปีงบประมาณ {p.fiscalYear} {n.fund(p.fundingSourceId)} โดย{n.group(p.workgroupId)}
            </p>
            <p><StatusBadge s={p.status} /> <RiskBadges flags={p.risks} /></p>
            <div className="strip-wrap" style={{ margin: 'var(--s5) 0' }}>
              <div className="strip-figures">
                <div className="strip-big num"><Pct v={p.budget.spendingPct} /><small>เบิกจ่ายแล้ว</small></div>
                <div className="stat"><span className="v"><Baht v={p.budget.currentBudget} /></span><span className="l">งบประมาณหลังโอนเปลี่ยนแปลง (บาท)</span></div>
                <div className="stat"><span className="v"><Pct v={p.physicalProgress} /></span><span className="l">ผลการดำเนินงาน</span></div>
              </div>
              <BudgetStrip b={p.budget} targetPct={p.monthly && m ? p.monthly.targetPct[m - 1] : undefined} />
            </div>
            {p.description && <p style={{ maxWidth: '70ch' }}>{p.description}</p>}
            <dl className="kv">
              <dt>ระยะเวลา</dt><dd>{formatThaiDate(p.startDate)} ถึง {formatThaiDate(p.endDate)}</dd>
              <dt>งบที่ได้รับจัดสรร</dt><dd><Baht v={p.budget.originalBudget} /> บาท</dd>
              <dt>โอนเพิ่ม / โอนลด</dt><dd><Baht v={p.budget.transferIn} /> / <Baht v={p.budget.transferOut} /> บาท</dd>
              <dt>ผูกพัน</dt><dd><Baht v={p.budget.committed} /> บาท</dd>
              <dt>คงเหลือ</dt><dd><Baht v={p.budget.remaining} /> บาท</dd>
            </dl>
            {p.monthly && (
              <section className="panel section">
                <h2>เบิกจ่ายสะสมเทียบแผน</h2>
                <PlanVsActual cumulative={p.monthly.disbursedCumulative} targetPct={p.monthly.targetPct} budget={p.budget.currentBudget} upToMonth={m} />
              </section>
            )}
            {!!p.activities?.length && (
              <section className="section">
                <h2>กิจกรรม</h2>
                <table className="data stack">
                  <thead><tr><th>กิจกรรม</th><th className="r">งบประมาณ</th><th className="r">เบิกจ่าย</th><th className="r">ผลงาน</th><th>สถานะ</th></tr></thead>
                  <tbody>
                    {p.activities.map((a) => (
                      <tr key={a.id}>
                        <td className="primary">{a.activityCode} {a.name}</td>
                        <td data-label="งบประมาณ" className="r"><Baht v={a.budget.currentBudget} /></td>
                        <td data-label="เบิกจ่าย" className="r"><Baht v={a.budget.disbursed} /></td>
                        <td data-label="ผลงาน" className="r"><Pct v={a.progressPct} /></td>
                        <td data-label="สถานะ"><StatusBadge s={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="small muted">งบประมาณที่บันทึกระดับโครงการจะไม่แสดงในรายการกิจกรรม</p>
              </section>
            )}
          </article>
        );
      }}
    </Async>
  );
}
