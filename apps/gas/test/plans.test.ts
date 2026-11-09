import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { fiscalMonthIndex, formatMoneyPlain, normalizePlanTable, readXlsx, todayBangkok, type ApiEnvelope, type AssignResult, type AuditLog, type Lookups, type PlanCheck, type PlanDetail, type PlanDoc, type PlanDocSummary, type PlanPreview, type ProjectDetail, type ProjectListItem, type MemoData, type MemoRecord, type MyProfile, type WorkgroupMemoSettings } from '@kpp/domain';
import { createMemoryEnv, type MemoryEnv } from '../src/memory';
import { handle } from '../src/core/router';
import { setSuperAdmin } from '../src/core/auth';
import { seedMasterData } from '../src/core/setup';
import { SYSTEM_USER, type Ctx } from '../src/core/context';

const XLSX_BYTES = readFileSync(new URL('../../../data/plans/2570-DOAE-r1-kamphaengphet.xlsx', import.meta.url));
const B64 = XLSX_BYTES.toString('base64');
/** สิ่งที่หน้าเว็บทำ: อ่าน Excel ในเบราว์เซอร์ → ตารางมาตรฐาน */
const NORMALIZED = normalizePlanTable(readXlsx(new Uint8Array(XLSX_BYTES))[0].rows);
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

function importPlan(table = NORMALIZED.table): { doc: PlanDoc; detail: PlanDetail } {
  const doc = ok<PlanDoc>('plans.commit', {
    fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, title: 'งบกรมฯ ปี 2570 ครั้งที่ 1', docNo: 'กษ 1004/ว 1594',
    table, originalTable: NORMALIZED.table, fileName: 'คง2-2570.xlsx', base64: B64, acceptWarnings: true,
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
    const pv = ok<PlanPreview>('plans.preview', { fileName: 'p.xlsx', base64: B64 }, superToken);
    expect(pv.parsed.computedTotal).toBe(242_986_200);
    expect(pv.meta).toMatchObject({ fiscalYear: 2570, round: 1, fundCode: 'DOAE' });
    expect(pv.table).toEqual(NORMALIZED.table);
    expect(pv.parsed.issues.filter((i) => i.level === 'ERROR')).toHaveLength(0);
    const { doc, detail } = importPlan();
    expect(doc).toMatchObject({ fiscalYear: 2570, totalSatang: 242_986_200, leafCount: 87, status: 'ACTIVE' });
    expect(detail.items).toHaveLength(pv.parsed.nodes.length);
    expect(ok<PlanDocSummary[]>('plans.list', { fiscalYear: 2570 }, superToken)[0].assignedCount).toBe(0);
  });

  it('only Super/Mini Super Admin can import, and documents with errors are rejected', () => {
    const t = adminFor('0811111111', 'PROD');
    expect(call('plans.preview', { fileName: 'p.xlsx', base64: B64 }, t).error?.code).toBe('FORBIDDEN_SCOPE');
    const bad = [['รายการ', 'หน่วยนับ', 'ปริมาณงาน', 'งบประมาณ'], ['1 โครงการ', '', '', '100'], ['1.1 กิจกรรม', 'ราย', '1', '90']];
    const r = call('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), table: bad, acceptWarnings: true }, superToken);
    expect(r.error?.code).toBe('VALIDATION_FAILED');
  });
});

