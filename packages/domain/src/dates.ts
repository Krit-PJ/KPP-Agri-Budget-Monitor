/**
 * วันที่: เก็บ YYYY-MM-DD (ค.ศ.) ทั้งระบบ, ปีงบประมาณเก็บเป็น พ.ศ. (เช่น 2570)
 * ปีงบประมาณไทย: 1 ต.ค. – 30 ก.ย. (ต.ค. 2569 = ปีงบ 2570)
 */
import { THAI_MONTHS, thaiDigitsToArabic } from './thai';

export const BE_OFFSET = 543;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toIsoDate(y: number, m: number, d: number): string | null {
  return isValidYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
}

/** ปี: รับ พ.ศ. 4 หลัก, ค.ศ. 4 หลัก, พ.ศ. 2 หลัก (69 → 2569) แล้วคืน ค.ศ. */
export function normalizeYear(y: number): number | null {
  if (!Number.isInteger(y)) return null;
  if (y >= 2400 && y <= 2700) return y - BE_OFFSET;
  if (y >= 1900 && y <= 2200) return y;
  if (y >= 0 && y < 100) return 2500 + y - BE_OFFSET; // สมมติเป็น พ.ศ. 25xx (เอกสารราชการ)
  return null;
}

/** Excel serial (ระบบ 1900) → ISO */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 120000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function monthFromThai(token: string): number | null {
  const t = token.replace(/\s/g, '');
  for (let i = 0; i < THAI_MONTHS.length; i++) {
    const m = THAI_MONTHS[i];
    if (t === m.full || m.short.some((s) => t === s || t === s.replace(/\./g, ''))) return i + 1;
  }
  for (let i = 0; i < THAI_MONTHS.length; i++) {
    if (THAI_MONTHS[i].full.startsWith(t) && t.length >= 3) return i + 1;
  }
  return null;
}

/**
 * แปลงวันที่จากไฟล์/เอกสารเป็น ISO:
 * - Date object, Excel serial
 * - 2026-01-15, 15/01/2569, 15-1-69, 15.01.2026
 * - 15 ม.ค. 2569, 15 มกราคม 69, ๑๕ ม.ค. ๒๕๖๙
 * dd/mm/yyyy ถือเป็นรูปแบบไทยเสมอ (ไม่ใช่ mm/dd)
 */
export function parseThaiDate(input: unknown): string | null {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return toIsoDate(input.getFullYear(), input.getMonth() + 1, input.getDate());
  }
  if (typeof input === 'number') return excelSerialToIso(input);
  const s = thaiDigitsToArabic(String(input ?? '')).trim().replace(/\s+/g, ' ');
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) {
    const y = normalizeYear(Number(m[1]));
    return y ? toIsoDate(y, Number(m[2]), Number(m[3])) : null;
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const y = normalizeYear(Number(m[3]));
    return y ? toIsoDate(y, Number(m[2]), Number(m[1])) : null;
  }
  m = s.match(/^(?:วันที่\s*)?(\d{1,2})\s*([ก-๙.]+?)\s*(?:พ\.?ศ\.?\s*)?(\d{2}|\d{4})$/);
  if (m) {
    const month = monthFromThai(m[2]);
    const y = normalizeYear(Number(m[3]));
    return month && y ? toIsoDate(y, month, Number(m[1])) : null;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));
  return null;
}

/** ปีงบประมาณ (พ.ศ.) ของวันที่ ISO */
export function fiscalYearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return (m >= 10 ? y + 1 : y) + BE_OFFSET;
}

/** ช่วงวันที่ของปีงบประมาณ พ.ศ. */
export function fiscalYearRange(fyBe: number): { start: string; end: string } {
  const ce = fyBe - BE_OFFSET;
  return { start: `${ce - 1}-10-01`, end: `${ce}-09-30` };
}

/** เดือนในปีงบ (ต.ค.=1 … ก.ย.=12) */
export function fiscalMonthIndex(iso: string): number {
  const m = Number(iso.slice(5, 7));
  return m >= 10 ? m - 9 : m + 3;
}

/** ปีงบประมาณปัจจุบันตามเวลาไทย */
export function currentFiscalYear(now: Date = new Date()): number {
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  return fiscalYearOf(toIsoDate(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, bkk.getUTCDate())!);
}

/** วันนี้ (เวลาไทย) เป็น ISO */
export function todayBangkok(now: Date = new Date()): string {
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  return toIsoDate(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, bkk.getUTCDate())!;
}

let thDate: Intl.DateTimeFormat | null = null;
let thDateTime: Intl.DateTimeFormat | null = null;

export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  if (!isValidYmd(y, m, d)) return '–';
  try {
    thDate ??= new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return thDate.format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return `${d} ${THAI_MONTHS[m - 1].short[0]} ${y + BE_OFFSET}`;
  }
}

export function formatThaiDateTime(isoTs: string | null | undefined): string {
  if (!isoTs) return '–';
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return '–';
  try {
    thDateTime ??= new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
    return thDateTime.format(d);
  } catch {
    return isoTs.slice(0, 16).replace('T', ' ');
  }
}
