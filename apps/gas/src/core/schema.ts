/**
 * Schema ของตารางใน Google Sheets (versioned) — header แถวที่ 1 ของแต่ละแท็บ
 * เปลี่ยน schema: เพิ่มคอลัมน์ต่อท้ายเท่านั้น แล้วเพิ่ม SCHEMA_VERSION; provisioning เติมหัวคอลัมน์ให้เอง
 */
export const SCHEMA_VERSION = '2026.11.08-1';

export type ColType = 'string' | 'number' | 'boolean' | 'json';
export type FileKey = 'IDENTITY' | 'CORE' | 'STAGING' | 'REPORTING';

export interface TableDef {
  file: FileKey;
  columns: ReadonlyArray<readonly [string, ColType]>;
}

const META: ReadonlyArray<readonly [string, ColType]> = [
  ['id', 'string'], ['createdAt', 'string'], ['createdBy', 'string'], ['updatedAt', 'string'],
  ['updatedBy', 'string'], ['version', 'number'], ['isDeleted', 'boolean'],
];

const t = (file: FileKey, cols: Array<[string, ColType]>, withMeta = true): TableDef => ({
  file,
  columns: withMeta ? [...META, ...cols] : cols,
});

export const TABLES = {
  Users: t('IDENTITY', [
    ['phone', 'string'], ['phoneHash', 'string'], ['fullName', 'string'], ['position', 'string'], ['workgroupId', 'string'],
    ['affiliation', 'string'], ['role', 'string'], ['status', 'string'], ['scopeWorkgroups', 'string'], ['tokenVersion', 'number'],
    ['approvedAt', 'string'], ['approvedBy', 'string'], ['lastLoginAt', 'string'], ['knownDevices', 'string'], ['title', 'string'],
  ]),
  AccessRequests: t('IDENTITY', [
    ['phone', 'string'], ['fullName', 'string'], ['position', 'string'], ['workgroupId', 'string'], ['affiliation', 'string'],
    ['note', 'string'], ['status', 'string'], ['decidedAt', 'string'], ['decidedBy', 'string'], ['reason', 'string'], ['title', 'string'],
  ]),
  LoginAttempts: t('IDENTITY', [
    ['id', 'string'], ['at', 'string'], ['role', 'string'], ['identifierMasked', 'string'], ['result', 'string'],
    ['userId', 'string'], ['device', 'string'], ['newDevice', 'boolean'],
  ], false),
  Organizations: t('CORE', [['code', 'string'], ['name', 'string']]),
  Workgroups: t('CORE', [
    ['orgId', 'string'], ['code', 'string'], ['name', 'string'], ['noActivities', 'boolean'],
    // ค่าหัวบันทึกข้อความของกลุ่ม
    ['memoOrg', 'string'], ['memoFax', 'string'], ['memoPrefix', 'string'], ['headName', 'string'], ['headPosition', 'string'], ['headLine2', 'string'],
  ]),
  FundingSources: t('CORE', [['code', 'string'], ['name', 'string'], ['shortName', 'string']]),
  Units: t('CORE', [['code', 'string'], ['name', 'string'], ['shortName', 'string'], ['kind', 'string'], ['sortOrder', 'number']]),
  ActivityUnits: t('CORE', [['projectId', 'string'], ['activityId', 'string'], ['unitId', 'string'], ['budgetSatang', 'number'], ['targetQty', 'number']]),
  Projects: t('CORE', [
    ['fiscalYear', 'number'], ['fundingSourceId', 'string'], ['projectCode', 'string'], ['name', 'string'], ['workgroupId', 'string'],
    ['ownerName', 'string'], ['startDate', 'string'], ['endDate', 'string'], ['status', 'string'], ['physicalProgress', 'number'],
    ['quarterTargets', 'string'], ['description', 'string'], ['published', 'boolean'], ['lastProgressAt', 'string'], ['idempotencyKey', 'string'],
    ['planDocId', 'string'], ['planNodeSeq', 'number'],
  ]),
  Activities: t('CORE', [
    ['projectId', 'string'], ['activityCode', 'string'], ['name', 'string'], ['startDate', 'string'], ['endDate', 'string'],
    ['status', 'string'], ['progressPct', 'number'], ['idempotencyKey', 'string'],
    ['planItemId', 'string'], ['unit', 'string'], ['targetQty', 'number'], ['planQuarters', 'string'], ['dueMonth', 'number'], ['dueDate', 'string'],
    ['budgetCode', 'string'], ['mainActivityCode', 'string'],
  ]),
  Allocations: t('CORE', [
    ['projectId', 'string'], ['activityId', 'string'], ['type', 'string'], ['amountSatang', 'number'], ['date', 'string'],
    ['docNo', 'string'], ['note', 'string'], ['source', 'string'], ['idempotencyKey', 'string'],
  ]),
  Disbursements: t('CORE', [
    ['projectId', 'string'], ['activityId', 'string'], ['status', 'string'], ['amountSatang', 'number'], ['date', 'string'],
    ['docNo', 'string'], ['description', 'string'], ['source', 'string'], ['idempotencyKey', 'string'], ['voidReason', 'string'],
    ['replacesId', 'string'], ['attachmentId', 'string'], ['unitId', 'string'],
  ]),
  /** บันทึกข้อความตรวจสอบเอกสารเพื่อขอเบิกเงิน — 1 แถวต่อ 1 การเบิก; แก้ไขแล้วเพิ่ม revision */
  Memos: t('CORE', [
    ['projectId', 'string'], ['activityId', 'string'], ['disbursementId', 'string'], ['unitId', 'string'], ['docNo', 'string'],
    ['date', 'string'], ['amountSatang', 'number'], ['data', 'string'], ['revision', 'number'], ['docFileId', 'string'],
    ['pdfFileId', 'string'], ['renderStatus', 'string'], ['renderError', 'string'],
  ]),
  ProgressReports: t('CORE', [
    ['projectId', 'string'], ['activityId', 'string'], ['reportDate', 'string'], ['progressPct', 'number'], ['detail', 'string'],
    ['issues', 'string'], ['idempotencyKey', 'string'],
  ]),
  Attachments: t('CORE', [
    ['entityType', 'string'], ['entityId', 'string'], ['projectId', 'string'], ['kind', 'string'], ['fileName', 'string'],
    ['mimeType', 'string'], ['sizeBytes', 'number'], ['sha256', 'string'], ['driveFileId', 'string'], ['ocrStatus', 'string'], ['ocrText', 'string'],
  ]),
  AuditLogs: t('CORE', [
    ['id', 'string'], ['at', 'string'], ['requestId', 'string'], ['actorId', 'string'], ['actorName', 'string'], ['actorRole', 'string'],
    ['action', 'string'], ['entityType', 'string'], ['entityId', 'string'], ['projectId', 'string'], ['before', 'string'],
    ['after', 'string'], ['reason', 'string'],
  ], false),
  Settings: t('CORE', [['key', 'string'], ['value', 'string'], ['updatedAt', 'string'], ['updatedBy', 'string']], false),
  PlanDocs: t('CORE', [
    ['fiscalYear', 'number'], ['fundingSourceId', 'string'], ['round', 'number'], ['title', 'string'], ['docNo', 'string'],
    ['docDate', 'string'], ['budgetType', 'string'], ['totalSatang', 'number'], ['leafCount', 'number'], ['sourceFileId', 'string'],
    ['sourceFileName', 'string'], ['status', 'string'], ['note', 'string'], ['sourceSha256', 'string'], ['editCount', 'number'],
  ]),
  PlanItems: t('CORE', [
    ['planDocId', 'string'], ['fiscalYear', 'number'], ['seq', 'number'], ['parentSeq', 'number'], ['depth', 'number'],
    ['kind', 'string'], ['number', 'string'], ['name', 'string'], ['unit', 'string'], ['quantity', 'number'],
    ['amountSatang', 'number'], ['isLeaf', 'boolean'], ['planIndex', 'number'], ['projectSeq', 'number'], ['activitySeq', 'number'],
    ['code', 'string'], ['workgroupId', 'string'], ['projectId', 'string'], ['activityId', 'string'], ['assignedAt', 'string'],
    ['assignedBy', 'string'],
  ]),
  ImportJobs: t('STAGING', [
    ['fileName', 'string'], ['sha256', 'string'], ['driveFileId', 'string'], ['channel', 'string'], ['kind', 'string'],
    ['fiscalYear', 'number'], ['fundingSourceId', 'string'], ['headerRow', 'number'], ['mapping', 'string'], ['status', 'string'],
    ['totalRows', 'number'], ['validRows', 'number'], ['warningRows', 'number'], ['errorRows', 'number'], ['committedRows', 'number'],
    ['committedAt', 'string'], ['committedBy', 'string'], ['message', 'string'],
  ]),
  ImportRows: t('STAGING', [
    ['id', 'string'], ['jobId', 'string'], ['rowNo', 'number'], ['rowKey', 'string'], ['status', 'string'], ['messages', 'string'],
    ['raw', 'string'], ['normalized', 'string'], ['committed', 'boolean'],
  ], false),
  Snapshots: t('REPORTING', [
    ['id', 'string'], ['kind', 'string'], ['fiscalYear', 'number'], ['generatedAt', 'string'], ['sourceVersion', 'string'], ['json', 'string'],
  ], false),
} as const satisfies Record<string, TableDef>;

export type TableName = keyof typeof TABLES;

export const FILE_NAMES: Record<FileKey, string> = {
  IDENTITY: 'KPP_ABM_IDENTITY',
  CORE: 'KPP_ABM_CORE',
  STAGING: 'KPP_ABM_STAGING',
  REPORTING: 'KPP_ABM_REPORTING',
};

/** เพดานเซลล์ต่อไฟล์ที่ใช้คำนวณการแจ้งเตือน (ใช้ค่าที่อนุรักษ์นิยมที่สุดที่ Google ประกาศ) */
export const CELL_LIMIT = 10_000_000;

/** โฟลเดอร์ใน Drive (ใต้โฟลเดอร์รากของโครงการ) */
export const FOLDERS = {
  system: '00_System',
  imports: '01_Imports',
  inbox: '01_Imports/Inbox',
  evidence: '02_Project_Evidence',
  archive: '99_Archive',
  backup: '99_Archive/backup',
} as const;

/** คอลัมน์ primary key ของตาราง (ค่าเริ่มต้น `id`) */
export function primaryKeyOf(table: TableName): string {
  return table === 'Settings' ? 'key' : 'id';
}
