/**
 * Import Center — ตรวจหัวตาราง จับคู่คอลัมน์ แปลงค่า และวางแผนการนำเข้า (ADR-004)
 * ทั้งหมดเป็น pure function: ใช้ร่วมกันใน Apps Script และโหมดสาธิตบนเบราว์เซอร์
 */
import { cleanText, normalizeKey } from './thai';
import { parseMoney, type Satang } from './money';
import { parseThaiDate } from './dates';
import { computeBudget, type BudgetSummary, EMPTY_SUMMARY } from './budget';
import type {
  Allocation, AllocationType, Disbursement, DisbursementStatus, FundingSource, ImportKind, Project,
  ProjectStatus, RowStatus, Workgroup, Activity,
} from './types';

export const IMPORT_FIELDS = [
  'projectCode', 'projectName', 'activityCode', 'activityName', 'workgroup', 'fundingSource', 'fiscalYear',
  'originalBudget', 'transferIn', 'transferOut', 'currentBudget', 'committed', 'disbursedCumulative', 'remaining',
  'startDate', 'endDate', 'ownerName', 'status', 'date', 'docNo', 'amount', 'description',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABEL: Record<ImportField, string> = {
  projectCode: 'รหัสโครงการ', projectName: 'ชื่อโครงการ', activityCode: 'รหัสกิจกรรม', activityName: 'ชื่อกิจกรรม',
  workgroup: 'กลุ่มงาน', fundingSource: 'แหล่งงบ', fiscalYear: 'ปีงบประมาณ',
  originalBudget: 'งบที่ได้รับ', transferIn: 'โอนเพิ่ม', transferOut: 'โอนลด', currentBudget: 'งบหลังปรับ',
  committed: 'ผูกพัน', disbursedCumulative: 'เบิกจ่ายสะสม', remaining: 'คงเหลือ',
  startDate: 'วันเริ่ม', endDate: 'วันสิ้นสุด', ownerName: 'ผู้รับผิดชอบ', status: 'สถานะ',
  date: 'วันที่', docNo: 'เลขที่เอกสาร', amount: 'จำนวนเงิน', description: 'รายการ/หมายเหตุ',
};

/** พจนานุกรมคำพ้องภาษาไทย/อังกฤษสำหรับหัวคอลัมน์ */
export const SYNONYMS: Record<ImportField, string[]> = {
  projectCode: ['รหัสโครงการ', 'รหัสงบประมาณ', 'projectcode', 'รหัส', 'code', 'รหัสแผนงาน'],
  projectName: ['ชื่อโครงการ', 'โครงการ', 'โครงการกิจกรรม', 'แผนงานโครงการ', 'project', 'projectname', 'ชื่อ'],
  activityCode: ['รหัสกิจกรรม', 'activitycode'],
  activityName: ['ชื่อกิจกรรม', 'กิจกรรม', 'activity', 'กิจกรรมย่อย'],
  workgroup: ['กลุ่มงาน', 'กลุ่มฝ่าย', 'ฝ่าย', 'กลุ่มงานรับผิดชอบ', 'หน่วยงานรับผิดชอบ', 'หน่วยงาน', 'workgroup'],
  fundingSource: ['แหล่งงบประมาณ', 'แหล่งงบ', 'แหล่งเงิน', 'ประเภทงบ', 'ประเภทงบประมาณ', 'fundingsource'],
  fiscalYear: ['ปีงบประมาณ', 'ปีงบ', 'fiscalyear', 'ปี'],
  originalBudget: [
    'งบประมาณที่ได้รับจัดสรร', 'งบประมาณที่ได้รับ', 'งบที่ได้รับ', 'ได้รับจัดสรร', 'งบจัดสรร', 'วงเงินงบประมาณ',
    'งบประมาณ', 'วงเงิน', 'allocated', 'budget',
  ],
  transferIn: ['โอนเพิ่ม', 'ปรับเพิ่ม', 'รับโอน', 'transferin'],
  transferOut: ['โอนลด', 'ปรับลด', 'โอนออก', 'โอนคืน', 'transferout'],
  currentBudget: ['งบประมาณหลังโอน', 'งบหลังปรับ', 'งบประมาณหลังปรับ', 'งบสุทธิ', 'งบประมาณสุทธิ', 'currentbudget'],
  committed: ['ผูกพัน', 'กันเงิน', 'ใบสั่งซื้อ', 'po', 'committed'],
  disbursedCumulative: [
    'เบิกจ่ายสะสม', 'ผลการเบิกจ่าย', 'เบิกจ่ายแล้ว', 'เบิกจ่าย', 'ผลการใช้จ่าย', 'ใช้จ่าย', 'disbursed',
  ],
  remaining: ['งบคงเหลือ', 'คงเหลือ', 'remaining'],
  startDate: ['วันเริ่มต้น', 'วันที่เริ่ม', 'วันเริ่ม', 'เริ่มต้น', 'startdate'],
  endDate: ['วันสิ้นสุด', 'สิ้นสุด', 'กำหนดเสร็จ', 'enddate'],
  ownerName: ['ผู้รับผิดชอบโครงการ', 'ผู้รับผิดชอบ', 'owner'],
  status: ['สถานะ', 'status'],
  date: ['วันที่เบิก', 'วันที่จ่าย', 'วันที่เอกสาร', 'วันที่', 'date'],
  docNo: ['เลขที่หนังสือ', 'เลขที่เอกสาร', 'เลขที่ขอเบิก', 'เลขที่ฎีกา', 'เลขที่', 'docno'],
  amount: ['จำนวนเงินเบิก', 'จำนวนเงิน', 'ยอดเบิก', 'ยอดเงิน', 'amount'],
  description: ['รายละเอียด', 'รายการ', 'หมายเหตุ', 'description'],
};

export type Mapping = Partial<Record<ImportField, number>>;

interface Candidate { field: ImportField; col: number; score: number }

function scoreHeader(header: string, field: ImportField): number {
  const h = normalizeKey(header);
  if (!h) return 0;
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    const s = normalizeKey(syn);
    if (!s) continue;
    if (h === s) best = Math.max(best, 100 + s.length);
    else if (s.length >= 3 && h.includes(s)) best = Math.max(best, 50 + s.length);
  }
  return best;
}

