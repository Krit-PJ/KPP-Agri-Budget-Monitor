/**
 * คำนวณส่วนแบ่งพื้นที่ดำเนินการของกิจกรรม
 * - province: ระดับจังหวัดอย่างเดียว ได้ทั้งหมด
 * - all / some: อำเภอได้ตามที่กรอก ระดับจังหวัด = ส่วนที่เหลือ (ยอดทั้งสิ้น − ผลรวมอำเภอ)
 *   ถ้าส่วนที่เหลือเป็น 0 ทั้งงบและเป้า จะไม่บันทึกแถวระดับจังหวัด
 */
export type AreaMode = 'province' | 'all' | 'some';
export interface DistrictInput { unitId: string; targetQty: number; budgetSatang: number | null }
export interface AreaShare { unitId: string; budgetSatang: number; targetQty: number }

export function computeAreaShares(p: {
  mode: AreaMode; provinceId: string; totalQty: number; totalBudget: number; districts: DistrictInput[];
}): { restQty: number; restBudget: number; badMoney: boolean; ok: boolean; shares: AreaShare[] } {
  const hasTarget = p.totalQty > 0;
  if (p.mode === 'province') {
    return { restQty: p.totalQty, restBudget: p.totalBudget, badMoney: false, ok: true, shares: [{ unitId: p.provinceId, budgetSatang: p.totalBudget, targetQty: p.totalQty }] };
  }
  const badMoney = p.districts.some((d) => d.budgetSatang === null);
  const sumQ = hasTarget ? p.districts.reduce((a, d) => a + d.targetQty, 0) : 0;
  const sumB = p.districts.reduce((a, d) => a + (d.budgetSatang ?? 0), 0);
  const restQty = hasTarget ? p.totalQty - sumQ : 0;
  const restBudget = p.totalBudget - sumB;
  const ok = p.districts.length > 0 && !badMoney && restQty >= 0 && restBudget >= 0;
  const shares: AreaShare[] = [
    ...(restBudget > 0 || restQty > 0 ? [{ unitId: p.provinceId, budgetSatang: restBudget, targetQty: restQty }] : []),
    ...p.districts.map((d) => ({ unitId: d.unitId, budgetSatang: d.budgetSatang ?? 0, targetQty: hasTarget ? d.targetQty : 0 })),
  ];
  return { restQty, restBudget, badMoney, ok, shares };
}
