/**
 * Google Apps Script adapters — ใช้ SpreadsheetApp / DriveApp / Drive (advanced v3) / LockService / CacheService
 * ไฟล์นี้รันได้เฉพาะบน Apps Script (ไม่มี unit test บน Node; ตรรกะทั้งหมดอยู่ใน core)
 */
import { AppError, escapeCell, parseDelimited, unescapeCell, type MemoData } from '@kpp/domain';
import { buildMemoDoc } from './memoDoc';
import type { Cache, Crypto, Db, Env, FileStore, Locker, Props, Row, StoredFile } from '../core/env';
import { pbkdf2Sha256Hex } from '../core/pbkdf2';
import { FILE_NAMES, FOLDERS, primaryKeyOf, SCHEMA_VERSION, TABLES, type FileKey, type TableName } from '../core/schema';

type Byte = number;
const toSigned = (bytes: Uint8Array): Byte[] => Array.from(bytes, (b) => (b > 127 ? b - 256 : b));
const toUnsigned = (bytes: Byte[]): Uint8Array => Uint8Array.from(bytes, (b) => b & 0xff);
const hex = (bytes: Byte[]) => bytes.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('');

/* --------------------------------- crypto --------------------------------- */

export const gasCrypto: Crypto = {
  sha256Hex: (d) => hex(typeof d === 'string'
    ? Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d, Utilities.Charset.UTF_8)
    : Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, toSigned(d))),
  hmacSha256B64Url: (key, msg) => Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(msg, key, Utilities.Charset.UTF_8)).replace(/=+$/, ''),
  pbkdf2Hex: (password, salt, iterations) => pbkdf2Sha256Hex((k, m) => Utilities.computeHmacSha256Signature(m, k), password, salt, iterations),
  randomHex: (n) => {
    let s = '';
    while (s.length < n * 2) s += hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
    return s.slice(0, n * 2);
  },
  base64Decode: (b64) => toUnsigned(Utilities.base64Decode(b64)),
  b64urlEncodeUtf8: (s) => Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ''),
  b64urlDecodeUtf8: (s) => Utilities.newBlob(Utilities.base64DecodeWebSafe(s + '==='.slice((s.length + 3) % 4))).getDataAsString('UTF-8'),
};

/* ----------------------------- lock/cache/props ---------------------------- */

export const gasLock: Locker = {
  withLock<T>(fn: () => T, timeoutMs = 25000): T {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(timeoutMs)) throw new AppError('BUSY_RETRY', 'ระบบกำลังบันทึกข้อมูลของผู้ใช้อื่น กรุณาลองใหม่อีกครั้ง');
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  },
};

export const gasCache: Cache = {
  get: (k) => CacheService.getScriptCache().get(k),
  put: (k, v, ttl) => CacheService.getScriptCache().put(k, v, Math.min(Math.max(ttl, 1), 21600)),
  remove: (k) => CacheService.getScriptCache().remove(k),
};

export const gasProps: Props = {
  get: (k) => PropertiesService.getScriptProperties().getProperty(k),
  set: (k, v) => {
    PropertiesService.getScriptProperties().setProperty(k, v);
  },
};

/* ---------------------------------- Sheets --------------------------------- */

function fileIds(): Record<FileKey, string> {
  const raw = gasProps.get('FILE_IDS');
  if (!raw) throw new AppError('INTERNAL_ERROR', 'ยังไม่ได้ติดตั้งระบบ — รันฟังก์ชัน setup ใน Apps Script editor');
  return JSON.parse(raw) as Record<FileKey, string>;
}

interface TableMemo {
  header: string[];
  rows: Row[];
  rowNum: Map<string, number>;
  pending: Row[];
}

/* ------------------------------ cache ข้ามคำขอ ------------------------------ */
/**
 * อ่านชีตทั้งตารางใช้เวลา 0.3–1 วินาทีต่อไฟล์ จึงเก็บค่าดิบของชีตไว้ใน CacheService
 * - ทุกครั้งที่เขียนตารางผ่านระบบ (insert/update) จะเปลี่ยน "รุ่น" ของตารางนั้นทันที → คำขอถัดไปอ่านชีตใหม่
 * - แก้ไขในชีตด้วยมือ: เห็นผลภายใน TABLE_TTL วินาที หรือกด "สร้างข้อมูลสาธารณะใหม่" ใน System Health
 * - ไม่ cache ตารางที่โตเร็ว/อ่านไม่บ่อย (AuditLogs, LoginAttempts, ImportRows, Snapshots)
 */
