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

/** กิจกรรมประเภทอบรม/ประชุม/สัมมนา — มาตรการเร่งรัดฯ กำหนดให้ดำเนินการให้เสร็จภายในไตรมาส 3 */
export const MEETING_RE = /อบรม|ประชุม|สัมมนา|ถ่ายทอดความรู้|เวที|ศึกษาดูงาน|Field Day|Workshop/i;

/** แผนรายไตรมาส "q1,q2,q3,q4" (สตางค์) → อาร์เรย์ หรือ null ถ้าว่าง/ไม่ถูกต้อง */
export function parsePlanQuarters(s: string | null | undefined): [number, number, number, number] | null {
  if (!s) return null;
  const q = String(s).split(',').map((x) => Number(x.trim()));
  if (q.length !== 4 || q.some((n) => !Number.isInteger(n) || n < 0)) return null;
  return q as [number, number, number, number];
}

/**
 * แผนการเบิกจ่ายสะสม (สตางค์) ณ สิ้นเดือนที่ m ของปีงบ (1 = ต.ค. … 12 = ก.ย.; 0 = ยังไม่เริ่ม)
 * ใช้แผนรายไตรมาสของกิจกรรมถ้ามี (ปรับสัดส่วนตามงบปัจจุบัน) ไม่เช่นนั้นใช้เป้าร้อยละรายไตรมาส
 */
export function planToDate(budget: Satang, planQuarters: string | null | undefined, quarterTargets: string, m: number): Satang {
  if (m <= 0 || budget <= 0) return 0;
  const month = Math.min(12, m);
  const q = parsePlanQuarters(planQuarters);
  const total = q ? q[0] + q[1] + q[2] + q[3] : 0;
  if (q && total > 0) {
    const cum = [q[0], q[0] + q[1], q[0] + q[1] + q[2], total];
    const k = Math.ceil(month / 3);
    const prev = k > 1 ? cum[k - 2] : 0;
    const v = prev + ((cum[k - 1] - prev) * (month - 3 * (k - 1))) / 3;
    return Math.round((v / total) * budget);
  }
  return Math.round((budget * monthlyTargetPct(quarterTargets)[month - 1]) / 100);
}

/* ------------------------- เป้าหมายการเบิกจ่าย (ตั้งค่าได้) ------------------------- */

/**
 * เป้าหมายการเบิกจ่ายของปีงบประมาณ (ร้อยละสะสม เป้าทั้งปี = 100%) — ตั้งได้ 2 แบบ
 * - quarter: ร้อยละสะสม ณ สิ้นไตรมาส 1–4 เช่น [30, 55, 80, 100] (ไตรมาส 4 ต้องเป็น 100)
 * - monthly: ร้อยละสะสม ณ สิ้นแต่ละเดือน 12 ค่า (ต.ค. … ก.ย.) ต้องไม่ลดลง และต้องถึง 100 ภายใน ก.ย.
 *   เดือนแรกที่ถึง 100 = เดือนที่ต้องเบิกครบ; เดือนหลังจากนั้นเป็น 100 เสมอ
 * ข้อมูลเก่าแบบ deadline (ถึง pct% ภายในเดือน month) แปลงเป็น monthly อัตโนมัติ
 */
export interface SpendTarget { mode: 'quarter' | 'monthly'; quarters: number[]; months: number[] }

const r2 = (v: number) => Math.round(v * 100) / 100;

/** เติมเป้ารายเดือนเท่า ๆ กันจาก ต.ค. ให้ถึง 100% ภายในเดือน fullMonth (1 = ต.ค. … 12 = ก.ย.) */
export function linearMonths(fullMonth: number): number[] {
  const f = Math.min(12, Math.max(1, Math.round(fullMonth)));
  return Array.from({ length: 12 }, (_, i) => (i + 1 >= f ? 100 : Math.round(((i + 1) * 100) / f)));
}

