/**
 * บันทึกข้อความ "ตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ" — ตรรกะกลางที่ใช้ทั้งหน้าเว็บ (ตัวอย่าง A4/พิมพ์)
 * และ Apps Script (สร้าง Google Doc + PDF) เพื่อให้ข้อความตรงกันทุกที่
 */
import { THAI_MONTHS } from './thai';
import { BE_OFFSET, isValidYmd } from './dates';
import type { Satang } from './money';

/* ---------------- ตัวเลข / จำนวนเงิน ---------------- */

const TH_DIGIT = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_UNIT = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** อ่านเลข 0–999,999 (กลุ่มละ 6 หลัก) */
function readGroup(n: number): string {
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - 1 - i;
    if (d === 0) continue;
    if (pos === 1) {
      out += (d === 1 ? '' : d === 2 ? 'ยี่' : TH_DIGIT[d]) + 'สิบ';
    } else if (pos === 0) {
      out += d === 1 && s.length > 1 && Number(s.slice(0, -1)) > 0 ? 'เอ็ด' : TH_DIGIT[d];
    } else {
      out += TH_DIGIT[d] + TH_UNIT[pos];
    }
  }
  return out;
}

/** อ่านจำนวนเต็มเป็นคำไทย เช่น 1_000_011 → "หนึ่งล้านสิบเอ็ด" */
export function thaiNumberWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  n = Math.floor(n);
  if (n === 0) return TH_DIGIT[0];
  const groups: number[] = [];
  while (n > 0) { groups.unshift(n % 1_000_000); n = Math.floor(n / 1_000_000); }
  return groups.map((g, i) => (g ? readGroup(g) : '') + (i < groups.length - 1 ? 'ล้าน' : '')).join('');
}

/** จำนวนเงินตัวอักษรตามแบบหนังสือราชการ เช่น 4_400_000 สตางค์ → "สี่หมื่นสี่พันบาทถ้วน" */
export function bahtText(satang: Satang): string {
  const neg = satang < 0;
  const abs = Math.round(Math.abs(satang));
  const baht = Math.floor(abs / 100);
  const st = abs % 100;
  let out: string;
  if (st === 0) out = `${thaiNumberWords(baht)}บาทถ้วน`;
  else if (baht === 0) out = `${thaiNumberWords(st)}สตางค์`;
  else out = `${thaiNumberWords(baht)}บาท${thaiNumberWords(st)}สตางค์`;
  return neg ? `ลบ${out}` : out;
}

const THAI_NUM = '๐๑๒๓๔๕๖๗๘๙';
/** แปลงเลขอารบิกในข้อความเป็นเลขไทย */
export function thaiDigits(input: string): string {
  return input.replace(/[0-9]/g, (c) => THAI_NUM[Number(c)]);
}

/** จำนวนเงินแบบหนังสือราชการ: จำนวนเต็มไม่แสดงทศนิยม เช่น 44,000 / 1,250.50 */
export function formatMoneyPlain(satang: Satang): string {
  const neg = satang < 0;
  const abs = Math.round(Math.abs(satang));
  const i = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const f = abs % 100;
  return `${neg ? '-' : ''}${i}${f ? `.${String(f).padStart(2, '0')}` : ''}`;
}

/** วันที่แบบเต็ม เช่น "5 สิงหาคม 2569" */
export function formatThaiDateLong(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!isValidYmd(y, m, d)) return '';
  return `${d} ${THAI_MONTHS[m - 1].full} ${y + BE_OFFSET}`;
}

/* ---------------- การตัดคำภาษาไทย ---------------- */

export interface WrapToken {
  t: string;
  /** true = ห้ามตัดบรรทัดภายในชิ้นนี้ (จำนวนเงิน+บาท, ข้อความในวงเล็บ, รหัส, คำย่อ) */
  keep: boolean;
}