const TABLE_TTL = 300;
const CHUNK = 30_000; // อักษรต่อ key (ไทย UTF-8 ≈ 3 ไบต์ → < 100KB ต่อค่า)
const NO_CACHE = new Set<TableName>(['AuditLogs', 'LoginAttempts', 'ImportRows', 'Snapshots']);

function tableGen(table: TableName, renew = false): string {
  const c = CacheService.getScriptCache();
  const k = `tg:${table}`;
  let g = renew ? null : c.get(k);
  if (!g) {
    g = Utilities.getUuid().slice(0, 8);
    c.put(k, g, 21600);
  }
  return g;
}

function readCachedValues(table: TableName): unknown[][] | null {
  try {
    const c = CacheService.getScriptCache();
    const base = `tv:${table}:${tableGen(table)}`;
    const n = Number(c.get(`${base}:n`) || 0);
    if (!n) return null;
    const keys = Array.from({ length: n }, (_, i) => `${base}:${i}`);
    const parts = c.getAll(keys);
    if (keys.some((k) => parts[k] === undefined || parts[k] === null)) return null;
    return JSON.parse(keys.map((k) => parts[k]).join('')) as unknown[][];
  } catch {
    return null;
  }
}

function writeCachedValues(table: TableName, values: unknown[][]): void {
  try {
    const json = JSON.stringify(values);
    if (json.length > 2_000_000) return;
    const base = `tv:${table}:${tableGen(table)}`;
    const entries: Record<string, string> = {};
    let n = 0;
    for (let i = 0; i < json.length; i += CHUNK) entries[`${base}:${n++}`] = json.slice(i, i + CHUNK);
    entries[`${base}:n`] = String(n);
    CacheService.getScriptCache().putAll(entries, TABLE_TTL);
  } catch { /* cache เต็ม/ผิดพลาด — อ่านจากชีตตามปกติ */ }
}

/** ให้ทุกตารางอ่านจากชีตใหม่ (เช่น หลังแก้ชีตด้วยมือ) */
export function invalidateTableCache(): void {
  for (const t of Object.keys(TABLES) as TableName[]) tableGen(t, true);
}

const bangkokIso = (d: Date) => Utilities.formatDate(d, 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ss'+07:00'");

function toCell(type: string, v: unknown): unknown {
  if (type === 'number') return v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v);
  if (type === 'boolean') return v === true || v === 'TRUE' || v === 'true';
  if (v === null || v === undefined) return '';
  return escapeCell(String(v));
}
function fromCell(type: string, v: unknown): unknown {
  if (type === 'number') return v === '' ? 0 : Number(v);
  if (type === 'boolean') return v === true || v === 'TRUE' || v === 'true';
  if (v instanceof Date) return bangkokIso(v);
  return unescapeCell(v === null || v === undefined ? '' : String(v));
}

export class SheetsDb implements Db {
  private books = new Map<FileKey, GoogleAppsScript.Spreadsheet.Spreadsheet>();
  private sheets = new Map<TableName, GoogleAppsScript.Spreadsheet.Sheet>();
  private memo = new Map<TableName, TableMemo>();

  private book(file: FileKey) {
    if (!this.books.has(file)) this.books.set(file, SpreadsheetApp.openById(fileIds()[file]));
    return this.books.get(file)!;
  }

  /** เปิดชีตเมื่อจำเป็นเท่านั้น (อ่านจาก cache ได้ก็ไม่ต้องเปิดไฟล์) */
  private sheet(table: TableName): GoogleAppsScript.Spreadsheet.Sheet {
    let sh = this.sheets.get(table);
    if (!sh) {
      sh = this.book(TABLES[table].file).getSheetByName(table) ?? undefined;
      if (!sh) throw new AppError('INTERNAL_ERROR', `ไม่พบชีต ${table} — รัน setup อีกครั้ง`);
      this.sheets.set(table, sh);
    }
    return sh;
  }

