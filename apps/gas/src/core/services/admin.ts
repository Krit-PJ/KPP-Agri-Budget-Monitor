/** งานผู้ดูแล: คำขอสิทธิ์ ผู้ใช้ รายงานการเข้าใช้ audit health ตั้งค่า master data */
import {
  AppError, cleanText, currentFiscalYear, isValidPhone, maskPhone, normalizePhone,
  type AccessRequest, type AuditLog, type HealthData, type ImportJob, type LoginAttempt, type OverviewData, type User, type Workgroup,
  type FundingSource, type Organization, type PlanDoc, type PlanItem,
} from '@kpp/domain';
import { canAccessWorkgroup, phoneHash, requireRole } from '../auth';
import { audit, bumpDataVersion, findById, getSettings, live, newMeta, nowIso, setSetting, type Ctx } from '../context';
import { CELL_LIMIT, SCHEMA_VERSION } from '../schema';
import { buildSummary } from './public';
import { listProjects } from './projects';

export function overview(ctx: Ctx, b: { fiscalYear?: number }): OverviewData {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
  const projects = listProjects(ctx, { fiscalYear: fy });
  const since = new Date(ctx.env.now().getTime() - 86400_000).toISOString();
  const attempts = u.role === 'admin' ? [] : ctx.env.db.list<LoginAttempt>('LoginAttempts').filter((a) => a.at >= since);
  const summary = buildSummary(ctx, fy, false);
  const totals = u.workgroupIds === null ? summary.totals : (() => {
    const s = { ...summary.totals };
    const keys = Object.keys(s) as Array<keyof typeof s>;
    keys.forEach((k) => ((s[k] as number) = 0));
    for (const p of projects) for (const k of keys) if (k !== 'spendingPct') (s[k] as number) += p.budget[k] as number;
    s.spendingPct = s.currentBudget > 0 ? Math.round((s.disbursed / s.currentBudget) * 10000) / 100 : 0;
    return s;
  })();
  return {
    pendingRequests: u.role === 'admin' ? 0 : ctx.env.db.list<AccessRequest>('AccessRequests').filter((r) => r.status === 'pending').length,
    stagedImports: live(ctx.env.db.list<ImportJob>('ImportJobs'))
      .filter((j) => j.status === 'STAGED' && (u.role !== 'admin' || j.createdBy === u.sub || j.channel === 'INBOX'))
      .map(({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt }) => ({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt })),
    risks: projects.filter((p) => p.risks.length).map((p) => ({ projectId: p.id, name: p.name, flags: p.risks })).slice(0, 30),
    newDeviceLogins: attempts.filter((a) => a.newDevice && a.result === 'success').length,
    failedLogins24h: attempts.filter((a) => a.result !== 'success').length,
    recentAudit: ctx.env.db.list<AuditLog>('AuditLogs')
      .filter((l) => u.workgroupIds === null || l.actorId === u.sub)
      .sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 10),
    totals,
    unassignedPlan: (() => {
      const docs = live(ctx.env.db.list<PlanDoc>('PlanDocs')).filter((d) => d.status === 'ACTIVE' && Number(d.fiscalYear) === fy);
      const ids = new Set(docs.map((d) => d.id));
      const open = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => ids.has(i.planDocId) && i.isLeaf && !i.workgroupId);
      return { items: open.length, satang: open.reduce((a, i) => a + Number(i.amountSatang), 0), planDocId: docs[0]?.id ?? '' };
    })(),
  };
}

/* ------------------------------ access requests ----------------------------- */

export function listRequests(ctx: Ctx, b: { status?: string }): AccessRequest[] {
  requireRole(ctx, 'minisuper', 'superadmin');
  const st = cleanText(b.status, 20);
  return ctx.env.db.list<AccessRequest>('AccessRequests')
    .filter((r) => !st || st === 'all' || r.status === st)
    .sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
}

