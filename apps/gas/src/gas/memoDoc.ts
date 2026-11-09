/**
 * สร้างบันทึกข้อความเป็น Google Doc ตามรูปแบบหนังสือราชการ (ระเบียบงานสารบรรณ)
 * A4 ขอบซ้าย 3 ซม. ขวา 2 ซม. · ตราครุฑสูง 1.5 ซม. · "บันทึกข้อความ" 29pt · หัวเรื่อง 20pt · เนื้อหา 16pt (ขนาดตามแบบ TH Sarabun)
 * ฟอนต์ Sarabun (มีใน Google Docs; TH Sarabun New ไม่มีใน Docs) — ตัวอักษรของ Sarabun ใหญ่กว่า TH Sarabun
 * ราว 1.46 เท่าที่ขนาด pt เดียวกัน (วัดจากความสูงพยัญชนะ 586 vs 400 หน่วย/em) จึงย่อขนาดด้วย SCALE
 * ให้ตัวอักษรบนกระดาษสูงเท่ากับหนังสือราชการที่พิมพ์ด้วย TH Sarabun 16pt
 */
import {
  GARUDA_JPEG_BASE64, MEMO_FONT_PT, formatThaiDateLong, memoBody, memoDocNo, memoText, protectGroups, type MemoData,
} from '@kpp/domain';

const CM = 28.3465; // pt ต่อ 1 ซม.
const FONT = 'Sarabun';
const BODY = MEMO_FONT_PT.body;
const LABEL = MEMO_FONT_PT.label;
const INDENT = 2.5 * CM;
/** ระยะบรรทัด: Sarabun ใน Docs บรรทัดเดี่ยว ≈1.3 em — ×1.15 ใกล้เคียงระยะบรรทัดของ TH Sarabun 16pt */
const LINE = 1.15;
const SECTION_GAP = 6;
const DOTS = '................................................';

type Para = GoogleAppsScript.Document.Paragraph;
type Cell = GoogleAppsScript.Document.TableCell;

function style(p: Para, align: GoogleAppsScript.Document.HorizontalAlignment, before = 0): Para {
  p.setAlignment(align).setSpacingBefore(before).setSpacingAfter(0).setLineSpacing(LINE).setIndentStart(0).setIndentEnd(0).setIndentFirstLine(0);
  return p;
}

function run(p: Para, text: string, size: number, bold = false): void {
  if (!text) return;
  const t = p.appendText(text);
  t.setFontFamily(FONT).setFontSize(size).setBold(bold);
}

/** ตารางไร้เส้นสำหรับจัดวางสองคอลัมน์ */
function layoutTable(body: GoogleAppsScript.Document.Body, cols: number, widths: number[]): GoogleAppsScript.Document.Table {
  const table = body.appendTable([Array.from({ length: cols }, () => '')]);
  table.setBorderWidth(0);
  widths.forEach((w, i) => table.setColumnWidth(i, w));
  const row = table.getRow(0);
  for (let i = 0; i < cols; i++) {
    const c = row.getCell(i);
    c.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0);
  }
  return table;
}

function cellPara(c: Cell, first: boolean, align: GoogleAppsScript.Document.HorizontalAlignment): Para {
  const p = first ? c.getChild(0).asParagraph() : c.appendParagraph('');
  return style(p, align);
}