  private load(table: TableName): TableMemo {
    const cached = this.memo.get(table);
    if (cached) return cached;
    const def = TABLES[table];
    let values = NO_CACHE.has(table) ? null : readCachedValues(table);
    if (!values) {
      values = this.sheet(table).getDataRange().getValues().map((line) => line.map((c) => (c instanceof Date ? bangkokIso(c) : c)));
      if (!NO_CACHE.has(table)) writeCachedValues(table, values);
    }
    const header = (values[0] ?? []).map(String);
    const idx = new Map(header.map((h, i) => [h, i]));
    const pk = primaryKeyOf(table);
    const rows: Row[] = [];
    const rowNum = new Map<string, number>();
    for (let r = 1; r < values.length; r++) {
      const line = values[r];
      if (line.every((c) => c === '' || c === null)) continue;
      const obj: Row = {};
      for (const [col, type] of def.columns) obj[col] = fromCell(type, idx.has(col) ? line[idx.get(col)!] : '');
      rows.push(obj);
      rowNum.set(String(obj[pk]), r + 1);
    }
    const m: TableMemo = { header, rows, rowNum, pending: [] };
    this.memo.set(table, m);
    return m;
  }

  /** ตารางที่เขียนแล้วใน execution นี้ — เปลี่ยนรุ่น cache หลัง SpreadsheetApp.flush() ใน flush() */
  private dirty = new Set<TableName>();

  private toLine(table: TableName, m: TableMemo, row: Row): unknown[] {
    const types = new Map(TABLES[table].columns.map(([c, t]) => [c, t] as const));
    return m.header.map((h) => (types.has(h) ? toCell(types.get(h)!, row[h]) : ''));
  }

  list<T = Row>(table: TableName): T[] {
    return this.load(table).rows.map((r) => ({ ...r }) as T);
  }

  insert(table: TableName, rows: object[]): void {
    if (!rows.length) return;
    const m = this.load(table);
    for (const r of rows) {
      const norm: Row = {};
      for (const [col, type] of TABLES[table].columns) norm[col] = fromCell(type, toCell(type, (r as Row)[col]));
      m.rows.push(norm);
      m.pending.push(norm);
    }
  }

  update(table: TableName, id: string, patch: object): void {
    const m = this.load(table);
    const pk = primaryKeyOf(table);
    const i = m.rows.findIndex((r) => r[pk] === id);
    if (i < 0) throw new AppError('NOT_FOUND', `ไม่พบข้อมูล ${table}`);
    const next = { ...m.rows[i], ...patch };
    m.rows[i] = next;
    const p = m.pending.findIndex((r) => r[pk] === id);
    if (p >= 0) {
      m.pending[p] = next;
      return;
    }
    const n = m.rowNum.get(id);
    if (!n) throw new AppError('INTERNAL_ERROR', `ไม่พบตำแหน่งแถว ${table}`);
    this.sheet(table).getRange(n, 1, 1, m.header.length).setValues([this.toLine(table, m, next)]);
    this.dirty.add(table);
  }

  flush(): void {
    for (const [table, m] of this.memo) {
      if (!m.pending.length) continue;
      const sh = this.sheet(table);
      const start = sh.getLastRow() + 1;
      const lines = m.pending.map((r) => this.toLine(table, m, r));
      sh.getRange(start, 1, lines.length, m.header.length).setValues(lines);
      this.dirty.add(table);
      const pk = primaryKeyOf(table);
      m.pending.forEach((r, i) => m.rowNum.set(String(r[pk]), start + i));
      m.pending = [];
    }
    if (this.dirty.size) {
      // Apps Script บัฟเฟอร์การเขียนชีต: ต้อง commit ก่อนเปลี่ยนรุ่น cache ไม่งั้นคำขออื่นอาจอ่านค่าเก่าไปเก็บใน cache รุ่นใหม่
      SpreadsheetApp.flush();
      for (const t of this.dirty) if (!NO_CACHE.has(t)) tableGen(t, true);
      this.dirty.clear();
    }
  }

  invalidate(): void {
    invalidateTableCache();
    this.memo.clear();
  }

  cellUsage(): Array<{ file: string; cells: number }> {
    return (Object.keys(FILE_NAMES) as FileKey[]).map((f) => ({
      file: FILE_NAMES[f],
      cells: this.book(f).getSheets().reduce((s, sh) => s + sh.getMaxRows() * sh.getMaxColumns(), 0),
    }));
  }
}