/** กลุ่มที่ไม่ควรถูกตัดกลางบรรทัด — เรียงจากเฉพาะเจาะจงที่สุด */
const KEEP_RE = new RegExp(
  [
    '\\([^()\\n]{1,40}\\)', // (สี่หมื่นสี่พันบาทถ้วน), (ศดปช.), (นายกิตติ โพธิ์จวง)
    '[0-9๐-๙][0-9๐-๙,.]*\\s?บาท', // 44,000 บาท
    '[0-9๐-๙][0-9๐-๙/.\\-]*', // รหัส เลขที่ วันที่
    '[ก-ฮ]{1,4}\\.(?:[ก-ฮ]{1,4}\\.)*', // อ. จ. ศดปช.
    '[A-Za-z][A-Za-z0-9 ]*[A-Za-z0-9]', // Service Provider
  ].join('|'),
  'g',
);

type Segmenter = { segment(s: string): Iterable<{ segment: string }> };
let segmenter: Segmenter | null | undefined;
function getSegmenter(): Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  try {
    const Ctor = (Intl as unknown as { Segmenter?: new (l: string, o: object) => Segmenter }).Segmenter;
    segmenter = Ctor ? new Ctor('th', { granularity: 'word' }) : null;
  } catch {
    segmenter = null;
  }
  return segmenter;
}

function splitWords(s: string): WrapToken[] {
  if (!s) return [];
  const seg = getSegmenter();
  if (!seg) return s.split(/(\s+)/).filter(Boolean).map((t) => ({ t, keep: false }));
  const out: WrapToken[] = [];
  for (const p of seg.segment(s)) out.push({ t: p.segment, keep: false });
  return out;
}

/**
 * แบ่งข้อความเป็นชิ้นสำหรับจัดบรรทัด: คำไทยแยกด้วย Intl.Segmenter (พจนานุกรม ICU)
 * ส่วนที่ต้องอยู่ด้วยกันถูกรวมเป็นชิ้นเดียว (keep) — ฝั่งเว็บวางเป็น <span nowrap>
 */
export function wrapSegments(text: string): WrapToken[] {
  const out: WrapToken[] = [];
  let last = 0;
  for (const m of text.matchAll(KEEP_RE)) {
    const i = m.index ?? 0;
    out.push(...splitWords(text.slice(last, i)));
    out.push({ t: m[0], keep: true });
    last = i + m[0].length;
  }
  out.push(...splitWords(text.slice(last)));
  return out;
}

/** สำหรับ Google Docs: แทนช่องว่างในกลุ่มที่ห้ามตัดด้วย NBSP */
export function protectGroups(text: string): string {
  return text.replace(KEEP_RE, (g) => g.replace(/ /g, ' '));
}

/* ---------------- ข้อมูลบันทึกข้อความ ---------------- */

export type MemoAlign = 'left' | 'justify';

export interface MemoPerson {
  /** ชื่อพร้อมคำนำหน้า เช่น "นายกิตติ โพธิ์จวง" */
  name: string;
  position: string;
  /** บรรทัดที่สองใต้ตำแหน่ง เช่น "รักษาการหัวหน้ากลุ่มอารักขาพืช" */
  line2?: string;
}

export interface MemoChecks {
  /** ถูกต้องตามคู่มือโครงการ */
  ok: boolean;
  /** ส่งคืนแก้ไข (ไม่เลือกพร้อม ok) */
  returnFix: boolean;
  returnReason: string;
  /** ส่งฝ่ายบริหารทั่วไปเพื่อดำเนินการต่อไป */
  forward: boolean;
}