/** จับคู่คอลัมน์กับฟิลด์แบบ greedy (คะแนนสูงก่อน) — แต่ละฟิลด์/คอลัมน์ใช้ได้ครั้งเดียว */
export function autoMap(headers: ReadonlyArray<string>): { mapping: Mapping; score: number } {
  const cands: Candidate[] = [];
  headers.forEach((h, col) => {
    for (const field of IMPORT_FIELDS) {
      const score = scoreHeader(h, field);
      if (score > 0) cands.push({ field, col, score });
    }
  });
  cands.sort((a, b) => b.score - a.score || a.col - b.col);
  const mapping: Mapping = {};
  const usedCols = new Set<number>();
  let score = 0;
  for (const c of cands) {
    if (mapping[c.field] !== undefined || usedCols.has(c.col)) continue;
    mapping[c.field] = c.col;
    usedCols.add(c.col);
    score += c.score;
  }
  return { mapping, score };
}

export interface HeaderDetection {
  headerRow: number;
  /** จำนวนแถวหัวตาราง (1 หรือ 2 กรณีหัวตารางสองชั้น) */
  headerSpan: number;
  headers: string[];
  mapping: Mapping;
  kind: ImportKind | null;
}

/** หาแถวหัวตารางใน 15 แถวแรก รองรับหัวตาราง 2 ชั้น (merged cells) */
export function detectHeader(rows: ReadonlyArray<ReadonlyArray<unknown>>): HeaderDetection {
  let best: HeaderDetection = { headerRow: 0, headerSpan: 1, headers: [], mapping: {}, kind: null };
  let bestScore = 0;
  const limit = Math.min(rows.length, 15);
  for (let r = 0; r < limit; r++) {
    const single = rows[r].map((c) => cleanText(c, 120));
    const variants: Array<{ headers: string[]; span: number }> = [{ headers: single, span: 1 }];
    if (r + 1 < rows.length) {
      let carry = '';
      const combined = single.map((h, i) => {
        if (h) carry = h;
        const sub = cleanText(rows[r + 1][i], 120);
        if (!sub) return h;
        // หัวย่อยที่มีความหมายในตัวเอง (เช่น "รหัส") ใช้เดี่ยว ๆ; ไม่เช่นนั้นต่อท้ายหัวหลัก
        return autoMap([sub]).score >= 100 ? sub : `${h || carry} ${sub}`.trim();
      });
      variants.push({ headers: combined, span: 2 });
    }
    for (const v of variants) {
      const { mapping, score } = autoMap(v.headers);
      const fields = Object.keys(mapping).length;
      // ให้รางวัลจำนวนฟิลด์มากกว่าคะแนนข้อความ เพื่อไม่ให้แถวชื่อเรื่องชนะ
      const total = fields * 1000 + score - (v.span - 1) * 50;
      if (fields >= 2 && total > bestScore) {
        bestScore = total;
        best = { headerRow: r, headerSpan: v.span, headers: v.headers, mapping, kind: detectKind(mapping) };
      }
    }
  }
  return best;
}

