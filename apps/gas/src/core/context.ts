/** บริบทต่อ request + เครื่องมือร่วม (audit, version, settings) */
import { AppError, type Meta, type SessionUser } from '@kpp/domain';
import type { Env } from './env';
import type { TableName } from './schema';

export interface Ctx {
  env: Env;
  requestId: string;
  user: SessionUser | null;
  device: string;
}

export const SYSTEM_USER: SessionUser = { sub: 'SYSTEM', name: 'ระบบอัตโนมัติ', role: 'superadmin', workgroupIds: null, workgroupName: 'ทุกกลุ่มงาน' };

export function nowIso(ctx: Ctx): string {
  return ctx.env.now().toISOString();
}

export function actor(ctx: Ctx): SessionUser {
  if (!ctx.user) throw new AppError('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  return ctx.user;
}

export function newMeta(ctx: Ctx): Meta {
  const at = nowIso(ctx);
  const by = ctx.user?.sub ?? 'PUBLIC';
  return { id: ctx.env.uuid(), createdAt: at, createdBy: by, updatedAt: at, updatedBy: by, version: 1, isDeleted: false };
}

export function live<T extends { isDeleted?: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => !r.isDeleted);
}

export function findById<T extends object>(ctx: Ctx, table: TableName, id: string, label = 'ข้อมูล'): T {
  const row = ctx.env.db.list<T>(table).find((r) => (r as { id?: string }).id === id && !(r as { isDeleted?: boolean }).isDeleted);
  if (!row) throw new AppError('NOT_FOUND', `ไม่พบ${label}`);
  return row;
}

/** แก้ไขแบบ optimistic lock: version ต้องตรง ไม่เช่นนั้น VERSION_CONFLICT พร้อมค่าปัจจุบัน */
export function updateVersioned<T extends Meta>(ctx: Ctx, table: TableName, current: T, expectedVersion: number, patch: Partial<T>): T {
  if (Number(current.version) !== Number(expectedVersion)) {
    throw new AppError('VERSION_CONFLICT', 'ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นแล้ว โปรดโหลดข้อมูลล่าสุดก่อนแก้ไข', { current });
  }
  const next = { ...current, ...patch, version: Number(current.version) + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub } as T;
  ctx.env.db.update(table, current.id, next);
  return next;
}

/** idempotency: คืนรายการเดิมถ้า key นี้เคยสร้างแล้ว */
export function findByIdempotency<T extends object>(ctx: Ctx, table: TableName, key: string): T | null {
  if (!key) throw new AppError('VALIDATION_FAILED', 'ต้องมี idempotencyKey');
  return ctx.env.db.list<T>(table).find((r) => (r as { idempotencyKey?: string }).idempotencyKey === key) ?? null;
}

const PII_KEYS = new Set(['phone', 'phoneHash', 'knownDevices', 'ocrText', 'password', 'token']);

export function redact(obj: unknown): string {
  if (obj === null || obj === undefined) return '';
  return JSON.stringify(obj, (k, v) => (PII_KEYS.has(k) ? (k === 'phone' && v ? '[masked]' : undefined) : v)).slice(0, 8000);
}

export function audit(
  ctx: Ctx,
  action: string,
  entityType: string,
  entityId: string,
  opts: { before?: unknown; after?: unknown; projectId?: string; reason?: string } = {},
): void {
  const u = ctx.user;
  ctx.env.db.insert('AuditLogs', [{
    id: ctx.env.uuid(), at: nowIso(ctx), requestId: ctx.requestId, actorId: u?.sub ?? 'PUBLIC', actorName: u?.name ?? 'สาธารณะ',
    actorRole: u?.role ?? 'public', action, entityType, entityId, projectId: opts.projectId ?? '',
    before: redact(opts.before), after: redact(opts.after), reason: opts.reason ?? '',
  }]);
}

/** เวอร์ชันข้อมูล — เปลี่ยนทุกครั้งที่มีการเขียน ใช้เป็น cache key ของ snapshot */
export function dataVersion(ctx: Ctx): string {
  let v = ctx.env.cache.get('dataVersion');
  if (!v) {
    v = String(ctx.env.now().getTime());
    ctx.env.cache.put('dataVersion', v, 21600);
  }
  return v;
}
export function bumpDataVersion(ctx: Ctx): void {
  ctx.env.cache.put('dataVersion', `${ctx.env.now().getTime()}-${ctx.env.uuid().slice(0, 4)}`, 21600);
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  autoCommitClean: 'false',
  defaultQuarterTargets: '30,55,80,100',
  /** เป้าเบิกจ่ายทั้งปี (%) — มาตรการเร่งรัดฯ ปี 2570: รายจ่ายประจำไม่น้อยกว่า 98% */
  annualTargetPct: '98',
  maxUploadMB: '15',
  backupRetentionDays: '30',
  publicNotice: 'ข้อมูลในระบบนี้ใช้เพื่อการติดตามและบริหารภายใน มิใช่ยอดทางบัญชีทางการ (ยอดทางการอ้างอิงระบบ New GFMIS Thai)',
  lastImportAt: '',
  lastBackupAt: '',
};

export function getSettings(ctx: Ctx): Record<string, string> {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of ctx.env.db.list<{ key: string; value: string }>('Settings')) out[r.key] = String(r.value ?? '');
  return out;
}

export function setSetting(ctx: Ctx, key: string, value: string): void {
  const rows = ctx.env.db.list<{ id?: string; key: string }>('Settings');
  const existing = rows.find((r) => r.key === key);
  const by = ctx.user?.sub ?? 'SYSTEM';
  if (existing) ctx.env.db.update('Settings', key, { key, value, updatedAt: nowIso(ctx), updatedBy: by });
  else ctx.env.db.insert('Settings', [{ key, value, updatedAt: nowIso(ctx), updatedBy: by }]);
}
