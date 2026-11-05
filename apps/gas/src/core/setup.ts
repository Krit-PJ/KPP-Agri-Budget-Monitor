/** ข้อมูลตั้งต้น (master data) + ข้อมูลสาธิต (ใช้เฉพาะโหมดสาธิต/ทดสอบ — ไม่มี PII จริง) */
import { currentFiscalYear, type FundingSource, type Organization, type Workgroup } from '@kpp/domain';
import { live, newMeta, type Ctx } from './context';
import { createAllocation, createActivity, createDisbursement, createProgress, createProject } from './services/projects';
import { SYSTEM_USER } from './context';

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
  { code: 'KPP-DISTRICT', name: 'สำนักงานเกษตรอำเภอ (จังหวัดกำแพงเพชร)', groups: [
    { code: 'DIST', name: 'สำนักงานเกษตรอำเภอ' },
  ] },
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