export function detectKind(m: Mapping): ImportKind | null {
  const has = (f: ImportField) => m[f] !== undefined;
  const hasProject = has('projectCode') || has('projectName');
  if (has('amount') && hasProject && (has('date') || has('docNo')) && !has('originalBudget') && !has('currentBudget')) {
    return 'DISBURSEMENT_LIST';
  }
  if (hasProject && (has('originalBudget') || has('currentBudget') || has('disbursedCumulative'))) return 'BUDGET_SUMMARY';
  if (has('amount') && hasProject) return 'DISBURSEMENT_LIST';
  return null;
}

/* ---------------------------- normalize + plan ---------------------------- */

export interface ParsedRow {
  rowNo: number;
  projectCode: string;
  projectName: string;
  activityCode: string;
  activityName: string;
  workgroup: string;
  fundingSource: string;
  fiscalYear: number | null;
  money: Partial<Record<'originalBudget' | 'transferIn' | 'transferOut' | 'currentBudget' | 'committed' | 'disbursedCumulative' | 'remaining' | 'amount', Satang>>;
  startDate: string | null;
  endDate: string | null;
  ownerName: string;
  status: string;
  date: string | null;
  docNo: string;
  description: string;
  issues: string[];
}

const MONEY_FIELDS = ['originalBudget', 'transferIn', 'transferOut', 'currentBudget', 'committed', 'disbursedCumulative', 'remaining', 'amount'] as const;

/** แถวสรุปยอดรวม/ว่าง ไม่ต้องนำเข้า */
function isTotalRow(text: string): boolean {
  const k = normalizeKey(text);
  return /^(รวม|รวมทั้งสิ้น|รวมทั้งหมด|ยอดรวม|total|grandtotal|รวมทั้งสิน)/.test(k);
}

export function parseRows(
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  det: Pick<HeaderDetection, 'headerRow' | 'headerSpan' | 'mapping'>,
): ParsedRow[] {
  const out: ParsedRow[] = [];
  const m = det.mapping;
  const get = (row: ReadonlyArray<unknown>, f: ImportField): unknown => (m[f] === undefined ? '' : row[m[f]!]);
  for (let i = det.headerRow + det.headerSpan; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => cleanText(c) === '')) continue;
    const projectName = cleanText(get(row, 'projectName'), 300);
    const projectCode = cleanText(get(row, 'projectCode'), 60);
    if (isTotalRow(projectName) || isTotalRow(projectCode)) continue;
    const issues: string[] = [];
    const money: ParsedRow['money'] = {};
    for (const f of MONEY_FIELDS) {
      if (m[f] === undefined) continue;
      const p = parseMoney(get(row, f));
      if (!p.ok) issues.push(`${FIELD_LABEL[f]}: อ่านจำนวนเงินไม่ได้ "${cleanText(get(row, f), 40)}"`);
      else if (!p.empty) money[f] = p.satang;
    }
    const dateOf = (f: ImportField): string | null => {
      const v = get(row, f);
      if (cleanText(v) === '') return null;
      const iso = parseThaiDate(v);
      if (!iso) issues.push(`${FIELD_LABEL[f]}: อ่านวันที่ไม่ได้ "${cleanText(v, 40)}"`);
      return iso;
    };
    const fyRaw = cleanText(get(row, 'fiscalYear'), 10).replace(/\D/g, '');
    let fiscalYear: number | null = null;
    if (fyRaw) {
      const n = Number(fyRaw);
      fiscalYear = n >= 2500 && n <= 2700 ? n : n >= 1950 && n <= 2200 ? n + 543 : n >= 60 && n <= 99 ? 2500 + n : null;
      if (fiscalYear === null) issues.push(`ปีงบประมาณไม่ถูกต้อง "${fyRaw}"`);
    }
    out.push({
      rowNo: i + 1,
      projectCode, projectName,
      activityCode: cleanText(get(row, 'activityCode'), 60),
      activityName: cleanText(get(row, 'activityName'), 300),
      workgroup: cleanText(get(row, 'workgroup'), 120),
      fundingSource: cleanText(get(row, 'fundingSource'), 120),
      fiscalYear,
      money,
      startDate: dateOf('startDate'),
      endDate: dateOf('endDate'),
      ownerName: cleanText(get(row, 'ownerName'), 120),
      status: cleanText(get(row, 'status'), 40),
      date: dateOf('date'),
      docNo: cleanText(get(row, 'docNo'), 80),
      description: cleanText(get(row, 'description'), 300),
      issues,
    });
  }
  return out;
}

