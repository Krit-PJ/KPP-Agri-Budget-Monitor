/**
 * Authentication & Authorization
 * - โมเดลบทบาทเดียวกับ Agri-Risk Map: admin / minisuper / superadmin
 * - Admin เข้าระบบด้วยเบอร์โทรอย่างเดียว (ADR-002 accepted risk) + มาตรการชดเชย
 * - Super Admin: username + password (PBKDF2-HMAC-SHA256) + throttling
 * - Token: HMAC-SHA256 signed, มี tokenVersion เพื่อเพิกถอนทันที
 */
import {
  AppError, cleanText, isValidPhone, maskPhone, normalizePhone,
  type AccessRequest, type SessionUser, type User, type Workgroup,
} from '@kpp/domain';
import { audit, findById, live, newMeta, nowIso, type Ctx } from './context';

export const TOKEN_HOURS = 8;
export const PBKDF2_ITERATIONS = 20000;
const PHONE_FAIL_LIMIT = 5;
const PHONE_FAIL_WINDOW_S = 15 * 60;
const GLOBAL_FAIL_LIMIT = 30;
const GLOBAL_FAIL_WINDOW_S = 10 * 60;
const SUPER_FAIL_LIMIT = 5;
const SUPER_LOCK_S = 15 * 60;

interface TokenPayload {
  sub: string;
  role: SessionUser['role'];
  tv: number;
  exp: number;
  jti: string;
}

/* --------------------------------- token --------------------------------- */

/** เปรียบเทียบสตริงแบบเวลาคงที่ */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function tokenSecret(ctx: Ctx): string {
  let s = ctx.env.props.get('TOKEN_SECRET');
  if (!s) {
    s = ctx.env.crypto.randomHex(32);
    ctx.env.props.set('TOKEN_SECRET', s);
  }
  return s;
}

export function signToken(ctx: Ctx, p: Omit<TokenPayload, 'exp' | 'jti'>): string {
  const payload: TokenPayload = { ...p, exp: ctx.env.now().getTime() + TOKEN_HOURS * 3600_000, jti: ctx.env.uuid() };
  const body = ctx.env.crypto.b64urlEncodeUtf8(JSON.stringify(payload));
  return `${body}.${ctx.env.crypto.hmacSha256B64Url(tokenSecret(ctx), body)}`;
}