describe('duplicates, replacement and edit history', () => {
  it('blocks the same file twice and asks before replacing a plan of the same year/fund/round', () => {
    const { doc } = importPlan();
    const sha = createHash('sha256').update(XLSX_BYTES).digest('hex');
    expect(doc.sourceSha256).toBe(sha);
    const chk = ok<PlanCheck>('plans.check', { sha256: sha, fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1 }, superToken);
    expect(chk).toMatchObject({ duplicateOf: { id: doc.id }, existing: { id: doc.id, assignedCount: 0 }, nextRound: 2 });
    const again = call('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, table: NORMALIZED.table, fileName: 'x.xlsx', base64: B64, acceptWarnings: true }, superToken);
    expect(again.error?.code).toBe('DUPLICATE_IMPORT');
    // ตารางเดียวกันแต่ไม่แนบไฟล์ (เช่น จาก Google Sheets): ต้องเลือกแทนที่
    const noFile = call('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, table: NORMALIZED.table, acceptWarnings: true }, superToken);
    expect(noFile.error?.code).toBe('IMPORT_REVIEW_REQUIRED');
    const replaced = ok<PlanDoc>('plans.commit', { fiscalYear: 2570, fundingSourceId: fs('DOAE'), round: 1, table: NORMALIZED.table, acceptWarnings: true, replaceExisting: true }, superToken);
    const list = ok<PlanDocSummary[]>('plans.list', { fiscalYear: 2570 }, superToken);
    expect(list.map((d) => d.id)).toEqual([replaced.id]);
  });

  it('records every cell changed from the original document', () => {
    const edited = NORMALIZED.table.map((r) => [...r]);
    const row = edited.findIndex((r) => r[0].startsWith('(2.1) จัดกระบวนการเรียนรู้'));
    edited[row][0] = edited[row][0].replace('(2.1)', '(1.1)');
    const { doc } = importPlan(edited);
    expect(doc).toMatchObject({ editCount: 1, note: 'แก้จากต้นฉบับ 1 ช่อง' });
    const log = ok<AuditLog[]>('admin.audit', { entityId: doc.id }, superToken).find((a) => a.action === 'plan.import')!;
    expect(log.before).toContain('(2.1) จัดกระบวนการเรียนรู้');
    expect(log.before).toContain('(1.1) จัดกระบวนการเรียนรู้');
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
    const prodProjects = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, prod).filter((p) => p.canEdit);
    const farmerProjects = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, farmer).filter((p) => p.canEdit);
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

  it('hides a workgroup from public pages without affecting staff work', () => {
    const { detail } = importPlan();
    const leaves = detail.items.filter((i) => i.isLeaf);
    ok('plans.assign', { itemIds: leaves.slice(0, 10).map((i) => i.id), workgroupId: wg('STRAT') }, superToken);
    ok('plans.assign', { itemIds: leaves.slice(10, 20).map((i) => i.id), workgroupId: wg('PROTECT') }, superToken);
    const before = ok<{ totals: { currentBudget: number }; byWorkgroup: Array<{ key: string }> }>('public.summary', { fiscalYear: 2570 });
    expect(before.byWorkgroup.map((g) => g.key).sort()).toEqual([wg('PROTECT'), wg('STRAT')].sort());
    // เจ้าหน้าที่ทั่วไปปิดไม่ได้
    const staff = adminFor('0877777777', 'STRAT');
    expect(call('admin.setWorkgroupPublic', { id: wg('STRAT'), visible: false }, staff).error?.code).toBe('FORBIDDEN_SCOPE');
    expect(ok('admin.setWorkgroupPublic', { id: wg('STRAT'), visible: false }, superToken)).toEqual({ id: wg('STRAT'), hidePublic: true });
    const after = ok<{ totals: { currentBudget: number }; byWorkgroup: Array<{ key: string }> }>('public.summary', { fiscalYear: 2570 });
    expect(after.byWorkgroup.map((g) => g.key)).toEqual([wg('PROTECT')]);
    expect(after.totals.currentBudget).toBeLessThan(before.totals.currentBudget);
    expect(ok<Array<{ workgroupId: string }>>('public.projects', { fiscalYear: 2570 }).every((p) => p.workgroupId === wg('PROTECT'))).toBe(true);
    expect(ok<{ rows: Array<{ workgroupId: string }> }>('public.report', { fiscalYear: 2570 }).rows.every((r) => r.workgroupId === wg('PROTECT'))).toBe(true);
    expect(ok<{ workgroups: Array<{ id: string; hidePublic?: boolean }> }>('public.lookups').workgroups.find((g) => g.id === wg('STRAT'))?.hidePublic).toBe(true);
    // งานเจ้าหน้าที่ของกลุ่มที่ปิดยังเห็นครบ
    expect(ok<Array<{ workgroupId: string; canEdit: boolean }>>('disbursements.entryList', { fiscalYear: 2570 }, staff).filter((x) => x.canEdit).length).toBe(10);
    // เปิดกลับ
    ok('admin.setWorkgroupPublic', { id: wg('STRAT'), visible: true }, superToken);
    expect(ok<{ totals: { currentBudget: number } }>('public.summary', { fiscalYear: 2570 }).totals.currentBudget).toBe(before.totals.currentBudget);
  });
});

describe('batch (หลายคำขออ่านในคำขอเดียว)', () => {
  it('runs read actions with one token, per-call errors, and rejects writes', () => {
    importPlan();
    const out = ok<Array<ApiEnvelope<unknown>>>('batch', {
      calls: [{ action: 'public.lookups' }, { action: 'plans.list', fiscalYear: 2570 }, { action: 'plans.get', id: 'nope' }, { action: 'plans.assign', itemIds: [], workgroupId: '' }],
    }, superToken);
    expect(out.map((e) => e.ok)).toEqual([true, true, false, false]);
    expect((out[1].data as PlanDocSummary[])[0].leafCount).toBe(87);
    expect(out[2].error?.code).toBe('NOT_FOUND');
    expect(out[3].error?.message).toContain('อ่านข้อมูล');
    // ไม่มี token: คำขอสาธารณะผ่าน คำขอของเจ้าหน้าที่ไม่ผ่าน
    const anon = ok<Array<ApiEnvelope<unknown>>>('batch', { calls: [{ action: 'public.summary', fiscalYear: 2570 }, { action: 'plans.list' }] });
    expect(anon.map((e) => e.error?.code ?? 'ok')).toEqual(['ok', 'AUTH_REQUIRED']);
    expect(call('batch', { calls: [] }).error?.code).toBe('VALIDATION_FAILED');
  });
});

describe('หน่วยดำเนินการ (ADR-006)', () => {
  const unit = (code: string) => lookups.units.find((u) => u.code === code)!.id;
  const districts = () => lookups.units.filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
  function assignedLeaf(name: string, group = 'PROD') {
    const { detail } = importPlan();
    const leaf = detail.items.find((i) => i.isLeaf && i.name.includes(name))!;
    ok<AssignResult>('plans.assign', { itemIds: [leaf.id], workgroupId: wg(group) }, superToken);
    const d = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken);
    const item = d.items.find((i) => i.id === leaf.id)!;
    return { detail: d, item, state: d.activities[item.activityId] };
  }

  it('seeds the province office + 11 districts and retires the old "สำนักงานเกษตรอำเภอ" workgroup', () => {
    expect(lookups.units.map((u) => u.code)).toEqual(['6200', ...Array.from({ length: 11 }, (_, i) => `62${String(i + 1).padStart(2, '0')}`)]);
    expect(lookups.units[0]).toMatchObject({ kind: 'PROVINCE', shortName: 'สนง.เกษตรจังหวัด' });
    expect(lookups.units.find((u) => u.code === '6211')!.name).toBe('สำนักงานเกษตรอำเภอโกสัมพีนคร');
    expect(lookups.workgroups.some((g) => g.code === 'DIST')).toBe(false);
  });

  it('splits an activity budget across districts, records disbursements per district and shows them on the dashboard', () => {
    const { item, state } = assignedLeaf('Smart Group');
    expect(state).toMatchObject({ budget: item.amountSatang, units: [], hasDisbursement: false });
    // แบ่งไม่ครบ → ไม่ได้
    const ids = districts().slice(0, 3);
    const bad = call('activities.setUnits', { activityId: item.activityId, units: ids.map((unitId) => ({ unitId, budgetSatang: 100 })) }, superToken);
    expect(bad.error?.message).toContain('ไม่เท่างบกิจกรรม');
    const share = [Math.floor(item.amountSatang / 3), Math.floor(item.amountSatang / 3)];
    share.push(item.amountSatang - share[0] - share[1]);
    const st = ok<PlanDetail['activities'][string]>('activities.setUnits', {
      activityId: item.activityId, units: ids.map((unitId, i) => ({ unitId, budgetSatang: share[i], targetQty: [5, 5, item.quantity - 10][i] })),
      planQuarters: [item.amountSatang, 0, 0, 0],
    }, superToken);
    expect(st.units).toHaveLength(3);
    expect(st.planQuarters).toBe(`${item.amountSatang},0,0,0`);
    // เบิกจ่ายในอำเภอที่ไม่ได้รับงบ → ไม่ได้; อำเภอที่ได้รับงบ → ได้
    const base = { projectId: item.projectId, activityId: item.activityId, status: 'APPROVED', amountSatang: 1_000_00, date: '2025-11-01' };
    expect(call('disbursements.create', { ...base, unitId: districts()[5], idempotencyKey: 'u1' }, superToken).error?.message).toContain('ไม่ได้รับงบ');
    ok('disbursements.create', { ...base, unitId: ids[1], idempotencyKey: 'u2' }, superToken);
    // เอาอำเภอที่มีเบิกจ่ายออก → ไม่ได้
    const drop = call('activities.setUnits', { activityId: item.activityId, units: [{ unitId: ids[0], budgetSatang: item.amountSatang, targetQty: item.quantity }] }, superToken);
    expect(drop.error?.message).toContain('มีรายการเบิกจ่ายแล้ว');
    // dashboard: กลุ่มงาน → รายอำเภอ
    const sum = ok<{ byWorkgroup: Array<{ key: string; plan: number; units: Array<{ key: string; budget: { currentBudget: number; disbursed: number } }> }>; activitiesWithoutUnits: number }>('public.summary', { fiscalYear: 2570 });
    const prod = sum.byWorkgroup.find((g) => g.key === wg('PROD'))!;
    expect(prod.units.map((u) => u.key)).toEqual(ids);
    expect(prod.units[1].budget).toMatchObject({ currentBudget: share[1], disbursed: 1_000_00 });
    // แผน ณ เดือนนี้ = งบ × เป้าหมายการเบิกจ่ายของปี (พ.ย. = 20% ตามค่าเริ่มต้น 30/55/80/100) — แผนรายไตรมาสของกิจกรรมไม่เปลี่ยนเป้าบนแถบ
    const m = fiscalMonthIndex(todayBangkok(env.now()));
    expect(m).toBe(2);
    expect(Math.abs(prod.plan - Math.round(item.amountSatang * 0.2))).toBeLessThanOrEqual(3);
    expect(sum.activitiesWithoutUnits).toBe(0);
    // แผนสะสมรายไตรมาส = เป้าของปี 30/55/80/100 (ปัดเศษรายหน่วย ±1 สตางค์)
    const pq = (prod as unknown as { planQ: number[] }).planQ;
    expect(pq).toHaveLength(4);
    [30, 55, 80, 100].forEach((p, i) => expect(Math.abs(pq[i] - (item.amountSatang * p) / 100)).toBeLessThanOrEqual(3));
    // อำเภอ → กลุ่มงาน
    const byUnit = (sum as unknown as { byUnit: Array<{ key: string; planQ: number[]; groups: Array<{ key: string; budget: { currentBudget: number } }> }> }).byUnit;
    const u1 = byUnit.find((u) => u.key === ids[1])!;
    expect(u1.groups.map((g) => g.key)).toEqual([wg('PROD')]);
    expect(u1.groups[0].budget.currentBudget).toBe(share[1]);
    expect(u1.planQ[0]).toBe(Math.round(share[1] * 0.3));
    // รายงาน: 1 แถวต่อ กิจกรรม × หน่วย
    const rep = ok<{ rows: Array<{ unitId: string; budget: number; disbursed: number }> }>('reports.data', { fiscalYear: 2570 }, superToken);
    expect(rep.rows.map((r) => r.unitId)).toEqual(ids);
    expect(rep.rows.reduce((a, r) => a + r.budget, 0)).toBe(item.amountSatang);
  });

  it('requires district targets to add up to the activity target, and district budgets to cover what was already spent', () => {
    const { item } = assignedLeaf('Smart Group');
    const ids = districts().slice(0, 2);
    const half = [Math.floor(item.amountSatang / 2), item.amountSatang - Math.floor(item.amountSatang / 2)];
    const wrongQty = call('activities.setUnits', { activityId: item.activityId, units: ids.map((unitId, i) => ({ unitId, budgetSatang: half[i], targetQty: 1 })) }, superToken);
    expect(wrongQty.error?.message).toContain('ไม่เท่าเป้าหมายทั้งสิ้น');
    const q = [Math.floor(item.quantity / 2), item.quantity - Math.floor(item.quantity / 2)];
    ok('activities.setUnits', { activityId: item.activityId, units: ids.map((unitId, i) => ({ unitId, budgetSatang: half[i], targetQty: q[i] })) }, superToken);
    ok('disbursements.create', { projectId: item.projectId, activityId: item.activityId, unitId: ids[0], status: 'PAID', amountSatang: 2_000_00, date: '2025-11-01', idempotencyKey: 'f1' }, superToken);
    // ลดงบอำเภอแรกให้ต่ำกว่ายอดเบิกแล้ว → ไม่ได้
    const tooLow = call('activities.setUnits', { activityId: item.activityId, units: [{ unitId: ids[0], budgetSatang: 1_000_00, targetQty: q[0] }, { unitId: ids[1], budgetSatang: item.amountSatang - 1_000_00, targetQty: q[1] }] }, superToken);
    expect(tooLow.error?.message).toContain('ต่ำกว่ายอดที่เบิกจ่ายแล้ว');
  });

  it('keeps the admin section out of activity ownership', () => {
    const admin = lookups.workgroups.find((g) => g.code === 'ADMIN')!;
    expect(admin.noActivities).toBe(true);
    const { detail } = importPlan();
    const leaf = detail.items.find((i) => i.isLeaf)!;
    expect(call('plans.assign', { itemIds: [leaf.id], workgroupId: admin.id }, superToken).error?.message).toContain('ไม่รับผิดชอบกิจกรรม');
  });

  it('unsplit budget and unit-less disbursements belong to the province office', () => {
    const { item } = assignedLeaf('Smart Group');
    ok('disbursements.create', { projectId: item.projectId, activityId: item.activityId, status: 'PAID', amountSatang: 500_00, date: '2025-11-02', idempotencyKey: 'p1' }, superToken);
    const rep = ok<{ rows: Array<{ unitId: string; budget: number; disbursed: number }> }>('reports.data', { fiscalYear: 2570 }, superToken);
    expect(rep.rows).toEqual([expect.objectContaining({ unitId: unit('6200'), budget: item.amountSatang, disbursed: 500_00 })]);
  });

  it('bulk-assigns all 11 districts with an equal split (remainder to the first)', () => {
    const { detail } = importPlan();
    const leaves = detail.items.filter((i) => i.isLeaf).slice(0, 4);
    ok<AssignResult>('plans.assign', { itemIds: leaves.map((i) => i.id), workgroupId: wg('FARMER') }, superToken);
    const d = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken);
    const actIds = leaves.map((l) => d.items.find((i) => i.id === l.id)!.activityId);
    const r = ok<{ updated: number }>('activities.setUnitsBulk', { activityIds: actIds, unitIds: districts() }, superToken);
    expect(r.updated).toBe(4);
    const after = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken);
    for (const id of actIds) {
      const s = after.activities[id];
      expect(s.units).toHaveLength(11);
      expect(s.units.reduce((a, u) => a + u.budgetSatang, 0)).toBe(s.budget);
    }
  });

  it('moves an activity to another group (keeping its districts) while it has no disbursements', () => {
    const { detail, item } = assignedLeaf('Smart Group');
    ok('activities.setUnitsBulk', { activityIds: [item.activityId], unitIds: districts().slice(0, 2) }, superToken);
    const prod = adminFor('0844444444', 'PROD');
    // admin กลุ่มเดียวย้ายไปกลุ่มที่ตนไม่มีสิทธิ์ไม่ได้
    expect(call('plans.assign', { itemIds: [item.id], workgroupId: wg('FARMER'), reassign: true }, prod).error?.code).toBe('FORBIDDEN_SCOPE');
    const moved = ok<AssignResult>('plans.assign', { itemIds: [item.id], workgroupId: wg('FARMER'), reassign: true }, superToken);
    expect(moved.assigned).toBe(1);
    const d = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken);
    const now = d.items.find((i) => i.id === item.id)!;
    expect(now.workgroupId).toBe(wg('FARMER'));
    expect(d.activities[now.activityId].units.map((u) => u.unitId)).toEqual(districts().slice(0, 2));
    expect(ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, prod).filter((p) => p.workgroupId === wg('PROD'))).toHaveLength(0); // โครงการเดิมของ PROD ว่างแล้วจึงถูกลบ
    // มีเบิกจ่ายแล้ว → ย้ายไม่ได้
    ok('disbursements.create', { projectId: now.projectId, activityId: now.activityId, unitId: districts()[0], status: 'COMMITTED', amountSatang: 100_00, date: '2025-11-01', idempotencyKey: 'm1' }, superToken);
    const blocked = ok<AssignResult>('plans.assign', { itemIds: [item.id], workgroupId: wg('PROD'), reassign: true }, superToken);
    expect(blocked.skipped[0].reason).toContain('มีรายการเบิกจ่ายแล้ว');
  });
});

