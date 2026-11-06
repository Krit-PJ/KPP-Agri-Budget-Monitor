/**
 * API client — เรียก Apps Script Web App (โหมดใช้งานจริง) หรือ backend เดียวกันในเบราว์เซอร์ (โหมดสาธิต)
 * - POST แบบ text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script (ADR-001)
 * - token เก็บใน sessionStorage เท่านั้น
 * - ความเร็ว (Apps Script ใช้เวลาเริ่มต้น ~1.5 วินาทีต่อคำขอ):
 *   1) คำขออ่านที่เกิดพร้อมกันรวมเป็นคำขอเดียว (action "batch")
 *   2) cache ผลแบบ stale-while-revalidate: แสดงข้อมูลล่าสุดทันที แล้วอัปเดตเบื้องหลัง
 *   3) คำขอซ้ำที่กำลังรออยู่ใช้ผลร่วมกัน
 */
import { BATCH_MAX, READ_ACTIONS, type ActionName, type ActionRequest, type ActionResponse, type ApiEnvelope, type ErrorCode, type SessionUser } from '@kpp/domain';

declare global {
  interface Window { KPP_CONFIG?: { API_URL?: string } }
}

export const API_URL = (window.KPP_CONFIG?.API_URL ?? '').trim();
export const DEMO = !/^https:\/\/script\.google(usercontent)?\.com\//.test(API_URL);

export class ApiError extends Error {
  constructor(public code: ErrorCode | 'NETWORK', message: string, public details?: unknown) {
    super(message);
  }
}

const SESSION_KEY = 'kpp-abm-session-v1';
interface Session { token: string; user: SessionUser; exp: number }

export function getSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Session | null;
    if (!s || Date.now() > s.exp) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user, exp: Date.now() + 8 * 3600_000 }));
  } catch { /* private mode */ }
  window.dispatchEvent(new Event('kpp-auth'));
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
  window.dispatchEvent(new Event('kpp-auth'));
}

function device(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : 'Other';
  return `${browser} / ${os}`;
}

const AUTH_CODES = new Set(['AUTH_REQUIRED', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'ACCOUNT_SUSPENDED']);

