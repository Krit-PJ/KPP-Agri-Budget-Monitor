/**
 * Ports (interfaces) ที่ core ใช้ — แยกจาก Google services เพื่อให้ทดสอบบน Node
 * และใช้ในโหมดสาธิตบนเบราว์เซอร์ได้ (ADR-001)
 */
import type { TableName } from './schema';
import type { MemoData } from '@kpp/domain';

export type Row = Record<string, unknown> & { id?: string };

export interface Db {
  /** อ่านทั้งตาราง (adapter cache ภายใน request) */
  list<T = Row>(table: TableName): T[];
  insert(table: TableName, rows: object[]): void;
  /** แก้ทั้งแถวตาม id — ไม่ตรวจ version (service ตรวจเอง) */
  update(table: TableName, id: string, patch: object): void;
  /** นับเซลล์ที่ใช้ต่อไฟล์ (System Health) */
  cellUsage(): Array<{ file: string; cells: number }>;
  /** เขียนรายการที่ buffer ไว้ลงที่เก็บจริง (Sheets adapter รวมเป็น batch) */
  flush?(): void;
  /** ล้าง cache ข้ามคำขอของทุกตาราง (หลังแก้ชีตด้วยมือ) */
  invalidate?(): void;
}

export interface Locker {
  /** รันใน script lock; หมดเวลา → AppError BUSY_RETRY */
  withLock<T>(fn: () => T, timeoutMs?: number): T;
}

export interface Cache {
  get(key: string): string | null;
  put(key: string, value: string, ttlSeconds: number): void;
  remove(key: string): void;
}

export interface Props {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface Crypto {
  sha256Hex(data: string | Uint8Array): string;
  hmacSha256B64Url(key: string, message: string): string;
  /** PBKDF2-HMAC-SHA256 คืน hex ยาว 64 ตัวอักษร */
  pbkdf2Hex(password: string, saltHex: string, iterations: number): string;
  randomHex(bytes: number): string;
  base64Decode(b64: string): Uint8Array;
  b64urlEncodeUtf8(text: string): string;
  b64urlDecodeUtf8(b64url: string): string;
}

export interface StoredFile { id: string; sha256: string; sizeBytes: number; mimeType: string }

export interface FileStore {
  /** บันทึกไฟล์ลงโฟลเดอร์ (path แยกด้วย /) คืนข้อมูลไฟล์ */
  save(folderPath: string, fileName: string, mimeType: string, bytes: Uint8Array): StoredFile;
  /** อ่านตารางจากไฟล์ที่บันทึกแล้ว (CSV/TSV/XLSX/XLS) — คืนทุกแท็บ */
  readTables(fileId: string, mimeType: string): Array<{ name: string; rows: unknown[][] }>;
  /** อ่านตารางจากลิงก์ Google Sheets */
  readSheetUrl(url: string): Array<{ name: string; rows: unknown[][] }>;
  /** OCR ภาษาไทยจากรูป/PDF */
  ocr(fileId: string): string;
  /** ไฟล์ใหม่ในโฟลเดอร์ Inbox */
  listInbox(): Array<{ id: string; name: string; mimeType: string; bytes: () => Uint8Array }>;
  moveToFolder(fileId: string, folderPath: string): void;
  /** สร้างบันทึกข้อความเป็น Google Doc (แก้ไขได้) + PDF ในโฟลเดอร์ที่กำหนด */
  renderMemo(folderPath: string, baseName: string, memo: MemoData): { docId: string; pdfId: string };
}

export interface Env {
  db: Db;
  lock: Locker;
  cache: Cache;
  props: Props;
  crypto: Crypto;
  files: FileStore;
  now(): Date;
  uuid(): string;
  log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>): void;
}
