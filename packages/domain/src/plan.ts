/**
 * แผนงบประมาณ (แบบ คง.2 และเอกสารจัดสรรลักษณะเดียวกัน)
 * แปลงตาราง "แผนงาน - โครงการ - กิจกรรม - วิธีการดำเนินงาน | หน่วยนับ | ปริมาณงาน | งบประมาณ" เป็นโครงสร้างต้นไม้
 * - ระดับของแต่ละแถวอนุมานจากรูปแบบเลขลำดับ (ไม่ต้องพึ่งการย่อหน้าซึ่งหายไปเมื่อคัดลอกจาก PDF/Excel)
 * - ตรวจยอดรวมทุกระดับ (ยอดแม่ = ผลรวมยอดลูก) และยอดรวมทั้งสิ้น
 * - "กิจกรรมย่อยสุดท้าย" (leaf) คือรายการที่ไม่มีรายการย่อย — กลุ่มงานเลือกได้กลุ่มเดียวต่อ 1 รายการ
 */
import { cleanText, normalizeKey, thaiDigitsToArabic } from './thai';
import { parseMoney, type Satang } from './money';

export const PLAN_KINDS = ['PLAN', 'OUTPUT', 'PROJECT', 'ACTIVITY', 'SUBACTIVITY', 'BUDGET_TYPE', 'METHOD', 'ITEM'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];
export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  PLAN: 'แผนงาน', OUTPUT: 'ผลผลิต', PROJECT: 'โครงการ', ACTIVITY: 'กิจกรรมหลัก', SUBACTIVITY: 'กิจกรรมรอง',
  BUDGET_TYPE: 'ประเภทงบ', METHOD: 'วิธีดำเนินงาน', ITEM: 'รายการ',
};

export interface PlanNode {
  /** ลำดับในเอกสาร (เริ่ม 1) — ใช้เป็นตัวอ้างอิงภายในการนำเข้า */
  seq: number;
  rowNo: number;
  parentSeq: number;
  depth: number;
  kind: PlanKind;
  /** เลขลำดับตามเอกสาร เช่น "1.1", "2.1)", "(1)", "-" */
  number: string;
  name: string;
  unit: string;
  quantity: number | null;
  amountSatang: Satang | null;
  isLeaf: boolean;
  /** ลำดับของแผนงาน (1..n) ที่รายการนี้อยู่ */
  planIndex: number;
  /** seq ของโครงการ (หรือกิจกรรมหลักถ้าไม่มีโครงการ) ที่รายการนี้อยู่ */
  projectSeq: number;
  /** seq ของกิจกรรมหลักที่รายการนี้อยู่ (0 ถ้าไม่มี) */
  activitySeq: number;
  /** รหัสภายในโครงการ เช่น "1.1/1)/1.1)" — ไม่ซ้ำในโครงการเดียวกัน */
  code: string;
}

export type PlanIssueLevel = 'ERROR' | 'WARNING' | 'INFO';
export interface PlanIssue { rowNo: number; level: PlanIssueLevel; message: string }

export interface ParsedPlan {
  nodes: PlanNode[];
  issues: PlanIssue[];
  declaredTotal: Satang | null;
  computedTotal: Satang;
  leafCount: number;
  leafTotal: Satang;
  summary: Array<{ kind: PlanKind; count: number }>;
}

interface RawRow { rowNo: number; text: string; unit: string; qty: string; amount: unknown }

const UNIT_WORDS = [
  'ราย/แปลง', 'ครัวเรือน', 'ตัวอย่าง', 'โครงการ', 'จังหวัด', 'อำเภอ', 'สินค้า', 'แปลง', 'กลุ่ม', 'ศูนย์', 'ครั้ง', 'แห่ง',
  'ราย', 'คน', 'ไร่', 'ชุด', 'ลำ', 'จุด', 'ตัน', 'กิโลกรัม', 'เครื่อง', 'หลัง', 'วัน', 'เรื่อง', 'ฉบับ', 'ต้น', 'ตำบล', 'หมู่บ้าน',
];

/* ------------------------------ classification ------------------------------ */

interface Classified { kind: PlanKind | 'TOTAL'; number: string; name: string; rank: number; numbered: boolean }