/* ------------------------------ matching ------------------------------ */

export function matchFundingSource(text: string, sources: ReadonlyArray<FundingSource>): FundingSource | null {
  const k = normalizeKey(text);
  if (!k) return null;
  for (const s of sources) {
    if ([s.code, s.name, s.shortName].some((x) => normalizeKey(x) === k)) return s;
  }
  // กลุ่มจังหวัด ต้องตรวจก่อน จังหวัด
  const byCode = (code: string) => sources.find((s) => s.code === code) ?? null;
  if (k.includes('กลุ่มจังหวัด') || k.includes('ภาคเหนือตอนล่าง')) return byCode('PROVGROUP');
  if (k.includes('จังหวัด') || k === 'จ' || k.includes('งบจ')) return byCode('PROVINCE');
  if (k.includes('กรม') || k.includes('กสก') || k.includes('doae')) return byCode('DOAE');
  return null;
}

export function matchWorkgroup(text: string, groups: ReadonlyArray<Workgroup>): Workgroup | null {
  const k = normalizeKey(text);
  if (!k) return null;
  const exact = groups.find((g) => normalizeKey(g.name) === k || normalizeKey(g.code) === k);
  if (exact) return exact;
  const stripped = k.replace(/^กลุ่มงาน|^กลุ่ม|^ฝ่าย/, '');
  const partial = groups.filter((g) => {
    const n = normalizeKey(g.name).replace(/^กลุ่มงาน|^กลุ่ม|^ฝ่าย/, '');
    return stripped.length >= 3 && (n.includes(stripped) || stripped.includes(n));
  });
  return partial.length === 1 ? partial[0] : null;
}

