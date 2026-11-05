/**
 * กฎงบประมาณ (BUDGET DOMAIN RULES ใน Master Prompt v2)
 * คำนวณจากธุรกรรมเสมอ — ไม่เก็บยอดรวมซ้ำใน Core
 */
import type { Allocation, Disbursement, Project } from './types';
import { fiscalMonthIndex, todayBangkok, fiscalYearRange } from './dates';
import type { Satang } from './money';

export interface BudgetSummary {
  originalBudget: Satang;
  transferIn: Satang;
  transferOut: Satang;
  currentBudget: Satang;
  committed: Satang;
  disbursed: Satang;
  paid: Satang;
  remaining: Satang;
  /** ร้อยละการเบิกจ่าย ทศนิยม 2 ตำแหน่ง */
  spendingPct: number;
}

export const EMPTY_SUMMARY: BudgetSummary = {
  originalBudget: 0, transferIn: 0, transferOut: 0, currentBudget: 0,
  committed: 0, disbursed: 0, paid: 0, remaining: 0, spendingPct: 0,
};

type A = Pick<Allocation, 'type' | 'amountSatang' | 'isDeleted'>;
type D = Pick<Disbursement, 'status' | 'amountSatang' | 'isDeleted'>;

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

export function computeBudget(allocations: ReadonlyArray<A>, disbursements: ReadonlyArray<D>): BudgetSummary {
  let originalBudget = 0, transferIn = 0, transferOut = 0, committed = 0, disbursed = 0, paid = 0;
  for (const a of allocations) {
    if (a.isDeleted) continue;
    if (a.type === 'ORIGINAL') originalBudget += a.amountSatang;
    else if (a.type === 'TRANSFER_IN') transferIn += a.amountSatang;
    else if (a.type === 'TRANSFER_OUT') transferOut += a.amountSatang;
  }
  for (const d of disbursements) {
    if (d.isDeleted || d.status === 'VOID') continue;
    if (d.status === 'COMMITTED') committed += d.amountSatang;
    if (d.status === 'APPROVED' || d.status === 'PAID') disbursed += d.amountSatang;
    if (d.status === 'PAID') paid += d.amountSatang;
  }
  const currentBudget = originalBudget + transferIn - transferOut;
  const remaining = currentBudget - disbursed;
  return {
    originalBudget, transferIn, transferOut, currentBudget,
    committed, disbursed, paid, remaining,
    spendingPct: pct(disbursed, currentBudget),
  };
}

export function addSummaries(list: ReadonlyArray<BudgetSummary>): BudgetSummary {
  const s = { ...EMPTY_SUMMARY };
  for (const x of list) {
    s.originalBudget += x.originalBudget;
    s.transferIn += x.transferIn;
    s.transferOut += x.transferOut;
    s.currentBudget += x.currentBudget;
    s.committed += x.committed;
    s.disbursed += x.disbursed;
    s.paid += x.paid;
    s.remaining += x.remaining;
  }
  s.spendingPct = pct(s.disbursed, s.currentBudget);
  return s;
}

/** reconciliation: currentBudget = disbursed + remaining */
export function reconciles(s: BudgetSummary): boolean {
  return s.currentBudget === s.disbursed + s.remaining &&
    s.currentBudget === s.originalBudget + s.transferIn - s.transferOut;
}

/**
 * ผลกระทบของรายการใหม่ต่องบคงเหลือ
 * คืน remaining หลังบันทึก (ติดลบ = เกินงบ)
 */
export function remainingAfter(current: BudgetSummary, add: { status: Disbursement['status']; amountSatang: Satang }): Satang {
  if (add.status === 'APPROVED' || add.status === 'PAID') return current.remaining - add.amountSatang;
  return current.remaining;
}

/** เบิกจ่ายสะสมรายเดือนตามปีงบประมาณ (ต.ค.…ก.ย.) */
export function monthlyCumulative(disbursements: ReadonlyArray<Pick<Disbursement, 'status' | 'amountSatang' | 'isDeleted' | 'date'>>, fiscalYear: number): Satang[] {
  const { start, end } = fiscalYearRange(fiscalYear);
  const months = new Array<number>(12).fill(0);
  for (const d of disbursements) {
    if (d.isDeleted || (d.status !== 'APPROVED' && d.status !== 'PAID')) continue;
    if (!d.date || d.date < start || d.date > end) continue;
    months[fiscalMonthIndex(d.date) - 1] += d.amountSatang;
  }
  for (let i = 1; i < 12; i++) months[i] += months[i - 1];
  return months;
}

/** เป้าหมายร้อยละสะสมรายเดือนจากเป้ารายไตรมาส "30,55,80,100" (interpolate เชิงเส้น) */
export function monthlyTargetPct(quarterTargets: string): number[] {
  const q = parseQuarterTargets(quarterTargets);
  const out: number[] = [];
  let prev = 0;
  for (let i = 0; i < 4; i++) {
    for (let k = 1; k <= 3; k++) out.push(Math.round((prev + ((q[i] - prev) * k) / 3) * 100) / 100);
    prev = q[i];
  }
  return out;
}

/** ค่าเริ่มต้นตามแนวเป้าหมายการเบิกจ่ายภาครัฐ (ปรับได้ต่อโครงการ/ในตั้งค่า) */
export const DEFAULT_QUARTER_TARGETS = '30,55,80,100';

export function parseQuarterTargets(s: string): [number, number, number, number] {
  const parts = String(s || DEFAULT_QUARTER_TARGETS).split(',').map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
    return parseQuarterTargets(DEFAULT_QUARTER_TARGETS);
  }
  return parts as [number, number, number, number];
}

export type RiskFlag = 'OVER_BUDGET' | 'BEHIND_SPENDING' | 'OVERDUE' | 'NO_RECENT_REPORT';
export const RISK_LABEL: Record<RiskFlag, string> = {
  OVER_BUDGET: 'งบติดลบ',
  BEHIND_SPENDING: 'เบิกจ่ายต่ำกว่าแผน',
  OVERDUE: 'เกินกำหนดเวลา',
  NO_RECENT_REPORT: 'ไม่รายงานผลเกิน 45 วัน',
};

export function riskFlags(
  project: Pick<Project, 'status' | 'endDate' | 'quarterTargets' | 'fiscalYear' | 'lastProgressAt' | 'startDate'>,
  summary: BudgetSummary,
  today: string = todayBangkok(),
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (summary.remaining < 0) flags.push('OVER_BUDGET');
  const active = project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
  if (active && project.endDate && project.endDate < today) flags.push('OVERDUE');
  const { start, end } = fiscalYearRange(project.fiscalYear);
  if (active && today >= start && today <= end && summary.currentBudget > 0) {
    const target = monthlyTargetPct(project.quarterTargets)[fiscalMonthIndex(today) - 1];
    if (summary.spendingPct + 10 < target) flags.push('BEHIND_SPENDING');
  }
  if (active && project.startDate && project.startDate <= today) {
    const last = (project.lastProgressAt || project.startDate).slice(0, 10);
    const days = (Date.parse(today) - Date.parse(last)) / 86400000;
    if (days > 45) flags.push('NO_RECENT_REPORT');
  }
  return flags;
}