describe('เป้าการเบิกจ่าย ตัวนับผู้เข้าชม และรายงานสาธารณะ', () => {
  function assigned(name: string, group = 'PROD') {
    const { detail } = importPlan();
    const lf = detail.items.find((i) => i.isLeaf && i.name.includes(name))!;
    ok<AssignResult>('plans.assign', { itemIds: [lf.id], workgroupId: wg(group) }, superToken);
    const d = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken);
    return d.items.find((i) => i.id === lf.id)!;
  }
  type Sum = { monthly: { targetPct: number[] }; targets: { spend: { mode: string } }; byWorkgroup: Array<{ key: string; plan: number; planQ: number[] }> };

  it('the yearly target (quarterly or 12 free monthly values, ending at 100%) is exactly what every bar shows', () => {
    const t0 = ok<{ curve: number[] }>('targets.get', { fiscalYear: 2570 }, superToken);
    expect([t0.curve[2], t0.curve[11]]).toEqual([30, 100]);
    const months = [5, 12, 30, 35, 40, 55, 60, 70, 85, 95, 100, 100];
    const staff = adminFor('0811111111', 'PROD');
    expect(call('targets.save', { fiscalYear: 2570, target: { mode: 'monthly', months, quarters: [] } }, staff).error?.code).toBe('FORBIDDEN_SCOPE');
    expect(call('targets.save', { fiscalYear: 2570, target: { mode: 'quarter', quarters: [40, 30, 80, 100], months: [] } }, superToken).error?.message).toContain('ต้องไม่น้อยกว่า');
    expect(call('targets.save', { fiscalYear: 2570, target: { mode: 'monthly', months: [...months.slice(0, 10), 96, 99], quarters: [] } }, superToken).error?.message).toContain('100%');
    const saved = ok<{ curve: number[] }>('targets.save', { fiscalYear: 2570, target: { mode: 'monthly', months, quarters: [] } }, superToken);
    expect(saved.curve).toEqual(months);
    const item = assigned('Smart Group'); // กิจกรรมอบรม — เดิมถูกดึงเป็น มิ.ย. ตอนนี้ใช้เป้าที่ตั้งเท่านั้น
    const sum = ok<Sum & { targets: { fullMonth: number; annualPct: number } }>('public.summary', { fiscalYear: 2570 });
    expect(sum.targets.spend.mode).toBe('monthly');
    expect(sum.targets).toMatchObject({ fullMonth: 11, annualPct: 100 });
    expect(sum.monthly.targetPct).toEqual(months);
    const g = sum.byWorkgroup.find((x) => x.key === wg('PROD'))!;
    expect(g.plan).toBe(Math.round(item.amountSatang * 0.12)); // พ.ย. = 12%
    expect(g.planQ).toEqual([30, 55, 85, 100].map((p) => Math.round((item.amountSatang * p) / 100)));
  });

  it('an activity due month is stored as a reminder and does not change the plan on the bars', () => {
    const item = assigned('Smart Group');
    const planNow = () => ok<Sum>('public.summary', { fiscalYear: 2570 }).byWorkgroup.find((g) => g.key === wg('PROD'))!.plan;
    expect(planNow()).toBe(Math.round(item.amountSatang * 0.2)); // เป้าเริ่มต้น พ.ย. = 20%
    const st = ok<{ dueMonth: number }>('activities.setDue', { activityId: item.activityId, dueMonth: 3 }, superToken);
    expect(st.dueMonth).toBe(3);
    expect(planNow()).toBe(Math.round(item.amountSatang * 0.2));
    expect(call('activities.setDue', { activityId: item.activityId, dueMonth: 13 }, superToken).ok).toBe(false);
    // กำหนดเป็นวันที่ (ปฏิทิน) — เดือนคำนวณให้เอง; ต้องอยู่ในปีงบ
    const byDate = ok<{ dueMonth: number; dueDate: string }>('activities.setDue', { activityId: item.activityId, dueDate: '2027-06-15' }, superToken);
    expect(byDate).toMatchObject({ dueMonth: 9, dueDate: '2027-06-15' });
    expect(call('activities.setDue', { activityId: item.activityId, dueDate: '2027-10-01' }, superToken).error?.message).toContain('ปีงบประมาณ');
    expect(call('activities.setDue', { activityId: item.activityId, dueDate: '2027-02-30' }, superToken).ok).toBe(false);
    expect(call('activities.setDue', { activityId: item.activityId, dueDate: '2027-13-45' }, superToken).error?.code).toBe('VALIDATION_FAILED');
    const cleared = ok<{ dueMonth: number; dueDate: string }>('activities.setDue', { activityId: item.activityId, dueMonth: -1 }, superToken);
    expect(cleared).toMatchObject({ dueMonth: -1, dueDate: '' });
    const other = adminFor('0822222222', 'FARMER');
    expect(call('activities.setDue', { activityId: item.activityId, dueMonth: 6 }, other).error?.code).toBe('FORBIDDEN_SCOPE');
  });

  it('public report has only published projects and needs no login', () => {
    assigned('Smart Group');
    const rep = ok<{ rows: Array<{ projectId: string }> }>('public.report', { fiscalYear: 2570 });
    expect(rep.rows.length).toBeGreaterThan(0);
    const list = ok<ProjectListItem[]>('projects.list', { fiscalYear: 2570 }, superToken);
    const p = list.find((x) => x.id === rep.rows[0].projectId)!;
    ok('projects.update', { id: p.id, version: p.version, patch: { published: false } }, superToken);
    expect(ok<{ rows: Array<{ projectId: string }> }>('public.report', { fiscalYear: 2570 }).rows.some((r) => r.projectId === p.id)).toBe(false);
  });

  it('entry list shows my activities with area budgets, used amounts and auto-numbered history', () => {
    const item = assigned('Smart Group');
    const lk = ok<{ units: Array<{ id: string; kind: string }> }>('public.lookups', {});
    const [d1, d2] = lk.units.filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
    const half = Math.floor(item.amountSatang / 2);
    ok('activities.setUnits', { activityId: item.activityId, units: [{ unitId: d1, budgetSatang: half, targetQty: Math.round(item.quantity) }, { unitId: d2, budgetSatang: item.amountSatang - half, targetQty: 0 }] }, superToken);
    const staff = adminFor('0833333333', 'PROD');
    const mk = (date: string, amt: number, key: string) => ok<{ id: string }>('disbursements.create', { projectId: item.projectId, activityId: item.activityId, unitId: d1, status: 'COMMITTED', amountSatang: amt, date, docNo: `กษ 0001/${key}`, idempotencyKey: key }, staff);
    mk('2026-11-05', 1000_00, 'k2');
    const first = mk('2026-10-20', 500_00, 'k1');
    const list = ok<Array<{ activityId: string; units: Array<{ unitId: string; used: number; budget: number }>; history: Array<{ no: number; date: string }> }>>('disbursements.entryList', { fiscalYear: 2570 }, staff);
    const e = list.find((x) => x.activityId === item.activityId)! as typeof list[number] & { hasAreas: boolean };
    expect(e.hasAreas).toBe(true);
    expect(e.units.find((u) => u.unitId === d1)).toMatchObject({ budget: half, used: 1500_00 });
    expect(e.history.map((h) => [h.no, h.date])).toEqual([[1, '2026-10-20'], [2, '2026-11-05']]);
    // ยกเลิกครั้งที่ 1 → ครั้งที่เลื่อนให้เอง
    ok('disbursements.void', { id: first.id, reason: 'กรอกผิด' }, staff);
    const again = ok<typeof list>('disbursements.entryList', { fiscalYear: 2570 }, staff).find((x) => x.activityId === item.activityId)!;
    expect(again.history.map((h) => h.no)).toEqual([1]);
    // กลุ่มอื่นเห็นได้แบบดูอย่างเดียว (ไม่มีลิงก์บันทึกข้อความ) และบันทึกไม่ได้ (ADR-010)
    const other = adminFor('0844444444', 'FARMER');
    const seen = ok<Array<typeof list[number] & { canEdit: boolean; projectId: string }>>('disbursements.entryList', { fiscalYear: 2570 }, other).find((x) => x.activityId === item.activityId)!;
    expect(seen.canEdit).toBe(false);
    expect(call('disbursements.create', { projectId: seen.projectId, activityId: seen.activityId, status: 'APPROVED', amountSatang: 100, date: '2026-11-01', idempotencyKey: 'xx' }, other).error?.code).toBe('FORBIDDEN_SCOPE');
  });

  it('counts visits once per call with count = true and keeps today/total', () => {
    expect(ok<{ today: number; total: number }>('public.hit', {})).toMatchObject({ today: 0, total: 0 });
    ok('public.hit', { count: true });
    const v = ok<{ today: number; total: number; since: string }>('public.hit', { count: true });
    expect(v).toMatchObject({ today: 2, total: 2 });
    expect(v.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ok<{ total: number }>('public.hit', {}).total).toBe(2);
  });
});

