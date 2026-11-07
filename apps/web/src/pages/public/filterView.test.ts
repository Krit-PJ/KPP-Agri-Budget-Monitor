import { describe, expect, it } from 'vitest';
import type { PublicSummary, ReportRow } from '@kpp/domain';
import { activityTotals, filteredSummary } from './filterView';

const row = (o: Partial<ReportRow>): ReportRow => ({
  workgroupId: 'G1', fundingSourceId: 'F', projectId: 'P1', projectCode: '', projectName: 'โครงการ 1',
  activityId: 'A1', activityCode: '', activityName: 'กิจกรรม 1', unit: '', targetQty: 0, unitId: 'U0', isMeeting: false,
  budget: 1000, plan: 300, committed: 0, disbursed: 100, remaining: 900, planQ: [300, 550, 800, 1000], ...o,
});
const names = { group: (id: string) => `กลุ่ม ${id}`, unit: (id: string) => `พื้นที่ ${id}` };
const base = { totals: {}, byWorkgroup: [], byUnit: [], meetings: { activities: 0, remaining: 0, budget: 0 } } as unknown as PublicSummary;

describe('overview filter', () => {
  const rows = [
    row({}),
    row({ unitId: 'U1', budget: 500, plan: 150, disbursed: 0, remaining: 500, planQ: [150, 275, 400, 500] }),
    row({ activityId: 'A2', activityName: 'ประชุม', isMeeting: true, budget: 200, plan: 60, disbursed: 50, remaining: 150, planQ: [60, 110, 160, 200] }),
  ];
  it('sums only the selected rows and keeps the same shape as the public summary', () => {
    const d = filteredSummary(base, rows, names);
    expect(d.totals).toMatchObject({ currentBudget: 1700, disbursed: 150, remaining: 1550, spendingPct: 8.82 });
    expect(d.byWorkgroup).toHaveLength(1);
    expect(d.byWorkgroup[0]).toMatchObject({ plan: 510, planQ: [510, 935, 1360, 1700], activities: 2 });
    expect(d.byWorkgroup[0].units?.map((u) => u.key)).toEqual(['U0', 'U1']);
    expect(d.byUnit.find((u) => u.key === 'U0')?.groups?.[0].budget.currentBudget).toBe(1200);
    expect(d.meetings).toEqual({ activities: 1, budget: 200, remaining: 150 });
  });
  it('lists activities with their areas for a single project', () => {
    const a = activityTotals(rows, names);
    expect(a.map((x) => [x.label, x.budget.currentBudget])).toEqual([['กิจกรรม 1', 1500], ['ประชุม', 200]]);
    expect(a[0].units?.map((u) => u.label)).toEqual(['พื้นที่ U0', 'พื้นที่ U1']);
  });
});
