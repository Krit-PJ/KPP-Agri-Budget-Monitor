/** Entity และค่าคงที่ของโดเมน — แหล่งเดียวของ schema ทั้ง frontend และ Apps Script */
import type { Satang } from './money';

export type Role = 'admin' | 'minisuper' | 'superadmin';
export type UserStatus = 'active' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: 'ยังไม่เริ่ม',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

export const ALLOCATION_TYPES = ['ORIGINAL', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;
export type AllocationType = (typeof ALLOCATION_TYPES)[number];
export const ALLOCATION_TYPE_LABEL: Record<AllocationType, string> = {
  ORIGINAL: 'งบที่ได้รับจัดสรร',
  TRANSFER_IN: 'โอนเพิ่ม/ปรับเพิ่ม',
  TRANSFER_OUT: 'โอนออก/ปรับลด',
};

export const DISBURSEMENT_STATUSES = ['COMMITTED', 'APPROVED', 'PAID', 'VOID'] as const;
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number];
export const DISBURSEMENT_STATUS_LABEL: Record<DisbursementStatus, string> = {
  COMMITTED: 'ผูกพัน/กันเงิน',
  APPROVED: 'อนุมัติเบิก',
  PAID: 'จ่ายแล้ว',
  VOID: 'ยกเลิก',
};

/** ฟิลด์ที่ทุก mutable entity ต้องมี */
export interface Meta {
  id: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  isDeleted: boolean;
}

export interface Organization extends Meta { code: string; name: string }
/** noActivities = ไม่รับผิดชอบกิจกรรมในแผน (เช่น ฝ่ายบริหารทั่วไป) — คงไว้ให้ผู้ใช้สังกัดได้ */
export interface Workgroup extends Meta {
  orgId: string; code: string; name: string; noActivities: boolean;
  /** ปิดการเผยแพร่บนหน้าสาธารณะชั่วคราว (ข้อมูลยังไม่พร้อม) — งานเจ้าหน้าที่ใช้ได้ตามปกติ */
  hidePublic?: boolean;
  /** หัวบันทึกข้อความ: ส่วนราชการ, โทรศัพท์, ส่วนหน้าเลขที่ (เช่น "กพ 0009.4") */
  memoOrg?: string; memoFax?: string; memoPrefix?: string;
  /** ผู้ลงนามฝั่งขวา (หัวหน้ากลุ่ม/ผู้รักษาการ) */
  headName?: string; headPosition?: string; headLine2?: string;
}
export interface FundingSource extends Meta { code: string; name: string; shortName: string }
/**
 * หน่วยดำเนินการ: สำนักงานเกษตรจังหวัด และสำนักงานเกษตรอำเภอ 11 อำเภอ
 * (เป็นผู้ดำเนินกิจกรรมและใช้งบ — ไม่ใช่ "หน่วยเบิกจ่าย" ตามความหมายของ GFMIS)
 */
export interface Unit extends Meta { code: string; name: string; shortName: string; kind: 'PROVINCE' | 'DISTRICT'; sortOrder: number }
/** ชื่อพื้นที่ดำเนินการสำหรับแสดงผล (ตามแบบ ผป.03): สนง.เกษตรจังหวัด = "ระดับจังหวัด", อำเภอ = ชื่ออำเภอ */
export function areaName(u: Pick<Unit, 'kind' | 'shortName'> | undefined): string {
  if (!u) return '–';
  return u.kind === 'PROVINCE' ? 'ระดับจังหวัด' : u.shortName.replace(/^อ\./, '');
}
/** สรุปพื้นที่ดำเนินการของกิจกรรม: "ระดับจังหวัด" / "ทั้ง 11 อำเภอ" / "3 อำเภอ: ไทรงาม คลองลาน พรานกระต่าย" */
export function areaSummary(unitIds: string[], units: Array<Pick<Unit, 'id' | 'kind' | 'shortName'>>, maxNames = 3): string {
  const sel = units.filter((u) => unitIds.includes(u.id));
  const districts = units.filter((u) => u.kind === 'DISTRICT');
  const dSel = sel.filter((u) => u.kind === 'DISTRICT');
  const prov = sel.some((u) => u.kind === 'PROVINCE');
  if (!sel.length || (prov && !dSel.length)) return 'ระดับจังหวัด';
  const d = dSel.length === districts.length ? `ทั้ง ${districts.length} อำเภอ`
    : `${dSel.length} อำเภอ: ${dSel.slice(0, maxNames).map(areaName).join(' ')}${dSel.length > maxNames ? ' ฯลฯ' : ''}`;
  return prov ? `ระดับจังหวัด และ${d}` : d;
}
/** งบและเป้าหมายของกิจกรรมที่แบ่งให้หน่วยดำเนินการ — ผลรวมงบต้องเท่างบกิจกรรม (ส่วนที่ไม่ได้แบ่งนับเป็นของสำนักงานเกษตรจังหวัด) */
export interface ActivityUnit extends Meta { projectId: string; activityId: string; unitId: string; budgetSatang: Satang; targetQty: number }

