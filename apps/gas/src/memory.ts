/**
 * In-memory adapter — ใช้ในการทดสอบ (Node) และโหมดสาธิตบนเบราว์เซอร์
 * พฤติกรรมเลียนแบบ Sheets adapter: เก็บค่าตาม schema, escape formula, คืนสำเนา
 */
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { AppError, escapeCell, parseDelimited, readXlsx, unescapeCell } from '@kpp/domain';
import type { Cache, Crypto, Db, Env, FileStore, Locker, Props, Row } from './core/env';
import { primaryKeyOf, TABLES, type TableName } from './core/schema';

function coerce(type: string, v: unknown): unknown {
  if (type === 'number') return v === '' || v === null || v === undefined ? 0 : Number(v);
  if (type === 'boolean') return v === true || v === 'TRUE' || v === 'true';
  return v === null || v === undefined ? '' : unescapeCell(String(v));
}

export class MemoryDb implements Db {
  readonly tables = new Map<TableName, Row[]>();

  private store(table: TableName): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  private normalize(table: TableName, row: Row): Row {
    const out: Row = {};
    for (const [col, type] of TABLES[table].columns) out[col] = coerce(type, escapeCell(row[col] ?? (type === 'number' ? 0 : type === 'boolean' ? false : '')));
    return out;
  }

  list<T = Row>(table: TableName): T[] {
    return this.store(table).map((r) => ({ ...r }) as T);
  }

  insert(table: TableName, rows: object[]): void {
    this.store(table).push(...rows.map((r) => this.normalize(table, r as Row)));
  }

  update(table: TableName, id: string, patch: object): void {
    const pk = primaryKeyOf(table);
    const rows = this.store(table);
    const i = rows.findIndex((r) => r[pk] === id);
    if (i < 0) throw new AppError('NOT_FOUND', `ไม่พบแถว ${table}:${id}`);
    rows[i] = this.normalize(table, { ...rows[i], ...patch });
  }

  cellUsage(): Array<{ file: string; cells: number }> {
    const by = new Map<string, number>();
    for (const [t, rows] of this.tables) {
      const def = TABLES[t];
      by.set(def.file, (by.get(def.file) ?? 0) + (rows.length + 1) * def.columns.length);
    }
    return [...by.entries()].map(([file, cells]) => ({ file, cells }));
  }

  /** export/import สำหรับเก็บสถานะโหมดสาธิตใน sessionStorage */
  dump(): string {
    return JSON.stringify([...this.tables.entries()]);
  }
  load(json: string): void {
    this.tables.clear();
    for (const [k, v] of JSON.parse(json) as Array<[TableName, Row[]]>) this.tables.set(k, v);
  }
}

export class MemoryCache implements Cache {
  private m = new Map<string, { v: string; exp: number }>();
  constructor(private clock: () => Date) {}
  get(key: string): string | null {
    const e = this.m.get(key);
    if (!e) return null;
    if (e.exp < this.clock().getTime()) {
      this.m.delete(key);
      return null;
    }
    return e.v;
  }
  put(key: string, value: string, ttl: number): void {
    this.m.set(key, { v: value, exp: this.clock().getTime() + ttl * 1000 });
  }
  remove(key: string): void {
    this.m.delete(key);
  }
}

