/**
 * สัญญา API (action-based RPC บน Apps Script) — ใช้ร่วมกันระหว่างหน้าเว็บกับ backend
 * รายละเอียด: docs/api/ACTIONS.md
 */
import type { BudgetSummary, RiskFlag } from './budget';
import type {
  AccessRequest, Activity, ActivityUnit, Allocation, Attachment, AuditLog, Disbursement, FundingSource, ImportJob, ImportKind,
  LoginAttempt, Organization, Project, ProgressReport, ProjectStatus, Role, Unit, User, Workgroup,
} from './types';
import type { Satang } from './money';
import type { CoverLetterResult } from './coverLetter';
import type { StagedRow } from './importer';
import type { ParsedPlan, PlanMeta } from './plan';
import type { ApiEnvelope, PlanDoc, PlanItem } from './types';

/** ผลอ่านไฟล์แผนที่ฝั่ง server (Google Sheets / PDF / รูป) — ไฟล์ Excel/CSV อ่านในเบราว์เซอร์ได้เลย */
export interface PlanPreview { table: string[][]; meta: PlanMeta; parsed: ParsedPlan; sourceFileId: string; sourceFileName: string; sha256: string; fromOcr: boolean }
/** ผลตรวจก่อนนำเข้า: ไฟล์เดิมเคยนำเข้าแล้วหรือไม่ / มีแผนของปี-แหล่งงบ-ครั้งที่เดียวกันแล้วหรือไม่ */
export interface PlanCheck {
  duplicateOf: { id: string; title: string; createdAt: string } | null;
  existing: { id: string; title: string; assignedCount: number } | null;
  nextRound: number;
}
export interface PlanCommitRequest {
  fiscalYear: number; fundingSourceId: string; round?: number; title?: string; docNo?: string; docDate?: string; budgetType?: string;
  /** ตารางมาตรฐานหลังตรวจแก้ */
  table: string[][];
  /** ตารางมาตรฐานตามต้นฉบับ (ก่อนแก้) — server ใช้คำนวณประวัติการแก้ */
  originalTable?: string[][];
  /** ไฟล์ต้นฉบับ (เก็บใน Drive และใช้ตรวจไฟล์ซ้ำ) */
  fileName?: string; base64?: string;
  /** ไฟล์ที่อ่านผ่าน server (plans.preview) — อ้างอิงไฟล์ที่เก็บแล้วแทนการส่งไฟล์ซ้ำ */
  sourceFileId?: string; sourceFileName?: string; sourceSha256?: string;
  acceptWarnings: boolean;
  /** มีแผนของปี/แหล่งงบ/ครั้งที่เดียวกันอยู่แล้ว: true = แทนที่ (ทำได้เมื่อยังไม่มีกลุ่มงานเลือกรายการ) */
  replaceExisting?: boolean;
}
export type PlanDocSummary = PlanDoc & { assignedCount: number; assignedSatang: number; groups: Array<{ workgroupId: string; count: number; satang: number }> };
/** สถานะกิจกรรมที่สร้างจากแผน — ใช้ในหน้า "แผนและผู้รับผิดชอบ" */
export interface PlanActivityState { activityId: string; projectId: string; budget: Satang; disbursed: Satang; committed: Satang; planQuarters: string; units: ActivityUnit[]; hasDisbursement: boolean }
export interface PlanDetail { doc: PlanDoc; items: PlanItem[]; activities: Record<string, PlanActivityState> }
export interface UnitShareInput { unitId: string; budgetSatang: Satang; targetQty?: number }
/** แถวข้อมูลรายงาน: 1 แถว = กิจกรรม × หน่วยดำเนินการ */
export interface ReportRow {
  workgroupId: string; fundingSourceId: string; projectId: string; projectCode: string; projectName: string;
  activityId: string; activityCode: string; activityName: string; unit: string; targetQty: number;
  unitId: string; isMeeting: boolean;
  budget: Satang; plan: Satang; committed: Satang; disbursed: Satang; remaining: Satang;
}
export interface ReportData { fiscalYear: number; generatedAt: string; monthIndex: number; rows: ReportRow[] }
export interface AssignResult { assigned: number; skipped: Array<{ id: string; reason: string }> }

export const API_VERSION = '1.0.0';

export interface SessionUser {
  sub: string;
  name: string;
  role: Role;
  /** null = ทุกกลุ่มงาน */
  workgroupIds: string[] | null;
  workgroupName: string;
}