export function decideRequest(ctx: Ctx, b: { requestId: string; approve: boolean; reason?: string; role?: 'admin' | 'minisuper' }): { ok: true } {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const req = ctx.env.db.list<AccessRequest>('AccessRequests').find((r) => r.id === b.requestId);
  if (!req) throw new AppError('NOT_FOUND', 'ไม่พบคำขอ');
  if (req.status !== 'pending') throw new AppError('VALIDATION_FAILED', 'คำขอนี้ได้รับการพิจารณาแล้ว');
  const role: 'admin' | 'minisuper' = b.role === 'minisuper' ? 'minisuper' : 'admin';
  if (role === 'minisuper' && u.role !== 'superadmin') throw new AppError('FORBIDDEN_SCOPE', 'แต่งตั้ง Mini Super Admin ได้เฉพาะ Super Admin');
  const at = nowIso(ctx);
  ctx.env.db.update('AccessRequests', req.id, {
    ...req, status: b.approve ? 'approved' : 'rejected', decidedAt: at, decidedBy: u.name, reason: cleanText(b.reason, 300),
    version: req.version + 1, updatedAt: at, updatedBy: u.sub,
  });
  if (b.approve) {
    const h = phoneHash(ctx, req.phone);
    if (!ctx.env.db.list<User>('Users').some((x) => !x.isDeleted && x.phoneHash === h)) {
      const user: User = {
        ...newMeta(ctx), phone: normalizePhone(req.phone), phoneHash: h, fullName: req.fullName, position: req.position, title: req.title ?? '',
        workgroupId: req.workgroupId, affiliation: req.affiliation, role, status: 'active', scopeWorkgroups: '[]', tokenVersion: 1,
        approvedAt: at, approvedBy: u.name, lastLoginAt: '', knownDevices: '[]',
      };
      ctx.env.db.insert('Users', [user as unknown as Record<string, unknown>]);
      audit(ctx, 'user.create', 'User', user.id, { after: user, reason: `อนุมัติคำขอ ${req.id}` });
    }
  }
  audit(ctx, b.approve ? 'request.approve' : 'request.reject', 'AccessRequest', req.id, { reason: b.reason });
  return { ok: true };
}

/* ----------------------------------- users ---------------------------------- */

export function listUsers(ctx: Ctx): Array<Omit<User, 'phoneHash' | 'knownDevices'>> {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  return live(ctx.env.db.list<User>('Users'))
    .map(({ phoneHash: _h, knownDevices: _d, ...rest }) => ({ ...rest, phone: u.role === 'superadmin' ? rest.phone : maskPhone(rest.phone) }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'th'));
}

