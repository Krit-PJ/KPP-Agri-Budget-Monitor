import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyPlanLine, detectPlanMeta, diffPlanTables, normalizePlanTable, parseDelimited, parsePlanTable, parsePlanText, planToTable, readXlsx, toCsv, writeXlsx,
} from '../src/index';

/** ไฟล์ต้นฉบับจากสำนักงาน (แบบ คง.2 หัวตาราง 3 แถวผสานเซลล์) */
const XLSX = readXlsx(new Uint8Array(readFileSync(new URL('../../../data/plans/2570-DOAE-r1-kamphaengphet.xlsx', import.meta.url))))[0].rows;

describe('classifyPlanLine', () => {
  it('reads every numbering style used in แบบ คง.2', () => {
    expect(classifyPlanLine('แผนงานยุทธศาสตร์การเกษตรสร้างมูลค่า').kind).toBe('PLAN');
    expect(classifyPlanLine('ผลผลิตเกษตรกรได้รับการส่งเสริม').kind).toBe('OUTPUT');
    expect(classifyPlanLine('1 โครงการตลาดเกษตรกร')).toMatchObject({ kind: 'PROJECT', number: '1' });
    expect(classifyPlanLine('๕.๑ กิจกรรมตลาดเกษตรกร')).toMatchObject({ kind: 'ACTIVITY', number: '5.1' });
    expect(classifyPlanLine('1.1.1 สนับสนุนโครงการ')).toMatchObject({ kind: 'SUBACTIVITY' });
    expect(classifyPlanLine('+ งบรายจ่ายอื่น (ค่าใช้จ่าย)').kind).toBe('BUDGET_TYPE');
    expect(classifyPlanLine('2.2.2.1) การจัดทำแปลง')).toMatchObject({ kind: 'METHOD', number: '2.2.2.1)', rank: 14 });
    expect(classifyPlanLine('(2.1) จัดกระบวนการ')).toMatchObject({ kind: 'ITEM', number: '(2.1)' });
    expect(classifyPlanLine('- คัดเลือก อกม.')).toMatchObject({ kind: 'ITEM', number: '-' });
    expect(classifyPlanLine('รวมทั้งสิ้น').kind).toBe('TOTAL');
  });
});

describe('แบบ คง.2 ปีงบประมาณ 2570 ครั้งที่ 1 (สนง.เกษตรจังหวัดกำแพงเพชร)', () => {
  const p = parsePlanTable(XLSX);

  it('reconciles every level to the baht', () => {
    expect(p.declaredTotal).toBe(242_986_200);
    expect(p.computedTotal).toBe(242_986_200);
    expect(p.leafTotal).toBe(242_986_200);
    expect(p.issues.filter((i) => i.level === 'ERROR')).toEqual([]);
  });

  it('builds the expected structure', () => {
    const count = (k: string) => p.summary.find((s) => s.kind === k)?.count ?? 0;
    expect(count('PLAN')).toBe(5);
    expect(count('PROJECT')).toBe(16);
    expect(count('ACTIVITY')).toBe(19);
    expect(p.leafCount).toBe(87);
    const plans = p.nodes.filter((n) => n.kind === 'PLAN');
    const totalOf = (seq: number) => p.nodes.filter((n) => n.isLeaf && n.planIndex === p.nodes.find((x) => x.seq === seq)!.planIndex).reduce((a, n) => a + (n.amountSatang ?? 0), 0);
    expect(plans.map((x) => totalOf(x.seq))).toEqual([5_550_000, 141_368_200, 4_800_000, 42_598_000, 48_670_000]);
  });

  it('flags the two numbering anomalies in the source document', () => {
    const info = p.issues.filter((i) => i.level === 'INFO').map((i) => i.message);
    expect(info.some((m) => m.includes('(2.1)') && m.includes('(1)'))).toBe(true);
    expect(info.some((m) => m.includes('จาก 2) ไป 4)'))).toBe(true);
  });

  it('gives each leaf a code that is unique inside its project', () => {
    const keys = p.nodes.filter((n) => n.isLeaf).map((n) => `${n.planIndex}|${n.projectSeq}|${n.code}`);
    expect(new Set(keys).size).toBe(keys.length);
    const dw = p.nodes.find((n) => n.name.startsWith('เวทีแลกเปลี่ยนเรียนรู้ระดับอำเภอ'))!;
    expect(dw).toMatchObject({ code: '2.1/1)/1.1)', unit: 'คน', quantity: 50, amountSatang: 1_450_000, isLeaf: true });
  });

  it('keeps sub-totals that have children (e.g. ข้าวโพดเลี้ยงสัตว์ 195,600) as non-leaf', () => {
    const corn = p.nodes.find((n) => n.name.includes('(ข้าวโพดเลี้ยงสัตว์)'))!;
    expect(corn.isLeaf).toBe(false);
    expect(corn.amountSatang).toBe(19_560_000);
  });

  it('round-trips through the export template', () => {
    const again = parsePlanTable(planToTable(p));
    expect(again.computedTotal).toBe(p.computedTotal);
    expect(again.leafCount).toBe(p.leafCount);
  });
});