export interface Lookups {
  organizations: Pick<Organization, 'id' | 'code' | 'name'>[];
  workgroups: Pick<Workgroup, 'id' | 'orgId' | 'code' | 'name' | 'noActivities'>[];
  fundingSources: Pick<FundingSource, 'id' | 'code' | 'name' | 'shortName'>[];
  /** หน่วยดำเนินการ เรียงตามรหัส (สำนักงานเกษตรจังหวัดก่อน) */
  units: Pick<Unit, 'id' | 'code' | 'name' | 'shortName' | 'kind'>[];
  fiscalYears: number[];
  currentFiscalYear: number;
}

/** ข้อมูลโครงการสำหรับสาธารณะ — ไม่มี PII, ไม่มี Drive ID, ไม่มีหมายเหตุภายใน */
export interface PublicProject {
  id: string;
  fiscalYear: number;
  fundingSourceId: string;
  projectCode: string;
  name: string;
  workgroupId: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  physicalProgress: number;
  description: string;
  budget: BudgetSummary;
  risks: RiskFlag[];
  activities?: Array<Pick<Activity, 'id' | 'activityCode' | 'name' | 'status' | 'progressPct' | 'startDate' | 'endDate'> & { budget: BudgetSummary }>;
  monthly?: { disbursedCumulative: number[]; targetPct: number[] };
}

export interface GroupTotal {
  key: string; label: string; budget: BudgetSummary; projects: number;
  /** แผนการเบิกจ่ายสะสม ณ เดือนปัจจุบัน (สตางค์) */
  plan?: Satang;
  /** แยกตามหน่วยดำเนินการ (เฉพาะ byWorkgroup / byUnit) */
  units?: GroupTotal[];
  /** จำนวนกิจกรรม */
  activities?: number;
}

export interface PublicSummary {
  fiscalYear: number;
  generatedAt: string;
  sourceVersion: string;
  totals: BudgetSummary;
  counts: { total: number; planned: number; inProgress: number; completed: number; delayed: number; cancelled: number };
  avgPhysicalProgress: number;
  byFundingSource: GroupTotal[];
  byWorkgroup: GroupTotal[];
  /** แยกตามแผนงานในแผนงบประมาณที่นำเข้า (โครงการนอกแผนรวมเป็น "นอกแผน") */
  byPlan: GroupTotal[];
  /** แยกตามหน่วยดำเนินการ (สำนักงานเกษตรจังหวัด + อำเภอ) */
  byUnit: GroupTotal[];
  /** กิจกรรมที่ยังไม่ได้แบ่งงบให้หน่วยดำเนินการ (นับเป็นของสำนักงานเกษตรจังหวัด) */
  activitiesWithoutUnits?: number;
  monthly: { disbursedCumulative: number[]; targetPct: number[] };
  /**
   * เป้าตามมาตรการเร่งรัดการเบิกจ่ายของรัฐบาล (ตั้งค่าได้):
   * annualPct = เป้าเบิกจ่ายทั้งปี (รายจ่ายประจำ ≥ 98% ตามมติ ครม. 29 ก.ย. 2569)
   * meetingDeadline = วันสุดท้ายของไตรมาส 3 ที่ค่าใช้จ่ายฝึกอบรม/ประชุม/สัมมนาต้องดำเนินการให้เสร็จ
   */
  targets: { annualPct: number; meetingDeadline: string };
  /** กิจกรรมประเภทอบรม/ประชุม/สัมมนา/เวที ที่ยังมีงบเหลือ (ต้องเสร็จภายในไตรมาส 3) */
  meetings: { activities: number; remaining: number; budget: number };
  risks: Array<{ projectId: string; name: string; flags: RiskFlag[] }>;
  dataQuality: { projectsWithoutBudget: number; projectsWithoutReport45d: number; lastImportAt: string };
}

export interface ProjectDetail {
  project: Project;
  budget: BudgetSummary;
  risks: RiskFlag[];
  activities: Array<Activity & { budget: BudgetSummary; units: ActivityUnit[] }>;
  allocations: Allocation[];
  disbursements: Disbursement[];
  progress: ProgressReport[];
  attachments: Omit<Attachment, 'ocrText'>[];
  audit: AuditLog[];
  monthly: { disbursedCumulative: number[]; targetPct: number[] };
}

export interface ProjectListItem extends Project { budget: BudgetSummary; risks: RiskFlag[] }

export interface ImportPreview {
  job: ImportJob;
  headers: string[];
  mapping: Partial<Record<string, number>>;
  rows: StagedRow[];
  summary: { total: number; valid: number; warning: number; error: number; budgetDelta: number; disbursedDelta: number; newProjects: number };
}