describe('บันทึกข้อความตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ', () => {
  type Ctx2 = { draft: MemoData; codesSaved: boolean; profileComplete: boolean; groupConfigured: boolean; units: Array<{ id: string; name: string }> };
  function setup() {
    const { detail } = importPlan();
    const lf = detail.items.find((i) => i.isLeaf && i.name.includes('Smart Group'))!;
    ok<AssignResult>('plans.assign', { itemIds: [lf.id], workgroupId: wg('PROD') }, superToken);
    const item = ok<PlanDetail>('plans.get', { id: detail.doc.id }, superToken).items.find((i) => i.id === lf.id)!;
    const staff = adminFor('0855555555', 'PROD');
    return { item, staff };
  }

  it('fills blue fields from the system, needs only the request amount, and counts as disbursed at once', () => {
    const { item, staff } = setup();
    // ข้อมูลของฉัน: คำนำหน้า + ตำแหน่งเต็ม
    expect(ok<MyProfile>('profile.get', {}, staff).complete).toBe(false);
    ok('profile.save', { title: 'นาย', fullName: 'กิตติ โพธิ์จวง', position: 'นักวิชาการส่งเสริมการเกษตรชำนาญการ' }, staff);
    // ค่าหัวบันทึกของกลุ่ม: เฉพาะ Mini Super/Super Admin
    const gs = ok<WorkgroupMemoSettings[]>('memos.groupSettings', {}, staff)[0];
    expect(call('memos.saveGroupSettings', { ...gs, memoPrefix: 'กพ 0009.3' }, staff).error?.code).toBe('FORBIDDEN_SCOPE');
    ok('memos.saveGroupSettings', { ...gs, memoPrefix: 'กพ 0009.3', memoFax: '0-5571-6858', headName: 'นายธนจิรพัชร พัฒนศักดิ์ภิญโญ', headPosition: 'นักวิชาการส่งเสริมการเกษตรชำนาญการ', headLine2: 'รักษาการหัวหน้ากลุ่ม' }, superToken);
    // public lookups ต้องไม่มีชื่อหัวหน้ากลุ่ม
    expect(JSON.stringify(ok('public.lookups'))).not.toContain('ธนจิรพัชร');

    const c = ok<Ctx2>('memos.context', { projectId: item.projectId, activityId: item.activityId }, staff);
    expect(c.profileComplete && c.groupConfigured).toBe(true);
    // รหัสงบ/รหัสกิจกรรมหลักมาจากฐานข้อมูลรหัสงบประมาณ 2570 อัตโนมัติ
    expect(c.codesSaved).toBe(true);
    expect(c.draft).toMatchObject({ budgetCode: '07011422029002000000', mainActivityCode: '07011700006100000', thaiNumerals: true });
    expect((c as unknown as { codesRef: string }).codesRef).toContain('5.5.1');
    expect(c.draft).toMatchObject({ budgetSatang: item.amountSatang, previousSatang: 0, docPrefix: 'กพ 0009.3', signer: { name: 'นายกิตติ โพธิ์จวง' }, align: 'left' });
    expect(c.draft.subActivityName).toBe(item.name);
    expect(c.draft.mainActivityName).toContain('กิจกรรมสร้างความเข้มแข็งกลุ่มการผลิต');

    const data: MemoData = {
      ...c.draft, docNumber: '101', expense: 'ค่าจัดซื้อวัสดุสนับสนุน', requestSatang: 1000_00,
      budgetCode: '07011152034002000000', mainActivityCode: '07011690009900000',
      // พยายามปลอมยอด/ผู้ลงนาม → server ทับด้วยค่าจริง
      budgetSatang: 999_999_99, previousSatang: 0, signer: { name: 'ปลอม', position: 'x' },
      checks: { ok: true, returnFix: false, returnReason: '', forward: true },
    };
    const m = ok<MemoRecord>('memos.create', { projectId: item.projectId, activityId: item.activityId, data, idempotencyKey: 'm1' }, staff);
    expect(m).toMatchObject({ docNo: 'กพ 0009.3/101', amountSatang: 1000_00, status: 'APPROVED', revision: 1, renderStatus: 'OK' });
    expect(m.data.budgetSatang).toBe(item.amountSatang);
    expect(m.data.signer.name).toBe('นายกิตติ โพธิ์จวง');
    // รหัสที่หน้าเว็บส่งมาไม่ตรงฐานข้อมูล → ใช้ของฐานข้อมูล
    expect(m.data.budgetCode).toBe('07011422029002000000');
    const codes = ok<Array<{ activityName: string }>>('budgetCodes.list', { fiscalYear: 2570 }, staff);
    expect(codes.length).toBeGreaterThan(40);
    // ส่งซ้ำ (กดสองครั้ง) ได้ผลเดิม ไม่เบิกซ้ำ
    expect(ok<MemoRecord>('memos.create', { projectId: item.projectId, activityId: item.activityId, data, idempotencyKey: 'm1' }, staff).id).toBe(m.id);
    // ไฟล์ Doc + PDF อยู่ในโฟลเดอร์หลักฐานของโครงการ
    const files = [...env.files.files.values()].filter((f) => f.folder.endsWith('/บันทึกข้อความ'));
    expect(files.map((f) => f.mime).sort()).toEqual(['application/pdf', 'application/vnd.google-apps.document']);

    // นับเป็นเบิกจ่ายแล้ว + ประวัติมีลิงก์บันทึก
    const e = ok<Array<{ activityId: string; disbursed: number; history: Array<{ memoId?: string }> }>>('disbursements.entryList', { fiscalYear: 2570 }, staff).find((x) => x.activityId === item.activityId)!;
    expect(e.disbursed).toBe(1000_00);
    expect(e.history[0].memoId).toBe(m.id);

    // ครั้งถัดไป: รหัสถูกจำไว้ ยอดเบิกมาแล้วรวมครั้งก่อน
    const c2 = ok<Ctx2>('memos.context', { projectId: item.projectId, activityId: item.activityId }, staff);
    expect(c2.codesSaved).toBe(true);
    expect(c2.draft).toMatchObject({ previousSatang: 1000_00, budgetCode: '07011422029002000000' });
    // เลขที่ซ้ำ / เกินงบ ถูกปฏิเสธ
    const base2 = { ...c2.draft, docNumber: '101', expense: 'ค่าวัสดุ', requestSatang: 100_00 };
    expect(call('memos.create', { projectId: item.projectId, activityId: item.activityId, data: base2, idempotencyKey: 'm2' }, staff).error?.message).toContain('ถูกใช้แล้ว');
    const over = { ...base2, docNumber: '102', requestSatang: item.amountSatang };
    expect(call('memos.create', { projectId: item.projectId, activityId: item.activityId, data: over, idempotencyKey: 'm3' }, staff).error?.message).toContain('เกินงบประมาณ');
  });

  it('edits make a new revision; amount changes need Super Admin and replace the disbursement', () => {
    const { item, staff } = setup();
    ok('profile.save', { title: 'นาง', fullName: 'สมใจ ใจดี', position: 'เจ้าพนักงานการเกษตรชำนาญงาน' }, staff);
    const c = ok<Ctx2>('memos.context', { projectId: item.projectId, activityId: item.activityId }, staff);
    const data = { ...c.draft, docNumber: '7', expense: 'ค่าวัสดุ', requestSatang: 500_00 };
    const m = ok<MemoRecord>('memos.create', { projectId: item.projectId, activityId: item.activityId, data, idempotencyKey: 'e1' }, staff);
    // แก้ข้อความ (ชิดขอบทั้งสองด้าน + ข้อความแก้เอง) → ฉบับที่ 2
    const body = [`ข้อความแก้เอง ยอด ${formatMoneyPlain(m.data.budgetSatang)} เบิกมาแล้ว 0 ครั้งนี้ 500 คงเหลือ ${formatMoneyPlain(m.data.budgetSatang - 500_00)}`];
    const r2 = ok<MemoRecord>('memos.update', { id: m.id, version: m.version, data: { ...m.data, align: 'justify', bodyOverride: body } }, staff);
    expect(r2).toMatchObject({ revision: 2, disbursementId: m.disbursementId });
    expect(r2.data.align).toBe('justify');
    // ข้อความแก้เองที่ยอดไม่ตรงถูกปฏิเสธ
    expect(call('memos.update', { id: m.id, version: r2.version, data: { ...r2.data, bodyOverride: ['ยอด 9,999'] } }, staff).error?.message).toContain('ไม่ตรง');
    // เปลี่ยนยอด: เจ้าหน้าที่ไม่ได้ / Super Admin ได้ (ยกเลิกรายการเดิม + รายการใหม่)
    const changed = { ...r2.data, bodyOverride: undefined, requestSatang: 600_00 };
    expect(call('memos.update', { id: m.id, version: r2.version, data: changed }, staff).error?.code).toBe('FORBIDDEN_SCOPE');
    const r3 = ok<MemoRecord>('memos.update', { id: m.id, version: r2.version, data: changed, reason: 'แก้ยอดตามหลักฐาน' }, superToken);
    expect(r3.disbursementId).not.toBe(m.disbursementId);
    expect(r3).toMatchObject({ amountSatang: 600_00, status: 'APPROVED', revision: 3 });
    expect(r3.data.previousSatang).toBe(0);
    // ฉบับเก่าใช้ version เดิมไม่ได้
    expect(call('memos.update', { id: m.id, version: r2.version, data: changed }, superToken).error?.code).toBe('VERSION_CONFLICT');
  });

  it('keeps title through registration and approval', () => {
    ok('auth.requestAccess', { phone: '0866666666', title: 'นางสาว', fullName: 'ทดสอบ ระบบ', position: 'นักวิชาการส่งเสริมการเกษตรปฏิบัติการ', workgroupId: wg('PROD'), affiliation: 'x' });
    const req = ok<Array<{ id: string; title?: string }>>('admin.requests', { status: 'pending' }, superToken)[0];
    expect(req.title).toBe('นางสาว');
    ok('admin.decideRequest', { requestId: req.id, approve: true }, superToken);
    const t = ok<{ token: string }>('auth.login', { phone: '0866666666' }).token;
    expect(ok<MyProfile>('profile.get', {}, t)).toMatchObject({ title: 'นางสาว', complete: true });
  });
});