export interface MemoData {
  /** ส่วนราชการ เช่น "กลุ่มอารักขาพืช สำนักงานเกษตรจังหวัดกำแพงเพชร" */
  orgLine: string;
  /** หมายเลขโทรศัพท์ (ชื่อฟิลด์เดิม fax เพื่อไม่ต้องย้ายข้อมูล) */
  fax: string;
  /** ส่วนหน้าของเลขที่ เช่น "กพ 0009.4" */
  docPrefix: string;
  /** เลขที่ที่เจ้าหน้าที่ลงเอง (ระบบไม่ออกเลข) */
  docNumber: string;
  /** วันที่ของบันทึก (ISO) */
  date: string;
  to: string;
  subject: string;
  /** หนังสืออ้างถึงจากอำเภอ/หน่วย */
  refNo: string;
  refDate: string;
  refFrom: string;
  /** ค่าใช้จ่ายที่ขอเบิก เช่น "ค่าจัดซื้อวัสดุสนับสนุน" */
  expense: string;
  projectName: string;
  mainActivityName: string;
  fund: string;
  budgetCode: string;
  mainActivityCode: string;
  subActivityName: string;
  budgetSatang: Satang;
  previousSatang: Satang;
  requestSatang: Satang;
  checks: MemoChecks;
  signer: MemoPerson;
  head: MemoPerson;
  align: MemoAlign;
  thaiNumerals: boolean;
  /** ข้อความเนื้อหาที่ผู้ใช้แก้เอง (แต่ละย่อหน้า) — ว่าง = ใช้ข้อความอัตโนมัติ */
  bodyOverride?: string[];
}

/**
 * ขนาดตัวอักษรเมื่อใช้ฟอนต์ Sarabun (Google) ให้ได้ขนาดบนกระดาษเท่ากับแบบ TH Sarabun
 * (เนื้อหา 16pt / หัวข้อ 20pt / "บันทึกข้อความ" 29pt): พยัญชนะ Sarabun สูง 586 หน่วย/em ส่วน TH Sarabun 400
 */
export const SARABUN_SCALE = 400 / 586;
const sizes = (scale: number) => {
  const sz = (thPt: number) => Math.round(thPt * scale * 2) / 2;
  return { body: sz(16), label: sz(20), title: sz(29) } as const;
};
/** Google Docs (ฟอนต์ Sarabun ของ Google) */
export const MEMO_FONT_PT = sizes(SARABUN_SCALE);
/** หน้าเว็บ/พิมพ์ (เว็บฟอนต์ TH Sarabun New ที่ติดตั้งกับระบบ — พยัญชนะสูง 1253/2048 em) */
export const MEMO_WEB_FONT_PT = sizes(0.4 / (1253 / 2048));

export const MEMO_SUBJECT = 'ตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ';
export const MEMO_DEFAULT_TO = 'เกษตรจังหวัดกำแพงเพชร';

/** คงเหลือหลังการขอเบิกครั้งนี้ */
export function memoRemaining(d: Pick<MemoData, 'budgetSatang' | 'previousSatang' | 'requestSatang'>): Satang {
  return d.budgetSatang - d.previousSatang - d.requestSatang;
}

const money = (s: Satang) => `${formatMoneyPlain(s)} บาท (${bahtText(s)})`;

/** "อำเภอเมืองกำแพงเพชร" — เติม "อำเภอ" ให้ถ้ายังไม่มีคำนำหน้าหน่วยงาน */
function fromUnit(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return /^(อำเภอ|สำนักงาน|กลุ่ม|ศูนย์|ฝ่าย)/.test(t) ? t : `อำเภอ${t}`;
}

/** ช่องของบันทึกข้อความ (ใช้เชื่อมตัวอย่างหน้าเอกสาร ↔ ช่องในฟอร์ม) */
export type MemoField =
  | 'orgLine' | 'fax' | 'docNumber' | 'date' | 'to' | 'refNo' | 'refDate' | 'refFrom' | 'expense'
  | 'projectName' | 'mainActivityName' | 'fund' | 'budgetCode' | 'mainActivityCode' | 'subActivityName'
  | 'budget' | 'previous' | 'request' | 'remaining' | 'checks' | 'signer' | 'head';
/** ช่องที่เจ้าหน้าที่กรอก (ที่เหลือระบบเติมให้) */
export const MEMO_STAFF_FIELDS: ReadonlySet<MemoField> = new Set<MemoField>(['docNumber', 'date', 'refNo', 'refDate', 'refFrom', 'expense', 'request', 'checks']);
/** ชิ้นข้อความ: f = ช่องที่มาของข้อความ (ว่าง = ข้อความคงที่) */
export interface MemoPart { t: string; f?: MemoField }

