/**
 * มุมมองที่กรองแล้วของหน้าภาพรวม (กลุ่มงาน / โครงการ) — คำนวณจากแถว กิจกรรม × พื้นที่ ของรายงานสาธารณะ
 * แผนทุกแถว = งบ × เป้าหมายการเบิกจ่ายของปี จึงรวมแล้วได้ตัวเลขชุดเดียวกับหน้าภาพรวมทั้งจังหวัด
 */
import { pct, type BudgetSummary, type GroupTotal, type PublicSummary, type ReportRow } from '@kpp/domain';

export interface Names { group: (id: string) => string; unit: (id: string) => string }

export function sumRows(rows: ReportRow[]): BudgetSummary {
  let budget = 0, committed = 0, disbursed = 0;
  for (const r of rows) { budget += r.budget; committed += r.committed; disbursed += r.disbursed; }
  return {
    originalBudget: budget, transferIn: 0, transferOut: 0, currentBudget: budget,
    committed, disbursed, paid: disbursed, remaining: budget - disbursed, spendingPct: pct(disbursed, budget),
  };
}

function total(key: string, label: string, rows: ReportRow[]): GroupTotal {
  const planQ = [0, 0, 0, 0];
  let plan = 0;
  for (const r of rows) { plan += r.plan; r.planQ?.forEach((v, i) => { planQ[i] += v; }); }
  return {
    key, label, budget: sumRows(rows), plan, planQ,
    projects: new Set(rows.map((r) => r.projectId)).size,
    activities: new Set(rows.filter((r) => r.activityId).map((r) => r.activityId)).size,
  };
}

function groupBy(rows: ReportRow[], keyOf: (r: ReportRow) => string): Map<string, ReportRow[]> {
  const m = new Map<string, ReportRow[]>();
  for (const r of rows) { const k = keyOf(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  return m;
}

/** แถวรายกิจกรรม (กดดูรายพื้นที่) สำหรับเมื่อเลือกโครงการเดียว */
export function activityTotals(rows: ReportRow[], n: Names): GroupTotal[] {
  return [...groupBy(rows, (r) => r.activityId || `P:${r.projectId}`)].map(([k, rs]) => ({
    ...total(k, rs[0].activityId ? rs[0].activityName : 'งบระดับโครงการ (ยังไม่แยกกิจกรรม)', rs),
    units: [...groupBy(rs, (r) => r.unitId)].map(([u, us]) => total(u, n.unit(u), us)),
  }));
}

/** สรุปภาพรวมฉบับกรองแล้ว — โครงสร้างเดียวกับ public.summary เพื่อให้ทุกส่วนของหน้าใช้ได้ทันที */
export function filteredSummary(d: PublicSummary, rows: ReportRow[], n: Names): PublicSummary {
  const meet = rows.filter((r) => r.isMeeting);
  return {
    ...d,
    totals: sumRows(rows),
    byWorkgroup: [...groupBy(rows, (r) => r.workgroupId)].map(([g, rs]) => ({
      ...total(g, n.group(g), rs),
      units: [...groupBy(rs, (r) => r.unitId)].map(([u, us]) => total(u, n.unit(u), us)),
    })),
    byUnit: [...groupBy(rows, (r) => r.unitId)].map(([u, rs]) => ({
      ...total(u, n.unit(u), rs),
      groups: [...groupBy(rs, (r) => r.workgroupId)].map(([g, gs]) => total(g, n.group(g), gs)),
    })),
    meetings: {
      activities: new Set(meet.map((r) => r.activityId)).size,
      budget: meet.reduce((a, r) => a + r.budget, 0),
      remaining: meet.reduce((a, r) => a + Math.max(0, r.budget - r.disbursed), 0),
    },
  };
}