describe('ไฟล์ Excel ต้นฉบับ (หัวตารางหลายชั้น)', () => {
  it('maps ปริมาณงาน and งบประมาณ from the sub-header row, not the merged parent header', () => {
    const n = normalizePlanTable(XLSX);
    expect(n.table[0]).toEqual(['แผนงาน - โครงการ - กิจกรรม - วิธีการดำเนินงาน', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ (บาท)']);
    expect(n.table[1]).toEqual(['รวมทั้งสิ้น', 'ราย', '908', '2429862']);
    expect(n.table.at(-1)![0]).toContain('การดำเนินงานตามมาตรการหมอกควัน'); // หยุดก่อน "หมายเหตุ"
    const again = parsePlanTable(n.table);
    expect(again.computedTotal).toBe(242_986_200);
    expect(again.leafCount).toBe(87);
  });

  it('reads the document heading so the form fills itself', () => {
    expect(detectPlanMeta(XLSX)).toMatchObject({ fiscalYear: 2570, round: 1, fundCode: 'DOAE', budgetType: 'งบดำเนินงาน', form: 'แบบ คง. 2', org: 'สำนักงานเกษตรจังหวัดกำแพงเพชร' });
  });

  it('offers optional fixes: renumber (2.1) → (1.1) and note leaves without a unit', () => {
    const n = normalizePlanTable(XLSX).table;
    const p = parsePlanTable(n);
    const renum = p.issues.find((i) => i.fix === 'เปลี่ยนเป็น (1.1)')!;
    expect(renum).toMatchObject({ level: 'INFO', field: 'name' });
    expect(renum.suggest).toMatch(/^\(1\.1\) จัดกระบวนการเรียนรู้/);
    expect(n[renum.rowNo - 1][0]).toMatch(/^\(2\.1\)/); // rowNo ชี้แถวในตารางมาตรฐาน
    const noUnit = p.issues.filter((i) => i.message.startsWith('กิจกรรมย่อยไม่มีหน่วยนับ'));
    expect(noUnit).toHaveLength(8);
    expect(p.issues.filter((i) => i.level !== 'INFO')).toEqual([]);
  });

  it('suggests the child sum when a parent total is wrong, and records edits', () => {
    const n = normalizePlanTable(XLSX).table.map((r) => [...r]);
    const row = n.findIndex((r) => r[0].startsWith('1.1 พัฒนาอาสาสมัครเกษตรหมู่บ้าน'));
    n[row][3] = '40000';
    // แถวที่แก้ผิดได้คำแนะนำ = ผลรวมลูก; แถวแม่ด้านบนก็ถูกแจ้งด้วย (ผู้ใช้เลือกว่าจะแก้ตัวไหน)
    const errs = parsePlanTable(n).issues.filter((i) => i.level === 'ERROR');
    expect(errs.map((i) => i.rowNo)).toEqual([row, row + 1]);
    const err = errs.find((i) => i.rowNo === row + 1)!;
    expect(err).toMatchObject({ rowNo: row + 1, field: 'amount', suggest: '41000' });
    const fixed = n.map((r) => [...r]);
    fixed[row][3] = err.suggest!;
    expect(parsePlanTable(fixed).issues.filter((i) => i.level === 'ERROR')).toEqual([]);
    expect(diffPlanTables(n, fixed)).toEqual([{ rowNo: row + 1, field: 'amount', before: '40000', after: '41000' }]);
  });

  it('gives the same result from CSV export of the normalized table', () => {
    const csv = toCsv(normalizePlanTable(XLSX).table);
    expect(parsePlanTable(parseDelimited(csv)).computedTotal).toBe(242_986_200);
  });
});

describe('validation', () => {
  it('reports parent/child sum mismatches and a wrong grand total', () => {
    const t = [
      ['รายการ', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ'],
      ['รวมทั้งสิ้น', '', '', '999'],
      ['แผนงานทดสอบ', '', '', '1,000'],
      ['1 โครงการ ก', '', '', '1,000'],
      ['1.1 กิจกรรม ข', '', '', '700'],
      ['1) วิธี ค', 'ราย', '5', '300'],
      ['2) วิธี ง', 'ราย', 'ห้า', ''],
    ];
    const p = parsePlanTable(t);
    const errs = p.issues.filter((i) => i.level === 'ERROR').map((i) => i.message);
    expect(errs.some((m) => m.includes('700') && m.includes('300'))).toBe(true);
    expect(errs.some((m) => m.includes('ยอดรวมทั้งสิ้น'))).toBe(true);
    expect(p.issues.some((i) => i.message.includes('ไม่มีงบประมาณ'))).toBe(true);
    expect(p.issues.some((i) => i.message.includes('ปริมาณงานไม่ใช่ตัวเลข'))).toBe(true);
  });
});

describe('parsePlanText (OCR draft)', () => {
  it('splits unit/qty/amount from line ends and re-joins wrapped lines', () => {
    const ocr = [
      'แบบ คง. 2',
      'รวมทั้งสิ้น ราย 908 2,429,862',
      'แผนงานพื้นฐานด้านการสร้างความสามารถในการแข่งขัน ราย 110 55,500',
      '1 กิจกรรมการพัฒนาเกษตรกร ราย 110 55,500',
      '1.1 พัฒนาอาสาสมัครเกษตรหมู่บ้าน ราย 110 55,500',
      '1) ขับเคลื่อนกลไกการทำงานอาสาสมัครเกษตร',
      '1.1) จัดทำผังแปลงเกษตรกรรมดิจิทัลที่ขึ้นทะเบียนใหม่หรือปรับปรุง',
      'ทะเบียนเกษตรกร ในปี 2568 - 2570 ทั่วประเทศ แปลง ๒๑,๒๕๐ ๕๕,๕๐๐',
    ].join('\n');
    const p = parsePlanText(ocr);
    const leaf = p.nodes.find((n) => n.isLeaf)!;
    expect(leaf.name).toContain('ในปี 2568 - 2570 ทั่วประเทศ');
    expect(leaf).toMatchObject({ unit: 'แปลง', quantity: 21250, amountSatang: 5_550_000 });
    expect(p.issues[0].message).toContain('OCR');
    expect(p.issues.some((i) => i.message.includes('ยอดรวมทั้งสิ้น'))).toBe(true); // 2,429,862 ≠ 55,500 → ต้องตรวจ
  });
});

describe('writeXlsx', () => {
  it('round-trips Thai text, numbers and styles through readXlsx', () => {
    const bytes = writeXlsx([{ name: 'สรุป/กลุ่มงาน', rows: [[{ v: 'รายงาน', s: 't' }], [{ v: 'กลุ่มงาน', s: 'h' }, { v: 'งบ', s: 'h' }], ['กลุ่มอารักขาพืช <&>', { v: 286300.5, fmt: 'money' }], [{ v: 'รวม', s: 'b' }, { v: 286300.5, s: 'b', fmt: 'money' }]], widths: [30, 14], merges: ['A1:B1'], freezeRow: 2 }]);
    const [sheet] = readXlsx(bytes);
    expect(sheet.name).toBe('สรุป กลุ่มงาน');
    expect(sheet.rows).toEqual([['รายงาน'], ['กลุ่มงาน', 'งบ'], ['กลุ่มอารักขาพืช <&>', 286300.5], ['รวม', 286300.5]]);
  });
});
