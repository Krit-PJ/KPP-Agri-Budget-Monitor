/**
 * Router: authenticate → authorize (ใน service) → scope (ใน service) → execute
 * ทุก action ที่เขียนข้อมูลรันใน script lock และ flush ก่อนปล่อย lock
 */
import { API_VERSION, AppError, BATCH_MAX, PUBLIC_ACTIONS, READ_ACTIONS, type ActionName, type ApiEnvelope, type SessionUser } from '@kpp/domain';
import type { Env } from './env';
import { loginAdmin, loginSuper, logoutAll, requestAccess, verifyToken } from './auth';
import type { Ctx } from './context';
import * as adminSvc from './services/admin';
import * as filesSvc from './services/files';
import * as importsSvc from './services/imports';
import * as projectsSvc from './services/projects';
import * as publicSvc from './services/public';
import * as plansSvc from './services/plans';
import * as reportsSvc from './services/reports';
import * as targetsSvc from './services/targets';
import * as unitsSvc from './services/units';
import * as memosSvc from './services/memos';

type Handler = (ctx: Ctx, body: Record<string, unknown>) => unknown;
interface Route { fn: Handler; write: boolean; limit: 'public' | 'auth' | 'admin' | 'import' }

/* eslint-disable @typescript-eslint/no-explicit-any */
const r = (fn: (ctx: Ctx, b: any) => unknown, write: boolean, limit: Route['limit']): Route => ({ fn, write, limit });
/* eslint-enable @typescript-eslint/no-explicit-any */

