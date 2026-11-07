/**
 * หน่วยดำเนินการ (ADR-006): สำนักงานเกษตรจังหวัด + สำนักงานเกษตรอำเภอ 11 อำเภอ
 * - กิจกรรมแบ่งงบ/เป้าให้หน่วยได้ (ActivityUnits) ผลรวมงบต้องเท่างบกิจกรรม
 * - งบที่ไม่ได้แบ่ง และรายการเบิกจ่ายที่ไม่ระบุหน่วย นับเป็นของสำนักงานเกษตรจังหวัด
 * - แผนการเบิกจ่าย ณ เดือนใด ๆ: เป้าหมายการเบิกจ่ายของปีงบ (ADR-007 ฉบับแก้ไข 7 พ.ย.)
 */
import {
  AppError, MEETING_RE, areaName, computeBudget, pct, planAt, splitEqual, splitMoney,
  type Activity, type ActivityUnit, type Allocation, type BudgetSummary, type Disbursement, type EntryActivity, type PlanActivityState,
  type Project, type ReportRow, type Satang, type Unit, type UnitShareInput,
} from '@kpp/domain';
import { canAccessWorkgroup, requireRole, requireWorkgroup } from '../auth';
import { audit, bumpDataVersion, curveFor, findById, live, newMeta, nowIso, type Ctx } from '../context';
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
    dueMonth: Number(a.dueMonth) || 0,
  };
}

/**
 * แผนการเบิกจ่ายสะสม ณ สิ้นเดือน m = งบ × เป้าหมายการเบิกจ่ายของปี (ตามที่ตั้งค่าไว้เท่านั้น)
 * กำหนดเบิกครบรายกิจกรรม (dueMonth / อบรม = มิ.ย.) ใช้เตือน ไม่เปลี่ยนเป้าบนแถบ — ตัวเลขทุกจุดจึงตรงกับเป้าที่ตั้ง
 */
export function activityPlan(budget: Satang, _a: Pick<Activity, 'name' | 'planQuarters' | 'dueMonth'> | null, curve: number[], m: number): Satang {
  return planAt(budget, curve, 0, m);
}