export function parseSpendTarget(json: string | null | undefined, fallbackQuarters = DEFAULT_QUARTER_TARGETS): SpendTarget {
  const fq = [...parseQuarterTargets(fallbackQuarters)];
  if (fq[3] !== 100) fq[3] = 100;
  const base: SpendTarget = { mode: 'quarter', quarters: fq, months: [] };
  if (!json) return base;
  try {
    const t = JSON.parse(json) as { mode?: string; quarters?: unknown[]; months?: unknown[]; month?: number; pct?: number };
    let out: SpendTarget;
    if (t.mode === 'deadline') {
      // รูปแบบเดิม: ถึง pct% ภายในเดือน month → เส้นตรงรายเดือน (เป้าทั้งปีคือ 100%)
      const m = Math.min(12, Math.max(1, Number(t.month) || 12));
      const pct = Math.min(100, Math.max(1, Number(t.pct) || 100));
      out = { mode: 'monthly', quarters: [], months: Array.from({ length: 12 }, (_, i) => (i + 1 <= m ? Math.round((pct * (i + 1)) / m) : Math.round(pct + ((100 - pct) * (i + 1 - m)) / (12 - m)))) };
    } else if (t.mode === 'monthly') {
      out = { mode: 'monthly', quarters: [], months: Array.isArray(t.months) ? t.months.map(Number) : [] };
    } else {
      out = { mode: 'quarter', quarters: Array.isArray(t.quarters) ? t.quarters.map(Number) : fq, months: [] };
    }
    return validateSpendTarget(out) ? base : out;
  } catch {
    return base;
  }
}

/** คืนข้อความผิดพลาด หรือ null ถ้าถูกต้อง */
export function validateSpendTarget(t: SpendTarget): string | null {
  const check = (v: number[], n: number, name: (i: number) => string): string | null => {
    if (!Array.isArray(v) || v.length !== n || v.some((x) => !Number.isFinite(x))) return `ต้องกรอกเป้าให้ครบ ${n} ช่อง`;
    for (let i = 0; i < n; i++) {
      if (v[i] < 0 || v[i] > 100) return `เป้า${name(i)} ต้องอยู่ระหว่าง 0–100%`;
      if (i > 0 && v[i] < v[i - 1]) return `เป้า${name(i)} ต้องไม่น้อยกว่า${name(i - 1)} (เป็นร้อยละสะสม)`;
    }
    if (v[n - 1] !== 100) return `เป้าทั้งปีคือ 100% — ${name(n - 1)}ต้องเป็น 100%`;
    return null;
  };
  if (t.mode === 'monthly') return check(t.months, 12, (i) => `เดือน${FISCAL_MONTH_NAMES[i]}`);
  return check(t.quarters, 4, (i) => `ไตรมาส ${i + 1}`);
}

/** ชื่อเดือนของปีงบ (1 = ต.ค.) */
export const FISCAL_MONTH_NAMES = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];

/** ร้อยละสะสมรายเดือน 12 ค่า (ต.ค. … ก.ย.) จากเป้าของปี */
export function targetCurve(t: SpendTarget): number[] {
  if (t.mode === 'monthly') return t.months.map(r2);
  return monthlyTargetPct(t.quarters.join(','));
}

/** เดือนแรกที่เป้าถึง 100% (1–12) = เดือนที่ต้องเบิกครบ */
export function fullMonthOf(curve: number[]): number {
  const i = curve.findIndex((v) => v >= 100);
  return i < 0 ? 12 : i + 1;
}

/** ร้อยละสะสมรายเดือนของกิจกรรมที่ต้องเบิกครบ 100% ภายในเดือน dueMonth */
export function dueCurve(dueMonth: number): number[] {
  return Array.from({ length: 12 }, (_, i) => r2(Math.min(1, (i + 1) / dueMonth) * 100));
}

/**
 * กำหนดเบิกครบของกิจกรรม (ใช้เตือน ไม่เปลี่ยนเป้าบนแถบ): ค่าที่ตั้งไว้ (1–12) > อบรม/ประชุม/สัมมนา = มิ.ย. (มาตรการเร่งรัดฯ) > 0 = ไม่มีกำหนดเฉพาะ
 * dueMonth = -1 คือเลือก "ไม่มีกำหนดเฉพาะ" โดยตั้งใจ (ใช้ยกเว้นกิจกรรมประเภทอบรม)
 */