export const ROUTES: Record<Exclude<ActionName, 'batch'>, Route> = {
  'public.lookups': r((c) => publicSvc.lookups(c), false, 'public'),
  'public.summary': r(publicSvc.publicSummary, false, 'public'),
  'public.projects': r(publicSvc.publicProjects, false, 'public'),
  'public.project': r(publicSvc.publicProject, false, 'public'),
  'public.report': r(publicSvc.publicReport, false, 'public'),
  // นับผู้เข้าชม: ใช้ lock สั้น ๆ ภายใน service เอง (ไม่ใช้ lock 25 วินาทีของ action เขียนข้อมูล)
  'public.hit': r(publicSvc.visitHit, false, 'public'),
  'auth.requestAccess': r(requestAccess, true, 'auth'),
  'auth.login': r(loginAdmin, true, 'auth'),
  'auth.loginSuper': r(loginSuper, true, 'auth'),
  'auth.me': r((c) => c.user, false, 'admin'),
  'auth.logout': r((c) => { logoutAll(c); return { ok: true }; }, true, 'admin'),
  'profile.get': r((c) => memosSvc.getProfile(c), false, 'admin'),
  'profile.save': r(memosSvc.saveProfile, true, 'admin'),
  'memos.context': r(memosSvc.memoContext, false, 'admin'),
  'memos.get': r(memosSvc.getMemo, false, 'admin'),
  'memos.create': r(memosSvc.createMemo, true, 'admin'),
  'memos.update': r(memosSvc.updateMemo, true, 'admin'),
  'memos.render': r(memosSvc.rerenderMemo, true, 'admin'),
  'memos.groupSettings': r((c) => memosSvc.listGroupSettings(c), false, 'admin'),
  'memos.saveGroupSettings': r(memosSvc.saveGroupSettings, true, 'admin'),
  'budgetCodes.list': r(memosSvc.listBudgetCodes, false, 'admin'),
  'admin.setWorkgroupPublic': r(adminSvc.setWorkgroupPublic, true, 'admin'),
  'admin.overview': r(adminSvc.overview, false, 'admin'),
  'projects.list': r(projectsSvc.listProjects, false, 'admin'),
  'projects.get': r(projectsSvc.getProject, false, 'admin'),
  'projects.create': r(projectsSvc.createProject, true, 'admin'),
  'projects.update': r(projectsSvc.updateProject, true, 'admin'),
  'projects.delete': r(projectsSvc.deleteProject, true, 'admin'),
  'activities.create': r(projectsSvc.createActivity, true, 'admin'),
  'activities.update': r(projectsSvc.updateActivity, true, 'admin'),
  'allocations.create': r(projectsSvc.createAllocation, true, 'admin'),
  'allocations.void': r(projectsSvc.voidAllocation, true, 'admin'),
  'disbursements.entryList': r(unitsSvc.entryActivities, false, 'admin'),
  'disbursements.create': r(projectsSvc.createDisbursement, true, 'admin'),
  'disbursements.setStatus': r(projectsSvc.setDisbursementStatus, true, 'admin'),
  'disbursements.void': r(projectsSvc.voidDisbursement, true, 'admin'),
  'progress.create': r(projectsSvc.createProgress, true, 'admin'),
  'files.upload': r(filesSvc.uploadFile, true, 'import'),
  'files.ocrCoverLetter': r(filesSvc.ocrCoverLetter, true, 'import'),
  'imports.upload': r(importsSvc.stageFile, true, 'import'),
  'imports.remap': r(importsSvc.remapImport, true, 'import'),
  'imports.get': r(importsSvc.getImport, false, 'admin'),
  'imports.list': r((c) => importsSvc.listImports(c), false, 'admin'),
  'imports.commit': r(importsSvc.commitImport, true, 'import'),
  'imports.cancel': r(importsSvc.cancelImport, true, 'admin'),
  'imports.errorsCsv': r(importsSvc.errorsCsv, false, 'admin'),
  'plans.preview': r(plansSvc.previewPlan, true, 'import'),
  'plans.check': r(plansSvc.checkPlan, false, 'import'),
  'plans.commit': r(plansSvc.commitPlan, true, 'import'),
  'plans.list': r(plansSvc.listPlans, false, 'admin'),
  'plans.get': r(plansSvc.getPlan, false, 'admin'),
  'plans.assign': r(plansSvc.assignPlanItems, true, 'admin'),
  'plans.unassign': r(plansSvc.unassignPlanItems, true, 'admin'),
  'activities.setUnits': r(unitsSvc.setActivityUnits, true, 'admin'),
  'activities.setUnitsBulk': r(unitsSvc.setActivityUnitsBulk, true, 'admin'),
  'reports.data': r(reportsSvc.reportData, false, 'admin'),
  'targets.get': r(targetsSvc.getTargets, false, 'admin'),
  'targets.save': r(targetsSvc.saveTargets, true, 'admin'),
  'activities.setDue': r(unitsSvc.setActivityDue, true, 'admin'),
  'admin.requests': r(adminSvc.listRequests, false, 'admin'),
  'admin.decideRequest': r(adminSvc.decideRequest, true, 'admin'),
  'admin.users': r((c) => adminSvc.listUsers(c), false, 'admin'),
  'admin.saveUser': r(adminSvc.saveUser, true, 'admin'),
  'admin.setUserStatus': r(adminSvc.setUserStatus, true, 'admin'),
  'admin.loginReport': r(adminSvc.loginReport, false, 'admin'),
  'admin.audit': r(adminSvc.auditList, false, 'admin'),
  'admin.health': r((c) => adminSvc.health(c, c.env.props.get('TRIGGERS')?.split(',') ?? []), false, 'admin'),
  'admin.saveSettings': r(adminSvc.saveSettings, true, 'admin'),
  'admin.saveMaster': r(adminSvc.saveMaster, true, 'admin'),
  'admin.rebuildSnapshot': r((c) => { if (c.user?.role !== 'superadmin') throw new AppError('FORBIDDEN_SCOPE', 'เฉพาะ Super Admin'); c.env.db.invalidate?.(); return publicSvc.writeSnapshot(c); }, true, 'admin'),
};

const LIMITS: Record<Route['limit'], number> = { public: 1200, auth: 60, admin: 180, import: 30 };

