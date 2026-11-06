/** โครงการ กิจกรรม ผลการดำเนินงาน + การคำนวณยอดเงินจากธุรกรรม */
import {
  AppError, ALLOCATION_TYPES, PROJECT_STATUSES, cleanText, computeBudget, currentFiscalYear, monthlyCumulative,
  monthlyTargetPct, parseThaiDate, riskFlags, todayBangkok,
  type Activity, type Allocation, type Attachment, type AuditLog, type BudgetSummary, type Disbursement,
  type FundingSource, type ProgressReport, type Project, type ProjectDetail, type ProjectListItem, type Workgroup,
} from '@kpp/domain';
import { canAccessWorkgroup, requireRole, requireWorkgroup } from '../auth';
import { activityUnitsOf, listUnits, provinceUnitId } from './units';
import {
  actor, audit, bumpDataVersion, findById, findByIdempotency, getSettings, live, newMeta, nowIso, updateVersioned, type Ctx,
} from '../context';

export interface Dataset {
  projects: Project[];
  activities: Activity[];
  allocations: Allocation[];
  disbursements: Disbursement[];
}

export function loadDataset(ctx: Ctx): Dataset {
  return {
    projects: live(ctx.env.db.list<Project>('Projects')),
    activities: live(ctx.env.db.list<Activity>('Activities')),
    allocations: live(ctx.env.db.list<Allocation>('Allocations')),
    disbursements: live(ctx.env.db.list<Disbursement>('Disbursements')),
  };
}

/** index ธุรกรรมตาม projectId เพื่อคำนวณครั้งเดียว O(n) */
export function budgetsByProject(ds: Dataset): Map<string, BudgetSummary> {
  const a = new Map<string, Allocation[]>();
  const d = new Map<string, Disbursement[]>();
  for (const x of ds.allocations) (a.get(x.projectId) ?? a.set(x.projectId, []).get(x.projectId)!).push(x);
  for (const x of ds.disbursements) (d.get(x.projectId) ?? d.set(x.projectId, []).get(x.projectId)!).push(x);
  const out = new Map<string, BudgetSummary>();
  for (const p of ds.projects) out.set(p.id, computeBudget(a.get(p.id) ?? [], d.get(p.id) ?? []));
  return out;
}

export function projectBudget(ctx: Ctx, projectId: string, activityId?: string): BudgetSummary {
  const allocs = live(ctx.env.db.list<Allocation>('Allocations')).filter((x) => x.projectId === projectId && (!activityId || x.activityId === activityId));
  const disbs = live(ctx.env.db.list<Disbursement>('Disbursements')).filter((x) => x.projectId === projectId && (!activityId || x.activityId === activityId));
  return computeBudget(allocs, disbs);
}

export function today(ctx: Ctx): string {
  return todayBangkok(ctx.env.now());
}

/* ---------------------------------- read ---------------------------------- */

export function listProjects(ctx: Ctx, b: { fiscalYear?: number }): ProjectListItem[] {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const ds = loadDataset(ctx);
  const fy = Number(b.fiscalYear) || 0;
  const budgets = budgetsByProject(ds);
  const t = today(ctx);
  return ds.projects
    .filter((p) => (!fy || Number(p.fiscalYear) === fy) && canAccessWorkgroup(u, p.workgroupId))
    .map((p) => {
      const budget = budgets.get(p.id)!;
      return { ...p, budget, risks: riskFlags(p, budget, t) };
    })
    .sort((x, y) => y.fiscalYear - x.fiscalYear || x.projectCode.localeCompare(y.projectCode, 'th'));
}

