import { describe, expect, it } from 'vitest';
import { parsePlanQuarters, planToDate, splitByWeight, splitEqual, splitMoney } from '../src/index';

describe('แผนรายไตรมาสและการแบ่งงบ (ADR-006)', () => {
  it('planToDate interpolates the activity quarterly plan, else the percentage targets', () => {
    expect(planToDate(1200, '300,300,300,300', '', 0)).toBe(0);
    expect(planToDate(1200, '300,300,300,300', '', 2)).toBe(200);
    expect(planToDate(1200, '300,300,300,300', '', 3)).toBe(300);
    expect(planToDate(1200, '300,300,300,300', '', 12)).toBe(1200);
    // แผนเดิมทำไว้ 1,000 แต่งบเพิ่มเป็น 2,000 → ปรับตามสัดส่วน
    expect(planToDate(2000, '1000,0,0,0', '', 3)).toBe(2000);
    expect(planToDate(1000, '', '30,55,80,100', 3)).toBe(300);
    expect(planToDate(1000, 'bad', '30,55,80,100', 6)).toBe(550);
    expect(parsePlanQuarters('1,2,3')).toBeNull();
  });
  it('splits money exactly with the remainder going to one row', () => {
    expect(splitEqual(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEqual(16, 11)).toEqual([2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1]);
    // 3,040 บาท ÷ 11 อำเภอ → บาทเต็ม: 277 ×4 + 276 ×7
    expect(splitMoney(304_000, 11)).toEqual([...Array(4).fill(27_700), ...Array(7).fill(27_600)]);
    expect(splitMoney(100_050, 2)).toEqual([50_025, 50_025]);
    expect(splitByWeight(1000, [1, 1, 2])).toEqual([250, 250, 500]);
    expect(splitByWeight(1001, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1001);
    expect(splitByWeight(100, [0, 0])).toEqual([50, 50]);
  });
});

describe('spend targets', () => {
  it('builds the monthly curve from quarters or 12 free monthly values; the year ends at 100%', async () => {
    const { targetCurve, dueCurve, effectiveDueMonth, parseSpendTarget, validateSpendTarget, planAt, linearMonths, fullMonthOf } = await import('../src/budget');
    expect(targetCurve({ mode: 'quarter', quarters: [30, 55, 80, 100], months: [] }).filter((_, i) => i % 3 === 2)).toEqual([30, 55, 80, 100]);
    const m = linearMonths(11);
    expect(m.slice(9)).toEqual([91, 100, 100]);
    expect(fullMonthOf(m)).toBe(11);
    const free = [5, 12, 30, 35, 40, 55, 60, 70, 85, 95, 100, 100];
    expect(targetCurve({ mode: 'monthly', quarters: [], months: free })).toEqual(free);
    expect(validateSpendTarget({ mode: 'monthly', quarters: [], months: free })).toBeNull();
    expect(validateSpendTarget({ mode: 'monthly', quarters: [], months: [...free.slice(0, 10), 96, 99] })).toContain('100%');
    expect(validateSpendTarget({ mode: 'monthly', quarters: [], months: [5, 4, ...free.slice(2)] })).toContain('ต้องไม่น้อยกว่า');
    expect(validateSpendTarget({ mode: 'quarter', quarters: [30, 55, 80, 98], months: [] })).toContain('100%');
    // รูปแบบเดิม deadline → รายเดือน
    const legacy = parseSpendTarget(JSON.stringify({ mode: 'deadline', month: 11, pct: 100 }));
    expect(legacy.mode).toBe('monthly');
    expect(legacy.months[10]).toBe(100);
    expect(parseSpendTarget('not json', '25,50,75,100').quarters).toEqual([25, 50, 75, 100]);
    expect(dueCurve(3)).toEqual([33.33, 66.67, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
    expect(effectiveDueMonth({ name: 'ประชุมคณะกรรมการ' })).toBe(9);
    expect(effectiveDueMonth({ name: 'ประชุมคณะกรรมการ', dueMonth: -1 })).toBe(0);
    expect(planAt(1000, m, 0, 0)).toBe(0);
    expect(planAt(1000, free, 0, 3)).toBe(300);
  });
});