export interface OverviewData {
  pendingRequests: number;
  stagedImports: Array<Pick<ImportJob, 'id' | 'fileName' | 'channel' | 'totalRows' | 'errorRows' | 'warningRows' | 'createdAt'>>;
  risks: Array<{ projectId: string; name: string; flags: RiskFlag[] }>;
  newDeviceLogins: number;
  failedLogins24h: number;
  recentAudit: AuditLog[];
  totals: BudgetSummary;
  /** กิจกรรมย่อยในแผนปีนี้ที่ยังไม่มีกลุ่มงานรับผิดชอบ (งบที่ยังไม่มีใครเบิกได้) */
  unassignedPlan: { items: number; satang: number; planDocId: string };
}

export interface HealthData {
  setupVersion: string;
  apiVersion: string;
  cellUsage: Array<{ file: string; cells: number; pctOfLimit: number }>;
  triggers: string[];
  lastBackupAt: string;
  lockTimeouts24h: number;
  errors24h: number;
  settings: Record<string, string>;
}

/** ตาราง action → (request, response) */
export interface Actions {
  // public (GET หรือ POST ไม่ต้องมี token)
  'public.lookups': [Record<string, never>, Lookups];
  'public.summary': [{ fiscalYear?: number }, PublicSummary];
  'public.projects': [{ fiscalYear?: number }, PublicProject[]];
  'public.project': [{ id: string }, PublicProject];
  // auth
  'auth.requestAccess': [{ phone: string; fullName: string; position: string; workgroupId: string; affiliation: string; note?: string }, { requestId: string }];
  'auth.login': [{ phone: string; device?: string }, { token: string; user: SessionUser }];
  'auth.loginSuper': [{ username: string; password: string; device?: string }, { token: string; user: SessionUser }];
  'auth.me': [Record<string, never>, SessionUser];
  'auth.logout': [Record<string, never>, { ok: true }];
  // admin
  'admin.overview': [{ fiscalYear?: number }, OverviewData];
  'projects.list': [{ fiscalYear?: number }, ProjectListItem[]];
  'projects.get': [{ id: string }, ProjectDetail];
  'projects.create': [Partial<Project> & { idempotencyKey: string; originalBudgetSatang?: number }, Project];
  'projects.update': [{ id: string; version: number; patch: Partial<Project> }, Project];
  'projects.delete': [{ id: string; version: number; reason: string }, { ok: true }];
  'activities.create': [{ projectId: string; activityCode?: string; name: string; startDate?: string; endDate?: string; idempotencyKey: string }, Activity];
  'activities.update': [{ id: string; version: number; patch: Partial<Activity> }, Activity];
  'allocations.create': [{ projectId: string; activityId?: string; type: Allocation['type']; amountSatang: number; date?: string; docNo?: string; note?: string; idempotencyKey: string }, Allocation];
  'allocations.void': [{ id: string; reason: string }, { ok: true }];
  'disbursements.create': [{ projectId: string; activityId?: string; unitId?: string; status: Disbursement['status']; amountSatang: number; date: string; docNo?: string; description?: string; attachmentId?: string; idempotencyKey: string; overrideReason?: string }, Disbursement];
  'disbursements.setStatus': [{ id: string; version: number; status: 'APPROVED' | 'PAID' }, Disbursement];
  'disbursements.void': [{ id: string; reason: string; replacement?: { amountSatang: number; date: string; docNo?: string; description?: string; status: Disbursement['status'] } }, { voided: Disbursement; replacement: Disbursement | null }];
  'progress.create': [{ projectId: string; activityId?: string; reportDate?: string; progressPct: number; detail?: string; issues?: string; idempotencyKey: string }, ProgressReport];
  'files.upload': [{ projectId: string; entityType: Attachment['entityType']; entityId?: string; kind: Attachment['kind']; fileName: string; mimeType: string; base64: string }, Omit<Attachment, 'ocrText'>];
  'files.ocrCoverLetter': [{ attachmentId: string }, CoverLetterResult];
  'imports.upload': [{ fileName: string; mimeType: string; base64?: string; sheetUrl?: string; fiscalYear?: number; fundingSourceId?: string; kind?: ImportKind; allowDuplicate?: boolean }, ImportPreview];
  'imports.remap': [{ jobId: string; mapping?: Partial<Record<string, number>>; fiscalYear?: number; fundingSourceId?: string; kind?: ImportKind }, ImportPreview];
  'imports.get': [{ jobId: string }, ImportPreview];
  'imports.list': [Record<string, never>, ImportJob[]];
  'imports.commit': [{ jobId: string; acceptWarnings: boolean }, { committed: number; skipped: number; job: ImportJob }];
  'imports.cancel': [{ jobId: string }, { ok: true }];
  'imports.errorsCsv': [{ jobId: string }, { fileName: string; csv: string }];
  // แผนงบประมาณ
  'plans.preview': [{ fileName: string; mimeType?: string; base64?: string; sheetUrl?: string }, PlanPreview];
  'plans.check': [{ sha256?: string; fiscalYear: number; fundingSourceId: string; round?: number }, PlanCheck];
  'plans.commit': [PlanCommitRequest, PlanDoc];
  'plans.list': [{ fiscalYear?: number }, PlanDocSummary[]];
  'plans.get': [{ id: string }, PlanDetail];
  /** กำหนดกลุ่มงาน: reassign = ย้ายรายการที่มีกลุ่มอื่นอยู่แล้ว (ได้เมื่อยังไม่มีการเบิกจ่าย) */
  'plans.assign': [{ itemIds: string[]; workgroupId: string; reassign?: boolean }, AssignResult];
  /** กำหนดหน่วยดำเนินการ + แบ่งงบ/เป้า + แผนรายไตรมาส ของกิจกรรมเดียว */
  'activities.setUnits': [{ activityId: string; units: UnitShareInput[]; planQuarters?: Satang[] | null }, PlanActivityState];
  /** กำหนดหน่วยให้หลายกิจกรรมพร้อมกัน: แบ่งงบเท่ากัน (เศษสตางค์ไปหน่วยแรก) */
  'activities.setUnitsBulk': [{ activityIds: string[]; unitIds: string[] }, { updated: number; skipped: Array<{ id: string; reason: string }> }];
  'reports.data': [{ fiscalYear: number }, ReportData];
  'plans.unassign': [{ itemIds: string[] }, { unassigned: number; skipped: Array<{ id: string; reason: string }> }];
  // super admin
  'admin.requests': [{ status?: string }, AccessRequest[]];
  'admin.decideRequest': [{ requestId: string; approve: boolean; reason?: string; role?: 'admin' | 'minisuper' }, { ok: true }];
  'admin.users': [Record<string, never>, Array<Omit<User, 'phoneHash' | 'knownDevices'>>];
  'admin.saveUser': [{ id?: string; phone: string; fullName: string; position: string; workgroupId: string; affiliation: string; role: 'admin' | 'minisuper'; scopeWorkgroups?: string[] }, { id: string }];
  'admin.setUserStatus': [{ id: string; status: 'active' | 'suspended' }, { ok: true }];
  'admin.loginReport': [{ days?: number }, LoginAttempt[]];
  'admin.audit': [{ entityId?: string; limit?: number }, AuditLog[]];
  'admin.health': [Record<string, never>, HealthData];
  'admin.saveSettings': [{ settings: Record<string, string> }, { ok: true }];
  'admin.saveMaster': [{ table: 'workgroups' | 'organizations' | 'fundingSources'; item: { id?: string; code: string; name: string; orgId?: string; shortName?: string } }, { id: string }];
  'admin.rebuildSnapshot': [Record<string, never>, { generatedAt: string }];
  /** รวมคำขออ่านหลายรายการเป็นคำขอเดียว (ลดเวลารอของ Apps Script) — ใช้ได้เฉพาะ action ที่อ่านอย่างเดียว */
  batch: [{ calls: BatchCall[] }, Array<ApiEnvelope<unknown>>];
}

export type BatchCall = { action: ActionName } & Record<string, unknown>;
export const BATCH_MAX = 8;

export type ActionName = keyof Actions;
export type ActionRequest<A extends ActionName> = Actions[A][0];
export type ActionResponse<A extends ActionName> = Actions[A][1];

export const PUBLIC_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'public.lookups', 'public.summary', 'public.projects', 'public.project',
  'auth.requestAccess', 'auth.login', 'auth.loginSuper', 'batch',
]);

/** action ที่อ่านอย่างเดียว — หน้าเว็บ cache ผลและรวมเป็น batch ได้ */
export const READ_ACTIONS: ReadonlySet<ActionName> = new Set<ActionName>([
  'public.lookups', 'public.summary', 'public.projects', 'public.project', 'auth.me',
  'admin.overview', 'projects.list', 'projects.get', 'imports.get', 'imports.list', 'plans.check', 'plans.list', 'plans.get', 'reports.data',
  'admin.requests', 'admin.users', 'admin.loginReport', 'admin.audit', 'admin.health',
]);
