/** เครื่องมือข้อความภาษาไทยที่ใช้ร่วมกันทั้งระบบ */

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

/** แปลงเลขไทย ๐-๙ เป็นเลขอารบิก */
export function thaiDigitsToArabic(input: string): string {
  let out = '';
  for (const ch of input) {
    const i = THAI_DIGITS.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

/**
 * ทำให้ข้อความเทียบกันได้: ตัดช่องว่าง/เครื่องหมาย/zero-width, ตัวพิมพ์เล็ก, เลขไทย→อารบิก
 * ใช้สำหรับจับคู่หัวคอลัมน์และชื่อ master data
 */
export function normalizeKey(input: unknown): string {
  return thaiDigitsToArabic(String(input ?? ''))
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\s\-_.,:;()[\]{}/\\'"“”‘’*#|+]+/g, '');
}

/** ตัดช่องว่างซ้ำ/zero-width และ trim */
export function cleanText(input: unknown, maxLength = 500): string {
  return String(input ?? '')
    .normalize('NFC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    // eslint-disable-next-line no-control-regex -- ตั้งใจลบอักขระควบคุม
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export const THAI_MONTHS: ReadonlyArray<{ full: string; short: string[] }> = [
  { full: 'มกราคม', short: ['ม.ค.', 'มค', 'ม.ค'] },
  { full: 'กุมภาพันธ์', short: ['ก.พ.', 'กพ', 'ก.พ'] },
  { full: 'มีนาคม', short: ['มี.ค.', 'มีค', 'มี.ค'] },
  { full: 'เมษายน', short: ['เม.ย.', 'เมย', 'เม.ย'] },
  { full: 'พฤษภาคม', short: ['พ.ค.', 'พค', 'พ.ค'] },
  { full: 'มิถุนายน', short: ['มิ.ย.', 'มิย', 'มิ.ย'] },
  { full: 'กรกฎาคม', short: ['ก.ค.', 'กค', 'ก.ค'] },
  { full: 'สิงหาคม', short: ['ส.ค.', 'สค', 'ส.ค'] },
  { full: 'กันยายน', short: ['ก.ย.', 'กย', 'ก.ย'] },
  { full: 'ตุลาคม', short: ['ต.ค.', 'ตค', 'ต.ค'] },
  { full: 'พฤศจิกายน', short: ['พ.ย.', 'พย', 'พ.ย'] },
  { full: 'ธันวาคม', short: ['ธ.ค.', 'ธค', 'ธ.ค'] },
];

export const THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