/** กำหนดเบิกครบของกิจกรรม (ใช้เตือน): 1–12, 0 = ค่าเริ่มต้น (อบรม/ประชุม = มิ.ย.), -1 = ไม่มีกำหนดเฉพาะ */
export function setActivityDue(ctx: Ctx, b: { activityId: string; dueMonth: number }): PlanActivityState {
  const a = findById<Activity>(ctx, 'Activities', String(b.activityId), 'กิจกรรม');
  const p = findById<Project>(ctx, 'Projects', a.projectId, 'โครงการ');
  const actor = requireWorkgroup(ctx, p.workgroupId).sub;
  const d = Number(b.dueMonth);
  if (!Number.isInteger(d) || d < -1 || d > 12) throw new AppError('VALIDATION_FAILED', 'เดือนที่ต้องเบิกครบไม่ถูกต้อง');
  const before = Number(a.dueMonth) || 0;
  if (before !== d) {
    ctx.env.db.update('Activities', a.id, { ...a, dueMonth: d, version: a.version + 1, updatedAt: nowIso(ctx), updatedBy: actor });
    audit(ctx, 'activity.due', 'Activity', a.id, { before: { dueMonth: before }, after: { dueMonth: d }, projectId: p.id });
    bumpDataVersion(ctx);
  }
  return activityState(ctx, { ...a, dueMonth: d });
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
    // เป้าหมายรายพื้นที่ต้องรวมเท่าเป้าหมายทั้งสิ้น (เฉพาะกิจกรรมที่มีเป้าหมาย)
    const target = Math.round(Number(a.targetQty) || 0);
    const qtySum = clean.reduce((s, x) => s + x.targetQty, 0);
    if (target > 0 && qtySum !== target) {
      throw new AppError('VALIDATION_FAILED', `ผลรวมเป้าหมาย ${qtySum.toLocaleString('th-TH')} ไม่เท่าเป้าหมายทั้งสิ้น ${target.toLocaleString('th-TH')} ${a.unit}`);
    }
  }
  // งบของแต่ละพื้นที่ต้องไม่ต่ำกว่ายอดที่เบิกจ่ายไปแล้วในพื้นที่นั้น
  const paoId = provinceUnitId(units);
  const spent = new Map<string, number>();
  for (const d of live(ctx.env.db.list<Disbursement>('Disbursements')).filter((x) => x.activityId === a.id && (x.status === 'APPROVED' || x.status === 'PAID'))) {
    spent.set(d.unitId || paoId, (spent.get(d.unitId || paoId) ?? 0) + Number(d.amountSatang));
  }
  for (const x of clean) {
    const used = spent.get(x.unitId) ?? 0;
    if (x.budgetSatang < used) {
      throw new AppError('VALIDATION_FAILED', `งบของ${areaName(units.find((u) => u.id === x.unitId))} ต่ำกว่ายอดที่เบิกจ่ายแล้ว ${(used / 100).toLocaleString('th-TH')} บาท`);
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
      throw new AppError('VALIDATION_FAILED', `${areaName(units.find((u) => u.id === uid))} มีรายการเบิกจ่ายแล้ว เอาออกไม่ได้`);
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

/** หลายกิจกรรมพร้อมกัน: แบ่งงบเท่ากัน (บาทเต็มเมื่อทำได้) ให้หน่วยที่เลือก (ข้ามรายการที่แบ่งไม่ได้ เช่น มีเบิกจ่ายในหน่วยอื่นแล้ว) */
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
      const shares = splitMoney(st.budget, ordered.length);
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

  const curves = new Map<number, number[]>();
  const curveOf = (fy: number) => curves.get(fy) ?? curves.set(fy, curveFor(ctx, fy)).get(fy)!;
  const rows: ReportRow[] = [];
  const emit = (p: Project, a: Activity | null, allocs: Allocation[], disbs: Disbursement[]) => {
    const total = computeBudget(allocs, []).currentBudget;
    const curve = curveOf(Number(p.fiscalYear));
    const planTotal = activityPlan(total, a, curve, m);
    const qTotals = [3, 6, 9, 12].map((mm) => activityPlan(total, a, curve, mm));
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
        planQ: qTotals.map((q) => (total ? Math.round((q * budget) / total) : 0)),
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
export function summarizeRows(rows: ReportRow[]): BudgetSummary & { plan: Satang; planQ: Satang[] } {
  let budget = 0, committed = 0, disbursed = 0, plan = 0;
  const planQ = [0, 0, 0, 0];
  for (const r of rows) {
    r.planQ?.forEach((v, i) => { planQ[i] += v; });
    budget += r.budget;
    committed += r.committed;
    disbursed += r.disbursed;
    plan += r.plan;
  }
  return {
    originalBudget: budget, transferIn: 0, transferOut: 0, currentBudget: budget, committed, disbursed, paid: 0,
    remaining: budget - disbursed, spendingPct: pct(disbursed, budget), plan, planQ,
  };
}

/** แผนการเบิกจ่ายสะสมรายเดือน (สตางค์) 12 เดือน ของชุดโครงการ — ใช้กติกาเดียวกับ activityPlan */
export function planSeries(ctx: Ctx, ds: Dataset, projects: Project[]): Satang[] {
  const out = new Array<number>(12).fill(0);
  const ids = new Set(projects.map((p) => p.id));
  const byProject = new Map(projects.map((p) => [p.id, p]));
  const budgetOf = new Map<string, Allocation[]>();
  for (const x of ds.allocations) if (ids.has(x.projectId)) (budgetOf.get(x.activityId || `P:${x.projectId}`) ?? budgetOf.set(x.activityId || `P:${x.projectId}`, []).get(x.activityId || `P:${x.projectId}`)!).push(x);
  const curves = new Map<number, number[]>();
  const curveOf = (fy: number) => curves.get(fy) ?? curves.set(fy, curveFor(ctx, fy)).get(fy)!;
  const add = (budget: number, a: Activity | null, curve: number[]) => {
    for (let m = 1; m <= 12; m++) out[m - 1] += activityPlan(budget, a, curve, m);
  };
  for (const a of ds.activities) {
    const p = byProject.get(a.projectId);
    if (p) add(computeBudget(budgetOf.get(a.id) ?? [], []).currentBudget, a, curveOf(Number(p.fiscalYear)));
  }
  for (const p of projects) add(computeBudget(budgetOf.get(`P:${p.id}`) ?? [], []).currentBudget, null, curveOf(Number(p.fiscalYear)));
  return out;
}

/**
 * ข้อมูลสำหรับหน้า "บันทึกผลการเบิกจ่าย": กิจกรรมในขอบเขตของผู้ใช้ พร้อมงบ/ยอดใช้รายพื้นที่ และประวัติการเบิก
 * ครั้งที่ = ลำดับตามวันที่ (แล้วตามเวลาบันทึก) ของรายการที่ไม่ถูกยกเลิก — ระบบเลขให้เอง
 */
export function entryActivities(ctx: Ctx, b: { fiscalYear: number }): EntryActivity[] {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear);
  const projects = live(ctx.env.db.list<Project>('Projects'))
    .filter((p) => Number(p.fiscalYear) === fy && p.status !== 'CANCELLED' && canAccessWorkgroup(u, p.workgroupId));
  const pids = new Set(projects.map((p) => p.id));
  const acts = live(ctx.env.db.list<Activity>('Activities')).filter((a) => pids.has(a.projectId) && a.status !== 'CANCELLED');
  const allocs = live(ctx.env.db.list<Allocation>('Allocations')).filter((x) => pids.has(x.projectId));
  const disbs = live(ctx.env.db.list<Disbursement>('Disbursements')).filter((x) => pids.has(x.projectId));
  const shares = activityUnitsOf(ctx);
  const pao = provinceUnitId(listUnits(ctx));
  const out: EntryActivity[] = [];
  const emit = (p: Project, a: Activity | null) => {
    const aid = a?.id ?? '';
    const al = allocs.filter((x) => x.projectId === p.id && (x.activityId || '') === aid);
    const di = disbs.filter((x) => x.projectId === p.id && (x.activityId || '') === aid);
    const bud = computeBudget(al, di);
    const live_ = di.filter((x) => x.status !== 'VOID')
      .sort((x, y) => (x.date === y.date ? x.createdAt.localeCompare(y.createdAt) : x.date.localeCompare(y.date)));
    const unitShares = a ? shares.filter((s) => s.activityId === a.id) : [];
    const usedOf = (unitId: string) => live_.filter((x) => (x.unitId || pao) === unitId).reduce((s, x) => s + x.amountSatang, 0);
    const units = unitShares.length
      ? unitShares.map((s) => ({ unitId: s.unitId, budget: s.budgetSatang, used: usedOf(s.unitId) }))
      : [{ unitId: pao, budget: bud.currentBudget, used: usedOf(pao) }];
    out.push({
      activityId: aid, projectId: p.id, projectCode: p.projectCode, projectName: p.name, activityName: a?.name ?? 'งบระดับโครงการ',
      workgroupId: p.workgroupId, budget: bud.currentBudget, disbursed: bud.disbursed, committed: bud.committed, units,
      history: live_.map((x, i) => ({ id: x.id, no: i + 1, date: x.date, amountSatang: x.amountSatang, docNo: x.docNo, unitId: x.unitId || pao, status: x.status, hasFile: !!x.attachmentId })),
    });
  };
  for (const p of projects) {
    const pa = acts.filter((a) => a.projectId === p.id);
    for (const a of pa) emit(p, a);
    // งบที่ยังไม่แยกกิจกรรม (หรือโครงการที่ไม่มีกิจกรรม)
    if (!pa.length || allocs.some((x) => x.projectId === p.id && !x.activityId)) emit(p, null);
  }
  return out;
}
