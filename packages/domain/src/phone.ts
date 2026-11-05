/** เบอร์โทรศัพท์: เก็บเป็นข้อความ 10 หลักขึ้นต้น 0 (คงเลข 0 นำหน้า) */
import { thaiDigitsToArabic } from './thai';

export function normalizePhone(v: unknown): string {
  let s = thaiDigitsToArabic(String(v ?? '')).replace(/\D/g, '');
  if (s.startsWith('66') && s.length === 11) s = '0' + s.slice(2);
  if (s.length === 9 && s[0] !== '0') s = '0' + s;
  return s;
}

/** มือถือไทย 06/08/09 หรือเบอร์บ้าน 0x 9 หลัก */
export function isValidPhone(p: string): boolean {
  return /^0[689]\d{8}$/.test(p) || /^0[2-7]\d{7}$/.test(p);
}

/** แสดงแบบปกปิด: 0812345678 → 081-xxx-5678 */
export function maskPhone(p: string): string {
  const n = normalizePhone(p);
  if (n.length < 9) return 'xxx';
  return `${n.slice(0, 3)}-xxx-${n.slice(-4)}`;
}