export function classifyPlanLine(raw: string): Classified {
  const t = cleanText(thaiDigitsToArabic(raw), 1000);
  let m: RegExpMatchArray | null;
  if (/^รวม(ทั้งสิ้น|ทั้งหมด)?\s*$/.test(t) || /^รวมทั้งสิ้น/.test(t)) return { kind: 'TOTAL', number: '', name: 'รวมทั้งสิ้น', rank: 0, numbered: false };
  if (/^แผนงาน/.test(t)) return { kind: 'PLAN', number: '', name: t, rank: 1, numbered: false };
  if (/^ผลผลิต/.test(t)) return { kind: 'OUTPUT', number: '', name: t, rank: 2, numbered: false };
  if ((m = t.match(/^\+\s*(.+)$/))) return { kind: 'BUDGET_TYPE', number: '+', name: m[1], rank: 9, numbered: false };
  if ((m = t.match(/^\((\d+(?:\.\d+)*)\)\s*(.+)$/))) {
    const segs = m[1].split('.').length;
    return { kind: 'ITEM', number: `(${m[1]})`, name: m[2], rank: 30 + segs, numbered: true };
  }
  if ((m = t.match(/^(\d+(?:\.\d+)*)\)\s*(.+)$/))) {
    const segs = m[1].split('.').length;
    return { kind: 'METHOD', number: `${m[1]})`, name: m[2], rank: 10 + segs, numbered: true };
  }
  if ((m = t.match(/^(\d+\.\d+\.\d+(?:\.\d+)*)\s+(.+)$/))) {
    return { kind: 'SUBACTIVITY', number: m[1], name: m[2], rank: 5 + (m[1].split('.').length - 3), numbered: true };
  }
  if ((m = t.match(/^(\d+\.\d+)\s+(.+)$/))) return { kind: 'ACTIVITY', number: m[1], name: m[2], rank: 4, numbered: true };
  if ((m = t.match(/^(\d+)\s+(.+)$/))) return { kind: 'PROJECT', number: m[1], name: m[2], rank: 3, numbered: true };
  if ((m = t.match(/^[-–•]\s*(.+)$/))) return { kind: 'ITEM', number: '-', name: m[1], rank: -1, numbered: false };
  return { kind: 'ITEM', number: '', name: t, rank: -2, numbered: false };
}

