/** ข้อมูลตั้งต้น (master data) + ข้อมูลสาธิต (ใช้เฉพาะโหมดสาธิต/ทดสอบ — ไม่มี PII จริง) */
import { currentFiscalYear, type AccessRequest, type FundingSource, type Organization, type Project, type Unit, type User, type Workgroup } from '@kpp/domain';
import { live, newMeta, nowIso, type Ctx } from './context';
import { activityUnitsOf, listUnits, setActivityUnitsBulk } from './services/units';
import { createAllocation, createActivity, createDisbursement, createProgress, createProject } from './services/projects';
import { SYSTEM_USER } from './context';
import { assignPlanItems, importPlanTable } from './services/plans';
import type { PlanItem } from '@kpp/domain';

export const SEED_FUNDING_SOURCES = [
  { code: 'DOAE', name: 'งบกรมส่งเสริมการเกษตร', shortName: 'กรมฯ' },
  { code: 'PROVINCE', name: 'งบจังหวัดกำแพงเพชร', shortName: 'จังหวัด' },
  { code: 'PROVGROUP', name: 'งบกลุ่มจังหวัดภาคเหนือตอนล่าง 2', shortName: 'กลุ่มจังหวัด' },
];

/** โครงสร้างตั้งต้นของสำนักงานเกษตรจังหวัด — Super Admin แก้ไขได้ในหน้า Master Data */
export const SEED_ORGS = [
  { code: 'KPP-PAO', name: 'สำนักงานเกษตรจังหวัดกำแพงเพชร', groups: [
    { code: 'ADMIN', name: 'ฝ่ายบริหารทั่วไป' },
    { code: 'STRAT', name: 'กลุ่มยุทธศาสตร์และสารสนเทศ' },
    { code: 'PROD', name: 'กลุ่มส่งเสริมและพัฒนาการผลิต' },
    { code: 'FARMER', name: 'กลุ่มส่งเสริมและพัฒนาเกษตรกร' },
    { code: 'PROTECT', name: 'กลุ่มอารักขาพืช' },
  ] },
];

/** หน่วยดำเนินการ: สำนักงานเกษตรจังหวัด + สำนักงานเกษตรอำเภอ 11 อำเภอ (รหัสตามรหัสอำเภอของกรมการปกครอง) */
export const SEED_UNITS: Array<{ code: string; name: string; shortName: string; kind: 'PROVINCE' | 'DISTRICT' }> = [
  { code: '6200', name: 'สำนักงานเกษตรจังหวัดกำแพงเพชร', shortName: 'สนง.เกษตรจังหวัด', kind: 'PROVINCE' },
  ...['เมืองกำแพงเพชร', 'ไทรงาม', 'คลองลาน', 'ขาณุวรลักษบุรี', 'คลองขลุง', 'พรานกระต่าย', 'ลานกระบือ', 'ทรายทองวัฒนา', 'ปางศิลาทอง', 'บึงสามัคคี', 'โกสัมพีนคร']
    .map((n, i) => ({ code: `62${String(i + 1).padStart(2, '0')}`, name: `สำนักงานเกษตรอำเภอ${n}`, shortName: `อ.${n}`, kind: 'DISTRICT' as const })),
];

/** idempotent: เติมเฉพาะรายการที่ยังไม่มี (ตรวจจาก code) */
export function seedMasterData(ctx: Ctx): void {
  const fs = live(ctx.env.db.list<FundingSource>('FundingSources'));
  const newFs = SEED_FUNDING_SOURCES.filter((s) => !fs.some((x) => x.code === s.code)).map((s) => ({ ...newMeta(ctx), ...s }));
  if (newFs.length) ctx.env.db.insert('FundingSources', newFs);
  const orgs = live(ctx.env.db.list<Organization>('Organizations'));
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  for (const o of SEED_ORGS) {
    let org = orgs.find((x) => x.code === o.code);
    if (!org) {
      org = { ...newMeta(ctx), code: o.code, name: o.name };
      ctx.env.db.insert('Organizations', [org as unknown as Record<string, unknown>]);
    }
    const add = o.groups.filter((g) => !groups.some((x) => x.code === g.code)).map((g) => ({ ...newMeta(ctx), orgId: org!.id, ...g }));
    if (add.length) ctx.env.db.insert('Workgroups', add);
  }
  const units = live(ctx.env.db.list<Unit>('Units'));
  const newUnits = SEED_UNITS.map((u, i) => ({ ...u, sortOrder: i })).filter((u) => !units.some((x) => x.code === u.code)).map((u) => ({ ...newMeta(ctx), ...u }));
  if (newUnits.length) ctx.env.db.insert('Units', newUnits);
  retireDistrictWorkgroup(ctx);
}