/** รหัสโครงการอัตโนมัติจากชื่อ (กรณีไฟล์ไม่มีรหัส) — คงที่สำหรับชื่อเดิม */
export function autoProjectCode(fiscalYear: number, name: string): string {
  let h = 2166136261;
  for (const ch of normalizeKey(name)) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `AUTO-${fiscalYear}-${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

/* -------------------------------- plan -------------------------------- */

export interface PlanProject {
  ref: string;
  fiscalYear: number;
  fundingSourceId: string;
  projectCode: string;
  name: string;
  workgroupId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}
export interface PlanActivity { ref: string; projectRef: string; activityCode: string; name: string }
export interface PlanAllocation { projectRef: string; activityRef: string; type: AllocationType; amountSatang: Satang; note: string }
export interface PlanDisbursement {
  projectRef: string; activityRef: string; status: DisbursementStatus; amountSatang: Satang;
  date: string; docNo: string; description: string; adjust: boolean;
}

export interface RowPlan {
  createProject?: PlanProject;
  updateProject?: { projectId: string; patch: Partial<Pick<Project, 'ownerName' | 'startDate' | 'endDate' | 'status'>> };
  createActivity?: PlanActivity;
  allocations: PlanAllocation[];
  disbursements: PlanDisbursement[];
}

export interface StagedRow {
  rowNo: number;
  status: RowStatus;
  messages: string[];
  label: string;
  plan: RowPlan;
  /** ผลต่อยอดเงินของโครงการ/กิจกรรม (สำหรับหน้า preview) */
  effect: { budgetDelta: Satang; disbursedDelta: Satang; committedDelta: Satang };
}

export interface PlanContext {
  kind: ImportKind;
  fiscalYear: number;
  fundingSourceId: string;
  fileLabel: string;
  workgroups: ReadonlyArray<Workgroup>;
  fundingSources: ReadonlyArray<FundingSource>;
  projects: ReadonlyArray<Project>;
  activities: ReadonlyArray<Activity>;
  allocations: ReadonlyArray<Allocation>;
  disbursements: ReadonlyArray<Disbursement>;
  /** null = ทุกกลุ่มงาน (Super/Mini Super) */
  allowedWorkgroupIds: ReadonlySet<string> | null;
  /** กลุ่มงานเริ่มต้นเมื่อไฟล์ไม่ระบุ (กรณี Admin มีกลุ่มงานเดียว) */
  defaultWorkgroupId: string;
  today: string;
}

const STATUS_WORDS: Array<[RegExp, ProjectStatus]> = [
  [/เสร็จ|แล้วเสร็จ|complete|done/, 'COMPLETED'],
  [/ยกเลิก|cancel/, 'CANCELLED'],
  [/ยังไม่|ไม่เริ่ม|plan/, 'PLANNED'],
  [/ดำเนินการ|กำลัง|progress/, 'IN_PROGRESS'],
];
function parseProjectStatus(s: string): ProjectStatus | null {
  const k = normalizeKey(s);
  if (!k) return null;
  for (const [re, st] of STATUS_WORDS) if (re.test(k)) return st;
  return null;
}
function parseDisbStatus(s: string): DisbursementStatus | null {
  const k = normalizeKey(s);
  if (!k) return null;
  if (/ผูกพัน|กันเงิน|po|commit/.test(k)) return 'COMMITTED';
  if (/จ่ายแล้ว|paid|โอนแล้ว/.test(k)) return 'PAID';
  if (/อนุมัติ|เบิก|approve/.test(k)) return 'APPROVED';
  if (/ยกเลิก|void/.test(k)) return 'VOID';
  return null;
}

/**
 * สร้างแผนนำเข้าทีละแถว พร้อมสถานะ VALID / WARNING / ERROR
 * - ไม่เขียนอะไร: commit จะทำตาม plan ภายใต้ lock
 * - ยอดเงินคำนวณสะสมระหว่างแถว (แถวหลังเห็นผลของแถวก่อน)
 */
export function planImport(parsed: ReadonlyArray<ParsedRow>, ctx: PlanContext): StagedRow[] {
  const result: StagedRow[] = [];
  const liveProjects = ctx.projects.filter((p) => !p.isDeleted);
  const liveActivities = ctx.activities.filter((a) => !a.isDeleted);
  const summaries = new Map<string, BudgetSummary>();
  const summaryKey = (projectId: string, activityId: string) => `${projectId}|${activityId}`;
  const existingSummary = (projectId: string, activityId: string): BudgetSummary => {
    const key = summaryKey(projectId, activityId);
    if (!summaries.has(key)) {
      if (!projectId.startsWith('new:')) {
        const allocs = ctx.allocations.filter((a) => a.projectId === projectId && (activityId === '*' || a.activityId === activityId));
        const disbs = ctx.disbursements.filter((d) => d.projectId === projectId && (activityId === '*' || d.activityId === activityId));
        summaries.set(key, computeBudget(allocs, disbs));
      } else summaries.set(key, { ...EMPTY_SUMMARY });
    }
    return summaries.get(key)!;
  };
  const bump = (projectId: string, activityId: string, budget: Satang, disbursed: Satang, committed: Satang) => {
    for (const aid of new Set([activityId, '*'])) {
      const s = existingSummary(projectId, aid);
      s.currentBudget += budget;
      s.disbursed += disbursed;
      s.committed += committed;
      s.remaining = s.currentBudget - s.disbursed;
    }
  };
  const newProjects = new Map<string, PlanProject>();
  const newActivities = new Map<string, PlanActivity>();
  const seenRowKeys = new Set<string>();
  const existingDisbKeys = new Set(
    ctx.disbursements.filter((d) => !d.isDeleted && d.status !== 'VOID')
      .map((d) => `${d.projectId}|${normalizeKey(d.docNo)}|${d.date}|${d.amountSatang}`),
  );

  for (const r of parsed) {
    const messages = [...r.issues];
    let hardError = r.issues.length > 0;
    let warn = false;
    const plan: RowPlan = { allocations: [], disbursements: [] };
    const effect = { budgetDelta: 0, disbursedDelta: 0, committedDelta: 0 };
    const label = [r.projectCode, r.projectName, r.activityName].filter(Boolean).join(' · ') || `แถว ${r.rowNo}`;
    const fy = r.fiscalYear ?? ctx.fiscalYear;

    let fundingSourceId = ctx.fundingSourceId;
    if (r.fundingSource) {
      const fs = matchFundingSource(r.fundingSource, ctx.fundingSources);
      if (fs) fundingSourceId = fs.id;
      else { messages.push(`ไม่รู้จักแหล่งงบ "${r.fundingSource}"`); hardError = true; }
    }
    if (!fundingSourceId) { messages.push('ไม่ระบุแหล่งงบ — เลือกแหล่งงบของไฟล์'); hardError = true; }

    if (!r.projectCode && !r.projectName) {
      messages.push('ไม่มีรหัสหรือชื่อโครงการ');
      result.push({ rowNo: r.rowNo, status: 'ERROR', messages, label, plan, effect });
      continue;
    }

    // ค้นหาโครงการ: รหัสก่อน แล้วจึงชื่อ (ภายในปีงบ + แหล่งงบ)
    const sameScope = liveProjects.filter((p) => p.fiscalYear === fy && p.fundingSourceId === fundingSourceId);
    let project: Project | undefined = r.projectCode
      ? sameScope.find((p) => normalizeKey(p.projectCode) === normalizeKey(r.projectCode))
      : undefined;
    if (!project && r.projectName) {
      const byName = sameScope.filter((p) => normalizeKey(p.name) === normalizeKey(r.projectName));
      if (byName.length === 1 && (!r.projectCode || byName[0].projectCode.startsWith('AUTO-'))) project = byName[0];
    }
    const projectCode = r.projectCode || (project?.projectCode ?? autoProjectCode(fy, r.projectName));
    const newKey = `${fy}|${fundingSourceId}|${normalizeKey(projectCode)}`;
    let projectRef = project?.id ?? '';
    let workgroupId = project?.workgroupId ?? '';

    if (r.workgroup) {
      const wg = matchWorkgroup(r.workgroup, ctx.workgroups);
      if (wg) {
        if (project && project.workgroupId !== wg.id) {
          messages.push(`กลุ่มงานในไฟล์ (${wg.name}) ต่างจากในระบบ — ใช้ค่าในระบบ`);
          warn = true;
        } else workgroupId = wg.id;
      } else if (!project) { messages.push(`ไม่รู้จักกลุ่มงาน "${r.workgroup}"`); hardError = true; }
    }
    if (!workgroupId && ctx.defaultWorkgroupId) workgroupId = ctx.defaultWorkgroupId;

    if (!project) {
      if (ctx.kind === 'DISBURSEMENT_LIST') {
        messages.push(`ไม่พบโครงการ "${r.projectCode || r.projectName}" ในปีงบ ${fy}`);
        hardError = true;
      } else if (!r.projectName && !newProjects.has(newKey)) {
        messages.push('โครงการใหม่ต้องมีชื่อโครงการ');
        hardError = true;
      } else {
        if (!workgroupId) { messages.push('ไม่ระบุกลุ่มงานของโครงการใหม่'); hardError = true; }
        if (!r.projectCode) { messages.push(`ไม่มีรหัสโครงการ — ระบบตั้งรหัส ${projectCode}`); warn = true; }
        projectRef = `new:${newKey}`;
        if (!newProjects.has(newKey)) {
          const p: PlanProject = {
            ref: projectRef, fiscalYear: fy, fundingSourceId, projectCode, name: r.projectName, workgroupId,
            ownerName: r.ownerName, startDate: r.startDate ?? '', endDate: r.endDate ?? '',
            status: parseProjectStatus(r.status) ?? 'IN_PROGRESS',
          };
          newProjects.set(newKey, p);
          plan.createProject = p;
          messages.push('สร้างโครงการใหม่');
        }
      }
    } else if (ctx.kind === 'BUDGET_SUMMARY') {
      const patch: NonNullable<RowPlan['updateProject']>['patch'] = {};
      if (r.ownerName && r.ownerName !== project.ownerName) patch.ownerName = r.ownerName;
      if (r.startDate && r.startDate !== project.startDate) patch.startDate = r.startDate;
      if (r.endDate && r.endDate !== project.endDate) patch.endDate = r.endDate;
      const st = parseProjectStatus(r.status);
      if (st && st !== project.status) patch.status = st;
      if (Object.keys(patch).length) plan.updateProject = { projectId: project.id, patch };
    }

    if (workgroupId && ctx.allowedWorkgroupIds && !ctx.allowedWorkgroupIds.has(workgroupId)) {
      messages.push('อยู่นอกกลุ่มงานที่คุณมีสิทธิ์');
      hardError = true;
    }

    // กิจกรรม (ถ้ามี)
    let activityRef = '';
    if (r.activityCode || r.activityName) {
      const acts = project ? liveActivities.filter((a) => a.projectId === project!.id) : [];
      const act = acts.find((a) => (r.activityCode && normalizeKey(a.activityCode) === normalizeKey(r.activityCode)) ||
        (!r.activityCode && normalizeKey(a.name) === normalizeKey(r.activityName)));
      if (act) activityRef = act.id;
      else if (ctx.kind === 'DISBURSEMENT_LIST') {
        messages.push(`ไม่พบกิจกรรม "${r.activityCode || r.activityName}" — บันทึกที่ระดับโครงการ`);
        warn = true;
      } else if (r.activityName) {
        const code = r.activityCode || String(acts.length + [...newActivities.values()].filter((a) => a.projectRef === projectRef).length + 1).padStart(2, '0');
        const aKey = `${projectRef}|${normalizeKey(code)}`;
        activityRef = `new:${aKey}`;
        if (!newActivities.has(aKey)) {
          const a: PlanActivity = { ref: activityRef, projectRef, activityCode: code, name: r.activityName };
          newActivities.set(aKey, a);
          plan.createActivity = a;
        }
      }
    }

    const rowKey = `${projectRef}|${activityRef}`;
    if (ctx.kind === 'BUDGET_SUMMARY') {
      if (seenRowKeys.has(rowKey)) {
        messages.push('โครงการ/กิจกรรมนี้ซ้ำกับแถวก่อนหน้าในไฟล์');
        hardError = true;
      }
      seenRowKeys.add(rowKey);
    }

    if (!hardError && projectRef) {
      const cur = existingSummary(projectRef, activityRef || '*');
      if (ctx.kind === 'BUDGET_SUMMARY') {
        const mny = { ...r.money };
        // รายงานราชการมักแสดงโอนลดเป็น "(100,000)" หรือ "-100,000" — คอลัมน์โอนลดหมายถึงการลดเสมอ
        if (mny.transferOut !== undefined) mny.transferOut = Math.abs(mny.transferOut);
        if (mny.transferIn !== undefined && mny.transferIn < 0) {
          messages.push('โอนเพิ่มเป็นค่าติดลบ — ถ้าเป็นการโอนลดให้ใส่ในคอลัมน์โอนลด');
          hardError = true;
        }
        for (const f of ['originalBudget', 'currentBudget', 'committed', 'disbursedCumulative'] as const) {
          if ((mny[f] ?? 0) < 0) { messages.push(`${FIELD_LABEL[f]}ติดลบ`); hardError = true; }
        }
        let target: Satang | null = null;
        if (hardError) target = null; else
        if (mny.currentBudget !== undefined) target = mny.currentBudget;
        else if (mny.originalBudget !== undefined) target = mny.originalBudget + (mny.transferIn ?? 0) - (mny.transferOut ?? 0);
        if (target !== null) {
          if (target < 0) { messages.push('งบประมาณติดลบ'); hardError = true; }
          else if (cur.currentBudget === 0) {
            const orig = mny.originalBudget ?? target;
            if (orig > 0) plan.allocations.push({ projectRef, activityRef, type: 'ORIGINAL', amountSatang: orig, note: `นำเข้าจาก ${ctx.fileLabel}` });
            if (mny.originalBudget !== undefined) {
              if (mny.transferIn) plan.allocations.push({ projectRef, activityRef, type: 'TRANSFER_IN', amountSatang: mny.transferIn, note: `นำเข้าจาก ${ctx.fileLabel}` });
              if (mny.transferOut) plan.allocations.push({ projectRef, activityRef, type: 'TRANSFER_OUT', amountSatang: mny.transferOut, note: `นำเข้าจาก ${ctx.fileLabel}` });
            }
            effect.budgetDelta = target;
          } else if (target !== cur.currentBudget) {
            const diff = target - cur.currentBudget;
            plan.allocations.push({
              projectRef, activityRef, type: diff > 0 ? 'TRANSFER_IN' : 'TRANSFER_OUT', amountSatang: Math.abs(diff),
              note: `ปรับตามไฟล์นำเข้า ${ctx.fileLabel}`,
            });
            effect.budgetDelta = diff;
            messages.push(`งบประมาณเปลี่ยนจากเดิม (${diff > 0 ? '+' : ''}${(diff / 100).toLocaleString('th-TH')} บาท)`);
            warn = true;
          }
        }
        const pairs: Array<['disbursedCumulative' | 'committed', DisbursementStatus, number]> = [
          ['disbursedCumulative', 'APPROVED', cur.disbursed],
          ['committed', 'COMMITTED', cur.committed],
        ];
        for (const [field, status, existing] of pairs) {
          const v = mny[field];
          if (v === undefined) continue;
          const diff = v - existing;
          if (diff > 0) {
            plan.disbursements.push({
              projectRef, activityRef, status, amountSatang: diff, date: ctx.today, docNo: '',
              description: `ปรับยอด${status === 'COMMITTED' ? 'ผูกพัน' : 'เบิกจ่ายสะสม'}ตามไฟล์ ${ctx.fileLabel}`, adjust: true,
            });
            if (status === 'COMMITTED') effect.committedDelta = diff; else effect.disbursedDelta = diff;
          } else if (diff < 0) {
            messages.push(`${FIELD_LABEL[field]}ในไฟล์น้อยกว่าในระบบ ${(-diff / 100).toLocaleString('th-TH')} บาท — ไม่ปรับลดอัตโนมัติ`);
            warn = true;
          }
        }
        const after = cur.currentBudget + effect.budgetDelta - (cur.disbursed + effect.disbursedDelta);
        if (mny.remaining !== undefined && mny.remaining !== after) {
          messages.push(`คงเหลือในไฟล์ไม่ตรงกับที่คำนวณได้ (${(after / 100).toLocaleString('th-TH')} บาท)`);
          warn = true;
        }
        if (after < 0) { messages.push('เบิกจ่ายเกินงบประมาณ'); hardError = true; }
      } else {
        const amount = r.money.amount;
        if (amount === undefined || amount === 0) { messages.push('ไม่มีจำนวนเงิน'); hardError = true; }
        else if (amount < 0) { messages.push('จำนวนเงินติดลบ — ใช้การยกเลิกรายการแทน'); hardError = true; }
        if (!r.date) { messages.push('ไม่มีวันที่'); hardError = true; }
        const status = parseDisbStatus(r.status) ?? 'APPROVED';
        if (status === 'VOID') { messages.push('รายการสถานะยกเลิก — ข้าม'); warn = true; }
        else if (!hardError && amount) {
          const dupKey = `${projectRef}|${normalizeKey(r.docNo)}|${r.date}|${amount}`;
          if (existingDisbKeys.has(dupKey)) {
            messages.push('มีรายการนี้ในระบบแล้ว — ข้าม');
            warn = true;
          } else {
            existingDisbKeys.add(dupKey);
            const disbursedAdd = status === 'COMMITTED' ? 0 : amount;
            if (cur.remaining - disbursedAdd < 0) { messages.push('เบิกจ่ายเกินงบประมาณคงเหลือ'); hardError = true; }
            else {
              plan.disbursements.push({
                projectRef, activityRef, status, amountSatang: amount, date: r.date!, docNo: r.docNo,
                description: r.description, adjust: false,
              });
              effect.disbursedDelta = disbursedAdd;
              effect.committedDelta = status === 'COMMITTED' ? amount : 0;
            }
          }
        }
      }
      if (!hardError) bump(projectRef, activityRef || '*', effect.budgetDelta, effect.disbursedDelta, effect.committedDelta);
    }

    if (hardError) {
      const i = messages.indexOf('สร้างโครงการใหม่');
      if (i >= 0) messages.splice(i, 1);
      plan.allocations = [];
      plan.disbursements = [];
      delete plan.createProject;
      delete plan.createActivity;
      delete plan.updateProject;
      if (newProjects.get(newKey)?.ref === projectRef && !result.some((x) => x.plan.createProject?.ref === projectRef)) {
        newProjects.delete(newKey);
      }
      if (activityRef.startsWith('new:') && !result.some((x) => x.plan.createActivity?.ref === activityRef)) {
        newActivities.delete(activityRef.slice(4));
      }
    }
    const status: RowStatus = hardError ? 'ERROR' : warn ? 'WARNING' : 'VALID';
    result.push({ rowNo: r.rowNo, status, messages, label, plan, effect });
  }
  return result;
}

export function summarizeStaged(rows: ReadonlyArray<StagedRow>) {
  let valid = 0, warning = 0, error = 0, budgetDelta = 0, disbursedDelta = 0, newProjects = 0;
  for (const r of rows) {
    if (r.status === 'VALID') valid++;
    else if (r.status === 'WARNING') warning++;
    else error++;
    if (r.status !== 'ERROR') {
      budgetDelta += r.effect.budgetDelta;
      disbursedDelta += r.effect.disbursedDelta;
      if (r.plan.createProject) newProjects++;
    }
  }
  return { total: rows.length, valid, warning, error, budgetDelta, disbursedDelta, newProjects };
}
