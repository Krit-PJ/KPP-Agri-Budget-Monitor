import { describe, expect, it } from 'vitest';
import { parsePlanQuarters, planToDate, splitByWeight, splitEqual } from '../src/index';

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
    expect(splitByWeight(1000, [1, 1, 2])).toEqual([250, 250, 500]);
    expect(splitByWeight(1001, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1001);
    expect(splitByWeight(100, [0, 0])).toEqual([50, 50]);
  });
});