export function getProject(ctx: Ctx, b: { id: string }): ProjectDetail {
  const p = findById<Project>(ctx, 'Projects', String(b.id), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId); // IDOR: ตรวจ scope จากข้อมูลจริงที่ server
  const activities = live(ctx.env.db.list<Activity>('Activities')).filter((a) => a.projectId === p.id);
  const allocations = ctx.env.db.list<Allocation>('Allocations').filter((a) => a.projectId === p.id);
  const disbursements = ctx.env.db.list<Disbursement>('Disbursements').filter((d) => d.projectId === p.id);
  const budget = computeBudget(live(allocations), live(disbursements));
  const shares = activityUnitsOf(ctx);
  return {
    project: p,
    budget,
    risks: riskFlags(p, budget, today(ctx)),
    activities: activities
      .map((a) => ({
        ...a,
        budget: computeBudget(live(allocations).filter((x) => x.activityId === a.id), live(disbursements).filter((x) => x.activityId === a.id)),
        units: shares.filter((s) => s.activityId === a.id),
      }))
      .sort((x, y) => x.activityCode.localeCompare(y.activityCode, 'th')),
    allocations: allocations.sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
    disbursements: disbursements.sort((x, y) => (y.date || '').localeCompare(x.date || '') || y.createdAt.localeCompare(x.createdAt)),
    progress: live(ctx.env.db.list<ProgressReport>('ProgressReports')).filter((r) => r.projectId === p.id).sort((x, y) => y.reportDate.localeCompare(x.reportDate)),
    attachments: live(ctx.env.db.list<Attachment>('Attachments')).filter((f) => f.projectId === p.id)
      .map(({ ocrText: _omit, ...rest }) => rest),
    audit: ctx.env.db.list<AuditLog>('AuditLogs').filter((l) => l.projectId === p.id || l.entityId === p.id)
      .sort((x, y) => y.at.localeCompare(x.at)).slice(0, 100),
    monthly: { disbursedCumulative: monthlyCumulative(live(disbursements), p.fiscalYear), targetPct: monthlyTargetPct(p.quarterTargets) },
  };
}

/* --------------------------------- write ---------------------------------- */

function validDate(v: unknown, label: string, required = false): string {
  const s = cleanText(v, 40);
  if (!s) {
    if (required) throw new AppError('VALIDATION_FAILED', `กรุณาระบุ${label}`);
    return '';
  }
  const iso = parseThaiDate(s);
  if (!iso) throw new AppError('VALIDATION_FAILED', `${label}ไม่ถูกต้อง`);
  return iso;
}

function validMoney(v: unknown, label: string): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new AppError('VALIDATION_FAILED', `${label}ต้องเป็นจำนวนเงินมากกว่า 0`);
  if (n > 100_000_000_000_00) throw new AppError('VALIDATION_FAILED', `${label}สูงเกินไป`);
  return n;
}