/* ---------------------------------- Drive ---------------------------------- */

const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const DOC_MIME = 'application/vnd.google-apps.document';

export class GasFiles implements FileStore {
  private folders = new Map<string, GoogleAppsScript.Drive.Folder>();

  root(): GoogleAppsScript.Drive.Folder {
    const id = gasProps.get('ROOT_FOLDER_ID');
    if (!id) throw new AppError('INTERNAL_ERROR', 'ยังไม่ได้ตั้งค่า ROOT_FOLDER_ID — รัน setup');
    return DriveApp.getFolderById(id);
  }

  folder(path: string): GoogleAppsScript.Drive.Folder {
    if (this.folders.has(path)) return this.folders.get(path)!;
    let f = this.root();
    for (const seg of path.split('/').filter(Boolean)) {
      const it = f.getFoldersByName(seg);
      f = it.hasNext() ? it.next() : f.createFolder(seg);
    }
    this.folders.set(path, f);
    return f;
  }

  save(folderPath: string, fileName: string, mimeType: string, bytes: Uint8Array): StoredFile {
    const signed = toSigned(bytes);
    const blob = Utilities.newBlob(signed, mimeType, fileName);
    const file = this.folder(folderPath).createFile(blob);
    // ไฟล์หลักฐานเป็นส่วนตัว: ไม่เปิดแชร์ลิงก์
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return { id: file.getId(), sha256: hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, signed)), sizeBytes: bytes.length, mimeType };
  }

  private sheetTables(ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    return ss.getSheets().map((sh) => ({
      name: sh.getName(),
      rows: sh.getDataRange().getValues().map((line) => line.map((c) => (c instanceof Date ? Utilities.formatDate(c, 'Asia/Bangkok', 'yyyy-MM-dd') : c))),
    }));
  }

  /** แปลงไฟล์เป็น Google format ชั่วคราวด้วย Drive API v3 แล้วลบทิ้ง */
  private convert<T>(fileId: string, targetMime: string, read: (id: string) => T, ocr = false): T {
    const src = DriveApp.getFileById(fileId);
    const tmpFolder = this.folder(`${FOLDERS.system}/tmp`);
    if (typeof Drive === 'undefined' || !Drive.Files) throw new AppError('INTERNAL_ERROR', 'ยังไม่ได้เปิด Advanced Drive Service (v3) ใน Apps Script');
    const created = Drive.Files.create(
      { name: `tmp-${Date.now()}`, mimeType: targetMime, parents: [tmpFolder.getId()] } as GoogleAppsScript.Drive_v3.Drive.V3.Schema.File,
      src.getBlob(),
      ocr ? { ocrLanguage: 'th' } : {},
    );
    try {
      return read(created.id!);
    } finally {
      DriveApp.getFileById(created.id!).setTrashed(true);
    }
  }

  readTables(fileId: string, mimeType: string) {
    if (mimeType.startsWith('text/')) {
      const blob = DriveApp.getFileById(fileId).getBlob();
      let text = blob.getDataAsString('UTF-8');
      if (text.includes('�')) text = blob.getDataAsString('TIS-620');
      return [{ name: DriveApp.getFileById(fileId).getName(), rows: parseDelimited(text) }];
    }
    return this.convert(fileId, SPREADSHEET_MIME, (id) => this.sheetTables(SpreadsheetApp.openById(id)));
  }

  readSheetUrl(url: string) {
    try {
      return this.sheetTables(SpreadsheetApp.openByUrl(url));
    } catch {
      throw new AppError('VALIDATION_FAILED', 'เปิดลิงก์ Google Sheets ไม่ได้ — แชร์ไฟล์ให้บัญชีผู้ดูแลระบบ (สิทธิ์ผู้มีสิทธิ์อ่าน) ก่อน');
    }
  }

  ocr(fileId: string): string {
    return this.convert(fileId, DOC_MIME, (id) => DocumentApp.openById(id).getBody().getText(), true);
  }

  listInbox() {
    const it = this.folder(FOLDERS.inbox).getFiles();
    const out: Array<{ id: string; name: string; mimeType: string; bytes: () => Uint8Array }> = [];
    while (it.hasNext() && out.length < 20) {
      const f = it.next();
      out.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), bytes: () => toUnsigned(f.getBlob().getBytes()) });
    }
    return out;
  }

  moveToFolder(fileId: string, folderPath: string): void {
    DriveApp.getFileById(fileId).moveTo(this.folder(folderPath));
  }

  renderMemo(folderPath: string, baseName: string, memo: MemoData): { docId: string; pdfId: string } {
    const folder = this.folder(folderPath);
    const doc = buildMemoDoc(baseName, memo);
    const docId = doc.getId();
    doc.saveAndClose();
    const docFile = DriveApp.getFileById(docId);
    docFile.moveTo(folder);
    docFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    const pdf = folder.createFile(docFile.getAs('application/pdf').setName(`${baseName}.pdf`));
    pdf.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return { docId, pdfId: pdf.getId() };
  }
}