async function post(payload: object): Promise<ApiEnvelope<unknown>> {
  if (DEMO) {
    const demo = await import('./demo');
    return (await demo.demoCall(payload as Record<string, unknown>)) as ApiEnvelope<unknown>;
  }
  let res: Response;
  try {
    res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
  } catch {
    throw new ApiError('NETWORK', navigator.onLine ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่' : 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
  }
  if (!res.ok) throw new ApiError('NETWORK', `เซิร์ฟเวอร์ตอบกลับผิดปกติ (HTTP ${res.status})`);
  return (await res.json()) as ApiEnvelope<unknown>;
}

function unwrap<T>(action: string, env: ApiEnvelope<unknown>): T {
  if (!env.ok) {
    const err = env.error ?? { code: 'INTERNAL_ERROR' as ErrorCode, message: 'เกิดข้อผิดพลาด' };
    if (AUTH_CODES.has(err.code) && !action.startsWith('auth.login')) clearSession();
    throw new ApiError(err.code, err.message, err.details);
  }
  return env.data as T;
}

/* ---------------------------- รวมคำขออ่านเป็น batch ---------------------------- */

interface Queued { action: string; body: object; resolve: (v: unknown) => void; reject: (e: unknown) => void }
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flushQueue(): void {
  timer = null;
  const items = queue;
  queue = [];
  for (let i = 0; i < items.length; i += BATCH_MAX) {
    const group = items.slice(i, i + BATCH_MAX);
    const base = { token: getSession()?.token, device: device() };
    if (group.length === 1) {
      const q = group[0];
      post({ action: q.action, ...base, ...q.body }).then((e) => q.resolve(unwrap(q.action, e)), q.reject);
      continue;
    }
    post({ action: 'batch', ...base, calls: group.map((q) => ({ action: q.action, ...q.body })) })
      .then((e) => {
        const list = unwrap<Array<ApiEnvelope<unknown>>>('batch', e);
        group.forEach((q, k) => {
          try {
            q.resolve(unwrap(q.action, list[k] ?? { ok: false, data: null, meta: null, error: { code: 'INTERNAL_ERROR', message: 'ไม่ได้รับผล' } }));
          } catch (err) {
            q.reject(err);
          }
        });
      })
      .catch((err) => group.forEach((q) => q.reject(err)));
  }
}

export async function call<A extends ActionName>(action: A, body: ActionRequest<A> = {} as ActionRequest<A>): Promise<ActionResponse<A>> {
  if (READ_ACTIONS.has(action) && !DEMO) {
    return new Promise<ActionResponse<A>>((resolve, reject) => {
      queue.push({ action, body: body as object, resolve: resolve as (v: unknown) => void, reject });
      timer ??= setTimeout(flushQueue, 0);
    });
  }
  const out = unwrap<ActionResponse<A>>(action, await post({ action, token: getSession()?.token, device: device(), ...(body as object) }));
  if (!READ_ACTIONS.has(action)) markAllStale();
  return out;
}

/* ------------------------------ cache ผลการอ่าน ------------------------------ */
/**
 * - ข้อมูลสาธารณะ (public.*) เก็บใน localStorage ด้วย: เปิดเว็บครั้งถัดไปเห็นข้อมูลทันที
 * - ข้อมูลเจ้าหน้าที่เก็บในหน่วยความจำของแท็บเท่านั้น และล้างเมื่อออกจากระบบ/เปลี่ยนผู้ใช้
 * - หลังบันทึกข้อมูลใด ๆ ทุกรายการถูกทำเครื่องหมายว่าเก่า (ยังแสดงได้ แต่ดึงใหม่เมื่อเปิดหน้า)
 */
export interface CacheEntry<T = unknown> { data: T; at: number }
const LS_PREFIX = 'kpp-cache-v1:';
const mem = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const isPublic = (a: string) => a.startsWith('public.');

export function cacheKey(action: ActionName, body: unknown): string {
  return `${action}:${JSON.stringify(body ?? {})}${isPublic(action) ? '' : `:${getSession()?.user.sub ?? ''}`}`;
}

export function peek<A extends ActionName>(action: A, body: ActionRequest<A>): CacheEntry<ActionResponse<A>> | undefined {
  const k = cacheKey(action, body);
  let e = mem.get(k);
  if (!e && isPublic(action)) {
    try {
      // เฉพาะ public.* ซึ่ง server รับประกันว่าไม่มี PII (ดู services/public.ts) — token/ข้อมูลเจ้าหน้าที่ไม่เคยลง localStorage
      // eslint-disable-next-line no-restricted-syntax
      const raw = localStorage.getItem(LS_PREFIX + k);
      // ข้อมูลจาก localStorage ถือว่าเก่าเสมอ (at = 0) — แสดงก่อนแล้วดึงใหม่
      if (raw) e = { data: JSON.parse(raw) as unknown, at: 0 };
    } catch { /* storage ไม่พร้อม */ }
    if (e) mem.set(k, e);
  }
  return e as CacheEntry<ActionResponse<A>> | undefined;
}

export function load<A extends ActionName>(action: A, body: ActionRequest<A>): Promise<ActionResponse<A>> {
  const k = cacheKey(action, body);
  const running = inflight.get(k);
  if (running) return running as Promise<ActionResponse<A>>;
  const p = call(action, body)
    .then((data) => {
      mem.set(k, { data, at: Date.now() });
      if (isPublic(action)) {
        try {
          // eslint-disable-next-line no-restricted-syntax -- public.* เท่านั้น (ไม่มี PII)
          localStorage.setItem(LS_PREFIX + k, JSON.stringify(data));
        } catch { /* quota */ }
      }
      return data;
    })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/** เริ่มโหลดล่วงหน้า (เช่น ตอนเปิดเว็บ) — ถ้ามีข้อมูลที่ยังใหม่อยู่แล้วจะไม่ดึงซ้ำ */
export function prefetch<A extends ActionName>(action: A, body: ActionRequest<A>, freshMs = 15_000): void {
  const e = peek(action, body);
  if (e && Date.now() - e.at < freshMs) return;
  load(action, body).catch(() => undefined);
}

function markAllStale(): void {
  for (const e of mem.values()) e.at = 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener('kpp-auth', () => {
    for (const k of [...mem.keys()]) if (!isPublic(k.split(':')[0])) mem.delete(k);
  });
}

/** idempotency key ต่อการกดบันทึก 1 ครั้ง (กดซ้ำ/เน็ตหลุดแล้วส่งใหม่ ไม่เกิดรายการซ้ำ) */
export function newKey(prefix = 'k'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** อ่านไฟล์เป็น base64 (ไม่มี prefix data:) */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    r.readAsDataURL(file);
  });
}

/**
 * ย่อรูปถ่ายหนังสือก่อนอัปโหลด: ยาวสุด 2000px, JPEG 0.85
 * วาดผ่าน canvas จึงตัด EXIF (รวมพิกัด GPS) ออกด้วย
 */
export async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!file.type.startsWith('image/')) return { blob: file, name: file.name };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { blob: file, name: file.name };
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return { blob: blob ?? file, name: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}
