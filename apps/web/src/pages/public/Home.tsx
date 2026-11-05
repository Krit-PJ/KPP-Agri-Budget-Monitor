import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fiscalMonthIndex, fiscalYearRange, formatThaiDateTime, RISK_LABEL, todayBangkok } from '@kpp/domain';
import { Async, Baht, BudgetStrip, MiniStrip, Pct, PlanVsActual, useApi, useLookups } from '../../components/ui';

export function FiscalYearPicker({ value, onChange }: { value: number; onChange: (fy: number) => void }) {
  const l = useLookups();
  return (
    <label className="field" style={{ minWidth: 160 }}>
      <span>ปีงบประมาณ</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {l.fiscalYears.map((y) => <option key={y} value={y}>พ.ศ. {y}</option>)}
      </select>
    </label>
  );
}

/** เดือนในปีงบที่ใช้เทียบแผน (ปีที่ผ่านมาแล้ว = ทั้งปี) */
export function monthsElapsed(fy: number): number {
  const today = todayBangkok();
  const { start, end } = fiscalYearRange(fy);
  if (today > end) return 12;
  if (today < start) return 0;
  return fiscalMonthIndex(today);
}

export default function Home() {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const s = useApi('public.summary', { fiscalYear: fy }, [fy]);
  const m = monthsElapsed(fy);
  return (
    <Async s={s} lines={8}>
      {(d) => {
        const target = m ? d.monthly.targetPct[m - 1] : 0;
        return (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-head">
                <div>
                  <h1 id="hero-title">งบประมาณปี {fy} เบิกจ่ายไปแล้ว <span className="num">{d.totals.spendingPct.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%</span></h1>
                  <p className="hero-lede">
                    {d.counts.total} โครงการจาก 3 แหล่งงบ รวมงบหลังโอนเปลี่ยนแปลง <Baht v={d.totals.currentBudget} short /> บาท
                    {m > 0 && target > 0 && (d.totals.spendingPct >= target
                      ? ` ซึ่งเป็นไปตามแผนของเดือนนี้ (${target.toFixed(0)}%)`
                      : ` ต่ำกว่าแผนของเดือนนี้ที่ ${target.toFixed(0)}%`)}
                  </p>
                </div>
                <FiscalYearPicker value={fy} onChange={setFy} />
              </div>
              <div className="strip-wrap">
                <BudgetStrip b={d.totals} targetPct={m ? target : undefined} label={`งบประมาณปี ${fy}`} />
              </div>
            </section>

            <div className="stats-row" style={{ marginTop: 'var(--s5)' }}>
              <div className="stat"><span className="v">{d.counts.inProgress}</span><span className="l">กำลังดำเนินการ</span></div>
              <div className="stat"><span className="v">{d.counts.completed}</span><span className="l">เสร็จสิ้น</span></div>
              <div className="stat"><span className="v">{d.counts.planned}</span><span className="l">ยังไม่เริ่ม</span></div>
              <div className="stat"><span className="v" style={{ color: d.counts.delayed ? 'var(--clay)' : undefined }}>{d.counts.delayed}</span><span className="l">ล่าช้าหรือเบิกจ่ายต่ำกว่าแผน</span></div>
              <div className="stat"><span className="v"><Pct v={d.avgPhysicalProgress} /></span><span className="l">ผลการดำเนินงานเฉลี่ย</span></div>
              <div className="stat"><span className="v"><Baht v={d.totals.paid} short /></span><span className="l">จ่ายแล้วจริง (บาท)</span></div>
            </div>

            <div className="grid grid-2 section">
              <section className="panel" aria-labelledby="by-fund">
                <h2 id="by-fund">แยกตามแหล่งงบ</h2>
                <ul className="row-list">
                  {d.byFundingSource.map((g) => (
                    <li key={g.key} className="fund-row">
                      <span>{g.label} <span className="muted small">({g.projects} โครงการ)</span></span>
                      <span className="num"><Pct v={g.budget.spendingPct} /></span>
                      <MiniStrip b={g.budget} />
                      <span className="small muted">เบิกจ่าย <Baht v={g.budget.disbursed} short /> จาก <Baht v={g.budget.currentBudget} short /> บาท</span>
                    </li>
                  ))}
                  {!d.byFundingSource.length && <li className="muted">ยังไม่มีโครงการในปีงบนี้</li>}
                </ul>
              </section>
              <section className="panel" aria-labelledby="plan">
                <h2 id="plan">เบิกจ่ายสะสมเทียบแผน</h2>
                <PlanVsActual cumulative={d.monthly.disbursedCumulative} targetPct={d.monthly.targetPct} budget={d.totals.currentBudget} upToMonth={m} />
              </section>
            </div>

            <div className="grid grid-2 section">
              <section aria-labelledby="by-group">
                <div className="section-head"><h2 id="by-group">แยกตามกลุ่มงาน</h2></div>
                <div className="panel">
                  <ul className="row-list">
                    {d.byWorkgroup.map((g) => (
                      <li key={g.key} className="fund-row">
                        <span>{g.label} <span className="muted small">({g.projects})</span></span>
                        <span className="num"><Pct v={g.budget.spendingPct} /></span>
                        <MiniStrip b={g.budget} />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
              <section aria-labelledby="risk">
                <div className="section-head">
                  <h2 id="risk">โครงการที่ต้องติดตาม</h2>
                  <Link to="/projects">ดูโครงการทั้งหมด</Link>
                </div>
                <div className="panel">
                  {d.risks.length ? (
                    <ul className="row-list">
                      {d.risks.slice(0, 8).map((r) => (
                        <li key={r.projectId}>
                          <Link to={`/projects/${r.projectId}`}>{r.name}</Link>
                          <div className="small" style={{ color: 'var(--clay)' }}>{r.flags.map((f) => RISK_LABEL[f]).join(', ')}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted">ไม่มีโครงการที่ล่าช้าหรือเกินงบในขณะนี้</p>}
                </div>
              </section>
            </div>

            <p className="small muted section">
              ข้อมูล ณ {formatThaiDateTime(d.generatedAt)}
              {d.dataQuality.lastImportAt && <> นำเข้าข้อมูลล่าสุด {formatThaiDateTime(d.dataQuality.lastImportAt)}</>}.
              {d.dataQuality.projectsWithoutBudget > 0 && <> มี {d.dataQuality.projectsWithoutBudget} โครงการที่ยังไม่บันทึกงบประมาณ.</>}
              {' '}<Link to="/about">อ่านข้อจำกัดของข้อมูล</Link>
            </p>
            <span className="sr-only">แหล่งงบในระบบ: {l.fundingSources.map((f) => f.name).join(', ')}</span>
          </>
        );
      }}
    </Async>
  );
}
