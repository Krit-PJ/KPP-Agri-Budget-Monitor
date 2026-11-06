/**
 * หน่วยดำเนินการ (ADR-006): สำนักงานเกษตรจังหวัด + สำนักงานเกษตรอำเภอ 11 อำเภอ
 * - กิจกรรมแบ่งงบ/เป้าให้หน่วยได้ (ActivityUnits) ผลรวมงบต้องเท่างบกิจกรรม
 * - งบที่ไม่ได้แบ่ง และรายการเบิกจ่ายที่ไม่ระบุหน่วย นับเป็นของสำนักงานเกษตรจังหวัด
 * - แผนการเบิกจ่าย ณ เดือนใด ๆ: แผนรายไตรมาสของกิจกรรม (ถ้ามี) ไม่เช่นนั้นใช้เป้าร้อยละของโครงการ
 */
import {
  AppError, MEETING_RE, computeBudget, pct, planToDate, splitEqual,
  type Activity, type ActivityUnit, type Allocation, type BudgetSummary, type Disbursement, type PlanActivityState,
  type Project, type ReportRow, type Satang, type Unit, type UnitShareInput,
} from '@kpp/domain';
import { requireWorkgroup } from '../auth';
import { audit, bumpDataVersion, findById, live, newMeta, nowIso, type Ctx } from '../context';
import type { Dataset } from './projects';

export function listUnits(ctx: Ctx): Unit[] {
  return live(ctx.env.db.list<Unit>('Units')).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder) || a.code.localeCompare(b.code));
}

/** หน่วยตั้งต้น = สำนักงานเกษตรจังหวัด */
export function provinceUnitId(units: Unit[]): string {
  return units.find((u) => u.kind === 'PROVINCE')?.id ?? '';
}

export function activityUnitsOf(ctx: Ctx, activityId?: string): ActivityUnit[] {
  const all = live(ctx.env.db.list<ActivityUnit>('ActivityUnits'));
  return activityId ? all.filter((x) => x.activityId === activityId) : all;
}

export function activityState(ctx: Ctx, a: Activity, allocs?: Allocation[], disbs?: Disbursement[], shares?: ActivityUnit[]): PlanActivityState {
  const al = (allocs ?? live(ctx.env.db.list<Allocation>('Allocations'))).filter((x) => x.activityId === a.id);
  const di = (disbs ?? live(ctx.env.db.list<Disbursement>('Disbursements'))).filter((x) => x.activityId === a.id);
  const b = computeBudget(al, di);
  return {
    activityId: a.id, projectId: a.projectId, budget: b.currentBudget, disbursed: b.disbursed, committed: b.committed,
    planQuarters: a.planQuarters ?? '', units: (shares ?? activityUnitsOf(ctx)).filter((x) => x.activityId === a.id),
    hasDisbursement: di.some((d) => d.status !== 'VOID' && !d.isDeleted),
  };
}

/**
 * กำหนดหน่วยดำเนินการของกิจกรรม: แทนที่ชุดเดิมทั้งชุด
 * - ผลรวมงบต้องเท่างบกิจกรรมพอดี (ป้องกันงบหายหรือเกิน)
 * - เอาหน่วยที่มีรายการเบิกจ่ายแล้วออกไม่ได้
 * - แผนรายไตรมาส (ไม่บังคับ) ผลรวมต้องเท่างบกิจกรรม
 */
