/**
 * อ่านค่าเซลล์จากไฟล์ .xlsx (Office Open XML) แบบเบา — ใช้ในเบราว์เซอร์ โหมดสาธิต และชุดทดสอบ
 * - อ่านเฉพาะ "ค่า" (ค่าที่คำนวณแล้วของสูตร, ข้อความ, ตัวเลข) ไม่รันสูตร/มาโคร/ลิงก์ภายนอก
 * - เซลล์ที่ผสาน (merge) มีค่าเฉพาะเซลล์มุมซ้ายบน ตามมาตรฐานของ Excel
 * - backend (Apps Script) ใช้การแปลงของ Google Drive แทน ไม่ได้ใช้ไฟล์นี้
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface XlsxSheet { name: string; rows: Array<Array<string | number>> }

const MAX_CELLS = 200_000;

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/_x000D_/g, '');
}

/** ข้อความใน <si> หรือ <is>: รวมทุก <t> (รองรับข้อความหลายรูปแบบ rich text) และไม่รวมคำอ่าน <rPh> */
function textOf(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of clean.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return decodeXml(out);
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

export function readXlsx(bytes: Uint8Array): XlsxSheet[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => /^xl\/(workbook\.xml|sharedStrings\.xml|_rels\/workbook\.xml\.rels|worksheets\/sheet\d+\.xml)$/.test(f.name) });
  } catch {
    throw new Error('ไฟล์ Excel เสียหายหรือไม่ใช่ .xlsx');
  }
  const text = (p: string) => (files[p] ? strFromU8(files[p]) : '');
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const rels = new Map([...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], 'Id') ?? '', attr(m[0], 'Target') ?? '']));
  const sheets: XlsxSheet[] = [];
  let cells = 0;
  for (const m of text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(attr(m[0], 'name') ?? `Sheet${sheets.length + 1}`);
    const rid = attr(m[0], 'r:id') ?? '';
    const target = (rels.get(rid) ?? '').replace(/^\/?xl\//, '').replace(/^\//, '');
    const xml = text(`xl/${target}`);
    if (!xml) continue;
    const rows: Array<Array<string | number>> = [];
    for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const r = Number(attr(rm[0], 'r') ?? rows.length + 1) - 1;
      const line: Array<string | number> = [];
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        if (++cells > MAX_CELLS) throw new Error('ไฟล์ใหญ่เกินไป');
        const tag = `<c${cm[1]}>`;
        const ref = attr(tag, 'r');
        const c = ref ? colIndex(ref) : line.length;
        const t = attr(tag, 't') ?? 'n';
        const body = cm[2] ?? '';
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let val: string | number = '';
        if (t === 's') val = v !== undefined ? shared[Number(v)] ?? '' : '';
        else if (t === 'inlineStr') val = textOf(body);
        else if (t === 'str' || t === 'e') val = v !== undefined ? decodeXml(v) : '';
        else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
        else if (v !== undefined && v !== '') {
          const n = Number(v);
          val = Number.isFinite(n) ? n : decodeXml(v);
        }
        while (line.length < c) line.push('');
        line[c] = val;
      }
      while (rows.length < r) rows.push([]);
      rows[r] = line;
    }
    sheets.push({ name, rows });
  }
  if (!sheets.length) throw new Error('ไม่พบแผ่นงานในไฟล์ Excel');
  return sheets;
}
