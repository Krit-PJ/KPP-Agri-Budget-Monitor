import { describe, expect, it } from 'vitest';
import {
  autoMap, detectHeader, parseRows, planImport, summarizeStaged, matchFundingSource, matchWorkgroup, autoProjectCode,
  parseCoverLetter,
} from '../src/index';
import type { FundingSource, Workgroup, Project, Allocation, Disbursement, PlanContext } from '../src/index';

const meta = { createdAt: '', createdBy: '', updatedAt: '', updatedBy: '', version: 1, isDeleted: false };
const FS: FundingSource[] = [
  { ...meta, id: 'fs1', code: 'DOAE', name: 'งบกรมส่งเสริมการเกษตร', shortName: 'กรมฯ' },
  { ...meta, id: 'fs2', code: 'PROVINCE', name: 'งบจังหวัดกำแพงเพชร', shortName: 'จังหวัด' },
  { ...meta, id: 'fs3', code: 'PROVGROUP', name: 'งบกลุ่มจังหวัดภาคเหนือตอนล่าง 2', shortName: 'กลุ่มจังหวัด' },
];
const WG: Workgroup[] = [
  { ...meta, id: 'wg1', orgId: 'o1', code: 'PLAN', name: 'กลุ่มยุทธศาสตร์และสารสนเทศ' },
  { ...meta, id: 'wg2', orgId: 'o1', code: 'PROD', name: 'กลุ่มส่งเสริมและพัฒนาการผลิต' },
  { ...meta, id: 'wg3', orgId: 'o1', code: 'FARMER', name: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร' },
];

function ctx(over: Partial<PlanContext> = {}): PlanContext {
  return {
    kind: 'BUDGET_SUMMARY', fiscalYear: 2570, fundingSourceId: 'fs1', fileLabel: 'test.xlsx',
    workgroups: WG, fundingSources: FS, projects: [], activities: [], allocations: [], disbursements: [],
    allowedWorkgroupIds: null, defaultWorkgroupId: '', today: '2026-11-05', ...over,
  };
}

const SUMMARY_SHEET = [
  ['รายงานผลการเบิกจ่ายงบประมาณ ปีงบประมาณ พ.ศ. 2570', '', '', '', '', ''],
  ['สำนักงานเกษตรจังหวัดกำแพงเพชร', '', '', '', '', ''],
  ['ลำดับ', 'รหัสโครงการ', 'ชื่อโครงการ/กิจกรรม', 'กลุ่มงานรับผิดชอบ', 'งบประมาณที่ได้รับจัดสรร (บาท)', 'ผลการเบิกจ่ายสะสม'],
  ['1', 'P70-001', 'โครงการส่งเสริมการผลิตข้าวคุณภาพ', 'กลุ่มส่งเสริมและพัฒนาการผลิต', '1,200,000.00', '300,000'],
  ['2', 'P70-002', 'โครงการพัฒนาเกษตรกรรุ่นใหม่', 'ส่งเสริมและพัฒนาเกษตรกร', '500,000', ''],
  ['', '', 'รวมทั้งสิ้น', '', '1,700,000', '300,000'],
];

describe('header detection and mapping', () => {
  it('finds the header row below title rows and maps Thai synonyms', () => {
    const det = detectHeader(SUMMARY_SHEET);
    expect(det.headerRow).toBe(2);
    expect(det.kind).toBe('BUDGET_SUMMARY');
    expect(det.mapping.projectCode).toBe(1);
    expect(det.mapping.projectName).toBe(2);
    expect(det.mapping.workgroup).toBe(3);
    expect(det.mapping.originalBudget).toBe(4);
    expect(det.mapping.disbursedCumulative).toBe(5);
  });
  it('handles two-row (merged) headers', () => {
    const rows = [
      ['โครงการ', '', 'งบประมาณ', ''],
      ['รหัส', 'ชื่อ', 'ที่ได้รับ', 'เบิกจ่าย'],
      ['A1', 'โครงการ ก', '100', '10'],
    ];
    const det = detectHeader(rows);
    expect(det.headerSpan).toBe(2);
    expect(det.mapping.originalBudget).toBe(2);
    expect(det.mapping.disbursedCumulative).toBe(3);
  });
  it('detects disbursement lists', () => {
    const { mapping } = autoMap(['รหัสโครงการ', 'วันที่เบิก', 'เลขที่เอกสาร', 'จำนวนเงิน', 'รายการ']);
    const det = detectHeader([['รหัสโครงการ', 'วันที่เบิก', 'เลขที่เอกสาร', 'จำนวนเงิน', 'รายการ']]);
    expect(mapping.amount).toBe(3);
    expect(det.kind).toBe('DISBURSEMENT_LIST');
  });
  it('matches funding sources and workgroups loosely', () => {
    expect(matchFundingSource('งบกลุ่มจังหวัด', FS)?.code).toBe('PROVGROUP');
    expect(matchFundingSource('จังหวัด', FS)?.code).toBe('PROVINCE');
    expect(matchFundingSource('กรมส่งเสริมฯ', FS)?.code).toBe('DOAE');
    expect(matchWorkgroup('ส่งเสริมและพัฒนาเกษตรกร', WG)?.id).toBe('wg3');
    expect(matchWorkgroup('ส่งเสริม', WG)).toBeNull();
  });
});

describe('planImport — BUDGET_SUMMARY', () => {
  it('creates projects, original allocation and cumulative disbursement; skips total rows', () => {
    const det = detectHeader(SUMMARY_SHEET);
    const parsed = parseRows(SUMMARY_SHEET, det);
    expect(parsed).toHaveLength(2);
    const staged = planImport(parsed, ctx());
    expect(staged.map((s) => s.status)).toEqual(['VALID', 'VALID']);
    expect(staged[0].plan.createProject?.workgroupId).toBe('wg2');
    expect(staged[0].plan.allocations[0]).toMatchObject({ type: 'ORIGINAL', amountSatang: 120000000 });
    expect(staged[0].plan.disbursements[0]).toMatchObject({ status: 'APPROVED', amountSatang: 30000000, adjust: true });
    const sum = summarizeStaged(staged);
    expect(sum.newProjects).toBe(2);
    expect(sum.budgetDelta).toBe(170000000);
  });

  it('is idempotent: re-importing the same figures produces no new money', () => {
    const project: Project = {
      ...meta, id: 'p1', fiscalYear: 2570, fundingSourceId: 'fs1', projectCode: 'P70-001', name: 'โครงการส่งเสริมการผลิตข้าวคุณภาพ',
      workgroupId: 'wg2', ownerName: '', startDate: '', endDate: '', status: 'IN_PROGRESS', physicalProgress: 0,
      quarterTargets: '', description: '', published: true, lastProgressAt: '', idempotencyKey: '', planDocId: '', planNodeSeq: 0,
    };
    const allocations = [{ ...meta, id: 'a1', projectId: 'p1', activityId: '', type: 'ORIGINAL', amountSatang: 120000000 } as Allocation];
    const disbursements = [{ ...meta, id: 'd1', projectId: 'p1', activityId: '', status: 'APPROVED', amountSatang: 30000000, date: '2026-11-01' } as Disbursement];
    const det = detectHeader(SUMMARY_SHEET);
    const staged = planImport(parseRows(SUMMARY_SHEET, det).slice(0, 1), ctx({ projects: [project], allocations, disbursements }));
    expect(staged[0].status).toBe('VALID');
    expect(staged[0].plan.allocations).toHaveLength(0);
    expect(staged[0].plan.disbursements).toHaveLength(0);
  });

  it('warns on budget change and on cumulative decrease; errors on overspend and out-of-scope', () => {
    const project: Project = {
      ...meta, id: 'p1', fiscalYear: 2570, fundingSourceId: 'fs1', projectCode: 'P70-001', name: 'x', workgroupId: 'wg2',
      ownerName: '', startDate: '', endDate: '', status: 'IN_PROGRESS', physicalProgress: 0, quarterTargets: '', description: '', published: true, lastProgressAt: '', idempotencyKey: '', planDocId: '', planNodeSeq: 0,
    };
    const allocations = [{ ...meta, id: 'a1', projectId: 'p1', activityId: '', type: 'ORIGINAL', amountSatang: 100000000 } as Allocation];
    const disbursements = [{ ...meta, id: 'd1', projectId: 'p1', activityId: '', status: 'APPROVED', amountSatang: 50000000, date: '2026-11-01' } as Disbursement];
    const rows = [
      ['รหัสโครงการ', 'ชื่อโครงการ', 'งบประมาณที่ได้รับ', 'เบิกจ่ายสะสม'],
      ['P70-001', 'x', '1,200,000', '400,000'],
    ];
    const s = planImport(parseRows(rows, detectHeader(rows)), ctx({ projects: [project], allocations, disbursements }));
    expect(s[0].status).toBe('WARNING');
    expect(s[0].plan.allocations[0]).toMatchObject({ type: 'TRANSFER_IN', amountSatang: 20000000 });
    expect(s[0].plan.disbursements).toHaveLength(0);

    const over = [['รหัสโครงการ', 'ชื่อโครงการ', 'กลุ่มงาน', 'งบประมาณที่ได้รับ', 'เบิกจ่ายสะสม'], ['N1', 'ใหม่', 'กลุ่มยุทธศาสตร์และสารสนเทศ', '100', '200']];
    expect(planImport(parseRows(over, detectHeader(over)), ctx())[0].status).toBe('ERROR');

    const scoped = planImport(parseRows(over, detectHeader(over)), ctx({ allowedWorkgroupIds: new Set(['wg2']) }));
    expect(scoped[0].messages.join()).toContain('นอกกลุ่มงาน');
  });

  it('auto-generates stable project codes when missing and uses admin default workgroup', () => {
    const rows = [['ชื่อโครงการ', 'งบประมาณ'], ['โครงการไม่มีรหัส', '10000']];
    const s = planImport(parseRows(rows, detectHeader(rows)), ctx({ defaultWorkgroupId: 'wg1' }));
    expect(s[0].status).toBe('WARNING');
    expect(s[0].plan.createProject?.projectCode).toBe(autoProjectCode(2570, 'โครงการไม่มีรหัส'));
    expect(s[0].plan.createProject?.workgroupId).toBe('wg1');
  });

  it('flags duplicate project rows within the same file', () => {
    const rows = [['รหัสโครงการ', 'ชื่อโครงการ', 'กลุ่มงาน', 'งบประมาณ'], ['D1', 'ก', 'กลุ่มยุทธศาสตร์และสารสนเทศ', '1'], ['D1', 'ก', 'กลุ่มยุทธศาสตร์และสารสนเทศ', '1']];
    const s = planImport(parseRows(rows, detectHeader(rows)), ctx());
    expect(s[1].status).toBe('ERROR');
  });
});

describe('planImport — DISBURSEMENT_LIST', () => {
  const project: Project = {
    ...meta, id: 'p1', fiscalYear: 2570, fundingSourceId: 'fs1', projectCode: 'P70-001', name: 'x', workgroupId: 'wg2',
    ownerName: '', startDate: '', endDate: '', status: 'IN_PROGRESS', physicalProgress: 0, quarterTargets: '', description: '', published: true, lastProgressAt: '', idempotencyKey: '', planDocId: '', planNodeSeq: 0,
  };
  const allocations = [{ ...meta, id: 'a1', projectId: 'p1', activityId: '', type: 'ORIGINAL', amountSatang: 100000 } as Allocation];
  const rows = [
    ['รหัสโครงการ', 'วันที่', 'เลขที่เอกสาร', 'จำนวนเงิน'],
    ['P70-001', '1 พ.ย. 2569', 'ฎ-1', '300'],
    ['P70-001', '2 พ.ย. 2569', 'ฎ-2', '800'],
    ['P70-999', '2 พ.ย. 2569', 'ฎ-3', '1'],
    ['P70-001', '', 'ฎ-4', '1'],
  ];
  it('validates, tracks running balance, and skips existing duplicates', () => {
    const disbursements = [{ ...meta, id: 'd0', projectId: 'p1', activityId: '', status: 'APPROVED', amountSatang: 30000, date: '2026-11-01', docNo: 'ฎ-1' } as Disbursement];
    const s = planImport(parseRows(rows, detectHeader(rows)), ctx({ kind: 'DISBURSEMENT_LIST', projects: [project], allocations, disbursements }));
    expect(s[0].status).toBe('WARNING'); // duplicate → skip
    expect(s[0].plan.disbursements).toHaveLength(0);
    expect(s[1].status).toBe('ERROR'); // 300 + 800 > 1000
    expect(s[2].status).toBe('ERROR'); // unknown project
    expect(s[3].status).toBe('ERROR'); // missing date
  });
});

describe('cover letter OCR parsing', () => {
  const text = `ที่ กษ ๑๐๑๒.๑๒/๒๓๔                 สำนักงานเกษตรจังหวัดกำแพงเพชร
                                          ๑๕ มกราคม ๒๕๗๐
เรื่อง ขอส่งเอกสารการเบิกจ่ายเงินโครงการส่งเสริมการผลิตข้าวคุณภาพ
เรียน คลังจังหวัดกำแพงเพชร
อ้างถึง หนังสือ ลงวันที่ 2 ธันวาคม 2569
ตามโครงการ P70-001 ขอเบิกจ่ายเงิน จำนวนเงิน 12,500.00 บาท (หนึ่งหมื่นสองพันห้าร้อยบาทถ้วน)`;
  it('extracts doc no, date (not the referenced one), amount, subject, project', () => {
    const r = parseCoverLetter(text, ['P70-001', 'P70-002']);
    expect(r.docNo?.value).toBe('กษ 1012.12/234');
    expect(r.date?.value).toBe('2027-01-15');
    expect(r.amount?.value).toBe(1250000);
    expect(r.amount?.confidence).toBeGreaterThan(0.9);
    expect(r.subject?.value).toContain('ขอส่งเอกสารการเบิกจ่าย');
    expect(r.projectCode?.value).toBe('P70-001');
    expect(r.warnings).toHaveLength(0);
  });
  it('lowers confidence and warns when numeric and word amounts disagree', () => {
    const r = parseCoverLetter('ที่ กษ 1012/1\nจำนวนเงิน 12,000 บาท (หนึ่งหมื่นสองพันห้าร้อยบาทถ้วน)');
    expect(r.amount?.confidence).toBeLessThan(0.5);
    expect(r.warnings.join()).toContain('ไม่ตรงกัน');
  });
  it('handles empty OCR', () => {
    const r = parseCoverLetter('');
    expect(r.amount).toBeNull();
    expect(r.overallConfidence).toBe(0);
  });
});
