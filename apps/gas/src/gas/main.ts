/**
 * Entry points ของ Apps Script — bundle เป็น global `KPP`, แล้ว footer สร้างฟังก์ชันระดับบนสุด
 * (doGet, doPost, setup, setSuperAdmin, autoImportInbox, dailyMaintenance, installTriggers)
 */
import { AppError, todayBangkok } from '@kpp/domain';
import { SYSTEM_USER, getSettings, setSetting, type Ctx } from '../core/context';
import { handle, type RpcRequest } from '../core/router';
import { setSuperAdmin as setSuper } from '../core/auth';
import { seedMasterData } from '../core/setup';
import { processInbox } from '../core/services/imports';
import { writeSnapshot } from '../core/services/public';
import { FILE_NAMES, FOLDERS, type FileKey } from '../core/schema';
import { createGasEnv, GasFiles, gasProps, provision } from './adapter';

function json(obj: unknown): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function systemCtx(): Ctx {
  return { env: createGasEnv(), requestId: Utilities.getUuid(), user: SYSTEM_USER, device: 'system' };
}

/** GET: เฉพาะ action สาธารณะแบบอ่าน — เช่น ?action=public.summary&fiscalYear=2570 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  const p = (e && e.parameter) || {};
  if (!p.action) return json({ ok: true, name: 'KPP Agri-Budget Monitor API', docs: 'POST {action, ...}' });
  if (!String(p.action).startsWith('public.')) return json({ ok: false, error: { code: 'UNKNOWN_ACTION', message: 'GET ใช้ได้เฉพาะ public.*' } });
  const req: RpcRequest = { action: p.action };
  if (p.fiscalYear) req.fiscalYear = Number(p.fiscalYear);
  if (p.id) req.id = String(p.id);
  return json(handle(createGasEnv(), req));
}

/** POST: Content-Type text/plain (เลี่ยง CORS preflight) body = JSON {action, token, ...} */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  let body: RpcRequest;
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > 25 * 1024 * 1024) throw new Error('too large');
    body = JSON.parse(raw) as RpcRequest;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not object');
  } catch {
    return json({ ok: false, data: null, meta: null, error: { code: 'VALIDATION_FAILED', message: 'รูปแบบคำขอไม่ถูกต้อง' } });
  }
  return json(handle(createGasEnv(), body));
}

/** ติดตั้ง/อัปเกรดระบบ (รันจาก editor) — idempotent */
export function setup(rootFolderId?: string, superUser?: string, superPassword?: string): string {
  const g = globalThis as unknown as Record<string, unknown>;
  const folderId = rootFolderId || (g.ROOT_FOLDER_ID as string) || gasProps.get('ROOT_FOLDER_ID');
  if (!folderId) throw new Error('กรุณาใส่ ROOT_FOLDER_ID ใน Secrets.gs');
  DriveApp.getFolderById(folderId); // ตรวจสิทธิ์
  gasProps.set('ROOT_FOLDER_ID', folderId);
  const files = new GasFiles();
  const log = provision(files);
  const ctx = systemCtx();
  seedMasterData(ctx);
  ctx.env.db.flush?.();
  const u = superUser || (g.INIT_SUPER_USER as string);
  const pw = superPassword || (g.INIT_SUPER_PASSWORD as string);
  if (!gasProps.get('SUPER_HASH')) {
    if (!u || !pw) throw new Error('ยังไม่มี Super Admin — ใส่ INIT_SUPER_USER / INIT_SUPER_PASSWORD ใน Secrets.gs แล้วรัน setup อีกครั้ง');
    setSuper(ctx, u, pw);
    log.push('super admin: created (โปรดลบไฟล์ Secrets.gs ออกจากโปรเจกต์)');
  }
  installTriggers();
  log.push(`triggers: ${gasProps.get('TRIGGERS')}`);
  console.log(log.join('\n'));
  return log.join('\n');
}

/** เปลี่ยนรหัส Super Admin (รันจาก editor) — token เดิมถูกเพิกถอนทันที */
export function setSuperAdmin(username: string, password: string): string {
  setSuper(systemCtx(), username, password);
  return 'เปลี่ยนรหัส Super Admin แล้ว';
}

export function installTriggers(): void {
  const want: Record<string, () => GoogleAppsScript.Script.ClockTriggerBuilder> = {
    autoImportInbox: () => ScriptApp.newTrigger('autoImportInbox').timeBased().everyMinutes(15) as unknown as GoogleAppsScript.Script.ClockTriggerBuilder,
    dailyMaintenance: () => ScriptApp.newTrigger('dailyMaintenance').timeBased().atHour(2).everyDays(1).inTimezone('Asia/Bangkok'),
  };
  const existing = ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());
  for (const [name, build] of Object.entries(want)) if (!existing.includes(name)) build().create();
  gasProps.set('TRIGGERS', Object.keys(want).join(','));
}

/** Trigger ทุก 15 นาที: ไฟล์ใน 01_Imports/Inbox → staging (หรือ commit ถ้าเปิด autoCommitClean และไฟล์สะอาด) */
export function autoImportInbox(): unknown {
  const ctx = systemCtx();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'busy';
  try {
    const out = processInbox(ctx);
    ctx.env.db.flush?.();
    if (out.length) ctx.env.log('info', 'inbox', { files: out.length });
    return out;
  } finally {
    lock.releaseLock();
  }
}

/** Trigger รายวัน 02:00: สำรองข้อมูล + ลบสำเนาเกินกำหนด + snapshot */
export function dailyMaintenance(): string {
  const ctx = systemCtx();
  const files = new GasFiles();
  const ids = JSON.parse(gasProps.get('FILE_IDS') || '{}') as Record<FileKey, string>;
  const day = todayBangkok();
  const folder = files.folder(`${FOLDERS.backup}/${day}`);
  for (const key of Object.keys(FILE_NAMES) as FileKey[]) {
    if (ids[key]) DriveApp.getFileById(ids[key]).makeCopy(`${FILE_NAMES[key]}_${day}`, folder);
  }
  const retention = Number(getSettings(ctx).backupRetentionDays) || 30;
  const cutoff = new Date(Date.now() - retention * 86400_000).toISOString().slice(0, 10);
  const it = files.folder(FOLDERS.backup).getFolders();
  while (it.hasNext()) {
    const f = it.next();
    // ลบเฉพาะโฟลเดอร์สำรองที่ระบบสร้าง (ชื่อเป็นวันที่) และเก่ากว่ากำหนด — ไปถังขยะ กู้คืนได้ 30 วัน
    if (/^\d{4}-\d{2}-\d{2}$/.test(f.getName()) && f.getName() < cutoff) f.setTrashed(true);
  }
  const lock = LockService.getScriptLock();
  if (lock.tryLock(20000)) {
    try {
      setSetting(ctx, 'lastBackupAt', new Date().toISOString());
      writeSnapshot(ctx);
      ctx.env.db.flush?.();
    } finally {
      lock.releaseLock();
    }
  }
  return `backup ${day} ok`;
}

export { AppError };