/** ตรวจ token และโหลดสิทธิ์ล่าสุดจากชีต (ระงับ/เปลี่ยนสิทธิ์มีผลทันที) */
export function verifyToken(ctx: Ctx, token: unknown): SessionUser {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AppError('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  const expected = ctx.env.crypto.hmacSha256B64Url(tokenSecret(ctx), parts[0]);
  if (!safeEqual(expected, parts[1])) throw new AppError('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  let p: TokenPayload;
  try {
    p = JSON.parse(ctx.env.crypto.b64urlDecodeUtf8(parts[0])) as TokenPayload;
  } catch {
    throw new AppError('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  }
  if (!p.exp || ctx.env.now().getTime() > p.exp) throw new AppError('TOKEN_EXPIRED', 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
  if (p.role === 'superadmin') {
    const tv = Number(ctx.env.props.get('SUPER_TV') || '1');
    if (p.tv !== tv) throw new AppError('TOKEN_REVOKED', 'สิทธิ์การเข้าใช้ถูกเพิกถอน กรุณาเข้าสู่ระบบใหม่');
    return superUser(ctx);
  }
  const user = ctx.env.db.list<User>('Users').find((u) => u.id === p.sub && !u.isDeleted);
  if (!user) throw new AppError('TOKEN_REVOKED', 'บัญชีถูกลบ');
  if (user.status !== 'active') throw new AppError('ACCOUNT_SUSPENDED', 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  if (Number(user.tokenVersion) !== p.tv) throw new AppError('TOKEN_REVOKED', 'สิทธิ์การเข้าใช้ถูกเพิกถอน กรุณาเข้าสู่ระบบใหม่');
  return toSessionUser(ctx, user);
}

export function superUser(ctx: Ctx): SessionUser {
  const name = ctx.env.props.get('SUPER_USER') || 'superadmin';
  return { sub: `SUPER:${name}`, name: `Super Admin (${name})`, role: 'superadmin', workgroupIds: null, workgroupName: 'ทุกกลุ่มงาน' };
}

export function toSessionUser(ctx: Ctx, u: User): SessionUser {
  const groups = ctx.env.db.list<Workgroup>('Workgroups');
  if (u.role === 'minisuper') {
    return { sub: u.id, name: u.fullName, role: 'minisuper', workgroupIds: null, workgroupName: 'ทุกกลุ่มงาน' };
  }
  let scope: string[] = [];
  try {
    scope = JSON.parse(u.scopeWorkgroups || '[]') as string[];
  } catch {
    scope = [];
  }
  const ids = [...new Set([u.workgroupId, ...scope].filter(Boolean))];
  return {
    sub: u.id, name: u.fullName, role: 'admin', workgroupIds: ids,
    workgroupName: groups.find((g) => g.id === u.workgroupId)?.name ?? '',
  };
}

/* -------------------------------- throttle ------------------------------- */

function bumpCounter(ctx: Ctx, key: string, ttl: number): number {
  const n = Number(ctx.env.cache.get(key) || '0') + 1;
  ctx.env.cache.put(key, String(n), ttl);
  return n;
}
function counter(ctx: Ctx, key: string): number {
  return Number(ctx.env.cache.get(key) || '0');
}

function deviceHash(ctx: Ctx, device: string): string {
  return ctx.env.crypto.sha256Hex(`dev:${cleanText(device, 200)}`).slice(0, 16);
}

function logAttempt(ctx: Ctx, role: string, identifierMasked: string, result: string, userId = '', newDevice = false): void {
  ctx.env.db.insert('LoginAttempts', [{
    id: ctx.env.uuid(), at: nowIso(ctx), role, identifierMasked, result, userId,
    device: cleanText(ctx.device, 120), newDevice,
  }]);
}

export function phoneHash(ctx: Ctx, phone: string): string {
  return ctx.env.crypto.sha256Hex(`phone:${normalizePhone(phone)}`);
}

/* ---------------------------------- login --------------------------------- */

/** Admin / Mini Super Admin: เบอร์โทรอย่างเดียว (ADR-002) */
export function loginAdmin(ctx: Ctx, body: { phone?: unknown }): { token: string; user: SessionUser } {
  const phone = normalizePhone(body.phone);
  if (!isValidPhone(phone)) {
    logAttempt(ctx, 'admin', String(body.phone ?? '').slice(0, 3) + '…', 'invalid');
    throw new AppError('VALIDATION_FAILED', 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ตัวอย่าง 0812345678)');
  }
  const h = phoneHash(ctx, phone);
  const phoneKey = `thr:p:${h.slice(0, 24)}`;
  if (counter(ctx, phoneKey) >= PHONE_FAIL_LIMIT || counter(ctx, 'thr:global') >= GLOBAL_FAIL_LIMIT) {
    logAttempt(ctx, 'admin', maskPhone(phone), 'throttled');
    throw new AppError('LOGIN_THROTTLED', 'มีการพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
  }
  const user = ctx.env.db.list<User>('Users').find((u) => !u.isDeleted && (u.phoneHash === h || normalizePhone(u.phone) === phone));
  if (!user) {
    bumpCounter(ctx, phoneKey, PHONE_FAIL_WINDOW_S);
    bumpCounter(ctx, 'thr:global', GLOBAL_FAIL_WINDOW_S);
    logAttempt(ctx, 'admin', maskPhone(phone), 'not_found_or_pending');
    // ข้อความเดียวสำหรับ "ไม่พบ" และ "รออนุมัติ" เพื่อลดการสำรวจเบอร์
    throw new AppError('ACCOUNT_PENDING', 'หมายเลขนี้ยังไม่มีสิทธิ์ใช้งาน หรือคำขอยังรอการอนุมัติ');
  }
  if (user.status !== 'active') {
    logAttempt(ctx, user.role, maskPhone(phone), 'suspended', user.id);
    throw new AppError('ACCOUNT_SUSPENDED', 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  }
  const dh = deviceHash(ctx, ctx.device);
  let known: string[] = [];
  try {
    known = JSON.parse(user.knownDevices || '[]') as string[];
  } catch {
    known = [];
  }
  const isNew = !known.includes(dh);
  if (isNew) known = [dh, ...known].slice(0, 10);
  ctx.env.db.update('Users', user.id, { ...user, lastLoginAt: nowIso(ctx), knownDevices: JSON.stringify(known) });
  logAttempt(ctx, user.role, maskPhone(phone), 'success', user.id, isNew);
  const session = toSessionUser(ctx, user);
  return { token: signToken(ctx, { sub: user.id, role: session.role, tv: Number(user.tokenVersion) || 1 }), user: session };
}

export function hashPassword(ctx: Ctx, password: string, iterations = PBKDF2_ITERATIONS): string {
  const salt = ctx.env.crypto.randomHex(16);
  return `pbkdf2_sha256$${iterations}$${salt}$${ctx.env.crypto.pbkdf2Hex(password, salt, iterations)}`;
}

export function verifyPassword(ctx: Ctx, password: string, stored: string): boolean {
  const [alg, iter, salt, hash] = String(stored || '').split('$');
  if (alg !== 'pbkdf2_sha256' || !iter || !salt || !hash) return false;
  return safeEqual(ctx.env.crypto.pbkdf2Hex(password, salt, Number(iter)), hash);
}

/** ตั้ง/เปลี่ยนรหัส Super Admin — เรียกจาก Apps Script editor เท่านั้น และเพิกถอน token เดิม */
export function setSuperAdmin(ctx: Ctx, username: string, password: string): void {
  const u = cleanText(username, 60);
  // ขั้นต่ำ 8 ตัวอักษรตาม NIST SP 800-63B (มี throttling + ระงับชั่วคราวชดเชย)
  if (!u || String(password).length < 8) throw new AppError('VALIDATION_FAILED', 'username ต้องไม่ว่าง และรหัสผ่านอย่างน้อย 8 ตัวอักษร');
  ctx.env.props.set('SUPER_USER', u);
  ctx.env.props.set('SUPER_HASH', hashPassword(ctx, String(password)));
  ctx.env.props.set('SUPER_TV', String(Number(ctx.env.props.get('SUPER_TV') || '1') + 1));
}

export function loginSuper(ctx: Ctx, body: { username?: unknown; password?: unknown }): { token: string; user: SessionUser } {
  const username = cleanText(body.username, 60);
  const lockKey = 'thr:super';
  if (counter(ctx, lockKey) >= SUPER_FAIL_LIMIT) {
    logAttempt(ctx, 'superadmin', username.slice(0, 2) + '…', 'throttled');
    throw new AppError('LOGIN_THROTTLED', 'ใส่รหัสผิดหลายครั้ง ระบบระงับการเข้าสู่ระบบ Super Admin ชั่วคราว 15 นาที');
  }
  const storedUser = ctx.env.props.get('SUPER_USER') || '';
  const storedHash = ctx.env.props.get('SUPER_HASH') || '';
  // คำนวณ hash เสมอแม้ username ผิด เพื่อไม่ให้เวลาตอบสนองบอกใบ้
  const passOk = verifyPassword(ctx, String(body.password ?? ''), storedHash || 'pbkdf2_sha256$1000$00$00');
  const ok = !!storedHash && safeEqual(username.toLowerCase(), storedUser.toLowerCase()) && passOk;
  if (!ok) {
    bumpCounter(ctx, lockKey, SUPER_LOCK_S);
    logAttempt(ctx, 'superadmin', username.slice(0, 2) + '…', 'wrong_credentials');
    throw new AppError('AUTH_REQUIRED', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  ctx.env.cache.remove(lockKey);
  // อัปเกรด iteration อัตโนมัติเมื่อค่าที่เก็บต่ำกว่าค่าปัจจุบัน
  if (Number(storedHash.split('$')[1]) < PBKDF2_ITERATIONS) {
    ctx.env.props.set('SUPER_HASH', hashPassword(ctx, String(body.password)));
  }
  logAttempt(ctx, 'superadmin', storedUser.slice(0, 2) + '…', 'success', 'SUPER');
  const user = superUser(ctx);
  return { token: signToken(ctx, { sub: user.sub, role: 'superadmin', tv: Number(ctx.env.props.get('SUPER_TV') || '1') }), user };
}

/** ออกจากระบบทุกอุปกรณ์ (เพิ่ม tokenVersion) */
export function logoutAll(ctx: Ctx): void {
  const u = ctx.user;
  if (!u) return;
  if (u.role === 'superadmin') {
    ctx.env.props.set('SUPER_TV', String(Number(ctx.env.props.get('SUPER_TV') || '1') + 1));
    return;
  }
  const row = findById<User>(ctx, 'Users', u.sub, 'ผู้ใช้');
  ctx.env.db.update('Users', row.id, { ...row, tokenVersion: Number(row.tokenVersion) + 1 });
}

/* --------------------------- request for access --------------------------- */

export function requestAccess(ctx: Ctx, b: Record<string, unknown>): { requestId: string } {
  const phone = normalizePhone(b.phone);
  if (!isValidPhone(phone)) throw new AppError('VALIDATION_FAILED', 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ตัวอย่าง 0812345678)');
  const fullName = cleanText(b.fullName, 120);
  const position = cleanText(b.position, 120);
  const title = cleanText(b.title, 40);
  const affiliation = cleanText(b.affiliation, 160);
  const workgroupId = cleanText(b.workgroupId, 60);
  if (fullName.length < 4) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อ-สกุล');
  if (!position) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกตำแหน่ง');
  if (!live(ctx.env.db.list<Workgroup>('Workgroups')).some((g) => g.id === workgroupId)) {
    throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกกลุ่มงาน');
  }
  // จำกัดคำขอสาธารณะ: 20 คำขอ / ชั่วโมง ทั้งระบบ
  if (bumpCounter(ctx, 'thr:register', 3600) > 20) throw new AppError('LOGIN_THROTTLED', 'มีคำขอจำนวนมาก กรุณาลองใหม่ภายหลัง');
  const h = phoneHash(ctx, phone);
  if (ctx.env.db.list<User>('Users').some((u) => !u.isDeleted && u.phoneHash === h)) {
    throw new AppError('VALIDATION_FAILED', 'หมายเลขนี้มีสิทธิ์ใช้งานแล้ว สามารถเข้าสู่ระบบได้ทันที');
  }
  const reqs = ctx.env.db.list<AccessRequest>('AccessRequests');
  if (reqs.some((r) => r.status === 'pending' && normalizePhone(r.phone) === phone)) {
    throw new AppError('VALIDATION_FAILED', 'มีคำขอของหมายเลขนี้รอการอนุมัติอยู่แล้ว');
  }
  const meta = newMeta(ctx);
  const row: AccessRequest = {
    ...meta, createdBy: 'PUBLIC', updatedBy: 'PUBLIC', phone, fullName, position, workgroupId, affiliation,
    note: cleanText(b.note, 300), status: 'pending', decidedAt: '', decidedBy: '', reason: '', title,
  };
  ctx.env.db.insert('AccessRequests', [row as unknown as Record<string, unknown>]);
  audit(ctx, 'request_access', 'AccessRequest', row.id, { after: { fullName, workgroupId } });
  return { requestId: row.id };
}

/* ------------------------------ authorization ------------------------------ */

export function requireRole(ctx: Ctx, ...roles: SessionUser['role'][]): SessionUser {
  const u = ctx.user;
  if (!u) throw new AppError('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  if (!roles.includes(u.role)) throw new AppError('FORBIDDEN_SCOPE', 'คุณไม่มีสิทธิ์ทำรายการนี้');
  return u;
}

/**
 * สิทธิ์ "แก้ไข" ตามกลุ่มงาน — การอ่านข้อมูลงานภายใน (รายการเบิกจ่าย รายโครงการ รายงาน หน้าหลัก)
 * เจ้าหน้าที่ทุกคนดูได้ทุกกลุ่ม (ตามที่ผู้ใช้กำหนด 9 พ.ย. 2569) แต่บันทึก/แก้ไขได้เฉพาะกลุ่มในสิทธิ์ — ดู ADR-010
 */
export function canAccessWorkgroup(user: SessionUser, workgroupId: string): boolean {
  return user.workgroupIds === null || user.workgroupIds.includes(workgroupId);
}

export function requireWorkgroup(ctx: Ctx, workgroupId: string): SessionUser {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  if (!canAccessWorkgroup(u, workgroupId)) throw new AppError('FORBIDDEN_SCOPE', 'รายการนี้อยู่นอกกลุ่มงานที่คุณมีสิทธิ์');
  return u;
}
