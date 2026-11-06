import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fiscalMonthIndex, fiscalYearRange, formatThaiDate, formatThaiDateTime, RISK_LABEL, todayBangkok, type GroupTotal, type PublicSummary } from '@kpp/domain';
import { Async, Baht, BudgetStrip, BulletBar, Pct, PlanVsActual, useApi, useLookups } from '../../components/ui';

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

function daysUntil(iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(todayBangkok())) / 86400_000);
}

const pct1 = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 });

/** 3 เรื่องที่ต้องรู้: ทันแผนเดือนนี้หรือไม่ / เป้าทั้งปี / กำหนดอบรม-ประชุม (มาตรการเร่งรัดฯ) */
function KeyFacts({ d, fy, target, m }: { d: PublicSummary; fy: number; target: number; m: number }) {
  const t = d.totals;
  const end = fiscalYearRange(fy).end;
  const daysToEnd = daysUntil(end);
  const daysToMeet = daysUntil(d.targets.meetingDeadline);
  const needNow = Math.max(0, Math.round((target / 100) * t.currentBudget) - t.disbursed);
  const needYear = Math.max(0, Math.round((d.targets.annualPct / 100) * t.currentBudget) - t.disbursed);
  const gap = t.spendingPct - target;
  return (
    <div className="facts">
      <div className={`fact ${m && target && gap < 0 ? 'is-behind' : ''}`}>
        <span className="fact-l">เทียบแผนเดือนนี้ ({pct1(target)}%)</span>
        {m && target ? (
          <>
            <span className="fact-v num">{gap >= 0 ? 'ทันแผน' : `ช้ากว่าแผน ${pct1(-gap)}%`}</span>
            <span className="fact-n">{gap >= 0 ? `เบิกจ่ายแล้ว ${pct1(t.spendingPct)}%` : <>ต้องเบิกเพิ่ม <Baht v={needNow} short /> บาท จึงจะทันแผน</>}</span>
          </>
        ) : <span className="fact-n">ยังไม่ถึงช่วงเบิกจ่ายตามแผน</span>}
      </div>
      <div className="fact">
        <span className="fact-l">เป้าทั้งปี {d.targets.annualPct}% ภายใน {formatThaiDate(end)}</span>
        <span className="fact-v num">{needYear > 0 ? <>เหลือ <Baht v={needYear} short /> บาท</> : 'ถึงเป้าแล้ว'}</span>
        <span className="fact-n">{daysToEnd >= 0 ? `อีก ${daysToEnd.toLocaleString('th-TH')} วัน` : 'สิ้นปีงบประมาณแล้ว'}</span>
      </div>
      <div className={`fact ${d.meetings.remaining > 0 && daysToMeet >= 0 && daysToMeet <= 60 ? 'is-behind' : ''}`}>
        <span className="fact-l">อบรม/ประชุม/สัมมนา ต้องเสร็จภายใน {formatThaiDate(d.targets.meetingDeadline)}</span>
        <span className="fact-v num">{d.meetings.remaining > 0 ? <>ยังไม่เบิก <Baht v={d.meetings.remaining} short /> บาท</> : d.meetings.activities ? 'เบิกครบแล้ว' : 'ไม่มีกิจกรรมประเภทนี้'}</span>
        <span className="fact-n">{d.meetings.activities ? `${d.meetings.activities} กิจกรรม` : ''}{daysToMeet >= 0 && d.meetings.remaining > 0 ? ` เหลืออีก ${daysToMeet.toLocaleString('th-TH')} วัน` : ''}</span>
      </div>
    </div>
  );
}

type By = 'group' | 'unit' | 'plan' | 'fund';
const BY_LABEL: Record<By, string> = { group: 'กลุ่มงาน', unit: 'หน่วยดำเนินการ', plan: 'แผนงาน', fund: 'แหล่งงบ' };

/**
 * ตารางผลการเบิกจ่าย: งบ / แผน ณ เดือนนี้ / เบิกจ่าย / ผูกพัน / คงเหลือ / ร้อยละคงเหลือ + แถบเทียบเป้า
 * แถวกลุ่มงานกดเพื่อดูรายหน่วยดำเนินการ (สนง.เกษตรจังหวัด/อำเภอ)
 */
