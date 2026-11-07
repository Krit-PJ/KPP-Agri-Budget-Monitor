import { useState } from 'react';
import type { GroupTotal, PublicSummary } from '@kpp/domain';
import { Baht, Pct, QuarterBar } from '../../components/ui';

const pct1 = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1 });

/** ไตรมาสปัจจุบันจากจำนวนเดือนที่ผ่านไปของปีงบ (0 = ยังไม่เริ่ม) */
export const quarterOf = (m: number) => (m > 0 ? Math.min(4, Math.ceil(m / 3)) : 0);

/** ร้อยละเป้าสะสมสิ้นไตรมาส 1–4 ของทั้งปี (จากแผนรายเดือน) */
export const totalQuarterPct = (d: PublicSummary) => [2, 5, 8, 11].map((i) => d.monthly.targetPct[i] ?? 0);

/** ร้อยละเป้าสะสมรายไตรมาสของแถว (ข้อมูลเก่าที่ยังไม่มี planQ ใช้สัดส่วนของทั้งปี) */
function quarterPct(g: GroupTotal, fallback: number[]): number[] {
  if (!g.planQ || !g.budget.currentBudget) return fallback;
  return g.planQ.map((v) => (v / g.budget.currentBudget) * 100);
}

/** ผลเทียบแผนสะสม ณ เดือนนี้ เป็นจุดร้อยละ */
export function PlanStatus({ budget, disbursed, plan }: { budget: number; disbursed: number; plan: number }) {
  if (!budget || !plan) return <span className="muted">–</span>;
  const gap = ((disbursed - plan) / budget) * 100;
  return gap >= -0.05
    ? <span className="st-ok">✓ ตามแผน</span>
    : <span className="st-bad">▼ ช้ากว่าแผน {Math.round(-gap).toLocaleString('th-TH')} จุด</span>;
}

/**
 * ตารางผลการเบิกจ่าย 1 มุมมอง (กลุ่มงาน / พื้นที่ดำเนินการ / แผนงาน / แหล่งงบ)
 * เรียงตามลำดับที่ส่งมา (คงที่) — กดชื่อแถวเพื่อดูรายละเอียดชั้นถัดไปถ้ามี
 */
export function BreakdownTable({ rows, head, childrenOf, d, curQ, planFallback }: {
  rows: GroupTotal[];
  head: string;
  childrenOf?: (g: GroupTotal) => GroupTotal[] | undefined;
  d: PublicSummary;
  curQ: number;
  /** แผน ณ เดือนนี้ เป็นร้อยละ (ใช้เมื่อแถวไม่มี plan) */
  planFallback: number;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const fallbackQ = totalQuarterPct(d);
  const planOf = (g: GroupTotal) => g.plan ?? Math.round((planFallback / 100) * g.budget.currentBudget);
  const toggle = (k: string) => setOpen((s0) => { const n = new Set(s0); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const row = (g: GroupTotal, sub: boolean, kids?: GroupTotal[]) => {
    const b = g.budget;
    const q = quarterPct(g, fallbackQ);
    const remPct = b.currentBudget ? (b.remaining / b.currentBudget) * 100 : 0;
    const isOpen = open.has(g.key);
    return (
      <tr key={(sub ? 'c:' : '') + g.key} className={sub ? 'bd-sub' : kids?.length ? 'bd-main' : ''}>
        <td className="primary">
          {kids?.length ? (
            <button className="bd-toggle bd-name" aria-expanded={isOpen} onClick={() => toggle(g.key)}>
              <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> {g.label}
            </button>
          ) : <span className={sub ? '' : 'bd-name'}>{g.label}</span>}
          <span className="xs muted"> {g.activities ? `${g.activities} กิจกรรม` : `${g.projects} โครงการ`}</span>
          <QuarterBar b={b} q={q} curQ={curQ} />
          <div className="qbar-cap">
            {curQ > 0 && <>เป้าไตรมาส {curQ}: <b>{Math.round(q[curQ - 1] ?? 0)}%</b>{'  '}</>}คงเหลือ {pct1(remPct)}%
          </div>
        </td>
        <td data-label="งบประมาณ (บาท)" className="r"><Baht v={b.currentBudget} whole /></td>
        <td data-label="เบิกจ่ายแล้ว (บาท)" className="r"><Baht v={b.disbursed} whole /></td>
        <td data-label="คงเหลือ (บาท)" className="r"><Baht v={b.remaining} whole /></td>
        <td data-label="ร้อยละเบิกจ่าย" className="r"><Pct v={b.spendingPct} /></td>
        <td data-label="เทียบแผน"><PlanStatus budget={b.currentBudget} disbursed={b.disbursed} plan={planOf(g)} /></td>
      </tr>
    );
  };

  const tot = rows.reduce((a, g) => ({ b: a.b + g.budget.currentBudget, p: a.p + planOf(g), d: a.d + g.budget.disbursed, r: a.r + g.budget.remaining }), { b: 0, p: 0, d: 0, r: 0 });
  return (
    <div className="table-wrap">
      <table className="data stack bd-table">
        <thead>
          <tr><th>{head}</th><th className="r">งบประมาณ (บาท)</th><th className="r">เบิกจ่ายแล้ว (บาท)</th><th className="r">คงเหลือ (บาท)</th><th className="r">ร้อยละเบิกจ่าย</th><th>เทียบแผน</th></tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const kids = childrenOf?.(g);
            return [row(g, false, kids), ...(open.has(g.key) ? (kids ?? []).map((c) => row(c, true)) : [])];
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>รวม</td>
            <td data-label="งบประมาณ (บาท)" className="r"><Baht v={tot.b} whole /></td>
            <td data-label="เบิกจ่ายแล้ว (บาท)" className="r"><Baht v={tot.d} whole /></td>
            <td data-label="คงเหลือ (บาท)" className="r"><Baht v={tot.r} whole /></td>
            <td data-label="ร้อยละเบิกจ่าย" className="r"><Pct v={tot.b ? Math.round((tot.d / tot.b) * 1000) / 10 : 0} /></td>
            <td data-label="เทียบแผน"><PlanStatus budget={tot.b} disbursed={tot.d} plan={tot.p} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