export function effectiveDueMonth(a: { name: string; dueMonth?: number | string | null }): number {
  const d = Number(a.dueMonth) || 0;
  if (d >= 1 && d <= 12) return d;
  if (d < 0) return 0;
  return MEETING_RE.test(a.name) ? MEETING_DUE_MONTH : 0;
}
/** มิ.ย. = เดือนที่ 9 ของปีงบ (สิ้นไตรมาส 3) */
export const MEETING_DUE_MONTH = 9;

/** แผนการเบิกจ่ายสะสม (สตางค์) ณ สิ้นเดือน m จากเป้าของปี หรือกำหนดเสร็จของกิจกรรม */
export function planAt(budget: Satang, curve: number[], dueMonth: number, m: number): Satang {
  if (m <= 0 || budget <= 0) return 0;
  const c = dueMonth > 0 ? dueCurve(dueMonth) : curve;
  return Math.round((budget * (c[Math.min(12, m) - 1] ?? 0)) / 100);
}

/**
 * แบ่งยอดเท่า ๆ กัน — เศษกระจายทีละ 1 หน่วยให้รายการแรก ๆ (เช่น 16 คน ÷ 11 = 2,2,2,2,2,1,…)
 * step: หน่วยที่ใช้แบ่ง เช่น 100 = แบ่งเป็นบาทเต็ม (ใช้เมื่อยอดรวมเป็นบาทเต็ม)
 */
export function splitEqual(total: number, n: number, step = 1): number[] {
  if (n <= 0) return [];
  const unit = step > 1 && total % step === 0 ? step : 1;
  const units = Math.round(total / unit);
  const base = Math.floor(units / n);
  const rest = units - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rest ? 1 : 0)) * unit);
}

/** แบ่งเงิน (สตางค์) เท่า ๆ กัน เป็นบาทเต็มเมื่อทำได้ */
export const splitMoney = (total: Satang, n: number): Satang[] => splitEqual(total, n, 100);

/** แบ่งยอดตามสัดส่วนน้ำหนัก (เช่น ปริมาณงาน) — เศษไปที่รายการที่น้ำหนักมากที่สุด; step เหมือน splitEqual */
export function splitByWeight(total: number, weights: number[], step = 1): number[] {
  const sum = weights.reduce((a, w) => a + Math.max(0, w), 0);
  if (sum <= 0) return splitEqual(total, weights.length, step);
  const unit = step > 1 && total % step === 0 ? step : 1;
  const units = Math.round(total / unit);
  const out = weights.map((w) => Math.floor((units * Math.max(0, w)) / sum));
  out[weights.indexOf(Math.max(...weights))] += units - out.reduce((a, v) => a + v, 0);
  return out.map((v) => v * unit);
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
  /** ร้อยละสะสมรายเดือนของเป้าปีงบ (ถ้าไม่ส่ง ใช้เป้ารายไตรมาสของโครงการ) */
  curve?: number[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (summary.remaining < 0) flags.push('OVER_BUDGET');
  const active = project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
  if (active && project.endDate && project.endDate < today) flags.push('OVERDUE');
  const { start, end } = fiscalYearRange(project.fiscalYear);
  if (active && today >= start && today <= end && summary.currentBudget > 0) {
    const target = (curve ?? monthlyTargetPct(project.quarterTargets))[fiscalMonthIndex(today) - 1];
    if (summary.spendingPct + 10 < target) flags.push('BEHIND_SPENDING');
  }
  if (active && project.startDate && project.startDate <= today) {
    const last = (project.lastProgressAt || project.startDate).slice(0, 10);
    const days = (Date.parse(today) - Date.parse(last)) / 86400000;
    if (days > 45) flags.push('NO_RECENT_REPORT');
  }
  return flags;
}
