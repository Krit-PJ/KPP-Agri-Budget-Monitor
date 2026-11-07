import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fiscalMonthIndex, fiscalYearRange, formatThaiDate, formatThaiDateTime, todayBangkok, type GroupTotal, type PublicSummary } from '@kpp/domain';
import { Async, Baht, QuarterBar, useApi, useLookups } from '../../components/ui';
import { BreakdownTable, quarterOf, totalQuarterPct } from './Breakdown';

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
            <span className="fact-v num">{gap >= 0 ? 'ทันแผน' : `ช้ากว่าแผน ${Math.round(-gap).toLocaleString('th-TH')} จุด`}</span>
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

/** เรียงตามลำดับในระบบ (คงที่ทุกเดือน) — กลุ่มงานตามผังองค์กร, พื้นที่: จังหวัดแล้วอำเภอตามรหัส */
function inOrder(rows: GroupTotal[], ids: string[]): GroupTotal[] {
  const pos = (k: string) => { const i = ids.indexOf(k); return i < 0 ? ids.length : i; };
  return [...rows].sort((a, b) => pos(a.key) - pos(b.key));
}

/** หน้าภาพรวมสำหรับผู้บริหาร: ตัวเลขหลัก + แถบ 3 ชั้น, เรื่องที่ต้องรู้, แยกตามกลุ่มงาน, แยกตามพื้นที่ */
export default function Home() {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const s = useApi('public.summary', { fiscalYear: fy }, [fy]);
  const m = monthsElapsed(fy);
  const curQ = quarterOf(m);
  const groupIds = l.workgroups.map((g) => g.id);
  const unitIds = l.units.map((u) => u.id);
  return (
    <Async s={s} lines={8}>
      {(d) => {
        const target = m ? d.monthly.targetPct[m - 1] : 0;
        const t = d.totals;
        const q = totalQuarterPct(d);
        const remPct = t.currentBudget ? (t.remaining / t.currentBudget) * 100 : 0;
        const gapPct = curQ ? Math.max(0, (q[curQ - 1] ?? 0) - t.spendingPct) : 0;
        const gapBaht = Math.round((gapPct / 100) * t.currentBudget);
        const acts = d.byWorkgroup.reduce((a, g) => a + (g.activities ?? 0), 0);
        const confirmed = Math.max(0, acts - (d.activitiesWithoutUnits ?? 0));
        return (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-head">
                <div>
                  <h1 id="hero-title">งบประมาณปี {fy} เบิกจ่ายไปแล้ว <span className="num">{pct1(t.spendingPct)}%</span></h1>
                  <p className="hero-lede">
                    งบประมาณทั้งสิ้น <Baht v={t.currentBudget} short /> บาท
                    {m > 0 && target > 0 && (t.spendingPct >= target
                      ? ` เป็นไปตามแผนสะสมของเดือนนี้ (${target.toFixed(0)}%)`
                      : ` ต่ำกว่าแผนสะสมของเดือนนี้ที่ ${target.toFixed(0)}%`)}
                  </p>
                </div>
                <FiscalYearPicker value={fy} onChange={setFy} />
              </div>
              <div className="strip-wrap">
                <QuarterBar b={t} q={q} curQ={curQ} size="lg" />
                <div className="qbar-legend">
                  <span className="key"><i style={{ background: t.remaining < 0 ? 'var(--clay)' : 'var(--paddy)' }} />เบิกจ่ายแล้ว <b><Baht v={t.disbursed} short /></b> ({pct1(t.spendingPct)}%)</span>
                  <span className="key"><i style={{ background: 'var(--commit)' }} />ผูกพัน <b><Baht v={t.committed} short /></b></span>
                  <span className="key"><i style={{ background: '#e3e9e4', border: '1px solid #cfd8d1' }} />คงเหลือ <b><Baht v={t.remaining} short /></b> ({pct1(remPct)}%)</span>
                  {curQ > 0 && gapPct > 0 && <span className="key"><i className="gap" />ยังขาดจากเป้าไตรมาสนี้ <b>{pct1(gapPct)}%</b> (<Baht v={gapBaht} short /> บาท)</span>}
                  <span className="key"><i className="tick" />เป้าสะสมสิ้นไตรมาสนี้ (เส้นประ = ไตรมาสอื่น)</span>
                </div>
                <div className="qtargets" aria-label="เป้าเบิกจ่ายสะสมรายไตรมาส">
                  {q.map((v, i) => <span key={i} className={curQ === i + 1 ? 'is-now' : ''}>ไตรมาส {i + 1}: {Math.round(v)}%{curQ === i + 1 ? ' (ไตรมาสนี้)' : ''}</span>)}
                </div>
              </div>
            </section>

            <KeyFacts d={d} fy={fy} target={target} m={m} />

            <section className="panel section" aria-labelledby="by-group">
              <h2 id="by-group">ผลการเบิกจ่ายแยกตามกลุ่มงาน</h2>
              <p className="small muted" style={{ marginTop: 0 }}>กดชื่อกลุ่มงานเพื่อดูรายพื้นที่ดำเนินการ บนแถบ: เส้นเข้ม = เป้าสิ้นไตรมาสนี้ ลายเหลือง = ส่วนที่ยังขาด ส่วน &ldquo;เทียบแผน&rdquo; เทียบกับแผนสะสม ณ สิ้นเดือนนี้</p>
              {d.byWorkgroup.length
                ? <BreakdownTable rows={inOrder(d.byWorkgroup, groupIds)} head="กลุ่มงาน" childrenOf={(g) => inOrder(g.units ?? [], unitIds)} d={d} curQ={curQ} planFallback={target} />
                : <p className="muted">ยังไม่มีโครงการในปีงบนี้</p>}
            </section>

            <section className="panel section" aria-labelledby="by-unit">
              <h2 id="by-unit">ผลการเบิกจ่ายแยกตามพื้นที่ดำเนินการ</h2>
              <p className="small muted" style={{ marginTop: 0 }}>
                กดชื่อพื้นที่เพื่อดูว่ากลุ่มงานใดใช้งบในพื้นที่นั้น.{' '}
                {acts > 0 && <>กำหนดพื้นที่แล้ว <b>{confirmed.toLocaleString('th-TH')}</b> จาก {acts.toLocaleString('th-TH')} กิจกรรม{confirmed < acts ? ' กิจกรรมที่ยังไม่กำหนดนับไว้ที่ระดับจังหวัด' : ''}</>}
              </p>
              {d.byUnit.length
                ? <BreakdownTable rows={inOrder(d.byUnit, unitIds)} head="พื้นที่ดำเนินการ" childrenOf={(u) => inOrder(u.groups ?? [], groupIds)} d={d} curQ={curQ} planFallback={target} />
                : <p className="muted">ยังไม่มีข้อมูล</p>}
            </section>

            <p className="small muted section">
              ข้อมูล ณ {formatThaiDateTime(d.generatedAt)}
              {d.dataQuality.lastImportAt && <> นำเข้าข้อมูลล่าสุด {formatThaiDateTime(d.dataQuality.lastImportAt)}</>}.
              {' '}&ldquo;เบิกจ่ายแล้ว&rdquo; ไม่รวมยอดผูกพัน. เป้าหมายอ้างอิงมาตรการเร่งรัดการเบิกจ่ายงบประมาณ พ.ศ. 2570 (มติ ครม. 29 ก.ย. 2569).
              {' '}<Link to="/projects">ดูกราฟและโครงการที่ต้องติดตาม</Link>
            </p>
            {s.refreshing && <span className="sr-only" role="status">กำลังอัปเดตข้อมูล</span>}
          </>
        );
      }}
    </Async>
  );
}