function rateLimit(env: Env, route: Route, who: string): void {
  const bucket = `rl:${route.limit}:${route.limit === 'public' || route.limit === 'auth' ? 'all' : who}:${Math.floor(env.now().getTime() / 60000)}`;
  const n = Number(env.cache.get(bucket) || '0') + 1;
  env.cache.put(bucket, String(n), 120);
  if (n > LIMITS[route.limit]) throw new AppError('QUOTA_RETRY', 'มีการใช้งานหนาแน่น กรุณารอสักครู่แล้วลองใหม่');
}

export interface RpcRequest {
  action?: unknown;
  token?: unknown;
  device?: unknown;
  [k: string]: unknown;
}

export function handle(env: Env, req: RpcRequest): ApiEnvelope<unknown> {
  if (req.action === 'batch') return handleBatch(env, req);
  const requestId = env.uuid();
  const meta = () => ({ requestId, version: API_VERSION, serverTime: env.now().toISOString() });
  const action = String(req.action ?? '') as Exclude<ActionName, 'batch'>;
  try {
    const route = ROUTES[action];
    if (!route) throw new AppError('UNKNOWN_ACTION', 'ไม่รู้จักคำสั่งนี้');
    const { action: _a, token, device, ...body } = req;
    const ctx: Ctx = { env, requestId, user: null, device: String(device ?? '').slice(0, 200) };
    if (!PUBLIC_ACTIONS.has(action)) ctx.user = verifyToken(ctx, token) as SessionUser;
    rateLimit(env, route, ctx.user?.sub ?? 'public');
    const run = () => route.fn(ctx, body);
    const data = route.write ? env.lock.withLock(() => { const out = run(); env.db.flush?.(); return out; }) : run();
    return { ok: true, data: data ?? null, meta: meta(), error: null };
  } catch (e) {
    if (e instanceof AppError) {
      if (e.code === 'BUSY_RETRY') env.cache.put('metric:lockTimeout', String(Number(env.cache.get('metric:lockTimeout') || '0') + 1), 86400);
      return { ok: false, data: null, meta: meta(), error: { code: e.code, message: e.message, details: e.code === 'VERSION_CONFLICT' || e.code === 'IMPORT_REVIEW_REQUIRED' || e.code === 'BUDGET_EXCEEDED' || e.code === 'DUPLICATE_IMPORT' ? e.details : undefined } };
    }
    env.cache.put('metric:errors', String(Number(env.cache.get('metric:errors') || '0') + 1), 86400);
    env.log('error', 'unhandled', { requestId, action, message: String((e as Error)?.message ?? e).slice(0, 500) });
    return { ok: false, data: null, meta: meta(), error: { code: 'INTERNAL_ERROR', message: `เกิดข้อผิดพลาดภายในระบบ (รหัสอ้างอิง ${requestId.slice(0, 8)})` } };
  }
}

/**
 * batch: รันคำขออ่านหลายรายการใน execution เดียว (Apps Script มีเวลาเริ่มต้นราว 1–1.5 วินาทีต่อคำขอ)
 * แต่ละรายการตรวจสิทธิ์และจำกัดอัตราแยกกัน ผลเป็น envelope ต่อรายการ; action ที่เขียนข้อมูลใช้ใน batch ไม่ได้
 */
function handleBatch(env: Env, req: RpcRequest): ApiEnvelope<unknown> {
  const calls = Array.isArray(req.calls) ? (req.calls as RpcRequest[]) : [];
  const meta = { requestId: env.uuid(), version: API_VERSION, serverTime: env.now().toISOString() };
  if (!calls.length || calls.length > BATCH_MAX) {
    return { ok: false, data: null, meta, error: { code: 'VALIDATION_FAILED', message: `batch ต้องมี 1–${BATCH_MAX} รายการ` } };
  }
  const data = calls.map((c) => {
    const a = String(c?.action ?? '') as ActionName;
    if (!READ_ACTIONS.has(a)) return { ok: false, data: null, meta, error: { code: 'VALIDATION_FAILED' as const, message: 'ใช้ batch ได้เฉพาะคำขออ่านข้อมูล' } };
    return handle(env, { ...c, action: a, token: req.token, device: req.device });
  });
  return { ok: true, data, meta, error: null };
}