export class MemoryProps implements Props {
  readonly m = new Map<string, string>();
  get(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  set(k: string, v: string): void {
    this.m.set(k, v);
  }
}

export class MemoryLock implements Locker {
  busy = false;
  withLock<T>(fn: () => T): T {
    if (this.busy) throw new AppError('BUSY_RETRY', 'ระบบกำลังบันทึกข้อมูลของผู้ใช้อื่น กรุณาลองใหม่อีกครั้ง');
    this.busy = true;
    try {
      return fn();
    } finally {
      this.busy = false;
    }
  }
}

function b64encode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export const nobleCrypto: Crypto = {
  sha256Hex: (d) => bytesToHex(sha256(typeof d === 'string' ? utf8ToBytes(d) : d)),
  hmacSha256B64Url: (key, msg) => b64encode(hmac(sha256, utf8ToBytes(key), utf8ToBytes(msg))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  pbkdf2Hex: (password, saltHex, iterations) => bytesToHex(pbkdf2(sha256, utf8ToBytes(password), utf8ToBytes(saltHex), { c: iterations, dkLen: 32 })),
  randomHex: (n) => {
    const b = new Uint8Array(n);
    globalThis.crypto.getRandomValues(b);
    return bytesToHex(b);
  },
  base64Decode: (b64) => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
  b64urlEncodeUtf8: (s) => b64encode(utf8ToBytes(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  b64urlDecodeUtf8: (s) => {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
    return new TextDecoder().decode(nobleCrypto.base64Decode(b64));
  },
};

/** ข้อความตัวอย่างสำหรับ OCR ในโหมดสาธิต (Drive OCR ใช้ได้เฉพาะเมื่อติดตั้งจริง) */
export const DEMO_OCR_TEXT = `ที่ กษ ๐๐๑๒/๒๔๕                      สำนักงานเกษตรจังหวัดกำแพงเพชร
                                           ๑๘ พฤศจิกายน ๒๕๖๙
เรื่อง  ขอส่งเอกสารประกอบการเบิกจ่ายเงินงบประมาณ
เรียน  คลังจังหวัดกำแพงเพชร
ด้วยสำนักงานเกษตรจังหวัดกำแพงเพชร ขอส่งเอกสารประกอบการเบิกจ่าย จำนวนเงิน ๔๕,๕๐๐.๐๐ บาท (สี่หมื่นห้าพันห้าร้อยบาทถ้วน)`;

export class MemoryFiles implements FileStore {
  readonly files = new Map<string, { name: string; mime: string; bytes: Uint8Array; folder: string }>();
  inbox: Array<{ id: string; name: string; mimeType: string; bytes: Uint8Array }> = [];
  constructor(private crypto: Crypto, private uuid: () => string) {}
  save(folder: string, name: string, mime: string, bytes: Uint8Array) {
    const id = `mem-${this.uuid()}`;
    this.files.set(id, { name, mime, bytes, folder });
    return { id, sha256: this.crypto.sha256Hex(bytes), sizeBytes: bytes.length, mimeType: mime };
  }
  readTables(fileId: string, mime: string) {
    const f = this.files.get(fileId) ?? this.inbox.find((x) => x.id === fileId);
    if (!f) throw new AppError('NOT_FOUND', 'ไม่พบไฟล์');
    if (/spreadsheetml|ms-excel/.test(mime)) {
      try {
        return readXlsx(f.bytes).map((s) => ({ name: s.name, rows: s.rows as unknown[][] }));
      } catch {
        throw new AppError('VALIDATION_FAILED', 'อ่านไฟล์ Excel ไม่ได้ (รองรับ .xlsx)');
      }
    }
    if (!mime.startsWith('text/')) throw new AppError('VALIDATION_FAILED', 'โหมดสาธิตอ่านได้เฉพาะ Excel (.xlsx) และ CSV/TSV');
    let text = new TextDecoder('utf-8').decode(f.bytes);
    if (text.includes('�')) text = new TextDecoder('windows-874').decode(f.bytes);
    return [{ name: 'name' in f ? f.name : 'file', rows: parseDelimited(text) }];
  }
  readSheetUrl(): Array<{ name: string; rows: unknown[][] }> {
    throw new AppError('VALIDATION_FAILED', 'โหมดสาธิตยังไม่รองรับลิงก์ Google Sheets');
  }
  ocr(): string {
    return DEMO_OCR_TEXT;
  }
  listInbox() {
    const items = this.inbox.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType, bytes: () => f.bytes }));
    return items;
  }
  moveToFolder(fileId: string, folder: string): void {
    const i = this.inbox.findIndex((x) => x.id === fileId);
    if (i >= 0) {
      const f = this.inbox.splice(i, 1)[0];
      this.files.set(f.id, { name: f.name, mime: f.mimeType, bytes: f.bytes, folder });
    }
  }
}

export interface MemoryEnv extends Env {
  db: MemoryDb;
  props: MemoryProps;
  files: MemoryFiles;
  lock: MemoryLock;
  setNow(d: Date): void;
}

export function createMemoryEnv(start = new Date()): MemoryEnv {
  let now = start;
  const clock = () => now;
  const uuid = () => globalThis.crypto.randomUUID();
  const env: MemoryEnv = {
    db: new MemoryDb(),
    lock: new MemoryLock(),
    cache: new MemoryCache(clock),
    props: new MemoryProps(),
    crypto: nobleCrypto,
    files: new MemoryFiles(nobleCrypto, uuid),
    now: clock,
    uuid,
    log: () => undefined,
    setNow: (d: Date) => {
      now = d;
    },
  };
  return env;
}