/** ข้อความเนื้อหาที่ระบบสร้างแบบแยกชิ้นตามช่อง — ย่อหน้าแรกย่อหน้า (indent) ที่เหลือชิดขอบ */
export function memoParagraphParts(d: MemoData, opts: { keepEmpty?: boolean } = {}): MemoPart[][] {
  const k = !!opts.keepEmpty;
  const P = (t: string, f?: MemoField): MemoPart => ({ t, f });
  const sp = P(' ');
  const join = (groups: MemoPart[][]): MemoPart[] => groups.filter((g) => g.length).flatMap((g, i) => (i ? [sp, ...g] : g));
  const moneyParts = (s: Satang, f: MemoField) => [P(money(s), f)];
  const ref = join([
    d.refNo || k ? [P('ตามหนังสือที่ '), P(d.refNo.trim(), 'refNo')] : [],
    d.refDate || k ? [P('ลงวันที่ '), P(d.refDate ? formatThaiDateLong(d.refDate) : '', 'refDate')] : [],
    d.refFrom || k ? [P('ของ'), P(fromUnit(d.refFrom), 'refFrom')] : [],
  ]);
  const first = join([
    ref.length ? [...ref, P(' ได้ส่งเอกสารหลักฐานเพื่อขอเบิกเงิน'), P(d.expense.trim(), 'expense')] : [P('ขอส่งเอกสารหลักฐานเพื่อขอเบิกเงิน'), P(d.expense.trim(), 'expense')],
    d.projectName ? [P(d.projectName.startsWith('โครงการ') ? d.projectName : `โครงการ${d.projectName}`, 'projectName')] : [],
    d.mainActivityName ? [P(d.mainActivityName.startsWith('กิจกรรม') ? d.mainActivityName : `กิจกรรม${d.mainActivityName}`, 'mainActivityName')] : [],
    d.fund ? [P('('), P(d.fund, 'fund'), P(')')] : [],
    d.budgetCode ? [P('('), P(d.budgetCode, 'budgetCode'), P(')')] : [],
  ]);
  const lines: MemoPart[][] = [first];
  if (d.mainActivityCode) lines.push([P('รหัสกิจกรรมหลัก '), P(d.mainActivityCode, 'mainActivityCode')]);
  if (d.subActivityName) lines.push([P('กิจกรรมย่อย '), P(d.subActivityName, 'subActivityName')]);
  lines.push(
    [P('ยอดเงินงบประมาณ '), ...moneyParts(d.budgetSatang, 'budget')],
    [P('ขอเบิกเงิน/ยืมเงินราชการมาแล้ว เป็นจำนวนเงิน '), ...moneyParts(d.previousSatang, 'previous')],
    [P('ขอเบิกเงินราชการครั้งนี้ เป็นจำนวนเงิน '), ...moneyParts(d.requestSatang, 'request')],
    [P('งบประมาณคงเหลือ '), ...moneyParts(memoRemaining(d), 'remaining')],
  );
  return lines;
}

/** ข้อความเนื้อหาที่ระบบสร้าง (สตริงต่อย่อหน้า) */
export function memoParagraphs(d: MemoData): string[] {
  return memoParagraphParts(d).map((ps) => ps.map((p) => p.t).join(''));
}

/** เนื้อหาที่จะใช้จริง (ข้อความที่ผู้ใช้แก้ หรือข้อความอัตโนมัติ) */
export function memoBody(d: MemoData): string[] {
  const o = (d.bodyOverride ?? []).map((s) => s.trim()).filter(Boolean);
  return o.length ? o : memoParagraphs(d);
}

/** ข้อความแก้เองยังมียอดเงินตรงกับตัวเลขล่าสุดหรือไม่ — ใช้เตือนเมื่อยอดเปลี่ยนหลังแก้ข้อความ */
export function memoOverrideStale(d: MemoData): boolean {
  if (!d.bodyOverride?.length) return false;
  const text = d.bodyOverride.join('\n');
  return [d.budgetSatang, d.previousSatang, d.requestSatang, memoRemaining(d)].some((s) => !text.includes(formatMoneyPlain(s)));
}

