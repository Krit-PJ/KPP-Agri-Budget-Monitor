/**
 * API client — เรียก Apps Script Web App (โหมดใช้งานจริง) หรือ backend เดียวกันในเบราว์เซอร์ (โหมดสาธิต)
 * - POST แบบ text/plain เพื่อเลี่ยง CORS preflight ของ Apps Script (ADR-001)
 * - token เก็บใน sessionStorage เท่านั้น
 */
import type { ActionName, ActionRequest, ActionResponse, ApiEnvelope, ErrorCode, SessionUser } from '@kpp/domain';

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

export async function call<A extends ActionName>(action: A, body: ActionRequest<A> = {} as ActionRequest<A>): Promise<ActionResponse<A>> {
  const payload = { action, token: getSession()?.token, device: device(), ...(body as object) };
  let env: ApiEnvelope<ActionResponse<A>>;
  if (DEMO) {
    const demo = await import('./demo');
    env = demo.demoCall(payload) as ApiEnvelope<ActionResponse<A>>;
  } else {
    let res: Response;
    try {
      res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
    } catch {
      throw new ApiError('NETWORK', navigator.onLine ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่' : 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
    }
    if (!res.ok) throw new ApiError('NETWORK', `เซิร์ฟเวอร์ตอบกลับผิดปกติ (HTTP ${res.status})`);
    env = (await res.json()) as ApiEnvelope<ActionResponse<A>>;
  }
  if (!env.ok) {
    const err = env.error ?? { code: 'INTERNAL_ERROR' as ErrorCode, message: 'เกิดข้อผิดพลาด' };
    if (AUTH_CODES.has(err.code) && !action.startsWith('auth.login')) clearSession();
    throw new ApiError(err.code, err.message, err.details);
  }
  return env.data as ActionResponse<A>;
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
