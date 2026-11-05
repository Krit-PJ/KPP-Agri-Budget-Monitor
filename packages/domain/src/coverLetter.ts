/**
 * อ่านข้อมูลจากข้อความ OCR ของ "หนังสือปะหน้านำส่งการใช้จ่ายงบประมาณ" (ADR-004)
 * ผลลัพธ์เป็นข้อเสนอพร้อมค่าความมั่นใจ — ผู้ใช้ต้องตรวจและยืนยันเองเสมอ
 */
import { thaiDigitsToArabic, normalizeKey } from './thai';
import { parseMoney, parseThaiBahtText, type Satang } from './money';
import { parseThaiDate } from './dates';

export interface Suggestion<T> { value: T; confidence: number; source: string }

export interface CoverLetterResult {
  docNo: Suggestion<string> | null;
  date: Suggestion<string> | null;
  amount: Suggestion<Satang> | null;
  subject: Suggestion<string> | null;
  projectCode: Suggestion<string> | null;
  warnings: string[];
  /** ค่าความมั่นใจรวม (ต่ำสุดของฟิลด์ที่พบ) */
  overallConfidence: number;
}

/** แก้ตัวอักษรที่ OCR อ่านพลาดบ่อยในบริบทตัวเลข */
function fixOcrDigits(s: string): string {
  return s.replace(/(?<=\d)[oO](?=\d)/g, '0').replace(/(?<=\d)[lI](?=\d)/g, '1');
}

export function parseCoverLetter(rawText: string, knownProjectCodes: ReadonlyArray<string> = []): CoverLetterResult {
  const text = fixOcrDigits(thaiDigitsToArabic(rawText ?? '')).replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const flat = lines.join(' ');
  const warnings: string[] = [];

  // เลขที่หนังสือ: "ที่ กษ 1012/123", "ที่ กษ 1012.01/ว 45"
  let docNo: CoverLetterResult['docNo'] = null;
  const docRe = /(?:^|\s)ที่\s*([ก-ฮ]{1,3}\.?\s?[ก-ฮ]{0,3}\.?\s*\d{3,5}(?:\.\d{1,3})*\s*\/\s*(?:ว\.?\s*)?\d{1,6}(?:\s*\/\s*\d{2,4})?)/;
  const dm = flat.match(docRe);
  if (dm) docNo = { value: dm[1].replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').trim(), confidence: 0.9, source: dm[0].trim() };

  // วันที่: บรรทัดที่มีเดือนไทย + ปี (ไม่เอาวันที่ในส่วนเนื้อหาหลังคำว่า "ลงวันที่" เป็นอันดับแรก)
  let date: CoverLetterResult['date'] = null;
  const dateRe = /(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|[มกพสตธ]\.?\s?[คพยย]\.?|มี\.?\s?ค\.?|เม\.?\s?ย\.?|มิ\.?\s?ย\.?)\s*(?:พ\.?\s?ศ\.?\s*)?(\d{4}|\d{2})/g;
  const dates: Array<{ iso: string; idx: number; src: string; ref: boolean }> = [];
  for (const m of flat.matchAll(dateRe)) {
    const iso = parseThaiDate(`${m[1]} ${m[2].replace(/\s/g, '')} ${m[3]}`);
    if (!iso) continue;
    const before = flat.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
    dates.push({ iso, idx: m.index ?? 0, src: m[0], ref: /ลงวันที่|ตามหนังสือ/.test(before) });
  }
  const primary = dates.find((d) => !d.ref) ?? dates[0];
  if (primary) date = { value: primary.iso, confidence: primary.ref ? 0.5 : dates.length === 1 ? 0.9 : 0.75, source: primary.src };

  // จำนวนเงินตัวเลข
  let numeric: { satang: Satang; confidence: number; src: string } | null = null;
  const kw = /(?:จำนวนเงิน|เป็นเงิน|รวมเงิน|ยอดเงิน|รวมทั้งสิ้น|ทั้งสิ้น|จำนวน)\s*[:：]?\s*([\d,]+(?:\.\d{1,2})?)\s*บาท/;
  const km = flat.match(kw);
  if (km) {
    const p = parseMoney(km[1]);
    if (p.ok && !p.empty) numeric = { satang: p.satang, confidence: 0.85, src: km[0] };
  }
  if (!numeric) {
    let best: { satang: Satang; src: string } | null = null;
    for (const m of flat.matchAll(/([\d]{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\s*บาท/g)) {
      const p = parseMoney(m[1]);
      if (p.ok && (!best || p.satang > best.satang)) best = { satang: p.satang, src: m[0] };
    }
    if (best) numeric = { ...best, confidence: 0.55 };
  }

  // จำนวนเงินตัวอักษร "(หนึ่งหมื่นบาทถ้วน)"
  let words: { satang: Satang; src: string } | null = null;
  for (const m of flat.matchAll(/\(?\s*([ก-๙\s]{4,120}?บาท(?:\s*ถ้วน|[ก-๙\s]{2,40}?สตางค์))\s*\)?/g)) {
    const v = parseThaiBahtText(m[1].replace(/^.*?(?=(?:หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ยี่|ร้อย|พัน|หมื่น|แสน|ล้าน))/, ''));
    if (v !== null && v > 0) { words = { satang: v, src: m[0].trim() }; break; }
  }

  let amount: CoverLetterResult['amount'] = null;
  if (numeric && words) {
    if (numeric.satang === words.satang) amount = { value: numeric.satang, confidence: 0.97, source: `${numeric.src} ${words.src}` };
    else {
      amount = { value: numeric.satang, confidence: 0.3, source: numeric.src };
      warnings.push('จำนวนเงินตัวเลขกับตัวอักษรไม่ตรงกัน — โปรดตรวจสอบกับต้นฉบับ');
    }
  } else if (numeric) amount = { value: numeric.satang, confidence: numeric.confidence, source: numeric.src };
  else if (words) amount = { value: words.satang, confidence: 0.7, source: words.src };

  // เรื่อง
  let subject: CoverLetterResult['subject'] = null;
  const sm = text.match(/เรื่อง\s+([^\n]{3,200})/);
  if (sm) subject = { value: sm[1].trim(), confidence: 0.8, source: sm[0].trim() };

  // รหัสโครงการ: ค้นจากรหัสที่มีในระบบ
  let projectCode: CoverLetterResult['projectCode'] = null;
  const nflat = normalizeKey(flat);
  const hits = knownProjectCodes.filter((c) => c && normalizeKey(c).length >= 4 && nflat.includes(normalizeKey(c)));
  if (hits.length === 1) projectCode = { value: hits[0], confidence: 0.85, source: hits[0] };
  else if (hits.length > 1) warnings.push(`พบรหัสโครงการหลายรายการ: ${hits.slice(0, 5).join(', ')}`);

  if (!amount) warnings.push('ไม่พบจำนวนเงินในเอกสาร');
  if (!docNo) warnings.push('ไม่พบเลขที่หนังสือ');
  const found = [docNo, date, amount, subject, projectCode].filter((x): x is NonNullable<typeof x> => x !== null);
  const overallConfidence = found.length ? Math.min(...found.map((f) => f.confidence)) : 0;
  return { docNo, date, amount, subject, projectCode, warnings, overallConfidence };
}