export interface Project extends Meta {
  fiscalYear: number;
  fundingSourceId: string;
  projectCode: string;
  name: string;
  workgroupId: string;
  /** ชื่อผู้รับผิดชอบ — ภายในเท่านั้น ไม่ส่งให้ public */
  ownerName: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  /** ร้อยละผลการดำเนินงาน (physical) 0–100 */
  physicalProgress: number;
  /** เป้าหมายร้อยละการเบิกจ่ายตามแผน ณ สิ้นแต่ละไตรมาส เช่น "30,55,80,100" */
  quarterTargets: string;
  description: string;
  published: boolean;
  lastProgressAt: string;
  idempotencyKey: string;
  /** ถ้าสร้างจากแผนงบประมาณ: เอกสารแผน และ seq ของโครงการในแผน */
  planDocId: string;
  planNodeSeq: number;
}

export interface Activity extends Meta {
  projectId: string;
  activityCode: string;
  name: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progressPct: number;
  idempotencyKey: string;
  /** รายการย่อยในแผนงบประมาณที่กิจกรรมนี้มาจาก */
  planItemId: string;
  unit: string;
  targetQty: number;
  /** แผนการใช้จ่ายรายไตรมาส (สตางค์, ไม่สะสม) "q1,q2,q3,q4" — ว่าง = ใช้เป้ามาตรฐานของโครงการ */
  planQuarters: string;
  /** ต้องเบิกครบ 100% ภายในเดือนที่ (1 = ต.ค. … 12 = ก.ย.); 0 = ค่าเริ่มต้น (อบรม = มิ.ย.); -1 = ตามเป้าของปี */
  dueMonth?: number;
  /** กำหนดเบิกครบเป็นวันที่ (YYYY-MM-DD ค.ศ.) — ใช้เตือน; ถ้ามีค่า dueMonth = เดือนของวันนี้ */
  dueDate?: string;
  /** รหัสงบประมาณ 20 หลัก (จำจากบันทึกข้อความครั้งแรก) */
  budgetCode?: string;
  /** รหัสกิจกรรมหลัก 17 หลัก */
  mainActivityCode?: string;
}

export interface Allocation extends Meta {
  projectId: string;
  activityId: string;
  type: AllocationType;
  amountSatang: Satang;
  date: string;
  docNo: string;
  note: string;
  source: string;
  idempotencyKey: string;
}

export interface Disbursement extends Meta {
  projectId: string;
  activityId: string;
  status: DisbursementStatus;
  amountSatang: Satang;
  date: string;
  docNo: string;
  description: string;
  /** แหล่งที่มา: MANUAL | IMPORT:{jobId} | ADJUST:{jobId} */
  source: string;
  idempotencyKey: string;
  voidReason: string;
  replacesId: string;
  attachmentId: string;
  /** หน่วยดำเนินการที่ใช้งบ — ว่าง = สำนักงานเกษตรจังหวัด */
  unitId: string;
}

export interface ProgressReport extends Meta {
  projectId: string;
  activityId: string;
  reportDate: string;
  progressPct: number;
  detail: string;
  issues: string;
  idempotencyKey: string;
}

export interface Attachment extends Meta {
  entityType: 'project' | 'disbursement' | 'progress' | 'import';
  entityId: string;
  projectId: string;
  kind: 'COVER_LETTER' | 'EVIDENCE' | 'IMPORT_ORIGINAL';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  driveFileId: string;
  ocrStatus: '' | 'DONE' | 'FAILED';
  ocrText: string;
}

export interface User extends Meta {
  phone: string;
  phoneHash: string;
  fullName: string;
  position: string;
  workgroupId: string;
  affiliation: string;
  role: Exclude<Role, 'superadmin'>;
  status: UserStatus;
  /** JSON array ของ workgroupId ที่ทำรายการได้; ว่าง = workgroupId ของตน */
  scopeWorkgroups: string;
  tokenVersion: number;
  approvedAt: string;
  approvedBy: string;
  lastLoginAt: string;
  knownDevices: string;
  /** คำนำหน้าชื่อ เช่น นาย นาง นางสาว */
  title?: string;
}