/** ตรวจข้อมูลก่อนบันทึก — คืนรายการข้อผิดพลาด (ภาษาไทย) */
export function validateMemo(d: MemoData): string[] {
  const e: string[] = [];
  if (!d.docNumber.trim()) e.push('กรุณากรอกเลขที่หนังสือ');
  if (!d.date) e.push('กรุณาเลือกวันที่');
  if (!d.expense.trim()) e.push('กรุณาระบุรายการค่าใช้จ่ายที่ขอเบิก');
  if (!(d.requestSatang > 0)) e.push('ยอดขอเบิกครั้งนี้ต้องมากกว่า 0');
  if (memoRemaining(d) < 0) e.push('ยอดขอเบิกเกินงบประมาณคงเหลือของกิจกรรม');
  if (d.checks.ok && d.checks.returnFix) e.push('เลือกได้อย่างใดอย่างหนึ่ง: ถูกต้องตามคู่มือ หรือ ส่งคืนแก้ไข');
  if (d.checks.returnFix && !d.checks.returnReason.trim()) e.push('กรุณาระบุเหตุผลที่ส่งคืนแก้ไข');
  if (!d.signer.name.trim()) e.push('ไม่พบชื่อผู้ลงนาม — กรุณากรอกข้อมูลของฉันให้ครบ');
  return e;
}

/** ข้อความแสดงผล (แปลงเลขไทยถ้าเลือก) */
export function memoText(d: Pick<MemoData, 'thaiNumerals'>, s: string): string {
  return d.thaiNumerals ? thaiDigits(s) : s;
}

/** เลขที่หนังสือเต็ม เช่น "กพ 0009.4/123" */
export function memoDocNo(d: Pick<MemoData, 'docPrefix' | 'docNumber'>): string {
  const p = d.docPrefix.trim().replace(/\/$/, '');
  const n = d.docNumber.trim();
  return p ? `${p}/${n}` : n;
}

/** คำนำหน้าชื่อที่ใช้บ่อย */
export const NAME_TITLES = ['นาย', 'นาง', 'นางสาว', 'ว่าที่ร้อยตรี', 'ว่าที่ร้อยตรีหญิง', 'ดร.', 'ผศ.ดร.'];

/** ตำแหน่งที่ใช้บ่อยในสำนักงานเกษตร (เลือกหรือพิมพ์เองได้) */
export const COMMON_POSITIONS = [
  'นักวิชาการส่งเสริมการเกษตร',
  'นักวิชาการส่งเสริมการเกษตรปฏิบัติการ',
  'นักวิชาการส่งเสริมการเกษตรชำนาญการ',
  'นักวิชาการส่งเสริมการเกษตรชำนาญการพิเศษ',
  'เจ้าพนักงานการเกษตร',
  'เจ้าพนักงานการเกษตรปฏิบัติงาน',
  'เจ้าพนักงานการเกษตรชำนาญงาน',
  'เจ้าพนักงานการเกษตรอาวุโส',
  'นักจัดการงานทั่วไป',
  'นักจัดการงานทั่วไปปฏิบัติการ',
  'นักจัดการงานทั่วไปชำนาญการ',
  'นักวิเคราะห์นโยบายและแผน',
  'นักวิเคราะห์นโยบายและแผนชำนาญการ',
  'เจ้าพนักงานธุรการ',
  'เจ้าพนักงานธุรการปฏิบัติงาน',
  'เจ้าพนักงานการเงินและบัญชี',
  'เจ้าพนักงานการเงินและบัญชีชำนาญงาน',
  'พนักงานราชการ',
  'พนักงานจ้างเหมาบริการ',
];

/** ชื่อเต็มพร้อมคำนำหน้า — ไม่เติมซ้ำถ้าชื่อขึ้นต้นด้วยคำนำหน้าอยู่แล้ว */
export function withTitle(title: string | undefined, fullName: string): string {
  const t = (title ?? '').trim();
  const n = fullName.trim();
  if (!t || n.startsWith(t)) return n;
  return `${t}${n}`;
}