function cleanProjectInput(ctx: Ctx, input: Partial<Project>, base?: Project): Partial<Project> {
  const out: Partial<Project> = {};
  if (input.name !== undefined) {
    out.name = cleanText(input.name, 300);
    if (out.name.length < 3) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อโครงการ');
  }
  if (input.projectCode !== undefined) {
    out.projectCode = cleanText(input.projectCode, 60);
    if (!out.projectCode) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกรหัสโครงการ');
  }
  if (input.fiscalYear !== undefined) {
    out.fiscalYear = Number(input.fiscalYear);
    if (!Number.isInteger(out.fiscalYear) || out.fiscalYear < 2560 || out.fiscalYear > 2650) throw new AppError('VALIDATION_FAILED', 'ปีงบประมาณไม่ถูกต้อง');
  }
  if (input.fundingSourceId !== undefined) {
    if (!live(ctx.env.db.list<FundingSource>('FundingSources')).some((f) => f.id === input.fundingSourceId)) throw new AppError('VALIDATION_FAILED', 'แหล่งงบไม่ถูกต้อง');
    out.fundingSourceId = String(input.fundingSourceId);
  }
  if (input.workgroupId !== undefined) {
    if (!live(ctx.env.db.list<Workgroup>('Workgroups')).some((g) => g.id === input.workgroupId)) throw new AppError('VALIDATION_FAILED', 'กลุ่มงานไม่ถูกต้อง');
    requireWorkgroup(ctx, String(input.workgroupId));
    out.workgroupId = String(input.workgroupId);
  }
  if (input.ownerName !== undefined) out.ownerName = cleanText(input.ownerName, 120);
  if (input.description !== undefined) out.description = cleanText(input.description, 2000);
  if (input.startDate !== undefined) out.startDate = validDate(input.startDate, 'วันเริ่มต้น');
  if (input.endDate !== undefined) out.endDate = validDate(input.endDate, 'วันสิ้นสุด');
  const start = out.startDate ?? base?.startDate;
  const end = out.endDate ?? base?.endDate;
  if (start && end && end < start) throw new AppError('VALIDATION_FAILED', 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
  if (input.status !== undefined) {
    if (!PROJECT_STATUSES.includes(input.status)) throw new AppError('VALIDATION_FAILED', 'สถานะไม่ถูกต้อง');
    out.status = input.status;
  }
  if (input.physicalProgress !== undefined) {
    const n = Number(input.physicalProgress);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new AppError('VALIDATION_FAILED', 'ร้อยละผลการดำเนินงานต้องอยู่ระหว่าง 0–100');
    out.physicalProgress = Math.round(n * 100) / 100;
  }
  if (input.quarterTargets !== undefined) {
    const q = String(input.quarterTargets).split(',').map((x) => Number(x.trim()));
    if (q.length !== 4 || q.some((n, i) => !Number.isFinite(n) || n < 0 || n > 100 || (i > 0 && n < q[i - 1]))) {
      throw new AppError('VALIDATION_FAILED', 'เป้าหมายรายไตรมาสต้องเป็นตัวเลข 4 ค่าเรียงจากน้อยไปมาก เช่น 30,55,80,100');
    }
    out.quarterTargets = q.join(',');
  }
  if (input.published !== undefined) out.published = Boolean(input.published);
  return out;
}

function assertUniqueCode(ctx: Ctx, p: Pick<Project, 'fiscalYear' | 'fundingSourceId' | 'projectCode' | 'id'>): void {
  const dup = live(ctx.env.db.list<Project>('Projects')).find((x) =>
    x.id !== p.id && Number(x.fiscalYear) === Number(p.fiscalYear) && x.fundingSourceId === p.fundingSourceId &&
    x.projectCode.toLowerCase() === p.projectCode.toLowerCase());
  if (dup) throw new AppError('VALIDATION_FAILED', `รหัสโครงการ ${p.projectCode} มีอยู่แล้วในปีงบและแหล่งงบนี้`);
}

export function createProject(ctx: Ctx, b: Partial<Project> & { idempotencyKey: string; originalBudgetSatang?: number }): Project {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const existing = findByIdempotency<Project>(ctx, 'Projects', String(b.idempotencyKey));
  if (existing) return existing;
  const u = actor(ctx);
  const input = cleanProjectInput(ctx, {
    fiscalYear: b.fiscalYear ?? currentFiscalYear(ctx.env.now()),
    fundingSourceId: b.fundingSourceId,
    workgroupId: b.workgroupId ?? (u.workgroupIds?.length === 1 ? u.workgroupIds[0] : undefined),
    projectCode: b.projectCode, name: b.name, ownerName: b.ownerName ?? '', description: b.description ?? '',
    startDate: b.startDate ?? '', endDate: b.endDate ?? '', status: b.status ?? 'PLANNED',
    physicalProgress: 0, quarterTargets: b.quarterTargets || getSettings(ctx).defaultQuarterTargets, published: b.published ?? true,
  });
  if (!input.workgroupId) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกกลุ่มงาน');
  if (!input.fundingSourceId) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกแหล่งงบ');
  // ลิงก์ไปแผนงบประมาณตั้งได้จาก service แผนเท่านั้น: อ่านจาก Symbol ซึ่ง JSON จาก client สร้างไม่ได้
  const { planDocId, planNodeSeq } = planLinkOf(b);
  const fromPlan = { planDocId, planNodeSeq };
  const project = { ...newMeta(ctx), lastProgressAt: '', idempotencyKey: String(b.idempotencyKey), ...fromPlan, ...input } as Project;
  assertUniqueCode(ctx, project);
  ctx.env.db.insert('Projects', [project as unknown as Record<string, unknown>]);
  audit(ctx, 'project.create', 'Project', project.id, { after: project, projectId: project.id });
  if (b.originalBudgetSatang) {
    createAllocation(ctx, {
      projectId: project.id, type: 'ORIGINAL', amountSatang: Number(b.originalBudgetSatang),
      note: 'งบที่ได้รับจัดสรรตอนสร้างโครงการ', idempotencyKey: `${b.idempotencyKey}:orig`,
    });
  }
  bumpDataVersion(ctx);
  return project;
}

export function updateProject(ctx: Ctx, b: { id: string; version: number; patch: Partial<Project> }): Project {
  const cur = findById<Project>(ctx, 'Projects', String(b.id), 'โครงการ');
  requireWorkgroup(ctx, cur.workgroupId);
  const patch = cleanProjectInput(ctx, b.patch ?? {}, cur);
  const next = updateVersioned(ctx, 'Projects', cur, Number(b.version), patch);
  if (patch.projectCode || patch.fiscalYear || patch.fundingSourceId) assertUniqueCode(ctx, next);
  audit(ctx, 'project.update', 'Project', cur.id, { before: cur, after: next, projectId: cur.id });
  bumpDataVersion(ctx);
  return next;
}

/** soft delete — เฉพาะโครงการที่ไม่มีรายการเบิกจ่ายที่ยังมีผล */
export function deleteProject(ctx: Ctx, b: { id: string; version: number; reason: string }): { ok: true } {
  const cur = findById<Project>(ctx, 'Projects', String(b.id), 'โครงการ');
  requireWorkgroup(ctx, cur.workgroupId);
  const reason = cleanText(b.reason, 300);
  if (!reason) throw new AppError('VALIDATION_FAILED', 'กรุณาระบุเหตุผลการลบ');
  const budget = projectBudget(ctx, cur.id);
  if (budget.disbursed > 0 || budget.committed > 0) {
    throw new AppError('VALIDATION_FAILED', 'โครงการมีรายการเบิกจ่าย/ผูกพันแล้ว ให้ยกเลิกรายการก่อน หรือเปลี่ยนสถานะเป็น "ยกเลิก"');
  }
  updateVersioned(ctx, 'Projects', cur, Number(b.version), { isDeleted: true });
  audit(ctx, 'project.delete', 'Project', cur.id, { before: cur, projectId: cur.id, reason });
  bumpDataVersion(ctx);
  return { ok: true };
}

export function createActivity(ctx: Ctx, b: { projectId: string; activityCode?: string; name: string; startDate?: string; endDate?: string; idempotencyKey: string; unit?: string; targetQty?: number }): Activity {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const existing = findByIdempotency<Activity>(ctx, 'Activities', String(b.idempotencyKey));
  if (existing) return existing;
  const acts = live(ctx.env.db.list<Activity>('Activities')).filter((a) => a.projectId === p.id);
  const code = cleanText(b.activityCode, 40) || String(acts.length + 1).padStart(2, '0');
  if (acts.some((a) => a.activityCode.toLowerCase() === code.toLowerCase())) throw new AppError('VALIDATION_FAILED', `รหัสกิจกรรม ${code} ซ้ำในโครงการนี้`);
  const name = cleanText(b.name, 300);
  if (name.length < 2) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อกิจกรรม');
  const a: Activity = {
    ...newMeta(ctx), projectId: p.id, activityCode: code, name, startDate: validDate(b.startDate, 'วันเริ่มต้น'),
    endDate: validDate(b.endDate, 'วันสิ้นสุด'), status: 'PLANNED', progressPct: 0, idempotencyKey: String(b.idempotencyKey),
    planItemId: planLinkOf(b).planItemId ?? '', unit: cleanText(b.unit, 40), targetQty: Math.max(0, Number(b.targetQty) || 0),
    planQuarters: '',
  };
  ctx.env.db.insert('Activities', [a as unknown as Record<string, unknown>]);
  audit(ctx, 'activity.create', 'Activity', a.id, { after: a, projectId: p.id });
  bumpDataVersion(ctx);
  return a;
}

export function updateActivity(ctx: Ctx, b: { id: string; version: number; patch: Partial<Activity> }): Activity {
  const cur = findById<Activity>(ctx, 'Activities', String(b.id), 'กิจกรรม');
  const p = findById<Project>(ctx, 'Projects', cur.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const patch: Partial<Activity> = {};
  const src = b.patch ?? {};
  if (src.name !== undefined) patch.name = cleanText(src.name, 300);
  if (src.startDate !== undefined) patch.startDate = validDate(src.startDate, 'วันเริ่มต้น');
  if (src.endDate !== undefined) patch.endDate = validDate(src.endDate, 'วันสิ้นสุด');
  if (src.status !== undefined) {
    if (!PROJECT_STATUSES.includes(src.status)) throw new AppError('VALIDATION_FAILED', 'สถานะไม่ถูกต้อง');
    patch.status = src.status;
  }
  const next = updateVersioned(ctx, 'Activities', cur, Number(b.version), patch);
  audit(ctx, 'activity.update', 'Activity', cur.id, { before: cur, after: next, projectId: p.id });
  bumpDataVersion(ctx);
  return next;
}

/* ------------------------------- allocations ------------------------------ */

/**
 * หน่วยดำเนินการของรายการเบิกจ่าย: ต้องเป็นหน่วยที่กิจกรรมแบ่งงบให้
 * ไม่ระบุ: ถ้ากิจกรรมมีหน่วยเดียวใช้หน่วยนั้น ไม่เช่นนั้นว่าง (= สำนักงานเกษตรจังหวัด)
 */
function checkUnit(ctx: Ctx, activityId: string, unitId?: string): string {
  const shares = activityId ? activityUnitsOf(ctx, activityId) : [];
  const id = cleanText(unitId, 60);
  if (!id) return shares.length === 1 ? shares[0].unitId : '';
  const units = listUnits(ctx);
  if (!units.some((u) => u.id === id)) throw new AppError('VALIDATION_FAILED', 'หน่วยดำเนินการไม่ถูกต้อง');
  const pao = provinceUnitId(units);
  if (shares.length && !shares.some((s) => s.unitId === id)) throw new AppError('VALIDATION_FAILED', 'หน่วยนี้ไม่ได้รับงบของกิจกรรมนี้');
  if (!shares.length && id !== pao) throw new AppError('VALIDATION_FAILED', 'กิจกรรมนี้ยังไม่ได้แบ่งงบให้อำเภอ — กำหนดในหน้า "แผนและผู้รับผิดชอบ"');
  return id === pao && !shares.length ? '' : id;
}

function checkActivity(ctx: Ctx, projectId: string, activityId?: string): string {
  if (!activityId) return '';
  const a = findById<Activity>(ctx, 'Activities', activityId, 'กิจกรรม');
  if (a.projectId !== projectId) throw new AppError('VALIDATION_FAILED', 'กิจกรรมไม่อยู่ในโครงการนี้');
  return a.id;
}

export function createAllocation(ctx: Ctx, b: { projectId: string; activityId?: string; type: Allocation['type']; amountSatang: number; date?: string; docNo?: string; note?: string; idempotencyKey: string; source?: string }): Allocation {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const existing = findByIdempotency<Allocation>(ctx, 'Allocations', String(b.idempotencyKey));
  if (existing) return existing;
  if (!ALLOCATION_TYPES.includes(b.type)) throw new AppError('VALIDATION_FAILED', 'ประเภทงบไม่ถูกต้อง');
  const amount = validMoney(b.amountSatang, 'จำนวนเงิน');
  const activityId = checkActivity(ctx, p.id, b.activityId);
  if (b.type === 'TRANSFER_OUT') {
    const s = projectBudget(ctx, p.id);
    if (s.remaining - amount < 0 && actor(ctx).role !== 'superadmin') {
      throw new AppError('BUDGET_EXCEEDED', 'โอนออกแล้วงบคงเหลือติดลบ — ต้องให้ Super Admin ดำเนินการ');
    }
  }
  const row: Allocation = {
    ...newMeta(ctx), projectId: p.id, activityId, type: b.type, amountSatang: amount,
    date: validDate(b.date || today(ctx), 'วันที่'), docNo: cleanText(b.docNo, 80), note: cleanText(b.note, 300),
    source: b.source ?? 'MANUAL', idempotencyKey: String(b.idempotencyKey),
  };
  ctx.env.db.insert('Allocations', [row as unknown as Record<string, unknown>]);
  audit(ctx, 'allocation.create', 'Allocation', row.id, { after: row, projectId: p.id });
  bumpDataVersion(ctx);
  return row;
}

/** ยกเลิกรายการงบ (soft delete + เหตุผล) — Super Admin เท่านั้น */
export function voidAllocation(ctx: Ctx, b: { id: string; reason: string }): { ok: true } {
  requireRole(ctx, 'superadmin');
  const cur = findById<Allocation>(ctx, 'Allocations', String(b.id), 'รายการงบ');
  const reason = cleanText(b.reason, 300);
  if (!reason) throw new AppError('VALIDATION_FAILED', 'กรุณาระบุเหตุผล');
  updateVersioned(ctx, 'Allocations', cur, cur.version, { isDeleted: true, note: `${cur.note} [ยกเลิก: ${reason}]` });
  audit(ctx, 'allocation.void', 'Allocation', cur.id, { before: cur, projectId: cur.projectId, reason });
  bumpDataVersion(ctx);
  return { ok: true };
}

/* ------------------------------ disbursements ----------------------------- */

export function createDisbursement(ctx: Ctx, b: {
  projectId: string; activityId?: string; unitId?: string; status: Disbursement['status']; amountSatang: number; date: string;
  docNo?: string; description?: string; attachmentId?: string; idempotencyKey: string; overrideReason?: string; source?: string; replacesId?: string;
}): Disbursement {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  const u = requireWorkgroup(ctx, p.workgroupId);
  const existing = findByIdempotency<Disbursement>(ctx, 'Disbursements', String(b.idempotencyKey));
  if (existing) return existing;
  if (!['COMMITTED', 'APPROVED', 'PAID'].includes(b.status)) throw new AppError('VALIDATION_FAILED', 'สถานะรายการไม่ถูกต้อง');
  const amount = validMoney(b.amountSatang, 'จำนวนเงิน');
  const activityId = checkActivity(ctx, p.id, b.activityId);
  const unitId = checkUnit(ctx, activityId, b.unitId);
  const date = validDate(b.date, 'วันที่', true);
  if (date > today(ctx)) throw new AppError('VALIDATION_FAILED', 'วันที่ต้องไม่เป็นวันในอนาคต');
  if (b.attachmentId) {
    const f = findById<Attachment>(ctx, 'Attachments', b.attachmentId, 'ไฟล์แนบ');
    if (f.projectId !== p.id) throw new AppError('VALIDATION_FAILED', 'ไฟล์แนบไม่อยู่ในโครงการนี้');
  }
  if (b.status !== 'COMMITTED') {
    const s = projectBudget(ctx, p.id);
    if (s.remaining - amount < 0) {
      const reason = cleanText(b.overrideReason, 300);
      if (u.role !== 'superadmin' || !reason) {
        throw new AppError('BUDGET_EXCEEDED', `จำนวนเงินเกินงบคงเหลือ (คงเหลือ ${(s.remaining / 100).toLocaleString('th-TH')} บาท)`, { remaining: s.remaining });
      }
      audit(ctx, 'budget.override', 'Project', p.id, { projectId: p.id, reason, after: { amount } });
    }
  }
  const row: Disbursement = {
    ...newMeta(ctx), projectId: p.id, activityId, status: b.status, amountSatang: amount, date,
    docNo: cleanText(b.docNo, 80), description: cleanText(b.description, 500), source: b.source ?? 'MANUAL',
    idempotencyKey: String(b.idempotencyKey), voidReason: '', replacesId: b.replacesId ?? '', attachmentId: b.attachmentId ?? '',
    unitId,
  };
  ctx.env.db.insert('Disbursements', [row as unknown as Record<string, unknown>]);
  if (b.attachmentId) {
    const f = findById<Attachment>(ctx, 'Attachments', b.attachmentId, 'ไฟล์แนบ');
    ctx.env.db.update('Attachments', f.id, { ...f, entityType: 'disbursement', entityId: row.id });
  }
  audit(ctx, 'disbursement.create', 'Disbursement', row.id, { after: row, projectId: p.id });
  bumpDataVersion(ctx);
  return row;
}

/** เลื่อนสถานะไปข้างหน้าเท่านั้น: COMMITTED → APPROVED → PAID (ไม่แก้จำนวนเงิน) */
export function setDisbursementStatus(ctx: Ctx, b: { id: string; version: number; status: 'APPROVED' | 'PAID' }): Disbursement {
  const cur = findById<Disbursement>(ctx, 'Disbursements', String(b.id), 'รายการเบิกจ่าย');
  const p = findById<Project>(ctx, 'Projects', cur.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const order = { COMMITTED: 0, APPROVED: 1, PAID: 2, VOID: -1 } as const;
  if (!(b.status in order) || order[b.status] <= order[cur.status]) throw new AppError('VALIDATION_FAILED', 'เปลี่ยนสถานะย้อนกลับไม่ได้ — ใช้การยกเลิกรายการแทน');
  if (cur.status === 'COMMITTED') {
    const s = projectBudget(ctx, p.id);
    if (s.remaining - cur.amountSatang < 0) throw new AppError('BUDGET_EXCEEDED', 'อนุมัติแล้วงบคงเหลือติดลบ');
  }
  const next = updateVersioned(ctx, 'Disbursements', cur, Number(b.version), { status: b.status });
  audit(ctx, 'disbursement.status', 'Disbursement', cur.id, { before: { status: cur.status }, after: { status: b.status }, projectId: p.id });
  bumpDataVersion(ctx);
  return next;
}

/**
 * void-and-replace: ไม่แก้จำนวนเงินเดิม
 * - Admin ยกเลิกได้เฉพาะรายการ COMMITTED ในขอบเขตตน
 * - รายการ APPROVED/PAID ยกเลิกได้เฉพาะ Super Admin (ADR-002)
 */
export function voidDisbursement(ctx: Ctx, b: { id: string; reason: string; replacement?: { amountSatang: number; date: string; docNo?: string; description?: string; status: Disbursement['status'] } }): { voided: Disbursement; replacement: Disbursement | null } {
  const cur = findById<Disbursement>(ctx, 'Disbursements', String(b.id), 'รายการเบิกจ่าย');
  const p = findById<Project>(ctx, 'Projects', cur.projectId, 'โครงการ');
  const u = requireWorkgroup(ctx, p.workgroupId);
  if (cur.status === 'VOID') throw new AppError('VALIDATION_FAILED', 'รายการนี้ถูกยกเลิกแล้ว');
  if (cur.status !== 'COMMITTED' && u.role !== 'superadmin') {
    throw new AppError('FORBIDDEN_SCOPE', 'รายการที่อนุมัติ/จ่ายแล้ว ยกเลิกได้เฉพาะ Super Admin');
  }
  const reason = cleanText(b.reason, 300);
  if (reason.length < 3) throw new AppError('VALIDATION_FAILED', 'กรุณาระบุเหตุผลการยกเลิก');
  const voided = updateVersioned(ctx, 'Disbursements', cur, cur.version, { status: 'VOID', voidReason: reason });
  audit(ctx, 'disbursement.void', 'Disbursement', cur.id, { before: cur, after: { status: 'VOID' }, projectId: p.id, reason });
  let replacement: Disbursement | null = null;
  if (b.replacement) {
    replacement = createDisbursement(ctx, {
      projectId: p.id, activityId: cur.activityId, unitId: cur.unitId || undefined, ...b.replacement, attachmentId: cur.attachmentId || undefined,
      idempotencyKey: `replace:${cur.id}`, replacesId: cur.id, source: cur.source,
    });
  }
  bumpDataVersion(ctx);
  return { voided, replacement };
}

/* -------------------------------- progress -------------------------------- */

export function createProgress(ctx: Ctx, b: { projectId: string; activityId?: string; reportDate?: string; progressPct: number; detail?: string; issues?: string; idempotencyKey: string }): ProgressReport {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const existing = findByIdempotency<ProgressReport>(ctx, 'ProgressReports', String(b.idempotencyKey));
  if (existing) return existing;
  const pctVal = Number(b.progressPct);
  if (!Number.isFinite(pctVal) || pctVal < 0 || pctVal > 100) throw new AppError('VALIDATION_FAILED', 'ร้อยละต้องอยู่ระหว่าง 0–100');
  const activityId = checkActivity(ctx, p.id, b.activityId);
  const row: ProgressReport = {
    ...newMeta(ctx), projectId: p.id, activityId, reportDate: validDate(b.reportDate || today(ctx), 'วันที่รายงาน'),
    progressPct: Math.round(pctVal * 100) / 100, detail: cleanText(b.detail, 2000), issues: cleanText(b.issues, 1000),
    idempotencyKey: String(b.idempotencyKey),
  };
  ctx.env.db.insert('ProgressReports', [row as unknown as Record<string, unknown>]);
  // อัปเดตร้อยละของกิจกรรม/โครงการให้อัตโนมัติ (ผู้ใช้ไม่ต้องกรอกซ้ำ)
  const status = row.progressPct >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
  if (activityId) {
    const a = findById<Activity>(ctx, 'Activities', activityId, 'กิจกรรม');
    ctx.env.db.update('Activities', a.id, { ...a, progressPct: row.progressPct, status, version: a.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
    const acts = live(ctx.env.db.list<Activity>('Activities')).filter((x) => x.projectId === p.id);
    const avg = acts.length ? acts.reduce((s, x) => s + Number(x.id === a.id ? row.progressPct : x.progressPct), 0) / acts.length : row.progressPct;
    ctx.env.db.update('Projects', p.id, { ...p, physicalProgress: Math.round(avg * 100) / 100, lastProgressAt: nowIso(ctx), status: avg >= 100 ? 'COMPLETED' : p.status === 'PLANNED' ? 'IN_PROGRESS' : p.status, version: p.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
  } else {
    ctx.env.db.update('Projects', p.id, { ...p, physicalProgress: row.progressPct, lastProgressAt: nowIso(ctx), status: row.progressPct >= 100 ? 'COMPLETED' : p.status === 'PLANNED' ? 'IN_PROGRESS' : p.status, version: p.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
  }
  audit(ctx, 'progress.create', 'ProgressReport', row.id, { after: row, projectId: p.id });
  bumpDataVersion(ctx);
  return row;
}

/** ลิงก์แผน: ยอมรับเฉพาะ planDocId ที่มีอยู่จริง (ตรวจโดย service แผนก่อนเรียก) */
const PLAN_LINK = Symbol('planLink');
interface PlanLink { planDocId: string; planNodeSeq: number; planItemId?: string }
export function withPlanLink<T extends object>(b: T, link: PlanLink): T {
  return Object.assign(b, { [PLAN_LINK]: link });
}
function planLinkOf(b: object): PlanLink {
  return (b as Record<symbol, PlanLink>)[PLAN_LINK] ?? { planDocId: '', planNodeSeq: 0 };
}