/**
 * อำเภอเป็น "หน่วยดำเนินการ" แล้ว (ADR-006) — กลุ่มงานเดิม "สำนักงานเกษตรอำเภอ" (DIST) เลิกใช้
 * ลบแบบ soft delete เฉพาะเมื่อไม่มีโครงการ ผู้ใช้ หรือรายการในแผนอ้างถึง
 */
function retireDistrictWorkgroup(ctx: Ctx): void {
  const dist = live(ctx.env.db.list<Workgroup>('Workgroups')).find((g) => g.code === 'DIST');
  if (!dist) return;
  const used = live(ctx.env.db.list<Project>('Projects')).some((p) => p.workgroupId === dist.id) ||
    live(ctx.env.db.list<User>('Users')).some((u) => u.workgroupId === dist.id || String(u.scopeWorkgroups ?? '').includes(dist.id)) ||
    live(ctx.env.db.list<PlanItem>('PlanItems')).some((i) => i.workgroupId === dist.id) ||
    live(ctx.env.db.list<AccessRequest>('AccessRequests')).some((r) => r.status === 'pending' && r.workgroupId === dist.id);
  if (used) return;
  ctx.env.db.update('Workgroups', dist.id, { ...dist, isDeleted: true, version: dist.version + 1, updatedAt: nowIso(ctx), updatedBy: 'system' });
  const org = live(ctx.env.db.list<Organization>('Organizations')).find((o) => o.id === dist.orgId && o.code === 'KPP-DISTRICT');
  if (org && !live(ctx.env.db.list<Workgroup>('Workgroups')).some((g) => g.orgId === org.id && g.id !== dist.id)) {
    ctx.env.db.update('Organizations', org.id, { ...org, isDeleted: true, version: org.version + 1, updatedAt: nowIso(ctx), updatedBy: 'system' });
  }
}