export function buildMemoDoc(name: string, d: MemoData): GoogleAppsScript.Document.Document {
  const H = DocumentApp.HorizontalAlignment;
  const tx = (s: string) => protectGroups(memoText(d, s));
  const bodyAlign = d.align === 'justify' ? H.JUSTIFY : H.LEFT;

  const doc = DocumentApp.create(name);
  const body = doc.getBody();
  body.setPageWidth(595.28).setPageHeight(841.89)
    .setMarginLeft(3 * CM).setMarginRight(2 * CM).setMarginTop(1.5 * CM).setMarginBottom(1.5 * CM);
  const contentW = 595.28 - 5 * CM;

  // หัว: ครุฑ (วางลอย) มุมซ้ายบน + "บันทึกข้อความ" กึ่งกลางหน้า — ใช้ย่อหน้าแรกของเอกสาร (ไม่มีบรรทัดว่างเกิน)
  const title = style(body.getChild(0).asParagraph(), H.CENTER);
  title.setSpacingBefore(12).setSpacingAfter(14);
  const img = title.addPositionedImage(Utilities.newBlob(Utilities.base64Decode(GARUDA_JPEG_BASE64), 'image/jpeg', 'garuda.jpg'));
  img.setWidth(Math.round(1.5 * CM)).setHeight(Math.round(1.5 * CM)).setLeftOffset(0).setTopOffset(0).setLayout(DocumentApp.PositionedLayout.ABOVE_TEXT);
  run(title, 'บันทึกข้อความ', MEMO_FONT_PT.title, true);

  // ส่วนราชการ
  const org = style(body.appendParagraph(''), H.LEFT);
  run(org, 'ส่วนราชการ', LABEL, true);
  run(org, `  ${tx(d.orgLine)}${d.fax ? `  โทรศัพท์ ${tx(d.fax)}` : ''}`, BODY);

  // ที่ / วันที่ (สองคอลัมน์)
  const nd = layoutTable(body, 2, [contentW * 0.5, contentW * 0.5]);
  const no = cellPara(nd.getRow(0).getCell(0), true, H.LEFT);
  run(no, 'ที่', LABEL, true);
  run(no, `  ${tx(memoDocNo(d))}`, BODY);
  const dt = cellPara(nd.getRow(0).getCell(1), true, H.LEFT);
  run(dt, 'วันที่', LABEL, true);
  run(dt, `  ${tx(formatThaiDateLong(d.date))}`, BODY);

  const subj = style(body.appendParagraph(''), H.LEFT);
  run(subj, 'เรื่อง', LABEL, true);
  run(subj, `  ${tx(d.subject)}`, BODY);

  const to = style(body.appendParagraph(''), H.LEFT, SECTION_GAP);
  run(to, 'เรียน', BODY);
  run(to, `  ${tx(d.to)}`, BODY);

  // เนื้อหา: ย่อหน้าแรกเยื้อง 2.5 ซม.
  memoBody(d).forEach((line, i) => {
    const p = style(body.appendParagraph(''), bodyAlign, i === 0 ? SECTION_GAP : 0);
    if (i === 0) p.setIndentFirstLine(INDENT);
    run(p, tx(line), BODY);
  });

  // ผลการตรวจสอบ (เจ้าหน้าที่กลุ่มเป็นผู้เลือก)
  const box = (on: boolean) => (on ? '☑' : '☐');
  const chk = style(body.appendParagraph(''), H.LEFT, SECTION_GAP);
  chk.setIndentStart(INDENT).setIndentFirstLine(INDENT);
  run(chk, 'ตรวจสอบแล้ว', BODY);
  const lines: string[] = [
    `${box(d.checks.ok)}  ถูกต้องตามคู่มือโครงการ`,
    `${box(d.checks.returnFix)}  ส่งคืนแก้ไข เนื่องจาก ${d.checks.returnFix && d.checks.returnReason.trim() ? tx(d.checks.returnReason.trim()) : DOTS}`,
    `${box(d.checks.forward)}  ส่งฝ่ายบริหารทั่วไปเพื่อดำเนินการต่อไป`,
  ];
  for (const l of lines) {
    const p = style(body.appendParagraph(''), H.LEFT);
    p.setIndentStart(INDENT + 0.5 * CM).setIndentFirstLine(INDENT + 0.5 * CM);
    run(p, l, BODY);
  }

  // ผู้ลงนาม: ซ้าย = ผู้จัดทำ (ผู้ใช้ที่เข้าสู่ระบบ) ขวา = หัวหน้ากลุ่ม
  body.appendParagraph('').setSpacingBefore(0).setSpacingAfter(0);
  const sig = layoutTable(body, 2, [contentW / 2, contentW / 2]);
  const people = [d.signer, d.head];
  people.forEach((person, i) => {
    const c = sig.getRow(0).getCell(i);
    const rows = [
      '(ลงชื่อ)........................................................',
      `(${person.name ? tx(person.name) : DOTS})`,
      `ตำแหน่ง ${person.position ? tx(person.position) : DOTS}`,
      person.line2 ? tx(person.line2) : '',
    ].filter(Boolean);
    rows.forEach((r, j) => run(cellPara(c, j === 0, H.CENTER), r, BODY));
  });

  // อนุมัติ
  const ap = style(body.appendParagraph(''), H.CENTER, 18);
  run(ap, 'อนุมัติ', BODY);
  for (const r of ['(ลงชื่อ)........................................................', `(${DOTS})`, `ตำแหน่ง ${DOTS}`]) {
    run(style(body.appendParagraph(''), H.CENTER, r.startsWith('(ลงชื่อ)') ? 14 : 0), r, BODY);
  }

  return doc;
}
