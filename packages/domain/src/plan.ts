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
/** คอลัมน์ในตารางมาตรฐาน: 0 รายการ, 1 หน่วยนับ, 2 ปริมาณงาน, 3 งบประมาณ */
export type PlanField = 'name' | 'unit' | 'qty' | 'amount';
export const PLAN_FIELD_COL: Record<PlanField, number> = { name: 0, unit: 1, qty: 2, amount: 3 };
export interface PlanIssue {
  rowNo: number;
  level: PlanIssueLevel;
  message: string;
  /** ช่องที่ควรตรวจ/แก้ */
  field?: PlanField;
  /** ค่าที่ระบบแนะนำสำหรับช่องนั้น (ผู้ใช้เลือกใช้หรือไม่ก็ได้) */
  suggest?: string;
  /** ข้อความบนปุ่มใช้ค่าที่แนะนำ */
  fix?: string;
}

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
  let totalRowNo = 0;
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
      totalRowNo = r.rowNo;
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
    if (r.qty && qty === null) {
      const digits = thaiDigitsToArabic(r.qty).replace(/[^\d.]/g, '');
      issues.push({ rowNo: r.rowNo, level: 'WARNING', message: `ปริมาณงานไม่ใช่ตัวเลข: "${r.qty}"`, field: 'qty', ...(digits ? { suggest: digits, fix: `ใช้ ${digits}` } : {}) });
    }
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
        issues.push({
          rowNo: n.rowNo, level: 'ERROR', field: 'amount', suggest: satangPlain(s), fix: `ใช้ผลรวม ${bahtText(s)} บาท`,
          message: `งบประมาณ ${bahtText(n.amountSatang)} บาท ไม่เท่ากับผลรวมรายการย่อย ${bahtText(s)} บาท (ถ้ายอดนี้ถูก ให้แก้รายการย่อยแทน)`,
        });
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
    issues.push({
      rowNo: totalRowNo, level: 'ERROR', field: 'amount', suggest: satangPlain(computedTotal), fix: `ใช้ผลรวม ${bahtText(computedTotal)} บาท`,
      message: `ยอดรวมทั้งสิ้น ${bahtText(declaredTotal)} บาท ไม่เท่ากับผลรวมแผนงาน ${bahtText(computedTotal)} บาท`,
    });
  }

  // รายการย่อยสุดท้าย
  const leaves = nodes.filter((n) => n.isLeaf);
  for (const l of leaves) {
    if (l.amountSatang === null) issues.push({ rowNo: l.rowNo, level: 'WARNING', field: 'amount', message: 'กิจกรรมย่อยสุดท้ายไม่มีงบประมาณ — ใส่งบ หรือถ้าเป็นหัวข้อ ให้ตรวจว่ารายการย่อยตกหล่นหรือไม่' });
    else if (l.amountSatang < 0) issues.push({ rowNo: l.rowNo, level: 'ERROR', field: 'amount', message: 'งบประมาณติดลบ' });
    else if (!l.unit || l.quantity === null) {
      issues.push({ rowNo: l.rowNo, level: 'INFO', field: l.unit ? 'qty' : 'unit', message: `กิจกรรมย่อยไม่มี${!l.unit && l.quantity === null ? 'หน่วยนับและปริมาณงาน' : !l.unit ? 'หน่วยนับ' : 'ปริมาณงาน'} — เพิ่มได้ถ้าทราบ (ไม่บังคับ)` });
    }
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
      const fixed = n.number.replace(core, `${parentCore}.${core.split('.').at(-1)}`);
      issues.push({
        rowNo: n.rowNo, level: 'INFO', field: 'name', suggest: `${fixed} ${n.name}`, fix: `เปลี่ยนเป็น ${fixed}`,
        message: `เลขลำดับ ${n.number} ไม่สอดคล้องกับรายการแม่ ${parent.number} (ระบบจัดระดับตามตำแหน่งในเอกสารอยู่แล้ว แก้หรือไม่ก็ได้)`,
      });
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
        else if (lastNums[i] !== lastNums[i - 1] + 1) issues.push({ rowNo: list[i].rowNo, level: 'INFO', field: 'name', message: `เลขลำดับข้ามจาก ${list[i - 1].number} ไป ${list[i].number} — ตรวจกับต้นฉบับว่ามีรายการตกหล่นหรือไม่` });
      }
    }
    // ชื่อซ้ำภายใต้แม่เดียวกัน
    const seen = new Map<string, PlanNode>();
    for (const k of kids) {
      const key = normalizeKey(k.name);
      if (seen.has(key)) issues.push({ rowNo: k.rowNo, level: 'WARNING', field: 'name', message: `ชื่อซ้ำกับ "${seen.get(key)!.number} ${seen.get(key)!.name}" ภายใต้หัวข้อเดียวกัน — ตรวจว่าบันทึกซ้ำหรือไม่` });
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
const SUBHEADER = /ปริมาณ|งบประมาณ|ครั้งที่|งวดที่|บาท|จำนวน|หน่วย/;

export const PLAN_TABLE_HEADER = ['แผนงาน - โครงการ - กิจกรรม - วิธีการดำเนินงาน', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ (บาท)'];

interface Located { headerRow: number; cols: { name: number; unit: number; qty: number; amount: number } }

/**
 * หาแถวหัวตารางและคอลัมน์ — รองรับหัวตารางหลายชั้นที่ผสานเซลล์ (เช่น แบบ คง.2:
 * "รายละเอียดงบประมาณ" ครอบ "ปริมาณงาน | งบประมาณ (บาท)" ในแถวถัดไป)
 */
function locate(table: ReadonlyArray<ReadonlyArray<unknown>>): Located {
  for (let r = 0; r < Math.min(table.length, 25); r++) {
    const cells = (table[r] ?? []).map((c) => cleanText(c, 200));
    const name = cells.findIndex((c) => NAME_HDR.test(c));
    const unit = cells.findIndex((c) => UNIT_HDR.test(c));
    const amountIdx = cells.map((c, i) => (AMOUNT_HDR.test(c) && i !== name ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    if (name < 0 || (unit < 0 && amountIdx < 0)) continue;
    const qty = cells.findIndex((c, i) => QTY_HDR.test(c) && i !== name && i !== amountIdx);
    const cols = { name, unit: unit >= 0 ? unit : name + 1, qty: qty >= 0 ? qty : (unit >= 0 ? unit + 1 : name + 2), amount: amountIdx >= 0 ? amountIdx : name + 3 };
    let headerRow = r;
    // หัวตารางย่อย (ไม่มีชื่อรายการ) — ใช้ระบุคอลัมน์ปริมาณ/งบให้แม่นขึ้น แล้วข้ามไป
    for (let k = 1; k <= 3 && r + k < table.length; k++) {
      const sub = (table[r + k] ?? []).map((c) => cleanText(c, 200));
      if (sub[cols.name] || !sub.some((c) => SUBHEADER.test(c))) break;
      const q = sub.findIndex((c, i) => i !== cols.name && QTY_HDR.test(c));
      const a = sub.map((c, i) => (i !== cols.name && AMOUNT_HDR.test(c) && !QTY_HDR.test(c) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
      if (q >= 0) cols.qty = q;
      if (a >= 0) cols.amount = a;
      headerRow = r + k;
    }
    return { headerRow, cols };
  }
  return { headerRow: -1, cols: { name: 0, unit: 1, qty: 2, amount: 3 } };
}

function cellText(v: unknown): string {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  return cleanText(v, 1000);
}

/** ข้อมูลหัวเอกสาร (ปี ครั้งที่ แหล่งงบ ประเภทงบ) ที่อ่านได้จากแถวก่อนตาราง — ใช้เติมแบบฟอร์มให้อัตโนมัติ */
export interface PlanMeta {
  fiscalYear?: number;
  round?: number;
  /** รหัสแหล่งงบ: DOAE | PROVINCE | PROVGROUP */
  fundCode?: string;
  budgetType?: string;
  title?: string;
  form?: string;
  org?: string;
}

export function detectPlanMeta(table: ReadonlyArray<ReadonlyArray<unknown>>, headerRow = locate(table).headerRow): PlanMeta {
  const lines = table.slice(0, Math.max(0, headerRow) + 1).map((r) => (r ?? []).map((c) => cleanText(thaiDigitsToArabic(String(c ?? '')), 300)).filter(Boolean).join(' ')).filter(Boolean);
  const all = lines.join('\n');
  const meta: PlanMeta = {};
  const fy = all.match(/ปี(?:งบประมาณ)?\s*(?:พ\.\s*ศ\.)?\s*(25\d\d)/);
  if (fy) meta.fiscalYear = Number(fy[1]);
  const round = all.match(/(?:ครั้งที่|งวดที่)\s*(\d{1,2})/);
  if (round) meta.round = Number(round[1]);
  if (/กรมส่งเสริมการเกษตร/.test(all)) meta.fundCode = 'DOAE';
  else if (/กลุ่มจังหวัด/.test(all)) meta.fundCode = 'PROVGROUP';
  else if (/งบ(?:ประมาณ)?(?:พัฒนา)?จังหวัด|แผนพัฒนาจังหวัด/.test(all)) meta.fundCode = 'PROVINCE';
  const bt = lines.find((l) => /^งบ(ดำเนินงาน|ลงทุน|รายจ่ายอื่น|อุดหนุน|บุคลากร)\s*$/.test(l));
  if (bt) meta.budgetType = bt;
  const title = lines.find((l) => /^(รายละเอียดงบประมาณ|แผนการใช้จ่าย|แผนปฏิบัติงาน)/.test(l));
  if (title) meta.title = title;
  const form = all.match(/แบบ\s*คง\.?\s*\d/);
  if (form) meta.form = form[0].replace(/\s+/g, ' ');
  const org = lines.find((l) => /^สำนักงานเกษตร/.test(l));
  if (org) meta.org = org;
  return meta;
}

/**
 * แปลงตารางจากไฟล์ใดก็ได้เป็น "ตารางมาตรฐาน" 4 คอลัมน์ (หัวตาราง + แถวข้อมูล) สำหรับตรวจ/แก้ไขในหน้าเว็บ
 * แถวหลัง "หมายเหตุ" ไม่นำมาใช้
 */
export function normalizePlanTable(table: ReadonlyArray<ReadonlyArray<unknown>>): { table: string[][]; meta: PlanMeta; headerRow: number } {
  const { headerRow, cols } = locate(table);
  const out: string[][] = [[...PLAN_TABLE_HEADER]];
  for (let r = headerRow + 1; r < table.length; r++) {
    const line = table[r] ?? [];
    const text = cleanText(line[cols.name], 1000);
    if (!text) continue;
    if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
    out.push([text, cellText(line[cols.unit]), cellText(line[cols.qty]), cellText(line[cols.amount])]);
  }
  return { table: out, meta: detectPlanMeta(table, headerRow), headerRow };
}

/** รับตารางจาก CSV/XLSX/Google Sheets — หาแถวหัวตารางเอง; ถ้าไม่พบใช้ลำดับคอลัมน์ รายการ|หน่วย|ปริมาณ|งบ */
export function parsePlanTable(table: ReadonlyArray<ReadonlyArray<unknown>>): ParsedPlan & { headerRow: number } {
  const { headerRow, cols } = locate(table);
  const rows: RawRow[] = [];
  for (let r = headerRow + 1; r < table.length; r++) {
    const line = table[r] ?? [];
    const text = cleanText(line[cols.name], 1000);
    if (!text) continue;
    if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
    rows.push({ rowNo: r + 1, text, unit: cleanText(line[cols.unit]), qty: cellText(line[cols.qty]), amount: line[cols.amount] ?? '' });
  }
  return { ...buildPlan(rows), headerRow };
}

/** เทียบตารางมาตรฐานก่อน/หลังแก้ — ใช้บันทึกประวัติการแก้จากต้นฉบับ */
export interface PlanEdit { rowNo: number; field: PlanField; before: string; after: string }
export function diffPlanTables(before: ReadonlyArray<ReadonlyArray<string>>, after: ReadonlyArray<ReadonlyArray<string>>): PlanEdit[] {
  const fields: PlanField[] = ['name', 'unit', 'qty', 'amount'];
  const out: PlanEdit[] = [];
  const n = Math.max(before.length, after.length);
  for (let r = 1; r < n; r++) {
    for (const f of fields) {
      const a = cleanText(before[r]?.[PLAN_FIELD_COL[f]] ?? '', 1000);
      const b = cleanText(after[r]?.[PLAN_FIELD_COL[f]] ?? '', 1000);
      if (a !== b) out.push({ rowNo: r + 1, field: f, before: a, after: b });
    }
  }
  return out;
}

function satangPlain(s: Satang): string {
  return s % 100 === 0 ? String(s / 100) : (s / 100).toFixed(2);
}
function bahtText(s: Satang): string {
  return (s / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
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
