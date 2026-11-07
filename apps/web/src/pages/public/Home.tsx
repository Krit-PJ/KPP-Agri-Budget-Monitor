import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { areaName, fiscalMonthIndex, fiscalYearRange, formatThaiDate, formatThaiDateTime, todayBangkok, type GroupTotal, type PublicSummary } from '@kpp/domain';
import { Async, Baht, QuarterBar, useApi, useLookups } from '../../components/ui';
import { BreakdownTable, quarterOf, totalQuarterPct } from './Breakdown';
import { activityTotals, filteredSummary } from './filterView';

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

/** วันสุดท้ายของเดือนที่ m ในปีงบ fy (1 = ต.ค.) เป็น YYYY-MM-DD */
function fullMonthEnd(fy: number, m: number): string {
  const ce = fy - 543 - (m <= 3 ? 1 : 0);
  const month = ((m + 8) % 12) + 1; // 1 → 10 (ต.ค.)
  const last = new Date(Date.UTC(ce, month, 0)).getUTCDate();
  return `${ce}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

const pct1 = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 });

/** 3 เรื่องที่ต้องรู้: ทันแผนเดือนนี้หรือไม่ / เป้าทั้งปี / กำหนดอบรม-ประชุม (มาตรการเร่งรัดฯ) */
function KeyFacts({ d, fy, target, m }: { d: PublicSummary; fy: number; target: number; m: number }) {
  const t = d.totals;
  const end = fiscalYearRange(fy).end;
  const daysToEnd = daysUntil(end);
  const daysToMeet = daysUntil(d.targets.meetingDeadline);
  const needNow = Math.max(0, Math.round((target / 100) * t.currentBudget) - t.disbursed);
  const needYear = Math.max(0, t.currentBudget - t.disbursed);
  // เป้าทั้งปี 100% ภายในเดือนที่ตั้งในหน้าเป้าหมายการเบิกจ่าย (เดือนแรกที่เป้าสะสมถึง 100%)
  const full = d.targets.fullMonth ?? 12;
  const fullEnd = fullMonthEnd(fy, full);
  const daysToFull = daysUntil(fullEnd);
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
        <span className="fact-l">เป้าทั้งปี 100% ภายใน {formatThaiDate(fullEnd)}</span>
        <span className="fact-v num">{needYear > 0 ? <>เหลือ <Baht v={needYear} short /> บาท</> : 'ถึงเป้าแล้ว'}</span>
        <span className="fact-n">{daysToFull >= 0 ? `อีก ${daysToFull.toLocaleString('th-TH')} วัน` : daysToEnd >= 0 ? 'เลยกำหนดเบิกครบแล้ว' : 'สิ้นปีงบประมาณแล้ว'}</span>
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

/** ตัวกรองหน้าภาพรวม: ?g=<กลุ่มงาน>&p=<โครงการ> (อยู่ในลิงก์ จึงส่งต่อ/พิมพ์ได้ตรงกัน) */
function useOverviewFilter() {
  const [sp, setSp] = useSearchParams();
  const g = sp.get('g') ?? '';
  const p = sp.get('p') ?? '';
  const set = (next: { g?: string; p?: string }) => {
    const n = new URLSearchParams(sp);
    const ng = next.g ?? g;
    const np = next.g !== undefined && next.g !== g ? '' : next.p ?? p;
    if (ng) n.set('g', ng); else n.delete('g');
    if (np) n.set('p', np); else n.delete('p');
    setSp(n, { replace: true });
  };
  return { g, p, set };
}

/** หน้าภาพรวมสำหรับผู้บริหาร: ตัวเลขหลัก + แถบเป้า, เรื่องที่ต้องรู้, แยกตามกลุ่มงาน (หรือรายกิจกรรม), แยกตามพื้นที่ */
export default function Home() {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const f = useOverviewFilter();
  const s = useApi('public.summary', { fiscalYear: fy }, [fy]);
  const projects = useApi('public.projects', { fiscalYear: fy }, [fy]);
  const groups = l.workgroups.filter((g) => !g.noActivities);
  const projList = (projects.data ?? []).filter((x) => !f.g || x.workgroupId === f.g).sort((a, b) => (a.projectCode || a.name).localeCompare(b.projectCode || b.name, 'th'));
  const project = (projects.data ?? []).find((x) => x.id === f.p);
  const filtered = !!(f.g || f.p);
  const filterBar = (
    <div className="ov-filter" role="search" aria-label="เลือกข้อมูลที่จะแสดง">
      <FiscalYearPicker value={fy} onChange={setFy} />
      <label className="field"><span>กลุ่มงาน</span>
        <select value={f.g} onChange={(e) => f.set({ g: e.target.value })}>
          <option value="">ทุกกลุ่มงาน</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
      <label className="field ov-project"><span>โครงการ</span>
        <select value={f.p} onChange={(e) => f.set({ p: e.target.value })}>
          <option value="">ทุกโครงการ{f.g ? 'ของกลุ่มนี้' : ''} ({projList.length})</option>
          {projList.map((x) => <option key={x.id} value={x.id}>{x.name.length > 70 ? `${x.name.slice(0, 70)}…` : x.name}</option>)}
        </select>
      </label>
      {filtered && <button type="button" className="btn btn-ghost" onClick={() => f.set({ g: '', p: '' })}>แสดงทั้งหมด</button>}
      {filtered && <Link className="btn btn-ghost" to={`/report?${new URLSearchParams({ ...(f.g ? { g: f.g } : {}), ...(f.p ? { p: f.p } : {}) }).toString()}`}>พิมพ์รายงานของที่เลือก</Link>}
    </div>
  );
  const groupName = f.g ? l.workgroups.find((g) => g.id === f.g)?.name ?? '' : project ? l.workgroups.find((g) => g.id === project.workgroupId)?.name ?? '' : '';
  const banner = filtered ? (
    <p className="ov-banner" role="status">
      กำลังแสดงเฉพาะ: <b>{groupName || 'ทุกกลุ่มงาน'}</b>{project && <> › <b>{project.name}</b></>}
      <span> — ไม่ใช่ตัวเลขทั้งจังหวัด</span>
    </p>
  ) : null;
  return (
    <Async s={s} lines={8}>
      {(d0) => filtered
        ? <FilteredOverview d0={d0} fy={fy} g={f.g} p={f.p} filterBar={filterBar} banner={banner} />
        : <Overview d={d0} fy={fy} filterBar={filterBar} banner={null} filtered={false} />}
    </Async>
  );
}

function FilteredOverview({ d0, fy, g, p, filterBar, banner }: { d0: PublicSummary; fy: number; g: string; p: string; filterBar: ReactNode; banner: ReactNode }) {
  const l = useLookups();
  const r = useApi('public.report', { fiscalYear: fy }, [fy]);
  const names = useMemo(() => ({
    group: (id: string) => l.workgroups.find((x) => x.id === id)?.name ?? 'ไม่ระบุกลุ่มงาน',
    unit: (id: string) => { const u = l.units.find((x) => x.id === id); return u ? areaName(u) : 'ไม่ระบุพื้นที่'; },
  }), [l]);
  return (
    <>
      <Async s={r} lines={8}>
        {(rep) => {
          const rows = rep.rows.filter((x) => (!g || x.workgroupId === g) && (!p || x.projectId === p));
          const d = filteredSummary(d0, rows, names);
          return <Overview d={d} fy={fy} filterBar={filterBar} banner={banner} filtered activities={p ? activityTotals(rows, names) : undefined} projectId={p} />;
        }}
      </Async>
    </>
  );
}

function Overview({ d, fy, filterBar, banner, filtered, activities, projectId }: {
  d: PublicSummary; fy: number; filterBar: ReactNode; banner: ReactNode; filtered: boolean; activities?: GroupTotal[]; projectId?: string;
}) {
  const l = useLookups();
  const m = monthsElapsed(fy);
  const curQ = quarterOf(m);
  const groupIds = l.workgroups.map((g) => g.id);
  const unitIds = l.units.map((u) => u.id);
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
              {filterBar}
              {banner}
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
              </div>
              <div className="strip-wrap">
                <QuarterBar b={t} q={q} curQ={curQ} size="lg" />
                <div className="qbar-legend">
                  <span className="key"><i style={{ background: t.remaining < 0 ? 'var(--clay)' : 'var(--paddy)' }} />เบิกจ่ายแล้ว <b><Baht v={t.disbursed} short /></b> ({pct1(t.spendingPct)}%)</span>
                  <span className="key"><i style={{ background: 'var(--commit)' }} />ผูกพัน <b><Baht v={t.committed} short /></b></span>
                  <span className="key"><i style={{ background: '#e3e9e4', border: '1px solid #cfd8d1' }} />คงเหลือ <b><Baht v={t.remaining} short /></b> ({pct1(remPct)}%)</span>
                  {curQ > 0 && gapPct > 0 && <span className="key"><i className="gap" />ยังขาดจากเป้าไตรมาสนี้ <b>{pct1(gapPct)}%</b> หรือ <b><Baht v={gapBaht} whole /></b> บาท</span>}
                  <span className="key"><i className="tick" />เป้าสะสมสิ้นไตรมาสนี้ (เส้นประ = ไตรมาสอื่น)</span>
                </div>
                <div className="qtargets" aria-label="เป้าเบิกจ่ายสะสมรายไตรมาส">
                  {q.map((v, i) => <span key={i} className={curQ === i + 1 ? 'is-now' : ''}>ไตรมาส {i + 1}: {Math.round(v)}%{curQ === i + 1 ? ' (ไตรมาสนี้)' : ''}</span>)}
                </div>
              </div>
            </section>

            <KeyFacts d={d} fy={fy} target={target} m={m} />

            {activities ? (
              <section className="panel section" aria-labelledby="by-act">
                <h2 id="by-act">ผลการเบิกจ่ายรายกิจกรรม</h2>
                <p className="small muted" style={{ marginTop: 0 }}>กดชื่อกิจกรรมเพื่อดูรายพื้นที่ดำเนินการ{projectId && <> · <Link to={`/projects/${projectId}`}>ดูรายละเอียดโครงการ</Link></>}</p>
                {activities.length
                  ? <BreakdownTable rows={activities} head="กิจกรรม" childrenOf={(a) => inOrder(a.units ?? [], unitIds)} d={d} curQ={curQ} planFallback={target} />
                  : <p className="muted">ไม่มีกิจกรรม</p>}
              </section>
            ) : (
            <section className="panel section" aria-labelledby="by-group">
              <h2 id="by-group">ผลการเบิกจ่ายแยกตามกลุ่มงาน</h2>
              <p className="small muted" style={{ marginTop: 0 }}>กดชื่อกลุ่มงานเพื่อดูรายพื้นที่ดำเนินการ บนแถบ: เส้นเข้ม = เป้าสิ้นไตรมาสนี้ ลายเหลือง = ส่วนที่ยังขาด ส่วน &ldquo;เทียบแผน&rdquo; เทียบกับแผนสะสม ณ สิ้นเดือนนี้</p>
              {d.byWorkgroup.length
                ? <BreakdownTable rows={inOrder(d.byWorkgroup, groupIds)} head="กลุ่มงาน" childrenOf={(g) => inOrder(g.units ?? [], unitIds)} d={d} curQ={curQ} planFallback={target} />
                : <p className="muted">ยังไม่มีโครงการในปีงบนี้</p>}
            </section>
            )}

            <section className="panel section" aria-labelledby="by-unit">
              <h2 id="by-unit">ผลการเบิกจ่ายแยกตามพื้นที่ดำเนินการ</h2>
              <p className="small muted" style={{ marginTop: 0 }}>
                กดชื่อพื้นที่เพื่อดูว่ากลุ่มงานใดใช้งบในพื้นที่นั้น.{' '}
                {!filtered && acts > 0 && <>กำหนดพื้นที่แล้ว <b>{confirmed.toLocaleString('th-TH')}</b> จาก {acts.toLocaleString('th-TH')} กิจกรรม{confirmed < acts ? ' กิจกรรมที่ยังไม่กำหนดนับไว้ที่ระดับจังหวัด' : ''}</>}
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

          </>
  );
}