export interface AccessRequest extends Meta {
  phone: string;
  fullName: string;
  position: string;
  workgroupId: string;
  affiliation: string;
  note: string;
  status: RequestStatus;
  decidedAt: string;
  decidedBy: string;
  reason: string;
  title?: string;
}

/** บันทึกข้อความที่บันทึกแล้ว (ข้อมูลเต็มเก็บใน data เป็น JSON ของ MemoData) */
export interface Memo extends Meta {
  projectId: string;
  activityId: string;
  disbursementId: string;
  unitId: string;
  docNo: string;
  date: string;
  amountSatang: number;
  data: string;
  revision: number;
  docFileId: string;
  pdfFileId: string;
  /** OK | ERROR | PENDING */
  renderStatus: string;
  renderError: string;
}

export interface LoginAttempt {
  id: string;
  at: string;
  role: string;
  identifierMasked: string;
  result: 'success' | 'not_found_or_pending' | 'suspended' | 'invalid' | 'wrong_credentials' | 'throttled';
  userId: string;
  device: string;
  newDevice: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  requestId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string;
  before: string;
  after: string;
  reason: string;
}

export interface PlanDoc extends Meta {
  fiscalYear: number;
  fundingSourceId: string;
  /** งวด/ครั้งที่จัดสรร เช่น 1 */
  round: number;
  title: string;
  docNo: string;
  docDate: string;
  budgetType: string;
  totalSatang: number;
  leafCount: number;
  sourceFileId: string;
  sourceFileName: string;
  status: 'ACTIVE' | 'REPLACED';
  note: string;
  /** ลายนิ้วมือไฟล์ต้นฉบับ (กันนำเข้าไฟล์เดิมซ้ำ) */
  sourceSha256: string;
  /** จำนวนช่องที่แก้จากต้นฉบับก่อนนำเข้า (รายละเอียดอยู่ใน AuditLogs) */
  editCount: number;
}

export interface PlanItem extends Meta {
  planDocId: string;
  fiscalYear: number;
  seq: number;
  parentSeq: number;
  depth: number;
  kind: string;
  number: string;
  name: string;
  unit: string;
  quantity: number;
  amountSatang: number;
  isLeaf: boolean;
  planIndex: number;
  projectSeq: number;
  activitySeq: number;
  code: string;
  /** กลุ่มงานที่รับผิดชอบ (เฉพาะรายการย่อยสุดท้าย — 1 รายการ 1 กลุ่ม) */
  workgroupId: string;
  projectId: string;
  activityId: string;
  assignedAt: string;
  assignedBy: string;
  /** เจ้าหน้าที่เพิ่มเอง (นอกแผนที่นำเข้าจากกรม) */
  manual?: boolean;
  note?: string;
}

export type ImportKind = 'BUDGET_SUMMARY' | 'DISBURSEMENT_LIST';
export type ImportJobStatus = 'STAGED' | 'COMMITTING' | 'COMMITTED' | 'PARTIAL' | 'CANCELLED' | 'FAILED';

export interface ImportJob extends Meta {
  fileName: string;
  sha256: string;
  driveFileId: string;
  channel: 'UPLOAD' | 'INBOX';
  kind: ImportKind;
  fiscalYear: number;
  fundingSourceId: string;
  headerRow: number;
  mapping: string;
  status: ImportJobStatus;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  committedRows: number;
  committedAt: string;
  committedBy: string;
  message: string;
}

export type RowStatus = 'VALID' | 'WARNING' | 'ERROR';

export interface ImportRow {
  id: string;
  jobId: string;
  rowNo: number;
  rowKey: string;
  status: RowStatus;
  messages: string;
  raw: string;
  normalized: string;
  committed: boolean;
}

/** รหัส error ที่คงที่ — frontend ใช้ตัดสินพฤติกรรม */
export const ERROR_CODES = [
  'AUTH_REQUIRED', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'ACCOUNT_PENDING', 'ACCOUNT_SUSPENDED',
  'LOGIN_THROTTLED', 'REAUTH_REQUIRED', 'FORBIDDEN_SCOPE', 'NOT_FOUND', 'VERSION_CONFLICT',
  'VALIDATION_FAILED', 'DUPLICATE_IMPORT', 'IMPORT_REVIEW_REQUIRED', 'BUDGET_EXCEEDED',
  'BUSY_RETRY', 'QUOTA_RETRY', 'UNKNOWN_ACTION', 'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  meta: { requestId: string; version: string; serverTime: string };
  error: { code: ErrorCode; message: string; details?: unknown } | null;
}
