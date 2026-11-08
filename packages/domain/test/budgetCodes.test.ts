import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUDGET_CODES_2570, matchBudgetCodes, normalizePlanTable, parsePlanTable, readXlsx, type PlanChainNode } from '../src/index';

const XLSX = readFileSync(new URL('../../../data/plans/2570-DOAE-r1-kamphaengphet.xlsx', import.meta.url));

describe('ฐานข้อมูลรหัสงบประมาณ 2570', () => {
  it('has well-formed codes', () => {
    expect(BUDGET_CODES_2570.length).toBeGreaterThan(40);
    for (const e of BUDGET_CODES_2570) {
      expect(e.budgetCode, e.activityName).toMatch(/^\d{20}$/);
      expect(e.mainActivityCode, e.activityName).toMatch(/^\d{17}$/);
      expect(e.activityName + e.projectName + e.itemName).not.toMatch(/ดาเนิน|ประจาปี|ดาริ|สูห่|ผูป้|ที่ดนิ|สิง่ |ทากิน|สาหรับ|สาปะหลัง/);
    }
  });

  it('every leaf of the Kamphaengphet 2570 plan gets both codes', () => {
    const p = parsePlanTable(normalizePlanTable(readXlsx(new Uint8Array(XLSX))[0].rows).table);
    const bySeq = new Map(p.nodes.map((n) => [n.seq, n]));
    const chainOf = (seq: number): PlanChainNode[] => {
      const out: PlanChainNode[] = [];
      for (let n = bySeq.get(seq); n; n = bySeq.get(n.parentSeq)) out.unshift({ kind: n.kind, name: n.name });
      return out;
    };
    const leaves = p.nodes.filter((n) => n.isLeaf);
    const miss = leaves.filter((n) => !matchBudgetCodes(BUDGET_CODES_2570, 2570, chainOf(n.seq))).map((n) => n.name);
    expect(miss).toEqual([]);
    const pick = (s: string) => matchBudgetCodes(BUDGET_CODES_2570, 2570, chainOf(leaves.find((n) => n.name.includes(s))!.seq));
    // งบรายจ่ายอื่น: รหัสงบของรายการค่าใช้จ่าย
    expect(pick('ศดปช')).toMatchObject({ budgetCode: '07011150034005000001', mainActivityCode: '07011700009900000', section: 'OTHER' });
    // งบประจำ: รหัสงบของผลผลิต + รหัสกิจกรรมของ "กิจกรรมการพัฒนาเกษตรกร"
    expect(pick('อาสาสมัครเกษตร')).toMatchObject({ budgetCode: '07011302001002000000', mainActivityCode: '07011708389900000', section: 'REGULAR' });
    expect(pick('Smart Group')).toMatchObject({ budgetCode: '07011422029002000000', mainActivityCode: '07011700006100000' });
  });

  it('does not guess for another year', () => {
    expect(matchBudgetCodes(BUDGET_CODES_2570, 2571, [{ kind: 'ACTIVITY', name: 'กิจกรรมตลาดเกษตรกร' }])).toBeNull();
  });
});
