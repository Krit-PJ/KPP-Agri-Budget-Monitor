import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectHeader, parseDelimited, parseRows, planImport, summarizeStaged } from '@kpp/domain';
import type { FundingSource, Workgroup } from '@kpp/domain';
import { SEED_FUNDING_SOURCES, SEED_ORGS } from '../src/core/setup';

const meta = { createdAt: '', createdBy: '', updatedAt: '', updatedBy: '', version: 1, isDeleted: false };
const FS = SEED_FUNDING_SOURCES.map((f, i) => ({ ...meta, id: `fs${i}`, ...f })) as FundingSource[];
const WG = SEED_ORGS.flatMap((o) => o.groups).map((g, i) => ({ ...meta, id: `wg${i}`, orgId: 'o', ...g })) as Workgroup[];
const read = (f: string) => parseDelimited(readFileSync(new URL(`../../../fixtures/import/${f}`, import.meta.url), 'utf8'));
const ctx = { fiscalYear: 2570, fundingSourceId: '', fileLabel: 'f', workgroups: WG, fundingSources: FS, projects: [], activities: [], allocations: [], disbursements: [], allowedWorkgroupIds: null, defaultWorkgroupId: '', today: '2026-12-15' };

describe('fixture files', () => {
  it('budget-summary.csv: detects layout, skips total row, parses Thai dates/numbers', () => {
    const rows = read('budget-summary.csv');
    const det = detectHeader(rows);
    expect(det.kind).toBe('BUDGET_SUMMARY');
    const parsed = parseRows(rows, det);
    expect(parsed).toHaveLength(3);
    expect(parsed[2].startDate).toBe('2026-12-01');
    expect(parsed[2].money.transferOut).toBe(-10_000_000);
    const staged = planImport(parsed, { ...ctx, kind: 'BUDGET_SUMMARY' });
    // "(100,000)" ในคอลัมน์โอนลด = ลด 100,000 → 1,500,000 - 100,000
    expect(staged[2].effect.budgetDelta).toBe(140_000_000);
    expect(staged[1].effect.budgetDelta).toBe(34_000_000);
    expect(staged[0]).toMatchObject({ status: 'VALID' });
    expect(staged[0].plan.disbursements.map((d) => d.amountSatang)).toEqual([21_050_050, 5_000_000]);
    const sum = summarizeStaged(staged);
    expect(sum).toMatchObject({ error: 0, newProjects: 3, budgetDelta: 259_000_000 }); // 850,000 + 340,000 + 1,400,000
  });
  it('malicious.csv: formula payloads are kept as text and invalid money is an error', () => {
    const rows = read('malicious.csv');
    const staged = planImport(parseRows(rows, detectHeader(rows)), { ...ctx, kind: 'BUDGET_SUMMARY' });
    expect(staged[0].plan.createProject?.name.startsWith('=HYPERLINK')).toBe(true);
    expect(staged[1].status).toBe('ERROR');
  });
});
