/**
 * จำนวนเงิน: เก็บเป็น "สตางค์" (จำนวนเต็ม) ทั้งระบบ — ADR-003
 * กฎปัดเศษเดียวทั้งระบบ: half-up (ปัดครึ่งขึ้น โดยดูค่าสัมบูรณ์)
 */
import { thaiDigitsToArabic } from './thai';

export type Satang = number;

/** ปัดบาท (ทศนิยมใด ๆ) เป็นสตางค์แบบ half-up */
export function bahtToSatang(baht: number): Satang {
  if (!Number.isFinite(baht)) throw new Error('จำนวนเงินไม่ถูกต้อง');
  const sign = baht < 0 ? -1 : 1;
  // ใช้ toFixed(6) ก่อนเพื่อตัด error ของเลขฐานสอง เช่น 1.005 → 1.005000
  const abs = Number(Math.abs(baht).toFixed(6));
  return sign * Math.round(abs * 100 + 1e-9);
}

export function satangToBaht(s: Satang): number {
  return s / 100;
}

export function isSatang(v: unknown): v is Satang {
  return typeof v === 'number' && Number.isSafeInteger(v);
}

export interface ParsedMoney {
  ok: boolean;
  satang: Satang;
  /** true เมื่อเป็นค่าว่าง (ไม่ใช่ error) */
  empty: boolean;
}

/**
 * แปลงข้อความจำนวนเงินจากไฟล์/ฟอร์ม:
 * "1,234.50", "฿1,234", "1 234,00"(ไม่รองรับ), "(1,000)" → ติดลบ, "-500", "๑,๐๐๐", "1,234.50 บาท"
 * ตัวเลขชนิด number จาก Excel รับตรง
 */
export function parseMoney(input: unknown): ParsedMoney {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? { ok: true, satang: bahtToSatang(input), empty: false } : { ok: false, satang: 0, empty: false };
  }
  let s = thaiDigitsToArabic(String(input ?? '')).trim();
  if (s === '' || s === '-' || s === '–') return { ok: true, satang: 0, empty: true };
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/บาท|baht|thb|฿|\s/gi, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(s)) return { ok: false, satang: 0, empty: false };
  const n = Number(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) return { ok: false, satang: 0, empty: false };
  const satang = bahtToSatang(n);
  return { ok: true, satang: negative ? -satang : satang, empty: false };
}

/** สร้าง formatter เมื่อใช้ครั้งแรก — ถ้า runtime (เช่น Apps Script) ไม่รองรับ locale ให้ใช้รูปแบบสำรอง */
let bahtFmt: Intl.NumberFormat | null = null;
let bahtShortFmt: Intl.NumberFormat | null = null;
function groupDigits(n: number, decimals: number): string {
  const [i, f] = Math.abs(n).toFixed(decimals).split('.');
  return `${n < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${f ? `.${f}` : ''}`;
}

export function formatBaht(s: Satang): string {
  try {
    bahtFmt ??= new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return bahtFmt.format(satangToBaht(s));
  } catch {
    return groupDigits(satangToBaht(s), 2);
  }
}

/** แสดงย่อสำหรับการ์ด KPI: 1,250,000 → "1.25 ล้าน" */
export function formatBahtShort(s: Satang): string {
  const b = satangToBaht(s);
  const abs = Math.abs(b);
  if (abs >= 1_000_000) return `${(b / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้าน`;
  try {
    bahtShortFmt ??= new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
    return bahtShortFmt.format(b);
  } catch {
    return groupDigits(b, 0);
  }
}

/* ---------------- จำนวนเงินตัวอักษรไทย (ใช้ตรวจหนังสือปะหน้า) ---------------- */

const DIGIT_WORDS: Record<string, number> = {
  ศูนย์: 0, หนึ่ง: 1, เอ็ด: 1, สอง: 2, ยี่: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9,
};
const UNIT_WORDS: Record<string, number> = { สิบ: 10, ร้อย: 100, พัน: 1000, หมื่น: 10000, แสน: 100000 };

/** แปลงตัวเลขไทยตัวอักษร (ไม่เกินหลักล้านซ้อน) เป็นจำนวนเต็ม; คืน null ถ้าอ่านไม่ได้ */
export function thaiWordsToInt(words: string): number | null {
  const w = words.replace(/\s+/g, '');
  if (!w) return null;
  // แยกตาม "ล้าน" จากขวา: a ล้าน b → a*1e6 + b
  const millionIdx = w.lastIndexOf('ล้าน');
  if (millionIdx >= 0) {
    const left = w.slice(0, millionIdx);
    const right = w.slice(millionIdx + 4);
    const l = left === '' ? 1 : thaiWordsToInt(left);
    const r = right === '' ? 0 : thaiWordsToInt(right);
    if (l === null || r === null) return null;
    return l * 1_000_000 + r;
  }
  let total = 0;
  let pending: number | null = null;
  let i = 0;
  const keys = [...Object.keys(DIGIT_WORDS), ...Object.keys(UNIT_WORDS)].sort((a, b) => b.length - a.length);
  while (i < w.length) {
    const key = keys.find((k) => w.startsWith(k, i));
    if (!key) return null;
    i += key.length;
    if (key in DIGIT_WORDS) {
      if (pending !== null) return null;
      pending = DIGIT_WORDS[key];
    } else {
      const unit = UNIT_WORDS[key];
      total += (pending ?? 1) * unit;
      pending = null;
    }
  }
  if (pending !== null) total += pending;
  return total;
}

/**
 * อ่านจำนวนเงินตัวอักษร เช่น "หนึ่งหมื่นสองพันห้าร้อยบาทถ้วน", "สามร้อยบาทห้าสิบสตางค์"
 * คืนค่าเป็นสตางค์ หรือ null
 */
export function parseThaiBahtText(text: string): Satang | null {
  const t = text.replace(/[()\s]/g, '');
  const m = t.match(/^(.*?)บาท(?:ถ้วน|(.*?)สตางค์)?$/);
  if (!m) return null;
  const baht = thaiWordsToInt(m[1]);
  if (baht === null) return null;
  const st = m[2] ? thaiWordsToInt(m[2]) : 0;
  if (st === null || st > 99) return null;
  return baht * 100 + st;
}
