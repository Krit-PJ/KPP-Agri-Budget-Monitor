/**
 * PBKDF2-HMAC-SHA256 (RFC 8018) แบบ pure — ใช้กับ HMAC ของ Apps Script (Utilities)
 * dkLen = 32 ไบต์ (1 block) ซึ่งพอสำหรับเก็บ hash รหัสผ่าน
 */
export type HmacFn = (key: number[], message: number[]) => number[];

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

export function pbkdf2Sha256Hex(hmacFn: HmacFn, password: string, salt: string, iterations: number): string {
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error('iterations ไม่ถูกต้อง');
  const key = utf8(password);
  let u = hmacFn(key, [...utf8(salt), 0, 0, 0, 1]).map((b) => b & 0xff);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = hmacFn(key, u).map((b) => b & 0xff);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return t.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('');
}