function parseQty(v: string): number | null {
  const s = thaiDigitsToArabic(v).replace(/[,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* --------------------------------- tree build --------------------------------- */

export function buildPlan(rows: ReadonlyArray<RawRow>): ParsedPlan {
  const issues: PlanIssue[] = [];
  const nodes: PlanNode[] = [];
  const stack: Array<{ node: PlanNode; rank: number }> = [];
  let declaredTotal: Satang | null = null;
  let planIndex = 0;
  let prevRank = 10;

  for (const r of rows) {
    const text = cleanText(r.text, 1000);
    if (!text) continue;
    const c = classifyPlanLine(text);
    const money = parseMoney(r.amount);
    if (!money.ok) issues.push({ rowNo: r.rowNo, level: 'ERROR', message: `อ่านงบประมาณไม่ได้: "${cleanText(r.amount, 30)}"` });
    const amount = money.ok && !money.empty ? money.satang : null;
    if (c.kind === 'TOTAL') {
      declaredTotal = amount;
      continue;
    }
    let rank = c.rank;
    if (rank === -1) rank = prevRank + 0.5; // "- รายการ" เป็นรายการย่อยของแถวก่อนหน้า
    if (rank === -2) {
      // แถวไม่มีเลขลำดับ: เป็นรายการย่อยของโครงสร้างล่าสุด
      rank = Math.max(10, (stack.at(-1)?.rank ?? 9) + 0.5);
      issues.push({ rowNo: r.rowNo, level: 'INFO', message: 'แถวนี้ไม่มีเลขลำดับ ระบบจัดเป็นรายการย่อยของแถวก่อนหน้า' });
    }
    while (stack.length && stack[stack.length - 1].rank >= rank) stack.pop();
    if (c.kind === 'PLAN') {
      planIndex++;
      stack.length = 0;
    }
    const parent = stack.at(-1)?.node;
    const qty = parseQty(r.qty);
    if (r.qty && qty === null) issues.push({ rowNo: r.rowNo, level: 'WARNING', message: `ปริมาณงานไม่ใช่ตัวเลข: "${r.qty}"` });
    const node: PlanNode = {
      seq: nodes.length + 1, rowNo: r.rowNo, parentSeq: parent?.seq ?? 0, depth: stack.length, kind: c.kind as PlanKind,
      number: c.number, name: c.name, unit: cleanText(r.unit, 40), quantity: qty, amountSatang: amount, isLeaf: true,
      planIndex, projectSeq: 0, activitySeq: 0, code: '',
    };
    if (parent) parent.isLeaf = false;
    // หาโครงการ/กิจกรรมหลักที่สังกัด
    const chain = [...stack.map((s) => s.node), node];
    const proj = [...chain].reverse().find((n) => n.kind === 'PROJECT');
    const act = [...chain].reverse().find((n) => n.kind === 'ACTIVITY');
    node.projectSeq = (proj ?? act ?? node).seq;
    node.activitySeq = act?.seq ?? 0;
    const fromProject = proj ? chain.slice(chain.indexOf(proj) + 1) : act ? chain.slice(chain.indexOf(act)) : [node];
    node.code = fromProject.map((n) => n.number || '•').join('/') || node.number;
    nodes.push(node);
    stack.push({ node, rank });
    prevRank = rank;
  }

  // ยอดรวมจากล่างขึ้นบน และตรวจยอดแม่ = ผลรวมลูก
  const children = new Map<number, PlanNode[]>();
  for (const n of nodes) (children.get(n.parentSeq) ?? children.set(n.parentSeq, []).get(n.parentSeq)!).push(n);
  const effective = new Map<number, Satang>();
  const sumOf = (n: PlanNode): Satang => {
    if (effective.has(n.seq)) return effective.get(n.seq)!;
    const kids = children.get(n.seq) ?? [];
    let v: Satang;
    if (!kids.length) v = n.amountSatang ?? 0;
    else {
      const s = kids.reduce((acc, k) => acc + sumOf(k), 0);
      if (n.amountSatang !== null && n.amountSatang !== s) {
        issues.push({ rowNo: n.rowNo, level: 'ERROR', message: `งบประมาณ ${(n.amountSatang / 100).toLocaleString('th-TH')} บาท ไม่เท่ากับผลรวมรายการย่อย ${(s / 100).toLocaleString('th-TH')} บาท` });
      }
      v = n.amountSatang ?? s;
    }
    effective.set(n.seq, v);
    return v;
  };
  const roots = children.get(0) ?? [];
  const computedTotal = roots.reduce((a, n) => a + sumOf(n), 0);
  nodes.forEach(sumOf);
  if (declaredTotal !== null && declaredTotal !== computedTotal) {
    issues.push({ rowNo: 0, level: 'ERROR', message: `ยอดรวมทั้งสิ้น ${(declaredTotal / 100).toLocaleString('th-TH')} บาท ไม่เท่ากับผลรวมแผนงาน ${(computedTotal / 100).toLocaleString('th-TH')} บาท` });
  }

  // รายการย่อยสุดท้าย
  const leaves = nodes.filter((n) => n.isLeaf);
  for (const l of leaves) {
    if (l.amountSatang === null) issues.push({ rowNo: l.rowNo, level: 'WARNING', message: 'รายการย่อยสุดท้ายไม่มีงบประมาณ' });
    else if (l.amountSatang < 0) issues.push({ rowNo: l.rowNo, level: 'ERROR', message: 'งบประมาณติดลบ' });
  }
  // เลขลำดับย่อยต้องขึ้นต้นด้วยเลขของรายการแม่ เช่น 2.1) อยู่ใต้ 2) และ (2.1) อยู่ใต้ (2)
  const bySeq = new Map(nodes.map((n) => [n.seq, n]));
  for (const n of nodes) {
    const core = n.number.match(/^\(?(\d+(?:\.\d+)+)\)?$/)?.[1];
    const parent = bySeq.get(n.parentSeq);
    if (!core || !parent) continue;
    const sameStyle = n.number.startsWith('(') === parent.number.startsWith('(') && /\)$/.test(n.number) === /\)$/.test(parent.number);
    const parentCore = parent.number.match(/^\(?(\d+(?:\.\d+)*)\)?$/)?.[1];
    if (sameStyle && parentCore && core.split('.').slice(0, -1).join('.') !== parentCore) {
      issues.push({ rowNo: n.rowNo, level: 'INFO', message: `เลขลำดับ ${n.number} ไม่สอดคล้องกับรายการแม่ ${parent.number} (ระบบยึดตามตำแหน่งในเอกสาร)` });
    }
  }
  // เลขลำดับข้าม / ซ้ำ ในพี่น้องรูปแบบเดียวกัน
  for (const [, kids] of children) {
    const byStyle = new Map<string, PlanNode[]>();
    for (const k of kids) {
      if (!/\d/.test(k.number)) continue;
      const style = k.number.replace(/\d+/g, '#');
      (byStyle.get(style) ?? byStyle.set(style, []).get(style)!).push(k);
    }
    for (const list of byStyle.values()) {
      const lastNums = list.map((k) => Number(k.number.match(/(\d+)\D*$/)?.[1] ?? 0));
      for (let i = 1; i < lastNums.length; i++) {
        if (lastNums[i] === lastNums[i - 1]) issues.push({ rowNo: list[i].rowNo, level: 'WARNING', message: `เลขลำดับ ${list[i].number} ซ้ำกับรายการก่อนหน้า` });
        else if (lastNums[i] !== lastNums[i - 1] + 1) issues.push({ rowNo: list[i].rowNo, level: 'INFO', message: `เลขลำดับข้ามจาก ${list[i - 1].number} ไป ${list[i].number} (ตรวจว่าตกหล่นหรือไม่)` });
      }
    }
    // ชื่อซ้ำภายใต้แม่เดียวกัน
    const seen = new Map<string, PlanNode>();
    for (const k of kids) {
      const key = normalizeKey(k.name);
      if (seen.has(key)) issues.push({ rowNo: k.rowNo, level: 'WARNING', message: `ชื่อรายการซ้ำกับแถว ${seen.get(key)!.rowNo}` });
      else seen.set(key, k);
    }
  }
  // รหัสภายในโครงการต้องไม่ซ้ำ (กันเลขลำดับซ้ำจากเอกสาร)
  const codes = new Map<string, PlanNode>();
  for (const n of nodes) {
    const key = `${n.planIndex}|${n.projectSeq}|${n.code}`;
    if (codes.has(key)) n.code = `${n.code}#${n.seq}`;
    codes.set(key, n);
  }

  const summary = PLAN_KINDS.map((kind) => ({ kind, count: nodes.filter((n) => n.kind === kind).length })).filter((s) => s.count > 0);
  return {
    nodes, issues: issues.sort((a, b) => a.rowNo - b.rowNo), declaredTotal, computedTotal,
    leafCount: leaves.length, leafTotal: leaves.reduce((a, l) => a + (l.amountSatang ?? 0), 0), summary,
  };
}

/* --------------------------------- table input --------------------------------- */

const NAME_HDR = /แผนงาน|รายการ|โครงการ.*กิจกรรม|กิจกรรม.*วิธี/;
const UNIT_HDR = /หน่วย/;
const QTY_HDR = /ปริมาณ|เป้าหมาย|จำนวน(?!เงิน)/;
const AMOUNT_HDR = /งบประมาณ|จำนวนเงิน|วงเงิน|บาท/;

/** รับตารางจาก CSV/XLSX/Google Sheets — หาแถวหัวตารางเอง; ถ้าไม่พบใช้ลำดับคอลัมน์ รายการ|หน่วย|ปริมาณ|งบ */
export function parsePlanTable(table: ReadonlyArray<ReadonlyArray<unknown>>): ParsedPlan & { headerRow: number } {
  let headerRow = -1;
  let cols = { name: 0, unit: 1, qty: 2, amount: 3 };
  for (let r = 0; r < Math.min(table.length, 20); r++) {
    const cells = table[r].map((c) => cleanText(c, 200));
    const name = cells.findIndex((c) => NAME_HDR.test(c));
    const unit = cells.findIndex((c) => UNIT_HDR.test(c));
    // งบประมาณ: เลือกคอลัมน์ขวาสุดที่ตรง (หัวตารางสองชั้นมักมี "รายละเอียดงบประมาณ" อยู่เหนือ)
    const amountIdx = cells.map((c, i) => (AMOUNT_HDR.test(c) && i !== name ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    if (name >= 0 && (unit >= 0 || amountIdx >= 0)) {
      headerRow = r;
      const qty = cells.findIndex((c, i) => QTY_HDR.test(c) && i !== name && i !== amountIdx);
      cols = { name, unit: unit >= 0 ? unit : name + 1, qty: qty >= 0 ? qty : (unit >= 0 ? unit + 1 : name + 2), amount: amountIdx >= 0 ? amountIdx : name + 3 };
      // หัวตารางหลายชั้น: ข้ามแถวที่ตามมาซึ่งเป็นหัวตารางย่อย (ไม่มีชื่อรายการ)
      while (headerRow + 1 < table.length && !cleanText(table[headerRow + 1][cols.name]) &&
        table[headerRow + 1].some((c) => /ปริมาณ|งบประมาณ|ครั้งที่/.test(cleanText(c)))) headerRow++;
      break;
    }
  }
  const rows: RawRow[] = [];
  for (let r = headerRow + 1; r < table.length; r++) {
    const line = table[r];
    const text = cleanText(line[cols.name], 1000);
    if (!text) continue;
    if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
    rows.push({ rowNo: r + 1, text, unit: cleanText(line[cols.unit]), qty: cleanText(line[cols.qty]), amount: line[cols.amount] ?? '' });
  }
  return { ...buildPlan(rows), headerRow };
}

/* --------------------------------- OCR text input --------------------------------- */

/**
 * ร่างแผนจากข้อความ OCR ของ PDF/รูป (Drive OCR) — ผลเป็น "ร่าง" ต้องตรวจทุกครั้ง
 * แยกหน่วยนับ/ปริมาณ/งบประมาณจากท้ายบรรทัด และต่อบรรทัดที่ถูกตัดกลับเข้าด้วยกัน
 */
export function parsePlanText(text: string): ParsedPlan {
  const units = [...UNIT_WORDS].sort((a, b) => b.length - a.length).map((u) => u.replace('/', '\\/')).join('|');
  const tail = new RegExp(`^(.*?)\\s+(?:(${units})\\s+([\\d,]+(?:\\.\\d+)?)\\s+)?([\\d]{1,3}(?:,\\d{3})+(?:\\.\\d{2})?|\\d{1,6}(?:\\.\\d{2})?)\\s*$`);
  const rows: RawRow[] = [];
  const lines = thaiDigitsToArabic(text).split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim());
  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    if (!line || /^(แบบ คง|รายละเอียดงบประมาณ|กรมส่งเสริม|สำนักงานเกษตร|งบดำเนินงาน|แผนงาน - โครงการ|ครั้งที่|ปริมาณ|งาน|\(บาท\)|หน่วยนับ|\d+\/\d+$)/.test(line)) continue;
    if (/^หมายเหตุ/.test(line)) break;
    const m = line.match(tail);
    let name = line;
    let unit = '';
    let qty = '';
    let amount = '';
    if (m) {
      name = m[1];
      unit = m[2] ?? '';
      qty = m[3] ?? '';
      amount = m[4];
      // เลขท้ายชื่อที่เป็นส่วนของชื่อ (เช่น "ปี 2568 - 2570") — งบต้องมีหน่วยหรือ comma
      if (!unit && !amount.includes(',') && Number(amount) < 1000) { name = line; amount = ''; }
    }
    const starts = classifyPlanLine(name);
    const prev = rows.at(-1);
    // บรรทัดต่อ: ไม่มีเลขลำดับ/คำขึ้นต้นโครงสร้าง และแถวก่อนหน้ายังไม่มีงบ → ต่อชื่อ
    if (prev && starts.rank === -2 && !prev.amount) {
      prev.text = `${prev.text} ${name}`.trim();
      if (amount) { prev.unit = unit; prev.qty = qty; prev.amount = amount; }
      continue;
    }
    if (prev && starts.rank === -2 && prev.amount && !amount) {
      prev.text = `${prev.text} ${name}`.trim();
      continue;
    }
    rows.push({ rowNo: lineNo, text: name, unit, qty, amount });
  }
  const parsed = buildPlan(rows);
  parsed.issues.unshift({ rowNo: 0, level: 'WARNING', message: 'ข้อมูลนี้ได้จากการอ่านภาพเอกสาร (OCR) — ตรวจทุกบรรทัดกับต้นฉบับ หรือดาวน์โหลดเป็นไฟล์ Excel แก้ไขแล้วนำเข้าใหม่' });
  return parsed;
}

/** ส่งออกต้นไม้เป็นตาราง (แม่แบบเดียวกับที่นำเข้า) เพื่อแก้ไขใน Excel */
export function planToTable(p: Pick<ParsedPlan, 'nodes' | 'declaredTotal' | 'computedTotal'>): string[][] {
  const out: string[][] = [['แผนงาน - โครงการ - กิจกรรม - วิธีการดำเนินงาน', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ (บาท)']];
  out.push(['รวมทั้งสิ้น', '', '', ((p.declaredTotal ?? p.computedTotal) / 100).toFixed(2)]);
  for (const n of p.nodes) {
    const prefix = n.kind === 'PLAN' || n.kind === 'OUTPUT' ? '' : n.number === '+' ? '+ ' : n.number ? `${n.number} ` : '';
    out.push([`${prefix}${n.name}`, n.unit, n.quantity === null ? '' : String(n.quantity), n.amountSatang === null ? '' : (n.amountSatang / 100).toFixed(2)]);
  }
  return out;
}
