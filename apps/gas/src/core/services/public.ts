/**
 * ข้อมูลสาธารณะ — ไม่มี PII (ไม่มีชื่อผู้รับผิดชอบ เบอร์โทร Drive ID หมายเหตุภายใน)
 * cache ด้วย dataVersion และบันทึก snapshot ลง REPORTING
 */
import {
  AppError, MEETING_RE, addSummaries, areaName, computeBudget, currentFiscalYear, fiscalMonthIndex, monthlyCumulative, monthlyTargetPct, pct, riskFlags,
  type Activity, type BudgetSummary, type FundingSource, type GroupTotal, type ImportJob, type Lookups, type Organization,
  type PlanItem, type Project, type PublicProject, type PublicSummary, type ReportRow, type Workgroup,
} from '@kpp/domain';
import { dataVersion, getSettings, live, nowIso, type Ctx } from '../context';
import { budgetsByProject, loadDataset, today } from './projects';
import { buildUnitRows, listUnits, planSeries, summarizeRows } from './units';
import { SCHEMA_VERSION } from '../schema';

function cached<T>(ctx: Ctx, key: string, build: () => T): T {
  // รวม SCHEMA_VERSION: deploy โค้ดใหม่ที่เปลี่ยนรูปข้อมูลแล้ว cache เดิมใช้ไม่ได้ทันที
  const full = `pub:${SCHEMA_VERSION}:${dataVersion(ctx)}:${key}`;
  const hit = ctx.env.cache.get(full);
  if (hit) {
    try {
      return JSON.parse(hit) as T;
    } catch { /* rebuild */ }
  }
  const value = build();
  const json = JSON.stringify(value);
  if (json.length < 95_000) ctx.env.cache.put(full, json, 600);
  return value;
}

export function lookups(ctx: Ctx): Lookups {
  return cached(ctx, 'lookups', () => {
    const fyNow = currentFiscalYear(ctx.env.now());
    const years = new Set<number>([fyNow, fyNow - 1]);
    for (const p of live(ctx.env.db.list<Project>('Projects'))) years.add(Number(p.fiscalYear));
    return {
      organizations: live(ctx.env.db.list<Organization>('Organizations')).map(({ id, code, name }) => ({ id, code, name })),
      workgroups: live(ctx.env.db.list<Workgroup>('Workgroups')).map(({ id, orgId, code, name, noActivities }) => ({ id, orgId, code, name, noActivities: !!noActivities })),
      fundingSources: live(ctx.env.db.list<FundingSource>('FundingSources')).map(({ id, code, name, shortName }) => ({ id, code, name, shortName })),
      units: listUnits(ctx).map(({ id, code, name, shortName, kind }) => ({ id, code, name, shortName, kind })),
      fiscalYears: [...years].sort((a, b) => b - a),
      currentFiscalYear: fyNow,
    };
  });
}

function toPublic(p: Project, budget: BudgetSummary, t: string): PublicProject {
  return {
    id: p.id, fiscalYear: Number(p.fiscalYear), fundingSourceId: p.fundingSourceId, projectCode: p.projectCode, name: p.name,
    workgroupId: p.workgroupId, startDate: p.startDate, endDate: p.endDate, status: p.status,
    physicalProgress: Number(p.physicalProgress) || 0, description: p.description, budget, risks: riskFlags(p, budget, t),
  };
}

function fyOf(ctx: Ctx, v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 2500 && n < 2700 ? n : currentFiscalYear(ctx.env.now());
}

export function publicProjects(ctx: Ctx, b: { fiscalYear?: number }): PublicProject[] {
  const fy = fyOf(ctx, b.fiscalYear);
  return cached(ctx, `projects:${fy}`, () => {
    const ds = loadDataset(ctx);
    const budgets = budgetsByProject(ds);
    const t = today(ctx);
    return ds.projects.filter((p) => p.published && Number(p.fiscalYear) === fy)
      .map((p) => toPublic(p, budgets.get(p.id)!, t))
      .sort((a, b2) => a.projectCode.localeCompare(b2.projectCode, 'th'));
  });
}

