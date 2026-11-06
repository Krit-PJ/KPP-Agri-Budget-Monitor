import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ApiEnvelope, AssignResult, Lookups, PlanDetail, PlanDoc, PlanDocSummary, PlanPreview, ProjectDetail, ProjectListItem } from '@kpp/domain';
import { createMemoryEnv, type MemoryEnv } from '../src/memory';
import { handle } from '../src/core/router';
import { setSuperAdmin } from '../src/core/auth';
import { seedMasterData } from '../src/core/setup';
import { SYSTEM_USER, type Ctx } from '../src/core/context';

const CSV = readFileSync(new URL('../../../data/plans/2570-DOAE-r1-kamphaengphet.csv', import.meta.url), 'utf8');
let env: MemoryEnv;
let superToken: string;
let lookups: Lookups;

function call<T>(action: string, body: Record<string, unknown> = {}, token?: string): ApiEnvelope<T> {
  return JSON.parse(JSON.stringify(handle(env, { action, token, device: 't', ...body }))) as ApiEnvelope<T>;
}
function ok<T>(action: string, body: Record<string, unknown> = {}, token?: string): T {
  const r = call<T>(action, body, token);
  if (!r.ok) throw new Error(`${action}: ${r.error?.code} ${r.error?.message}`);
  return r.data as T;
}
const wg = (c: string) => lookups.workgroups.find((g) => g.code === c)!.id;
const fs = (c: string) => lookups.fundingSources.find((f) => f.code === c)!.id;

function adminFor(phone: string, group: string): string {
  ok('admin.saveUser', { phone, fullName: 'ผู้ทดสอบ ระบบ', position: 'นักวิชาการ', workgroupId: wg(group), affiliation: 'x', role: 'admin' }, superToken);
  return ok<{ token: string }>('auth.login', { phone }).token;
}

function importPlan(): { doc: PlanDoc; detail: PlanDetail } {
  const pv = ok<PlanPreview>('plans.preview', { fileName: 'คง2-2570.csv', base64: Buffer.from(CSV).toString('base64') }, superToken);
  const doc = ok<PlanDoc>('plans.commit', {
    fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, title: 'งบกรมฯ ปี 2570 ครั้งที่ 1', docNo: 'กษ 1004/ว 1594',
    table: pv.table, sourceFileId: pv.sourceFileId, sourceFileName: pv.sourceFileName, acceptWarnings: true,
  }, superToken);
  return { doc, detail: ok<PlanDetail>('plans.get', { id: doc.id }, superToken) };
}
const leaf = (d: PlanDetail, startsWith: string) => d.items.find((i) => i.isLeaf && i.name.startsWith(startsWith))!;

beforeEach(() => {
  env = createMemoryEnv(new Date('2026-11-06T05:00:00Z'));
  const ctx: Ctx = { env, requestId: 't', user: SYSTEM_USER, device: 't' };
  seedMasterData(ctx);
  setSuperAdmin(ctx, 'Krit', 'Correct-Horse-9');
  superToken = ok<{ token: string }>('auth.loginSuper', { username: 'Krit', password: 'Correct-Horse-9' }).token;
  lookups = ok<Lookups>('public.lookups');
});