/** ข้อมูลสาธิตภาษาไทย (ไม่ใช่ข้อมูลจริง) — ใช้ในโหมดสาธิตและการทดสอบ */
export function seedDemoData(ctx: Ctx): void {
  seedMasterData(ctx);
  const saved = ctx.user;
  ctx.user = SYSTEM_USER;
  const fy = currentFiscalYear(ctx.env.now());
  const fs = live(ctx.env.db.list<FundingSource>('FundingSources'));
  const g = live(ctx.env.db.list<Workgroup>('Workgroups'));
  const F = (c: string) => fs.find((x) => x.code === c)!.id;
  const G = (c: string) => g.find((x) => x.code === c)!.id;
  const ce = fy - 543;
  const d = (m: number, day: number) => `${m >= 10 ? ce - 1 : ce}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today = ctx.env.now().toISOString().slice(0, 10);
  const past = (iso: string) => (iso <= today ? iso : today);
  const demo: Array<{ code: string; name: string; fund: string; group: string; budget: number; spent: Array<[number, number, number]>; acts: string[]; progress: number; status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' }> = [
    { code: `${fy}-D01`, name: 'โครงการส่งเสริมการผลิตข้าวคุณภาพดี (นาแปลงใหญ่)', fund: 'DOAE', group: 'PROD', budget: 1_250_000, spent: [[10, 20, 180_000], [11, 15, 220_000]], acts: ['จัดเวทีชุมชนและวางแผนการผลิต', 'ถ่ายทอดเทคโนโลยีการลดต้นทุน', 'ติดตามและประเมินผล'], progress: 40 },
    { code: `${fy}-D02`, name: 'โครงการพัฒนาศักยภาพ Young Smart Farmer', fund: 'DOAE', group: 'FARMER', budget: 480_000, spent: [[11, 2, 60_000]], acts: ['อบรมเชิงปฏิบัติการ', 'ศึกษาดูงาน'], progress: 25 },
    { code: `${fy}-P01`, name: 'โครงการส่งเสริมการปลูกพืชหลากหลายลดการเผาในพื้นที่เกษตร', fund: 'PROVINCE', group: 'STRAT', budget: 2_100_000, spent: [[10, 28, 350_000], [11, 10, 410_000]], acts: ['สำรวจพื้นที่เสี่ยงการเผา', 'สนับสนุนปัจจัยการผลิต', 'รณรงค์ประชาสัมพันธ์'], progress: 35 },
    { code: `${fy}-P02`, name: 'โครงการเฝ้าระวังและป้องกันศัตรูพืชระบาด', fund: 'PROVINCE', group: 'PROTECT', budget: 650_000, spent: [], acts: ['จัดตั้งศูนย์จัดการศัตรูพืชชุมชน'], progress: 0, status: 'PLANNED' },
    { code: `${fy}-G01`, name: 'โครงการยกระดับมาตรฐานสินค้าเกษตรสู่ตลาดสมัยใหม่', fund: 'PROVGROUP', group: 'PROD', budget: 3_400_000, spent: [[10, 5, 900_000], [11, 1, 1_150_000]], acts: ['ตรวจรับรองมาตรฐาน GAP', 'พัฒนาบรรจุภัณฑ์'], progress: 62 },
    { code: `${fy}-G02`, name: 'โครงการพัฒนาระบบข้อมูลการเกษตรเพื่อการตัดสินใจ', fund: 'PROVGROUP', group: 'STRAT', budget: 900_000, spent: [[10, 12, 900_000]], acts: ['จัดทำฐานข้อมูล'], progress: 100, status: 'COMPLETED' },
  ];
  for (const p of demo) {
    const project = createProject(ctx, {
      idempotencyKey: `demo:${p.code}`, fiscalYear: fy, fundingSourceId: F(p.fund), workgroupId: G(p.group), projectCode: p.code,
      name: p.name, ownerName: 'เจ้าหน้าที่ (ข้อมูลสาธิต)', startDate: d(10, 1), endDate: d(9, 30), status: p.status ?? 'IN_PROGRESS',
      published: true,
    });
    createAllocation(ctx, { idempotencyKey: `demo:${p.code}:o`, projectId: project.id, type: 'ORIGINAL', amountSatang: p.budget * 100, date: d(10, 1), note: 'ข้อมูลสาธิต' });
    p.acts.forEach((name, i) => createActivity(ctx, { idempotencyKey: `demo:${p.code}:a${i}`, projectId: project.id, name }));
    p.spent.forEach(([m, day, amt], i) => createDisbursement(ctx, {
      idempotencyKey: `demo:${p.code}:d${i}`, projectId: project.id, status: i % 2 ? 'APPROVED' : 'PAID', amountSatang: amt * 100,
      date: past(d(m, day)), docNo: `กษ 0012/${100 + i}`, description: 'ข้อมูลสาธิต',
    }));
    if (p.progress) createProgress(ctx, { idempotencyKey: `demo:${p.code}:pr`, projectId: project.id, progressPct: p.progress, detail: 'ดำเนินการตามแผน (ข้อมูลสาธิต)' });
  }
  ctx.user = saved;
}

/** กลุ่มงานตัวอย่างตามคำสำคัญของกิจกรรม (ใช้เฉพาะโหมดสาธิต) */
const DEMO_GROUP_RULES: Array<[RegExp, string]> = [
  [/ศัตรูพืช|อารักขา|ชีวภัณฑ์|ศจช|สารเคมี|สุขภาพพืช/, 'PROTECT'],
  [/ยุวเกษตรกร|แม่บ้าน|Smart Farmer|Young Smart|สูงวัย|วิสาหกิจ|อาสาสมัคร|อกม|ส่งเสริมอาชีพ/, 'FARMER'],
  [/แปลงใหญ่|GAP|ข้าวโพด|มันสำปะหลัง|ไม้ผล|ดิน|ปุ๋ย|ศดปช|ศพก|ตลาด/, 'PROD'],
  [/ทะเบียน|ผังแปลง|ภูมิสารสนเทศ|ข้อมูล|District Workshop|ระบบส่งเสริม/, 'STRAT'],
];

/** ข้อมูลสาธิตจากแผนจริง (แบบ คง.2 ปี 2570 ครั้งที่ 1) + การเบิกจ่ายจำลองบางส่วน */
export function seedDemoPlan(ctx: Ctx, table: unknown[][]): void {
  seedMasterData(ctx);
  const saved = ctx.user;
  ctx.user = SYSTEM_USER;
  const fs = live(ctx.env.db.list<FundingSource>('FundingSources'));
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  const doc = importPlanTable(ctx, table, {
    fiscalYear: 2570, fundingSourceId: fs.find((f) => f.code === 'DOAE')!.id, round: 1,
    title: 'งบกรมส่งเสริมการเกษตร ปี 2570 ครั้งที่ 1 (โครงการตามตัวชี้วัด)', docNo: 'กษ 1004/ว 1594',
  });
  const leaves = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === doc.id && i.isLeaf);
  const byGroup = new Map<string, string[]>();
  leaves.forEach((leaf, k) => {
    const path: string[] = [];
    let cur: PlanItem | undefined = leaf;
    const all = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === doc.id);
    while (cur) { path.push(cur.name); cur = all.find((x) => x.seq === cur!.parentSeq); }
    const text = path.join(' ');
    const rule = DEMO_GROUP_RULES.find(([re]) => re.test(text));
    if (!rule || k % 7 === 3) return; // เว้นบางรายการให้ทดลองเลือกเอง
    const g = groups.find((x) => x.code === rule[1])!.id;
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(leaf.id);
  });
  for (const [workgroupId, itemIds] of byGroup) assignPlanItems(ctx, { itemIds, workgroupId });
  // หน่วยดำเนินการจำลอง: ราว 1 ใน 3 ของกิจกรรมทำทั้ง 11 อำเภอ, บางส่วน 3 อำเภอ, ที่เหลือจังหวัดทำเอง
  const assigned = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === doc.id && i.isLeaf && i.activityId);
  const districts = listUnits(ctx).filter((u) => u.kind === 'DISTRICT').map((u) => u.id);
  assigned.forEach((i, k) => {
    if (k % 3 === 0) setActivityUnitsBulk(ctx, { activityIds: [i.activityId], unitIds: districts });
    else if (k % 5 === 1) setActivityUnitsBulk(ctx, { activityIds: [i.activityId], unitIds: districts.filter((_, j) => (j + k) % 4 === 0).slice(0, 3) });
  });
  // เบิกจ่ายจำลอง ~ 15–40% ของบางกิจกรรม (กระจายตามหน่วยที่ได้รับงบ)
  const daysAgo = (n: number) => new Date(ctx.env.now().getTime() - n * 86400000).toISOString().slice(0, 10);
  assigned.forEach((i, k) => {
    if (k % 3 === 2 || i.amountSatang < 100000) return;
    const shares = activityUnitsOf(ctx, i.activityId);
    const targets = shares.length ? shares.filter((_, j) => (j + k) % 3 !== 1) : [null];
    targets.forEach((sh, j) => {
      const base = sh ? Number(sh.budgetSatang) : i.amountSatang;
      const amount = Math.round((base * (15 + ((k * 7 + j * 11) % 26))) / 100 / 100) * 100;
      if (amount <= 0) return;
      createDisbursement(ctx, {
        idempotencyKey: `demo:plan:${i.id}:${j}`, projectId: i.projectId, activityId: i.activityId, unitId: sh?.unitId, status: (k + j) % 2 ? 'APPROVED' : 'PAID',
        amountSatang: amount, date: daysAgo(1 + ((k + j) % 25)), docNo: `ฎ ${100 + k}/2570`, description: 'ข้อมูลสาธิต',
      });
    });
  });
  ctx.user = saved;
}
