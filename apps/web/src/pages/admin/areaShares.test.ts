import { describe, expect, it } from 'vitest';
import { computeAreaShares } from './areaShares';

const P = 'pao';
const d = (unitId: string, budgetBaht: number | null, targetQty = 0) => ({ unitId, targetQty, budgetSatang: budgetBaht === null ? null : budgetBaht * 100 });

describe('computeAreaShares', () => {
  it('puts what districts do not use at province level (screenshot case: 5 × 1,000 of 8,000)', () => {
    const r = computeAreaShares({ mode: 'some', provinceId: P, totalQty: 0, totalBudget: 8_000_00, districts: ['a', 'b', 'c', 'd', 'e'].map((u) => d(u, 1000)) });
    expect(r.ok).toBe(true);
    expect(r.restBudget).toBe(3_000_00);
    expect(r.shares[0]).toEqual({ unitId: P, budgetSatang: 3_000_00, targetQty: 0 });
    expect(r.shares.reduce((a, s) => a + s.budgetSatang, 0)).toBe(8_000_00);
  });

  it('omits the province row when districts use everything', () => {
    const r = computeAreaShares({ mode: 'all', provinceId: P, totalQty: 10, totalBudget: 10_000_00, districts: [d('a', 5000, 5), d('b', 5000, 5)] });
    expect(r.ok).toBe(true);
    expect(r.shares.map((s) => s.unitId)).toEqual(['a', 'b']);
  });

  it('gives the province leftover targets too', () => {
    const r = computeAreaShares({ mode: 'some', provinceId: P, totalQty: 55, totalBudget: 55_000_00, districts: [d('a', 5000, 5)] });
    expect(r.shares[0]).toEqual({ unitId: P, budgetSatang: 50_000_00, targetQty: 50 });
  });

  it('blocks saving when districts exceed the total or money is invalid', () => {
    expect(computeAreaShares({ mode: 'some', provinceId: P, totalQty: 0, totalBudget: 1_000_00, districts: [d('a', 1500)] }).ok).toBe(false);
    expect(computeAreaShares({ mode: 'some', provinceId: P, totalQty: 4, totalBudget: 1_000_00, districts: [d('a', 500, 5)] }).ok).toBe(false);
    expect(computeAreaShares({ mode: 'some', provinceId: P, totalQty: 0, totalBudget: 1_000_00, districts: [d('a', null)] }).ok).toBe(false);
    expect(computeAreaShares({ mode: 'some', provinceId: P, totalQty: 0, totalBudget: 1_000_00, districts: [] }).ok).toBe(false);
  });

  it('province-only mode gives everything to the province', () => {
    expect(computeAreaShares({ mode: 'province', provinceId: P, totalQty: 3, totalBudget: 900_00, districts: [] }).shares).toEqual([{ unitId: P, budgetSatang: 900_00, targetQty: 3 }]);
  });
});