describe('plan import', () => {
  it('previews, commits and stores the full tree with verified totals', () => {
    const pv = ok<PlanPreview>('plans.preview', { fileName: 'p.csv', base64: Buffer.from(CSV).toString('base64') }, superToken);
    expect(pv.parsed.computedTotal).toBe(242_986_200);
    expect(pv.parsed.issues.filter((i) => i.level === 'ERROR')).toHaveLength(0);
    const { doc, detail } = importPlan();
    expect(doc).toMatchObject({ fiscalYear: 2570, totalSatang: 242_986_200, leafCount: 87, status: 'ACTIVE' });
    expect(detail.items).toHaveLength(pv.parsed.nodes.length);
    expect(ok<PlanDocSummary[]>('plans.list', { fiscalYear: 2570 }, superToken)[0].assignedCount).toBe(0);
  });

  it('only Super/Mini Super Admin can import, and documents with errors are rejected', () => {
    const t = adminFor('0811111111', 'PROD');
    expect(call('plans.preview', { fileName: 'p.csv', base64: Buffer.from(CSV).toString('base64') }, t).error?.code).toBe('FORBIDDEN_SCOPE');
    const bad = [['รายการ', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ'], ['1 โครงการ', '', '', '100'], ['1.1 กิจกรรม', 'ราย', '1', '90']];
    const r = call('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), table: bad, acceptWarnings: true }, superToken);
    expect(r.error?.code).toBe('VALIDATION_FAILED');
  });
});

describe('selecting leaf activities per workgroup', () => {
  it('lets two groups share a main activity, but never the same leaf', () => {
    const { detail } = importPlan();
    const prod = adminFor('0822222222', 'PROD');
    const farmer = adminFor('0833333333', 'FARMER');
    // กิจกรรมหลัก "1.1 กิจกรรมสร้างความเข้มแข็งกลุ่มการผลิตด้านการเกษตร" — สองกลุ่มเลือกคนละรายการย่อย
    const smartGroup = detail.items.filter((i) => i.isLeaf && i.name.includes('Smart Group') && i.name.includes('ส่งเสริมอาชีพ'));
    const youth = detail.items.filter((i) => i.isLeaf && i.name.includes('ยุวเกษตรกร'));
    expect(smartGroup[0].activitySeq).toBe(youth[0].activitySeq);
    expect(ok<AssignResult>('plans.assign', { itemIds: smartGroup.map((i) => i.id), workgroupId: wg('PROD') }, prod).assigned).toBe(2);
    expect(ok<AssignResult>('plans.assign', { itemIds: youth.map((i) => i.id), workgroupId: wg('FARMER') }, farmer).assigned).toBe(youth.length);
    // ซ้ำ: กลุ่มอื่นเลือกรายการเดิมไม่ได้ (Super Admin ก็ไม่ได้ — ต้องยกเลิกก่อน)
    const clash = ok<AssignResult>('plans.assign', { itemIds: [smartGroup[0].id], workgroupId: wg('FARMER') }, superToken);
    expect(clash.assigned).toBe(0);
    expect(clash.skipped[0].reason).toContain('กลุ่มงานอื่นเลือก');
    // กดซ้ำโดยกลุ่มเดิม = ไม่มีผล ไม่สร้างงบซ้ำ
    expect(ok<AssignResult>('plans.assign', { itemIds: [smartGroup[0].id], workgroupId: wg('PROD') }, prod).assigned).toBe(0);
    // แต่ละกลุ่มได้โครงการของตนเอง (ชื่อเดียวกับโครงการในแผน) พร้อมงบตามรายการที่เลือก
    const prodProjects = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, prod);
    const farmerProjects = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, farmer);
    expect(prodProjects).toHaveLength(1);
    expect(farmerProjects).toHaveLength(1);
    expect(prodProjects[0].name).toBe(farmerProjects[0].name);
    expect(prodProjects[0].budget.currentBudget).toBe(11_000_00);
    expect(farmerProjects[0].budget.currentBudget).toBe(youth.reduce((a, i) => a + i.amountSatang, 0));
    const pd = ok<ProjectDetail>('projects.get', { id: prodProjects[0].id }, prod);
    expect(pd.activities.map((a) => a.unit)).toEqual(['ราย', 'กลุ่ม']);
    expect(pd.activities[0].targetQty).toBe(15);
  });

  it('enforces scope and leaf-only selection', () => {
    const { detail } = importPlan();
    const prod = adminFor('0844444444', 'PROD');
    const anyLeaf = detail.items.find((i) => i.isLeaf)!;
    expect(call('plans.assign', { itemIds: [anyLeaf.id], workgroupId: wg('FARMER') }, prod).error?.code).toBe('FORBIDDEN_SCOPE');
    const parent = detail.items.find((i) => !i.isLeaf && i.kind === 'ACTIVITY')!;
    expect(ok<AssignResult>('plans.assign', { itemIds: [parent.id], workgroupId: wg('PROD') }, prod).skipped[0].reason).toContain('กิจกรรมย่อยสุดท้าย');
  });

  it('unassigns cleanly, but not after money has been spent; plan cannot be replaced once used', () => {
    const { detail } = importPlan();
    const prod = adminFor('0855555555', 'PROD');
    const gap = leaf(detail, 'ถ่ายทอดความรู้ให้เกษตรกรเพื่อเข้าสู่ระบบมาตรฐาน GAP');
    const dw = leaf(detail, 'เวทีแลกเปลี่ยนเรียนรู้ระดับอำเภอ');
    ok('plans.assign', { itemIds: [gap.id, dw.id], workgroupId: wg('PROD') }, prod);
    const after = ok<PlanDetail>('plans.get', { id: detail.doc.id }, prod);
    const gapNow = after.items.find((i) => i.id === gap.id)!;
    ok('disbursements.create', { projectId: gapNow.projectId, activityId: gapNow.activityId, status: 'APPROVED', amountSatang: 5_000_00, date: '2026-11-05', idempotencyKey: 'd1' }, prod);
    const r = ok<{ unassigned: number; skipped: Array<{ reason: string }> }>('plans.unassign', { itemIds: [gap.id, dw.id] }, prod);
    expect(r.unassigned).toBe(1);
    expect(r.skipped[0].reason).toContain('เบิกจ่าย');
    // โครงการของ DW ถูกลบ (soft) เพราะไม่มีกิจกรรมเหลือ; โครงการ GAP ยังอยู่
    const projects = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, prod);
    expect(projects.map((p) => p.name)).toEqual([expect.stringContaining('แปลงใหญ่')]);
    // นำเข้าแผนเดิมซ้ำ (ปี/แหล่งงบ/งวดเดียวกัน) ไม่ได้เมื่อมีการเลือกแล้ว
    const again = call('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, table: [['รายการ', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ'], ['1 โครงการ', 'ราย', '1', '1']], acceptWarnings: true }, superToken);
    expect(again.error?.message).toContain('เลือกรายการแล้ว');
    // เลือกใหม่หลังยกเลิกได้ และไม่ชนกับ idempotency เดิม
    expect(ok<AssignResult>('plans.assign', { itemIds: [dw.id], workgroupId: wg('PROD') }, prod).assigned).toBe(1);
  });

  it('dashboard totals equal the plan once every leaf is assigned', () => {
    const { detail } = importPlan();
    const leaves = detail.items.filter((i) => i.isLeaf);
    ok('plans.assign', { itemIds: leaves.map((i) => i.id), workgroupId: wg('STRAT') }, superToken);
    const s = ok<{ totals: { currentBudget: number } }>('public.summary', { fiscalYear: 2570 });
    expect(s.totals.currentBudget).toBe(242_986_200);
    expect(ok<PlanDocSummary[]>('plans.list', { fiscalYear: 2570 }, superToken)[0]).toMatchObject({ assignedCount: 87, assignedSatang: 242_986_200 });
  });
});