export function saveUser(ctx: Ctx, b: { id?: string; phone: string; title?: string; fullName: string; position: string; workgroupId: string; affiliation: string; role: 'admin' | 'minisuper'; scopeWorkgroups?: string[] }): { id: string } {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const phone = normalizePhone(b.phone);
  if (!isValidPhone(phone)) throw new AppError('VALIDATION_FAILED', 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
  const role: 'admin' | 'minisuper' = b.role === 'minisuper' ? 'minisuper' : 'admin';
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  if (!groups.some((g) => g.id === b.workgroupId)) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกกลุ่มงาน');
  const scope = (b.scopeWorkgroups ?? []).filter((id) => groups.some((g) => g.id === id));
  const h = phoneHash(ctx, phone);
  const users = live(ctx.env.db.list<User>('Users'));
  if (users.some((x) => x.phoneHash === h && x.id !== b.id)) throw new AppError('VALIDATION_FAILED', 'หมายเลขนี้มีในระบบแล้ว');
  const fields = {
    phone, phoneHash: h, title: cleanText(b.title, 40), fullName: cleanText(b.fullName, 120), position: cleanText(b.position, 120), workgroupId: b.workgroupId,
    affiliation: cleanText(b.affiliation, 160), role, scopeWorkgroups: JSON.stringify(scope),
  };
  if (fields.fullName.length < 4) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อ-สกุล');
  if (b.id) {
    const cur = findById<User>(ctx, 'Users', b.id, 'ผู้ใช้');
    if ((cur.role === 'minisuper' || role === 'minisuper') && u.role !== 'superadmin') throw new AppError('FORBIDDEN_SCOPE', 'จัดการ Mini Super Admin ได้เฉพาะ Super Admin');
    if (cur.id === u.sub && cur.role !== role) throw new AppError('VALIDATION_FAILED', 'ไม่สามารถเปลี่ยนบทบาทของตนเองได้');
    // เปลี่ยนสิทธิ์/เบอร์ → เพิกถอน token เดิมทันที (แก้เฉพาะคำนำหน้า/ชื่อ/ตำแหน่ง ไม่ต้องออกจากระบบ)
    const authChanged = cur.phoneHash !== fields.phoneHash || cur.role !== role || cur.workgroupId !== fields.workgroupId
      || (cur.scopeWorkgroups || '[]') !== fields.scopeWorkgroups;
    const next = { ...cur, ...fields, tokenVersion: Number(cur.tokenVersion) + (authChanged ? 1 : 0), version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
    ctx.env.db.update('Users', cur.id, next);
    audit(ctx, 'user.update', 'User', cur.id, { before: cur, after: next });
    return { id: cur.id };
  }
  if (role === 'minisuper' && u.role !== 'superadmin') throw new AppError('FORBIDDEN_SCOPE', 'แต่งตั้ง Mini Super Admin ได้เฉพาะ Super Admin');
  const user: User = { ...newMeta(ctx), ...fields, status: 'active', tokenVersion: 1, approvedAt: nowIso(ctx), approvedBy: u.name, lastLoginAt: '', knownDevices: '[]' };
  ctx.env.db.insert('Users', [user as unknown as Record<string, unknown>]);
  audit(ctx, 'user.create', 'User', user.id, { after: user });
  return { id: user.id };
}

export function setUserStatus(ctx: Ctx, b: { id: string; status: 'active' | 'suspended' }): { ok: true } {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const cur = findById<User>(ctx, 'Users', b.id, 'ผู้ใช้');
  if (cur.role === 'minisuper' && u.role !== 'superadmin') throw new AppError('FORBIDDEN_SCOPE', 'จัดการ Mini Super Admin ได้เฉพาะ Super Admin');
  if (cur.id === u.sub) throw new AppError('VALIDATION_FAILED', 'ไม่สามารถระงับบัญชีของตนเองได้');
  const status = b.status === 'suspended' ? 'suspended' : 'active';
  ctx.env.db.update('Users', cur.id, { ...cur, status, tokenVersion: Number(cur.tokenVersion) + 1, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
  audit(ctx, status === 'suspended' ? 'user.suspend' : 'user.activate', 'User', cur.id, { before: { status: cur.status }, after: { status } });
  return { ok: true };
}

export function loginReport(ctx: Ctx, b: { days?: number }): LoginAttempt[] {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const days = Math.min(Math.max(Number(b.days) || 7, 1), 90);
  const since = new Date(ctx.env.now().getTime() - days * 86400_000).toISOString();
  return ctx.env.db.list<LoginAttempt>('LoginAttempts')
    .filter((a) => a.at >= since && (u.role === 'superadmin' || a.role !== 'superadmin'))
    .sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 1000);
}

export function auditList(ctx: Ctx, b: { entityId?: string; limit?: number }): AuditLog[] {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const limit = Math.min(Math.max(Number(b.limit) || 200, 1), 1000);
  return ctx.env.db.list<AuditLog>('AuditLogs')
    .filter((l) => (!b.entityId || l.entityId === b.entityId || l.projectId === b.entityId) && (u.role !== 'admin' || l.actorId === u.sub))
    .sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, limit);
}

export function health(ctx: Ctx, triggers: string[] = []): HealthData {
  requireRole(ctx, 'superadmin');
  const s = getSettings(ctx);
  return {
    setupVersion: ctx.env.props.get('SETUP_VERSION') || SCHEMA_VERSION,
    apiVersion: '1.0.0',
    cellUsage: ctx.env.db.cellUsage().map((c) => ({ ...c, pctOfLimit: Math.round((c.cells / CELL_LIMIT) * 10000) / 100 })),
    triggers,
    lastBackupAt: s.lastBackupAt,
    lockTimeouts24h: Number(ctx.env.cache.get('metric:lockTimeout') || '0'),
    errors24h: Number(ctx.env.cache.get('metric:errors') || '0'),
    settings: { autoCommitClean: s.autoCommitClean, defaultQuarterTargets: s.defaultQuarterTargets, annualTargetPct: s.annualTargetPct, maxUploadMB: s.maxUploadMB, backupRetentionDays: s.backupRetentionDays, publicNotice: s.publicNotice },
  };
}

const EDITABLE_SETTINGS = new Set(['autoCommitClean', 'defaultQuarterTargets', 'annualTargetPct', 'maxUploadMB', 'backupRetentionDays', 'publicNotice']);

export function saveSettings(ctx: Ctx, b: { settings: Record<string, string> }): { ok: true } {
  requireRole(ctx, 'superadmin');
  for (const [k, v] of Object.entries(b.settings ?? {})) {
    if (!EDITABLE_SETTINGS.has(k)) throw new AppError('VALIDATION_FAILED', `ตั้งค่า ${k} ไม่ได้`);
    const val = cleanText(v, 500);
    if (k === 'autoCommitClean' && !['true', 'false'].includes(val)) throw new AppError('VALIDATION_FAILED', 'autoCommitClean ต้องเป็น true/false');
    if ((k === 'maxUploadMB' || k === 'backupRetentionDays') && !(Number(val) > 0 && Number(val) <= 365)) throw new AppError('VALIDATION_FAILED', `${k} ไม่ถูกต้อง`);
    if (k === 'annualTargetPct' && !(Number(val) > 0 && Number(val) <= 100)) throw new AppError('VALIDATION_FAILED', 'เป้าเบิกจ่ายทั้งปีต้องอยู่ระหว่าง 1–100');
    setSetting(ctx, k, val);
  }
  audit(ctx, 'settings.update', 'Settings', 'settings', { after: b.settings });
  bumpDataVersion(ctx);
  return { ok: true };
}

export function saveMaster(ctx: Ctx, b: { table: 'workgroups' | 'organizations' | 'fundingSources'; item: { id?: string; code: string; name: string; orgId?: string; shortName?: string } }): { id: string } {
  const u = requireRole(ctx, 'superadmin');
  const table = ({ workgroups: 'Workgroups', organizations: 'Organizations', fundingSources: 'FundingSources' } as const)[b.table];
  if (!table) throw new AppError('VALIDATION_FAILED', 'ตารางไม่ถูกต้อง');
  const code = cleanText(b.item.code, 40);
  const name = cleanText(b.item.name, 200);
  if (!code || !name) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกรหัสและชื่อ');
  const rows = live(ctx.env.db.list<Workgroup | FundingSource | Organization>(table));
  if (rows.some((r) => r.code.toLowerCase() === code.toLowerCase() && r.id !== b.item.id)) throw new AppError('VALIDATION_FAILED', 'รหัสซ้ำ');
  const extra: Record<string, string> = {};
  if (table === 'Workgroups') {
    const orgs = live(ctx.env.db.list<Organization>('Organizations'));
    if (!orgs.some((o) => o.id === b.item.orgId)) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกหน่วยงาน');
    extra.orgId = String(b.item.orgId);
  }
  if (table === 'FundingSources') extra.shortName = cleanText(b.item.shortName, 60) || name;
  if (b.item.id) {
    const cur = findById<Workgroup>(ctx, table, b.item.id);
    const next = { ...cur, code, name, ...extra, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
    ctx.env.db.update(table, cur.id, next);
    audit(ctx, 'master.update', table, cur.id, { before: cur, after: next });
    bumpDataVersion(ctx);
    return { id: cur.id };
  }
  const row = { ...newMeta(ctx), code, name, ...extra };
  ctx.env.db.insert(table, [row]);
  audit(ctx, 'master.create', table, row.id, { after: row });
  bumpDataVersion(ctx);
  return { id: row.id };
}

/** ใช้ใน import: กลุ่มงานที่ผู้ใช้เข้าถึงได้ */
export function allowedGroups(ctx: Ctx): Set<string> | null {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  if (u.workgroupIds === null) return null;
  return new Set(live(ctx.env.db.list<Workgroup>('Workgroups')).filter((g) => canAccessWorkgroup(u, g.id)).map((g) => g.id));
}

/** เปิด/ปิดการเผยแพร่ข้อมูลของกลุ่มงานบนหน้าสาธารณะ — งานเจ้าหน้าที่ของกลุ่มนั้นยังใช้ได้ตามปกติ */
export function setWorkgroupPublic(ctx: Ctx, b: { id: string; visible: boolean }): { id: string; hidePublic: boolean } {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const cur = findById<Workgroup>(ctx, 'Workgroups', String(b.id), 'กลุ่มงาน');
  if (cur.noActivities) throw new AppError('VALIDATION_FAILED', `${cur.name}ไม่มีข้อมูลโครงการให้เผยแพร่`);
  const hidePublic = !b.visible;
  if (!!cur.hidePublic !== hidePublic) {
    ctx.env.db.update('Workgroups', cur.id, { ...cur, hidePublic, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
    audit(ctx, hidePublic ? 'workgroup.hidePublic' : 'workgroup.showPublic', 'Workgroup', cur.id, { before: { hidePublic: !!cur.hidePublic }, after: { hidePublic } });
    bumpDataVersion(ctx);
  }
  return { id: cur.id, hidePublic };
}