export function publicProject(ctx: Ctx, b: { id: string }): PublicProject {
  const ds = loadDataset(ctx);
  const p = ds.projects.find((x) => x.id === String(b.id) && x.published);
  if (!p) throw new AppError('NOT_FOUND', 'ไม่พบโครงการ หรือยังไม่เผยแพร่');
  const allocs = ds.allocations.filter((a) => a.projectId === p.id);
  const disbs = ds.disbursements.filter((d) => d.projectId === p.id);
  const out = toPublic(p, computeBudget(allocs, disbs), today(ctx));
  out.activities = ds.activities.filter((a: Activity) => a.projectId === p.id)
    .sort((x, y) => x.activityCode.localeCompare(y.activityCode, 'th'))
    .map((a) => ({
      id: a.id, activityCode: a.activityCode, name: a.name, status: a.status, progressPct: Number(a.progressPct) || 0,
      startDate: a.startDate, endDate: a.endDate,
      budget: computeBudget(allocs.filter((x) => x.activityId === a.id), disbs.filter((x) => x.activityId === a.id)),
    }));
  out.monthly = { disbursedCumulative: monthlyCumulative(disbs, p.fiscalYear), targetPct: monthlyTargetPct(p.quarterTargets) };
  return out;
}

export function buildSummary(ctx: Ctx, fy: number, onlyPublished: boolean): PublicSummary {
  const ds = loadDataset(ctx);
  const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy && (!onlyPublished || p.published));
  const ids = new Set(projects.map((p) => p.id));
  const budgets = budgetsByProject({ ...ds, projects });
  const t = today(ctx);
  const sources = live(ctx.env.db.list<FundingSource>('FundingSources'));
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  const group = (keyOf: (p: Project) => string, labelOf: (k: string) => string): GroupTotal[] => {
    const m = new Map<string, Project[]>();
    for (const p of projects) (m.get(keyOf(p)) ?? m.set(keyOf(p), []).get(keyOf(p))!).push(p);
    return [...m.entries()].map(([key, ps]) => ({ key, label: labelOf(key), projects: ps.length, budget: addSummaries(ps.map((p) => budgets.get(p.id)!)) }))
      .sort((a, b) => b.budget.currentBudget - a.budget.currentBudget);
  };
  const risks = projects.map((p) => ({ projectId: p.id, name: p.name, flags: riskFlags(p, budgets.get(p.id)!, t) }))
    .filter((r) => r.flags.length > 0);
  const totals = addSummaries(projects.map((p) => budgets.get(p.id)!));
  // แผนรายเดือน: แผนรายไตรมาสของกิจกรรม (ถ้ามี) หรือเป้าร้อยละของโครงการ
  const targetSatang = planSeries(ds, projects);
  // กิจกรรม × หน่วยดำเนินการ ณ เดือนปัจจุบัน — ใช้แยกกลุ่มงาน/หน่วย
  const fyNow = currentFiscalYear(ctx.env.now());
  const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(t);
  const unitRows = buildUnitRows(ctx, ds, projects, m);
  const units = listUnits(ctx);
  const unitName = (id: string) => areaName(units.find((u) => u.id === id));
  const byUnitOf = (rows: ReportRow[]): GroupTotal[] => {
    const mm = new Map<string, ReportRow[]>();
    for (const r of rows) (mm.get(r.unitId) ?? mm.set(r.unitId, []).get(r.unitId)!).push(r);
    return units.filter((u) => mm.has(u.id)).map((u) => {
      const rs = mm.get(u.id)!;
      const { plan, ...budget } = summarizeRows(rs);
      return { key: u.id, label: unitName(u.id), budget, plan, projects: new Set(rs.map((r) => r.projectId)).size, activities: new Set(rs.map((r) => r.activityId)).size };
    });
  };
  const settings = getSettings(ctx);
  const inScopeDisb = ds.disbursements.filter((d) => ids.has(d.projectId));
  // แผนงาน: ชื่อจากแผนงบประมาณที่นำเข้า
  const planItems = projects.some((p) => p.planDocId) ? live(ctx.env.db.list<PlanItem>('PlanItems')) : [];
  const planKey = (p: Project): string => {
    if (!p.planDocId) return 'นอกแผน';
    const node = planItems.find((i) => i.planDocId === p.planDocId && Number(i.seq) === Number(p.planNodeSeq));
    const plan = node && planItems.find((i) => i.planDocId === p.planDocId && i.kind === 'PLAN' && Number(i.planIndex) === Number(node.planIndex));
    return plan?.name ?? 'นอกแผน';
  };
  // อบรม/ประชุม/สัมมนา: ต้องดำเนินการให้เสร็จภายในไตรมาส 3 (มาตรการเร่งรัดฯ)
  const meetingActs = ds.activities.filter((a) => ids.has(a.projectId) && MEETING_RE.test(a.name));
  let mBudget = 0;
  let mRemaining = 0;
  for (const a of meetingActs) {
    const b = computeBudget(ds.allocations.filter((x) => x.activityId === a.id), ds.disbursements.filter((x) => x.activityId === a.id));
    mBudget += b.currentBudget;
    mRemaining += Math.max(0, b.currentBudget - b.disbursed);
  }
  const delayed = risks.filter((r) => r.flags.includes('OVERDUE') || r.flags.includes('BEHIND_SPENDING')).length;
  return {
    fiscalYear: fy,
    generatedAt: nowIso(ctx),
    sourceVersion: dataVersion(ctx),
    totals,
    counts: {
      total: projects.length,
      planned: projects.filter((p) => p.status === 'PLANNED').length,
      inProgress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
      completed: projects.filter((p) => p.status === 'COMPLETED').length,
      cancelled: projects.filter((p) => p.status === 'CANCELLED').length,
      delayed,
    },
    avgPhysicalProgress: projects.length
      ? Math.round((projects.reduce((s, p) => s + (Number(p.physicalProgress) || 0), 0) / projects.length) * 100) / 100 : 0,
    byFundingSource: group((p) => p.fundingSourceId, (k) => sources.find((s) => s.id === k)?.name ?? 'ไม่ระบุ'),
    byWorkgroup: group((p) => p.workgroupId, (k) => groups.find((g) => g.id === k)?.name ?? 'ไม่ระบุ').map((g) => {
      const rs = unitRows.filter((r) => r.workgroupId === g.key);
      return { ...g, plan: summarizeRows(rs).plan, activities: new Set(rs.filter((r) => r.activityId).map((r) => r.activityId)).size, units: byUnitOf(rs) };
    }),
    byUnit: byUnitOf(unitRows),
    activitiesWithoutUnits: (() => {
      const withShares = new Set(ctx.env.db.list<{ activityId: string; isDeleted: boolean }>('ActivityUnits').filter((x) => !x.isDeleted).map((x) => x.activityId));
      return ds.activities.filter((a) => ids.has(a.projectId) && !withShares.has(a.id)).length;
    })(),
    byPlan: group(planKey, (k) => k),
    targets: {
      annualPct: Math.min(100, Math.max(0, Number(settings.annualTargetPct) || 98)),
      meetingDeadline: `${fy - 543}-06-30`,
    },
    meetings: { activities: meetingActs.filter((a) => a.status !== 'CANCELLED').length, remaining: mRemaining, budget: mBudget },
    monthly: {
      disbursedCumulative: monthlyCumulative(inScopeDisb, fy),
      targetPct: targetSatang.map((v) => pct(v, totals.currentBudget)),
    },
    risks: risks.slice(0, 50),
    dataQuality: {
      projectsWithoutBudget: projects.filter((p) => budgets.get(p.id)!.currentBudget === 0).length,
      projectsWithoutReport45d: risks.filter((r) => r.flags.includes('NO_RECENT_REPORT')).length,
      lastImportAt: settings.lastImportAt || (live(ctx.env.db.list<ImportJob>('ImportJobs')).filter((j) => j.committedAt).map((j) => j.committedAt).sort().pop() ?? ''),
    },
  };
}

export function publicSummary(ctx: Ctx, b: { fiscalYear?: number }): PublicSummary {
  const fy = fyOf(ctx, b.fiscalYear);
  return cached(ctx, `summary:${fy}`, () => buildSummary(ctx, fy, true));
}

/** บันทึก snapshot ลงไฟล์ REPORTING (เรียกจาก trigger หรือ Super Admin) */
export function writeSnapshot(ctx: Ctx): { generatedAt: string } {
  const fy = currentFiscalYear(ctx.env.now());
  const s = buildSummary(ctx, fy, true);
  ctx.env.db.insert('Snapshots', [{ id: ctx.env.uuid(), kind: 'PUBLIC_SUMMARY', fiscalYear: fy, generatedAt: s.generatedAt, sourceVersion: s.sourceVersion, json: JSON.stringify(s).slice(0, 49000) }]);
  return { generatedAt: s.generatedAt };
}
