/**
 * อ่านค่าเซลล์จากไฟล์ .xlsx (Office Open XML) แบบเบา — ใช้ในเบราว์เซอร์ โหมดสาธิต และชุดทดสอบ
 * - อ่านเฉพาะ "ค่า" (ค่าที่คำนวณแล้วของสูตร, ข้อความ, ตัวเลข) ไม่รันสูตร/มาโคร/ลิงก์ภายนอก
 * - เซลล์ที่ผสาน (merge) มีค่าเฉพาะเซลล์มุมซ้ายบน ตามมาตรฐานของ Excel
 * - backend (Apps Script) ใช้การแปลงของ Google Drive แทน ไม่ได้ใช้ไฟล์นี้
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

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

/* ------------------------------------ เขียน .xlsx ------------------------------------ */

/** ช่องข้อมูล: ข้อความ/ตัวเลข หรือกำหนดรูปแบบ — style: b = ตัวหนา, h = หัวตาราง, t = ชื่อรายงาน */
export type XlsxCell = string | number | null | { v: string | number | null; s?: 'b' | 'h' | 't'; fmt?: 'money' | 'pct' | 'int' };
export interface XlsxOutSheet {
  name: string;
  rows: XlsxCell[][];
  /** ความกว้างคอลัมน์ (จำนวนตัวอักษร) */
  widths?: number[];
  /** ผสานเซลล์ เช่น "A1:H1" */
  merges?: string[];
  /** ตรึงแถวด้านบนจนถึงแถวนี้ (นับจาก 1) */
  freezeRow?: number;
  landscape?: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // ตัดอักขระควบคุมที่ XML ไม่รับ
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * สไตล์ (cellXfs): 0 ปกติ, 1 ตัวหนา, 2 เงิน #,##0.00, 3 เงินตัวหนา, 4 ร้อยละ 0.0, 5 ร้อยละตัวหนา, 6 หัวตาราง (หนา พื้นเขียวอ่อน ตัดบรรทัด),
 * 7 ชื่อรายงาน, 8 จำนวนเต็ม #,##0, 9 จำนวนเต็มตัวหนา
 */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="0.0"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="14"/><name val="Tahoma"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6F0E8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFB8C4BC"/></left><right style="thin"><color rgb="FFB8C4BC"/></right><top style="thin"><color rgb="FFB8C4BC"/></top><bottom style="thin"><color rgb="FFB8C4BC"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" applyFont="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="1" fillId="0" borderId="1" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"><alignment vertical="top"/></xf>
<xf numFmtId="3" fontId="1" fillId="0" borderId="1" applyNumberFormat="1" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function styleOf(c: XlsxCell): number {
  if (c === null || typeof c !== 'object') return 0;
  if (c.s === 't') return 7;
  if (c.s === 'h') return 6;
  const bold = c.s === 'b';
  if (c.fmt === 'money') return bold ? 3 : 2;
  if (c.fmt === 'pct') return bold ? 5 : 4;
  if (c.fmt === 'int') return bold ? 9 : 8;
  return bold ? 1 : 0;
}

function sheetXml(sh: XlsxOutSheet): string {
  const rows = sh.rows.map((r, ri) => {
    const cells = r.map((c, ci) => {
      const v = c !== null && typeof c === 'object' ? c.v : c;
      const ref = `${colName(ci)}${ri + 1}`;
      const s = styleOf(c);
      if (v === null || v === undefined || v === '') return s ? `<c r="${ref}" s="${s}"/>` : '';
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
    }).join('');
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join('');
  const cols = sh.widths?.length ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const pane = sh.freezeRow ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freezeRow}" topLeftCell="A${sh.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
  const merges = sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData>${merges}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${sh.landscape === false ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

/** สร้างไฟล์ .xlsx (ไม่มีสูตร/มาโคร) — ชื่อแผ่นงานตัดอักขระต้องห้ามและยาวไม่เกิน 31 ตัว */
export function writeXlsx(sheets: XlsxOutSheet[]): Uint8Array {
  const names = sheets.map((s, i) => (s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Sheet${i + 1}`));
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files, { level: 6 });
}