export function setActivityUnits(ctx: Ctx, b: { activityId: string; units: UnitShareInput[]; planQuarters?: Satang[] | null }): PlanActivityState {
  const a = findById<Activity>(ctx, 'Activities', String(b.activityId), 'กิจกรรม');
  const p = findById<Project>(ctx, 'Projects', a.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  const units = listUnits(ctx);
  const st = activityState(ctx, a);
  const input = Array.isArray(b.units) ? b.units.slice(0, 50) : [];
  const seen = new Set<string>();
  const clean = input.map((x) => {
    const unit = units.find((u) => u.id === x.unitId);
    if (!unit) throw new AppError('VALIDATION_FAILED', 'หน่วยดำเนินการไม่ถูกต้อง');
    if (seen.has(unit.id)) throw new AppError('VALIDATION_FAILED', `เลือก${unit.shortName}ซ้ำ`);
    seen.add(unit.id);
    const budget = Number(x.budgetSatang);
    if (!Number.isInteger(budget) || budget < 0) throw new AppError('VALIDATION_FAILED', `งบของ${unit.shortName}ไม่ถูกต้อง`);
    const qty = Math.max(0, Number(x.targetQty) || 0);
    return { unitId: unit.id, budgetSatang: budget, targetQty: qty };
  });
  if (clean.length) {
    const sum = clean.reduce((s, x) => s + x.budgetSatang, 0);
    if (sum !== st.budget) {
      throw new AppError('VALIDATION_FAILED', `ผลรวมงบที่แบ่ง ${(sum / 100).toLocaleString('th-TH')} บาท ไม่เท่างบกิจกรรม ${(st.budget / 100).toLocaleString('th-TH')} บาท`);
    }
  }
  // หน่วยที่มีรายการเบิกจ่ายแล้ว ต้องยังอยู่
  const pao = provinceUnitId(units);
  const used = new Set(live(ctx.env.db.list<Disbursement>('Disbursements'))
    .filter((d) => d.activityId === a.id && d.status !== 'VOID').map((d) => d.unitId || pao));
  const keep = new Set(clean.map((x) => x.unitId));
  const keepPao = clean.length === 0; // ไม่แบ่ง = ทั้งหมดเป็นของจังหวัด
  for (const uid of used) {
    if (!keep.has(uid) && !(keepPao && uid === pao)) {
      throw new AppError('VALIDATION_FAILED', `${units.find((u) => u.id === uid)?.shortName ?? 'หน่วยนี้'} มีรายการเบิกจ่ายแล้ว เอาออกไม่ได้`);
    }
  }
  let planQuarters = a.planQuarters ?? '';
  if (b.planQuarters !== undefined) {
    if (b.planQuarters === null || (Array.isArray(b.planQuarters) && b.planQuarters.every((v) => !Number(v)))) planQuarters = '';
    else {
      const q = (b.planQuarters ?? []).map(Number);
      if (q.length !== 4 || q.some((v) => !Number.isInteger(v) || v < 0)) throw new AppError('VALIDATION_FAILED', 'แผนรายไตรมาสไม่ถูกต้อง');
      if (q.reduce((s, v) => s + v, 0) !== st.budget) throw new AppError('VALIDATION_FAILED', 'ผลรวมแผนรายไตรมาสต้องเท่างบกิจกรรม');
      planQuarters = q.join(',');
    }
  }

  const before = { units: st.units.map((x) => ({ unitId: x.unitId, budgetSatang: x.budgetSatang, targetQty: x.targetQty })), planQuarters: a.planQuarters };
  const now = nowIso(ctx);
  const actor = ctx.user?.sub ?? 'system';
  for (const old of st.units) {
    const next = clean.find((x) => x.unitId === old.unitId);
    if (!next) ctx.env.db.update('ActivityUnits', old.id, { ...old, isDeleted: true, version: old.version + 1, updatedAt: now, updatedBy: actor });
    else if (next.budgetSatang !== Number(old.budgetSatang) || next.targetQty !== Number(old.targetQty)) {
      ctx.env.db.update('ActivityUnits', old.id, { ...old, ...next, version: old.version + 1, updatedAt: now, updatedBy: actor });
    }
  }
  const add = clean.filter((x) => !st.units.some((o) => o.unitId === x.unitId)).map((x) => ({ ...newMeta(ctx), projectId: p.id, activityId: a.id, ...x }));
  if (add.length) ctx.env.db.insert('ActivityUnits', add);
  if (planQuarters !== (a.planQuarters ?? '')) {
    ctx.env.db.update('Activities', a.id, { ...a, planQuarters, version: a.version + 1, updatedAt: now, updatedBy: actor });
  }
  audit(ctx, 'activity.units', 'Activity', a.id, { before, after: { units: clean, planQuarters }, projectId: p.id });
  bumpDataVersion(ctx);
  return activityState(ctx, { ...a, planQuarters });
}

/** หลายกิจกรรมพร้อมกัน: แบ่งงบเท่ากันให้หน่วยที่เลือก (ข้ามรายการที่แบ่งไม่ได้ เช่น มีเบิกจ่ายในหน่วยอื่นแล้ว) */
export function setActivityUnitsBulk(ctx: Ctx, b: { activityIds: string[]; unitIds: string[] }): { updated: number; skipped: Array<{ id: string; reason: string }> } {
  const ids = [...new Set((b.activityIds ?? []).map(String))].slice(0, 300);
  const unitIds = [...new Set((b.unitIds ?? []).map(String))];
  if (!ids.length) throw new AppError('VALIDATION_FAILED', 'ยังไม่ได้เลือกกิจกรรม');
  if (!unitIds.length) throw new AppError('VALIDATION_FAILED', 'ยังไม่ได้เลือกหน่วยดำเนินการ');
  const units = listUnits(ctx);
  const ordered = units.filter((u) => unitIds.includes(u.id)).map((u) => u.id);
  let updated = 0;
  const skipped: Array<{ id: string; reason: string }> = [];
  for (const id of ids) {
    try {
      const a = findById<Activity>(ctx, 'Activities', id, 'กิจกรรม');
      const st = activityState(ctx, a);
      const shares = splitEqual(st.budget, ordered.length);
      const qty = splitEqual(Math.round(Number(a.targetQty) || 0), ordered.length);
      setActivityUnits(ctx, { activityId: id, units: ordered.map((unitId, i) => ({ unitId, budgetSatang: shares[i], targetQty: qty[i] })) });
      updated++;
    } catch (e) {
      skipped.push({ id, reason: e instanceof AppError ? e.message : 'บันทึกไม่สำเร็จ' });
    }
  }
  return { updated, skipped };
}

/* ------------------------------ สรุปรายหน่วย ------------------------------ */

/**
 * แถวข้อมูล กิจกรรม × หน่วยดำเนินการ ของโครงการที่ระบุ — ใช้ทั้ง dashboard และรายงาน
 * m = จำนวนเดือนที่ผ่านไปของปีงบ (ใช้คำนวณแผน ณ เดือนนั้น)
 */
export function buildUnitRows(ctx: Ctx, ds: Dataset, projects: Project[], m: number): ReportRow[] {
  const units = listUnits(ctx);
  const pao = provinceUnitId(units);
  const shares = activityUnitsOf(ctx);
  const ids = new Set(projects.map((p) => p.id));
  const byProject = new Map(projects.map((p) => [p.id, p]));
  const acts = ds.activities.filter((a) => ids.has(a.projectId));
  const allocBy = new Map<string, Allocation[]>();
  const disbBy = new Map<string, Disbursement[]>();
  const key = (projectId: string, activityId: string) => `${projectId}|${activityId}`;
  for (const x of ds.allocations) if (ids.has(x.projectId)) (allocBy.get(key(x.projectId, x.activityId)) ?? allocBy.set(key(x.projectId, x.activityId), []).get(key(x.projectId, x.activityId))!).push(x);
  for (const x of ds.disbursements) if (ids.has(x.projectId)) (disbBy.get(key(x.projectId, x.activityId)) ?? disbBy.set(key(x.projectId, x.activityId), []).get(key(x.projectId, x.activityId))!).push(x);

  const rows: ReportRow[] = [];
  const emit = (p: Project, a: Activity | null, allocs: Allocation[], disbs: Disbursement[]) => {
    const total = computeBudget(allocs, []).currentBudget;
    const planTotal = planToDate(total, a?.planQuarters, p.quarterTargets, m);
    const mine = a ? shares.filter((s) => s.activityId === a.id) : [];
    const budgetOf = new Map<string, number>(mine.map((s) => [s.unitId, Number(s.budgetSatang)]));
    const qtyOf = new Map<string, number>(mine.map((s) => [s.unitId, Number(s.targetQty)]));
    const assigned = mine.reduce((s, x) => s + Number(x.budgetSatang), 0);
    if (total - assigned !== 0 || !mine.length) budgetOf.set(pao, (budgetOf.get(pao) ?? 0) + (total - assigned));
    if (!mine.length) qtyOf.set(pao, Number(a?.targetQty) || 0);
    const unitIds = new Set([...budgetOf.keys(), ...disbs.filter((d) => d.status !== 'VOID').map((d) => d.unitId || pao)]);
    for (const uid of units.map((u) => u.id).filter((id) => unitIds.has(id))) {
      const s = computeBudget([], disbs.filter((d) => (d.unitId || pao) === uid));
      const budget = budgetOf.get(uid) ?? 0;
      rows.push({
        workgroupId: p.workgroupId, fundingSourceId: p.fundingSourceId, projectId: p.id, projectCode: p.projectCode, projectName: p.name,
        activityId: a?.id ?? '', activityCode: a?.activityCode ?? '', activityName: a?.name ?? 'งบระดับโครงการ', unit: a?.unit ?? '',
        targetQty: qtyOf.get(uid) ?? 0, unitId: uid, isMeeting: !!a && MEETING_RE.test(a.name),
        budget, plan: total ? Math.round((planTotal * budget) / total) : 0, committed: s.committed, disbursed: s.disbursed, remaining: budget - s.disbursed,
      });
    }
  };
  for (const a of acts) {
    const p = byProject.get(a.projectId)!;
    emit(p, a, allocBy.get(key(p.id, a.id)) ?? [], disbBy.get(key(p.id, a.id)) ?? []);
  }
  // งบ/รายการที่ไม่ผูกกิจกรรม
  for (const p of projects) {
    const al = allocBy.get(key(p.id, '')) ?? [];
    const di = disbBy.get(key(p.id, '')) ?? [];
    if (al.length || di.length) emit(p, null, al, di);
  }
  return rows;
}

/** รวมแถวเป็น BudgetSummary (ไม่มีการโอนระดับหน่วย) */
export function summarizeRows(rows: ReportRow[]): BudgetSummary & { plan: Satang } {
  let budget = 0, committed = 0, disbursed = 0, plan = 0;
  for (const r of rows) {
    budget += r.budget;
    committed += r.committed;
    disbursed += r.disbursed;
    plan += r.plan;
  }
  return {
    originalBudget: budget, transferIn: 0, transferOut: 0, currentBudget: budget, committed, disbursed, paid: 0,
    remaining: budget - disbursed, spendingPct: pct(disbursed, budget), plan,
  };
}

/** แผนการเบิกจ่ายสะสมรายเดือน (สตางค์) 12 เดือน ของชุดโครงการ — ใช้แผนรายไตรมาสของกิจกรรมเมื่อมี */
export function planSeries(ds: Dataset, projects: Project[]): Satang[] {
  const out = new Array<number>(12).fill(0);
  const ids = new Set(projects.map((p) => p.id));
  const byProject = new Map(projects.map((p) => [p.id, p]));
  const budgetOf = new Map<string, Allocation[]>();
  for (const x of ds.allocations) if (ids.has(x.projectId)) (budgetOf.get(x.activityId || `P:${x.projectId}`) ?? budgetOf.set(x.activityId || `P:${x.projectId}`, []).get(x.activityId || `P:${x.projectId}`)!).push(x);
  const add = (budget: number, planQuarters: string, qt: string) => {
    for (let m = 1; m <= 12; m++) out[m - 1] += planToDate(budget, planQuarters, qt, m);
  };
  for (const a of ds.activities) {
    const p = byProject.get(a.projectId);
    if (p) add(computeBudget(budgetOf.get(a.id) ?? [], []).currentBudget, a.planQuarters ?? '', p.quarterTargets);
  }
  for (const p of projects) add(computeBudget(budgetOf.get(`P:${p.id}`) ?? [], []).currentBudget, '', p.quarterTargets);
  return out;
}