/* ------------------------------- provisioning ------------------------------ */

/** idempotent: สร้างโฟลเดอร์/ไฟล์/แท็บ/หัวคอลัมน์ที่ยังไม่มี; ไม่ลบหรือย้ายข้อมูลเดิม */
export function provision(files: GasFiles, dryRun = false): string[] {
  const log: string[] = [];
  for (const p of Object.values(FOLDERS)) {
    if (!dryRun) files.folder(p);
    log.push(`folder: ${p}`);
  }
  const ids: Partial<Record<FileKey, string>> = JSON.parse(gasProps.get('FILE_IDS') || '{}');
  const systemFolder = files.folder(FOLDERS.system);
  for (const key of Object.keys(FILE_NAMES) as FileKey[]) {
    if (!ids[key]) {
      const found = systemFolder.getFilesByName(FILE_NAMES[key]);
      if (found.hasNext()) ids[key] = found.next().getId();
      else if (!dryRun) {
        const ss = SpreadsheetApp.create(FILE_NAMES[key]);
        DriveApp.getFileById(ss.getId()).moveTo(systemFolder);
        ids[key] = ss.getId();
        log.push(`create spreadsheet: ${FILE_NAMES[key]}`);
      }
    }
  }
  if (dryRun) return log;
  gasProps.set('FILE_IDS', JSON.stringify(ids));
  for (const [table, def] of Object.entries(TABLES) as Array<[TableName, (typeof TABLES)[TableName]]>) {
    const ss = SpreadsheetApp.openById(ids[def.file]!);
    let sh = ss.getSheetByName(table);
    if (!sh) {
      sh = ss.insertSheet(table);
      log.push(`create sheet: ${table}`);
    }
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String).filter(Boolean);
    const missing = def.columns.map(([c]) => c).filter((c) => !header.includes(c));
    if (missing.length) {
      sh.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
      log.push(`add columns ${table}: ${missing.join(',')}`);
    }
    const full = [...header, ...missing];
    full.forEach((c, i) => {
      const type = def.columns.find(([n]) => n === c)?.[1];
      if (type === 'string' || type === 'json') sh!.getRange(1, i + 1, sh!.getMaxRows(), 1).setNumberFormat('@');
    });
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, full.length).setFontWeight('bold').setBackground('#e8f1ea');
  }
  for (const key of Object.keys(FILE_NAMES) as FileKey[]) {
    const ss = SpreadsheetApp.openById(ids[key]!);
    for (const sh of ss.getSheets()) {
      if (/^(Sheet1|ชีต1|แผ่นงาน1)$/.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
    }
  }
  gasProps.set('SETUP_VERSION', SCHEMA_VERSION);
  return log;
}

export function createGasEnv(): Env {
  return {
    db: new SheetsDb(),
    lock: gasLock,
    cache: gasCache,
    props: gasProps,
    crypto: gasCrypto,
    files: new GasFiles(),
    now: () => new Date(),
    uuid: () => Utilities.getUuid(),
    log: (level, event, data) => {
      // structured log → Cloud Logging; ห้ามใส่ token/เบอร์โทร/เนื้อหาเอกสาร
      const line = JSON.stringify({ level, event, ...data });
      if (level === 'error') console.error(line);
      else if (level === 'warn') console.warn(line);
      else console.log(line);
    },
  };
}
