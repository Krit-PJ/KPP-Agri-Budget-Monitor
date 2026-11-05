/**
 * Smoke test ของไฟล์ dist/Code.gs: โหลดใน V8 context เปล่า (ไม่มี window/process/TextEncoder/btoa เหมือน Apps Script)
 * แล้วเรียก doGet/doPost ด้วย stub ของ ContentService/Utilities — ยืนยันว่า bundle ใช้งานได้จริง ไม่พึ่ง API ที่ Apps Script ไม่มี
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const file = new URL('../dist/Code.gs', import.meta.url);

describe.skipIf(!existsSync(file))('Apps Script bundle', () => {
  it('exposes entry points and answers without Node/browser globals', () => {
    const toSigned = (b: Buffer) => Array.from(b, (x) => (x > 127 ? x - 256 : x));
    const props = new Map<string, string>();
    const sandbox: Record<string, unknown> = {
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      ContentService: {
        MimeType: { JSON: 'json' },
        createTextOutput: (s: string) => ({ s, setMimeType() { return this; } }),
      },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
        getUuid: () => randomUUID(),
        computeDigest: (_a: string, v: string | number[]) => toSigned(createHash('sha256').update(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map((x) => x & 255))).digest()),
        computeHmacSha256Signature: (v: string | number[], k: string | number[]) => toSigned(createHmac('sha256', typeof k === 'string' ? Buffer.from(k) : Buffer.from(k.map((x) => x & 255))).update(typeof v === 'string' ? Buffer.from(v) : Buffer.from(v.map((x) => x & 255))).digest()),
        base64EncodeWebSafe: (v: string | number[]) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map((x) => x & 255))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }) },
      CacheService: { getScriptCache: () => ({ get: () => null, put: () => undefined, remove: () => undefined }) },
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => undefined }) },
    };
    vm.createContext(sandbox);
    vm.runInContext(readFileSync(file, 'utf8'), sandbox, { filename: 'Code.gs' });
    for (const fn of ['doGet', 'doPost', 'setup', 'setSuperAdmin', 'autoImportInbox', 'dailyMaintenance', 'installTriggers']) {
      expect(typeof sandbox[fn]).toBe('function');
    }
    const info = JSON.parse((sandbox.doGet as (e: unknown) => { s: string })({ parameter: {} }).s);
    expect(info.ok).toBe(true);
    const bad = JSON.parse((sandbox.doPost as (e: unknown) => { s: string })({ postData: { contents: 'not json' } }).s);
    expect(bad.error.code).toBe('VALIDATION_FAILED');
    // ยังไม่ได้ setup → ต้องตอบ error ที่ปลอดภัย ไม่ใช่ crash
    const notSetup = JSON.parse((sandbox.doPost as (e: unknown) => { s: string })({ postData: { contents: JSON.stringify({ action: 'public.summary' }) } }).s);
    expect(notSetup.ok).toBe(false);
    expect(notSetup.error.code).toBe('INTERNAL_ERROR');
  });
});