function Breakdown({ d, target }: { d: PublicSummary; target: number }) {
  const [by, setBy] = useState<By>('group');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const planOf = (g: GroupTotal) => g.plan ?? Math.round((target / 100) * g.budget.currentBudget);
  const gap = (g: GroupTotal) => g.budget.disbursed - planOf(g);
  const src = by === 'group' ? d.byWorkgroup : by === 'unit' ? d.byUnit : by === 'plan' ? d.byPlan : d.byFundingSource;
  const rows = by === 'unit' || by === 'fund' ? src : [...src].sort((a, b) => gap(a) / Math.max(1, a.budget.currentBudget) - gap(b) / Math.max(1, b.budget.currentBudget));
  const tot = rows.reduce((a, g) => ({ b: a.b + g.budget.currentBudget, p: a.p + planOf(g), d: a.d + g.budget.disbursed, c: a.c + g.budget.committed, r: a.r + g.budget.remaining }), { b: 0, p: 0, d: 0, c: 0, r: 0 });
  const row = (g: GroupTotal, sub = false, expandable = false) => {
    const plan = planOf(g);
    const isOpen = open.has(g.key);
    const remPct = g.budget.currentBudget ? (g.budget.remaining / g.budget.currentBudget) * 100 : 0;
    const tPct = g.budget.currentBudget ? (plan / g.budget.currentBudget) * 100 : 0;
    return (
      <tr key={(sub ? 'u:' : '') + g.key} className={sub ? 'bd-sub' : expandable ? 'bd-main' : ''}>
        <td className="primary">
          {expandable ? (
            <button className="bd-toggle" aria-expanded={isOpen} onClick={() => setOpen((s0) => { const n = new Set(s0); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
              <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> {g.label}
            </button>
          ) : <span>{g.label}</span>}
          <span className="xs muted"> {g.activities ? `${g.activities} กิจกรรม` : `${g.projects} โครงการ`}</span>
          <BulletBar b={g.budget} targetPct={tPct} />
        </td>
        <td data-label="งบประมาณ" className="r"><Baht v={g.budget.currentBudget} /></td>
        <td data-label="แผน ณ เดือนนี้" className="r"><Baht v={plan} /></td>
        <td data-label="เบิกจ่าย" className="r"><Baht v={g.budget.disbursed} /><div className={`xs ${g.budget.disbursed < plan ? 'bd-behind' : 'muted'}`}><Pct v={g.budget.spendingPct} /></div></td>
        <td data-label="ผูกพัน" className="r"><Baht v={g.budget.committed} /></td>
        <td data-label="คงเหลือ" className="r"><Baht v={g.budget.remaining} /></td>
        <td data-label="% คงเหลือ" className="r"><Pct v={remPct} /></td>
      </tr>
    );
  };
  return (
    <section className="panel section" aria-labelledby="breakdown">
      <div className="section-head" style={{ marginBottom: 'var(--s2)' }}>
        <h2 id="breakdown">ผลการเบิกจ่ายแยกตาม{BY_LABEL[by]}</h2>
        <div className="segmented" role="group" aria-label="แยกตาม">
          {(['group', 'unit', 'plan', 'fund'] as By[]).map((k) => <button key={k} aria-pressed={by === k} onClick={() => setBy(k)}>{BY_LABEL[k]}</button>)}
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {by === 'group' ? 'กดชื่อกลุ่มงานเพื่อดูรายอำเภอ ' : ''}{by === 'group' || by === 'plan' ? 'เรียงจากที่ช้ากว่าแผนมากที่สุด ' : ''}
        ขีดตั้งบนแถบคือแผน ณ เดือนนี้{by === 'unit' && d.activitiesWithoutUnits ? ` — ${d.activitiesWithoutUnits} กิจกรรมยังไม่ได้แบ่งงบให้อำเภอ จึงนับเป็นของสนง.เกษตรจังหวัด` : ''}
      </p>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data stack bd-table">
            <thead><tr><th>{BY_LABEL[by]}</th><th className="r">งบประมาณ</th><th className="r">แผน ณ เดือนนี้</th><th className="r">เบิกจ่าย</th><th className="r">ผูกพัน</th><th className="r">คงเหลือ</th><th className="r">% คงเหลือ</th></tr></thead>
            <tbody>
              {rows.map((g) => [row(g, false, by === 'group' && !!g.units?.length), ...(by === 'group' && open.has(g.key) ? (g.units ?? []).map((u) => row(u, true)) : [])])}
            </tbody>
            <tfoot>
              <tr>
                <td>รวม</td>
                <td data-label="งบประมาณ" className="r"><Baht v={tot.b} /></td>
                <td data-label="แผน ณ เดือนนี้" className="r"><Baht v={tot.p} /></td>
                <td data-label="เบิกจ่าย" className="r"><Baht v={tot.d} /><div className="xs muted"><Pct v={tot.b ? (tot.d / tot.b) * 100 : 0} /></div></td>
                <td data-label="ผูกพัน" className="r"><Baht v={tot.c} /></td>
                <td data-label="คงเหลือ" className="r"><Baht v={tot.r} /></td>
                <td data-label="% คงเหลือ" className="r"><Pct v={tot.b ? (tot.r / tot.b) * 100 : 0} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : <p className="muted">ยังไม่มีโครงการในปีงบนี้</p>}
    </section>
  );
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
        const c = d.counts;
        return (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-head">
                <div>
                  <h1 id="hero-title">งบประมาณปี {fy} เบิกจ่ายไปแล้ว <span className="num">{pct1(d.totals.spendingPct)}%</span></h1>
                  <p className="hero-lede">
                    {c.total} โครงการ งบหลังโอนเปลี่ยนแปลง <Baht v={d.totals.currentBudget} short /> บาท
                    {m > 0 && target > 0 && (d.totals.spendingPct >= target
                      ? ` เป็นไปตามแผนของเดือนนี้ (${target.toFixed(0)}%)`
                      : ` ต่ำกว่าแผนของเดือนนี้ที่ ${target.toFixed(0)}%`)}
                  </p>
                </div>
                <FiscalYearPicker value={fy} onChange={setFy} />
              </div>
              <div className="strip-wrap">
                <BudgetStrip b={d.totals} targetPct={m ? target : undefined} label={`งบประมาณปี ${fy}`} />
              </div>
              <p className="small status-line">
                กำลังดำเนินการ {c.inProgress} ยังไม่เริ่ม {c.planned} เสร็จสิ้น {c.completed} โครงการ
                {c.delayed > 0 && <span style={{ color: 'var(--clay)' }}>, ล่าช้าหรือเบิกจ่ายต่ำกว่าแผน {c.delayed} โครงการ</span>}
                {d.avgPhysicalProgress > 0 && `, ผลการดำเนินงานเฉลี่ย ${pct1(d.avgPhysicalProgress)}%`}
              </p>
            </section>

            <KeyFacts d={d} fy={fy} target={target} m={m} />

            <Breakdown d={d} target={target} />

            <div className="grid grid-2 section">
              <section className="panel" aria-labelledby="plan">
                <h2 id="plan">เบิกจ่ายสะสมเทียบแผน</h2>
                <PlanVsActual cumulative={d.monthly.disbursedCumulative} targetPct={d.monthly.targetPct} budget={d.totals.currentBudget} upToMonth={m} annualPct={d.targets.annualPct} markMonth={8} />
              </section>
              <section className="panel" aria-labelledby="risk">
                <div className="section-head">
                  <h2 id="risk">โครงการที่ต้องติดตาม</h2>
                  <Link to="/projects">ดูทั้งหมด</Link>
                </div>
                {d.risks.length ? (
                  <ul className="row-list">
                    {d.risks.slice(0, 10).map((r) => (
                      <li key={r.projectId}>
                        <Link to={`/projects/${r.projectId}`}>{r.name}</Link>
                        <div className="small" style={{ color: 'var(--clay)' }}>{r.flags.map((f) => RISK_LABEL[f]).join(', ')}</div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted" style={{ margin: 0 }}>ไม่มีโครงการที่ล่าช้าหรือเกินงบในขณะนี้</p>}
              </section>
            </div>

            <p className="small muted section">
              ข้อมูล ณ {formatThaiDateTime(d.generatedAt)}
              {d.dataQuality.lastImportAt && <> นำเข้าข้อมูลล่าสุด {formatThaiDateTime(d.dataQuality.lastImportAt)}</>}.
              {d.dataQuality.projectsWithoutBudget > 0 && <> มี {d.dataQuality.projectsWithoutBudget} โครงการที่ยังไม่บันทึกงบประมาณ.</>}
              {' '}เป้าหมายอ้างอิงมาตรการเร่งรัดการเบิกจ่ายงบประมาณ พ.ศ. 2570 (มติ ครม. 29 ก.ย. 2569).
              {' '}<Link to="/about">อ่านข้อจำกัดของข้อมูล</Link>
            </p>
            {s.refreshing && <span className="sr-only" role="status">กำลังอัปเดตข้อมูล</span>}
            <span className="sr-only">แหล่งงบในระบบ: {l.fundingSources.map((f) => f.name).join(', ')}</span>
          </>
        );
      }}
    </Async>
  );
}
