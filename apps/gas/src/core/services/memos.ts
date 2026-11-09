/**
 * บันทึกข้อความ "ตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ"
 * - ตัวเลขทุกจำนวน (งบ/เบิกมาแล้ว/คงเหลือ) คำนวณจากฐานข้อมูลฝั่ง server — ไม่เชื่อค่าจากหน้าเว็บ
 * - บันทึก = รายการเบิกจ่ายสถานะ APPROVED (นับเป็นเบิกจ่ายแล้วทันที) + Google Doc + PDF ใน Drive
 * - ระบบไม่ออกเลขหนังสือ: เจ้าหน้าที่กรอกเลขเอง ต่อท้าย prefix ของกลุ่ม
 */
import {
  AppError, MEMO_DEFAULT_TO, matchBudgetCodes, type BudgetCodeEntry, type BudgetCodeMatch, MEMO_SUBJECT, areaName, cleanText, computeBudget, memoDocNo, memoOverrideStale, validateMemo, withTitle,
  type Activity, type Allocation, type Disbursement, type FundingSource, type Memo, type MemoContext, type MemoData,
  type MemoRecord, type MyProfile, type PlanItem, type Project, type User, type Workgroup, type WorkgroupMemoSettings,
} from '@kpp/domain';
import { canAccessWorkgroup, requireRole, requireWorkgroup } from '../auth';
import { audit, findById, findByIdempotency, live, newMeta, nowIso, type Ctx } from '../context';
import { createDisbursement, today, voidDisbursement } from './projects';
import { listUnits, provinceUnitId } from './units';
import { safeFileName } from './files';

const DEFAULT_EXPENSES = [
  'ค่าจัดซื้อวัสดุสนับสนุน', 'ค่าใช้จ่ายในการจัดอบรม', 'ค่าใช้จ่ายในการจัดประชุม', 'ค่าใช้จ่ายในการจัดงานวันถ่ายทอดเทคโนโลยี',
  'ค่าใช้จ่ายในการเดินทางไปราชการ', 'ค่าจ้างเหมาบริการ', 'ค่าวัสดุการเกษตร', 'ค่าวัสดุสำนักงาน',
];

/* --------------------------------- profile --------------------------------- */

function superProfile(ctx: Ctx): { title: string; fullName: string; position: string } {
  try {
    return { title: '', fullName: '', position: '', ...(JSON.parse(ctx.env.props.get('SUPER_PROFILE') || '{}') as object) };
  } catch {
    return { title: '', fullName: '', position: '' };
  }
}

export function getProfile(ctx: Ctx): MyProfile {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  if (u.role === 'superadmin') {
    const p = superProfile(ctx);
    return { ...p, workgroupId: '', workgroupName: 'ทุกกลุ่มงาน', complete: !!(p.fullName && p.position) };
  }
  const row = findById<User>(ctx, 'Users', u.sub, 'ผู้ใช้');
  return {
    title: row.title ?? '', fullName: row.fullName, position: row.position, workgroupId: row.workgroupId,
    workgroupName: groups.find((g) => g.id === row.workgroupId)?.name ?? '',
    complete: !!((row.title || /^(นาย|นาง|นางสาว|ว่าที่|ดร\.)/.test(row.fullName)) && row.fullName && row.position),
  };
}

export function saveProfile(ctx: Ctx, b: { title: string; fullName: string; position: string }): MyProfile {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const next = { title: cleanText(b.title, 40), fullName: cleanText(b.fullName, 120), position: cleanText(b.position, 120) };
  if (next.fullName.length < 4) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อ-สกุล');
  if (!next.position) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกตำแหน่ง');
  if (u.role === 'superadmin') {
    ctx.env.props.set('SUPER_PROFILE', JSON.stringify(next));
    audit(ctx, 'profile.update', 'User', u.sub, { after: next });
    return getProfile(ctx);
  }
  const cur = findById<User>(ctx, 'Users', u.sub, 'ผู้ใช้');
  // แก้ข้อมูลส่วนตัว ไม่เปลี่ยนสิทธิ์ → ไม่เพิกถอน token
  ctx.env.db.update('Users', cur.id, { ...cur, ...next, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
  audit(ctx, 'profile.update', 'User', cur.id, { before: { title: cur.title, fullName: cur.fullName, position: cur.position }, after: next });
  return getProfile(ctx);
}

/* ----------------------------- group settings ------------------------------ */

function toSettings(g: Workgroup): WorkgroupMemoSettings {
  return {
    id: g.id, code: g.code, name: g.name, memoOrg: g.memoOrg ?? '', memoFax: g.memoFax ?? '', memoPrefix: g.memoPrefix ?? '',
    headName: g.headName ?? '', headPosition: g.headPosition ?? '', headLine2: g.headLine2 ?? '',
  };
}

export function listGroupSettings(ctx: Ctx): WorkgroupMemoSettings[] {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  return live(ctx.env.db.list<Workgroup>('Workgroups')).filter((g) => !g.noActivities && canAccessWorkgroup(u, g.id)).map(toSettings);
}

export function saveGroupSettings(ctx: Ctx, b: WorkgroupMemoSettings): WorkgroupMemoSettings {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const cur = findById<Workgroup>(ctx, 'Workgroups', String(b.id), 'กลุ่มงาน');
  const patch = {
    memoOrg: cleanText(b.memoOrg, 200), memoFax: cleanText(b.memoFax, 40), memoPrefix: cleanText(b.memoPrefix, 40),
    headName: cleanText(b.headName, 120), headPosition: cleanText(b.headPosition, 120), headLine2: cleanText(b.headLine2, 160),
  };
  const next = { ...cur, ...patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
  ctx.env.db.update('Workgroups', cur.id, next);
  audit(ctx, 'workgroup.memoSettings', 'Workgroup', cur.id, { before: toSettings(cur), after: patch });
  return toSettings(next);
}

/* ---------------------------------- context --------------------------------- */

interface Facts {
  project: Project; activity: Activity; group: Workgroup | undefined; fund: FundingSource | undefined;
  mainActivityName: string; budget: number; previous: number;
  /** รหัสจากฐานข้อมูลรหัสงบประมาณ (ตรงกับแผน) — มาก่อนรหัสที่เคยกรอกไว้กับกิจกรรม */
  codes: { budgetCode: string; mainActivityCode: string; source: 'CODEBOOK' | 'ACTIVITY' | ''; ref: string };
}

/** ข้อมูลจริงจากฐานข้อมูล; previous = ยอดเบิก (ไม่รวม VOID) ทุกอำเภอ — ฉบับแก้ไขนับเฉพาะรายการก่อนบันทึกฉบับแรก */
function facts(ctx: Ctx, projectId: string, activityId: string, before?: { id: string; at: string }): Facts {
  const project = findById<Project>(ctx, 'Projects', String(projectId), 'โครงการ');
  requireWorkgroup(ctx, project.workgroupId);
  if (!activityId) throw new AppError('VALIDATION_FAILED', 'บันทึกข้อความต้องเลือกกิจกรรม');
  const activity = findById<Activity>(ctx, 'Activities', String(activityId), 'กิจกรรม');
  if (activity.projectId !== project.id) throw new AppError('VALIDATION_FAILED', 'กิจกรรมไม่อยู่ในโครงการนี้');
  const allocs = live(ctx.env.db.list<Allocation>('Allocations')).filter((x) => x.projectId === project.id && x.activityId === activity.id);
  const disbs = live(ctx.env.db.list<Disbursement>('Disbursements')).filter((x) => x.projectId === project.id && x.activityId === activity.id);
  const budget = computeBudget(allocs, disbs).currentBudget;
  const prior = before
    ? disbs.filter((x) => x.id !== before.id && x.status !== 'VOID' && x.createdAt < before.at)
    : disbs.filter((x) => x.status !== 'VOID');
  const previous = prior.reduce((s, x) => s + Number(x.amountSatang), 0);
  // ชื่อกิจกรรม (ระดับ "กิจกรรม" ในแผน) จากเส้นทางของรายการย่อย
  let mainActivityName = '';
  let match: BudgetCodeMatch | null = null;
  if (activity.planItemId) {
    const items = live(ctx.env.db.list<PlanItem>('PlanItems'));
    const leaf = items.find((i) => i.id === activity.planItemId);
    const node = leaf && items.find((i) => i.planDocId === leaf.planDocId && i.seq === leaf.activitySeq && i.id !== leaf.id);
    mainActivityName = node?.name ?? '';
    if (leaf) {
      const bySeq = new Map(items.filter((i) => i.planDocId === leaf.planDocId).map((i) => [Number(i.seq), i]));
      const chain: Array<{ kind: string; name: string }> = [];
      for (let n: PlanItem | undefined = leaf; n && chain.length < 20; n = Number(n.parentSeq) ? bySeq.get(Number(n.parentSeq)) : undefined) chain.unshift({ kind: n.kind, name: n.name });
      match = matchBudgetCodes(live(ctx.env.db.list<BudgetCodeEntry & { isDeleted?: boolean }>('BudgetCodes')), Number(project.fiscalYear), chain);
    }
  }
  const codes: Facts['codes'] = match
    ? { budgetCode: match.budgetCode, mainActivityCode: match.mainActivityCode, source: 'CODEBOOK', ref: match.ref }
    : activity.budgetCode || activity.mainActivityCode
      ? { budgetCode: activity.budgetCode ?? '', mainActivityCode: activity.mainActivityCode ?? '', source: 'ACTIVITY', ref: 'บันทึกไว้กับกิจกรรม' }
      : { budgetCode: '', mainActivityCode: '', source: '', ref: '' };
  return {
    project, activity, mainActivityName, budget, previous, codes,
    group: live(ctx.env.db.list<Workgroup>('Workgroups')).find((g) => g.id === project.workgroupId),
    fund: live(ctx.env.db.list<FundingSource>('FundingSources')).find((f) => f.id === project.fundingSourceId),
  };
}

function fundLabel(f: FundingSource | undefined): string {
  const n = (f?.name || f?.shortName || '').trim();
  if (!n) return '';
  return n.startsWith('งบ') ? n : `งบ${n}`;
}

function signerOf(ctx: Ctx): MemoData['signer'] {
  const p = getProfile(ctx);
  return { name: withTitle(p.title, p.fullName), position: p.position };
}

/** ฟิลด์ที่ระบบเติมเอง (ทับค่าที่หน้าเว็บส่งมาเสมอ) */
function autoFields(ctx: Ctx, f: Facts): Partial<MemoData> {
  return {
    subject: MEMO_SUBJECT,
    projectName: f.project.name,
    mainActivityName: f.mainActivityName,
    subActivityName: f.activity.name,
    fund: fundLabel(f.fund),
    budgetSatang: f.budget,
    previousSatang: f.previous,
    signer: signerOf(ctx),
  };
}

function unitRefName(ctx: Ctx, unitId: string): string {
  const u = listUnits(ctx).find((x) => x.id === unitId);
  if (!u || u.kind === 'PROVINCE') return '';
  return `อำเภอ${areaName(u)}`;
}

export function memoContext(ctx: Ctx, b: { projectId: string; activityId: string; unitId?: string }): MemoContext {
  const f = facts(ctx, b.projectId, b.activityId);
  const g = f.group;
  const units = listUnits(ctx);
  const unitId = b.unitId || provinceUnitId(units);
  const draft: MemoData = {
    orgLine: g?.memoOrg || `${g?.name ?? ''} สำนักงานเกษตรจังหวัดกำแพงเพชร`.trim(),
    fax: g?.memoFax ?? '', docPrefix: g?.memoPrefix ?? '', docNumber: '', date: today(ctx), to: MEMO_DEFAULT_TO, subject: MEMO_SUBJECT,
    refNo: '', refDate: '', refFrom: unitRefName(ctx, unitId), expense: '',
    projectName: '', mainActivityName: '', fund: '', budgetCode: f.codes.budgetCode, mainActivityCode: f.codes.mainActivityCode,
    subActivityName: '', budgetSatang: 0, previousSatang: 0, requestSatang: 0,
    checks: { ok: false, returnFix: false, returnReason: '', forward: false },
    signer: { name: '', position: '' },
    head: { name: g?.headName ?? '', position: g?.headPosition ?? '', line2: g?.headLine2 ?? '' },
    align: 'left', thaiNumerals: true,
    ...autoFields(ctx, f),
  };
  const mine = live(ctx.env.db.list<Memo>('Memos')).slice(-200);
  const used = mine.map((m) => { try { return (JSON.parse(m.data) as MemoData).expense; } catch { return ''; } }).filter(Boolean);
  const profile = getProfile(ctx);
  return {
    draft,
    codesSaved: !!(f.codes.budgetCode && f.codes.mainActivityCode),
    codesRef: f.codes.ref,
    expenseSuggestions: [...new Set([...used.reverse(), ...DEFAULT_EXPENSES])].slice(0, 30),
    units: units.map((u) => ({ id: u.id, name: u.kind === 'PROVINCE' ? 'ระดับจังหวัด (สนง.เกษตรจังหวัด)' : `อำเภอ${areaName(u)}` })),
    profileComplete: profile.complete,
    groupConfigured: !!(g?.memoPrefix && g?.headName),
  };
}

/* ------------------------------ create / update ----------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** รับเฉพาะฟิลด์ที่ผู้ใช้กรอกได้ แล้วทับด้วยข้อมูลจากระบบ */
function sanitize(ctx: Ctx, input: MemoData, f: Facts, keepSigner?: MemoData['signer']): MemoData {
  const i = input ?? ({} as MemoData);
  const s = (v: unknown, n: number) => cleanText(v, n);
  const code = (v: unknown) => s(v, 40).replace(/\s+/g, '');
  const body = Array.isArray(i.bodyOverride) ? i.bodyOverride.map((x) => s(x, 2000)).filter(Boolean).slice(0, 20) : [];
  const d: MemoData = {
    orgLine: s(i.orgLine, 200), fax: s(i.fax, 40), docPrefix: s(i.docPrefix, 40), docNumber: s(i.docNumber, 40),
    date: ISO.test(String(i.date)) ? String(i.date) : '', to: s(i.to, 120) || MEMO_DEFAULT_TO, subject: MEMO_SUBJECT,
    refNo: s(i.refNo, 80), refDate: ISO.test(String(i.refDate)) ? String(i.refDate) : '', refFrom: s(i.refFrom, 120),
    expense: s(i.expense, 200), projectName: '', mainActivityName: '', fund: '',
    budgetCode: f.codes.budgetCode || code(i.budgetCode), mainActivityCode: f.codes.mainActivityCode || code(i.mainActivityCode),
    subActivityName: '', budgetSatang: 0, previousSatang: 0, requestSatang: Math.round(Number(i.requestSatang) || 0),
    checks: {
      ok: !!i.checks?.ok, returnFix: !!i.checks?.returnFix, returnReason: s(i.checks?.returnReason, 300), forward: !!i.checks?.forward,
    },
    signer: { name: '', position: '' },
    head: { name: s(i.head?.name, 120), position: s(i.head?.position, 120), line2: s(i.head?.line2, 160) },
    align: i.align === 'justify' ? 'justify' : 'left', thaiNumerals: !!i.thaiNumerals,
    bodyOverride: body.length ? body : undefined,
    ...autoFields(ctx, f),
  };
  if (keepSigner) d.signer = keepSigner;
  if (d.budgetCode && !/^\d{20}$/.test(d.budgetCode)) throw new AppError('VALIDATION_FAILED', 'รหัสงบประมาณต้องเป็นตัวเลข 20 หลัก');
  if (d.mainActivityCode && !/^\d{17}$/.test(d.mainActivityCode)) throw new AppError('VALIDATION_FAILED', 'รหัสกิจกรรมหลักต้องเป็นตัวเลข 17 หลัก');
  const errors = validateMemo(d);
  if (errors.length) throw new AppError('VALIDATION_FAILED', errors.join(' · '));
  if (memoOverrideStale(d)) {
    throw new AppError('VALIDATION_FAILED', 'ข้อความที่แก้ไขมียอดเงินไม่ตรงกับยอดล่าสุด — กด "ใช้ข้อความอัตโนมัติ" หรือแก้ตัวเลขให้ตรง');
  }
  return d;
}

/** จำรหัสงบ/รหัสกิจกรรมหลักไว้กับกิจกรรม (กรอกครั้งแรกครั้งเดียว) */
function rememberCodes(ctx: Ctx, a: Activity, d: MemoData): void {
  if ((a.budgetCode || !d.budgetCode) && (a.mainActivityCode || !d.mainActivityCode)) return;
  const cur = findById<Activity>(ctx, 'Activities', a.id, 'กิจกรรม');
  const patch = { budgetCode: cur.budgetCode || d.budgetCode, mainActivityCode: cur.mainActivityCode || d.mainActivityCode };
  ctx.env.db.update('Activities', cur.id, { ...cur, ...patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: ctx.user?.sub ?? '' });
  audit(ctx, 'activity.codes', 'Activity', cur.id, { projectId: cur.projectId, after: patch });
}

/**
 * จำผู้ลงนามฝั่งขวา (หัวหน้ากลุ่ม/ผู้รักษาการ) ล่าสุดไว้กับกลุ่มงาน — ฉบับถัดไปเติมให้อัตโนมัติ
 * และเติมเบอร์โทรศัพท์/ส่วนหน้าเลขที่/ส่วนราชการ ถ้ากลุ่มยังไม่ได้ตั้งค่า
 */
function rememberHead(ctx: Ctx, workgroupId: string, d: Pick<MemoData, 'head' | 'fax' | 'docPrefix' | 'orgLine'>): void {
  const g = live(ctx.env.db.list<Workgroup>('Workgroups')).find((x) => x.id === workgroupId);
  if (!g) return;
  const patch: Partial<Workgroup> = {};
  const set = <K extends 'headName' | 'headPosition' | 'headLine2' | 'memoFax' | 'memoPrefix' | 'memoOrg'>(k: K, v: string, onlyIfEmpty = false) => {
    const val = cleanText(v, 200);
    if (!val || (g[k] ?? '') === val || (onlyIfEmpty && g[k])) return;
    patch[k] = val;
  };
  set('headName', d.head?.name ?? '');
  set('headPosition', d.head?.position ?? '');
  if ((d.head?.name ?? '') && (g.headLine2 ?? '') !== cleanText(d.head?.line2 ?? '', 200)) patch.headLine2 = cleanText(d.head?.line2 ?? '', 200);
  set('memoFax', d.fax, true);
  set('memoPrefix', d.docPrefix, true);
  set('memoOrg', d.orgLine, true);
  if (!Object.keys(patch).length) return;
  ctx.env.db.update('Workgroups', g.id, { ...g, ...patch, version: g.version + 1, updatedAt: nowIso(ctx), updatedBy: ctx.user?.sub ?? '' });
  audit(ctx, 'workgroup.memoRemember', 'Workgroup', g.id, { before: { headName: g.headName, headPosition: g.headPosition, headLine2: g.headLine2 }, after: patch });
}

/** บันทึกผู้ลงนามฝั่งขวาของกลุ่มจากหน้าบันทึกข้อความ (เจ้าหน้าที่ของกลุ่มนั้น) */
export function saveMemoHead(ctx: Ctx, b: { projectId: string; head: MemoData['head']; fax?: string }): WorkgroupMemoSettings {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  if (!cleanText(b.head?.name, 120)) throw new AppError('VALIDATION_FAILED', 'กรุณากรอกชื่อหัวหน้ากลุ่ม/ผู้รักษาการ');
  rememberHead(ctx, p.workgroupId, { head: b.head, fax: '', docPrefix: '', orgLine: '' });
  if (b.fax !== undefined) {
    const g = findById<Workgroup>(ctx, 'Workgroups', p.workgroupId, 'กลุ่มงาน');
    const fax = cleanText(b.fax, 40);
    if ((g.memoFax ?? '') !== fax) ctx.env.db.update('Workgroups', g.id, { ...g, memoFax: fax, version: g.version + 1, updatedAt: nowIso(ctx), updatedBy: ctx.user?.sub ?? '' });
  }
  return toSettings(findById<Workgroup>(ctx, 'Workgroups', p.workgroupId, 'กลุ่มงาน'));
}

const docUrl = (id: string) => (id && !id.startsWith('mem-') ? `https://docs.google.com/document/d/${id}/edit` : '');
const pdfUrl = (id: string) => (id && !id.startsWith('mem-') ? `https://drive.google.com/file/d/${id}/view` : '');

function toRecord(ctx: Ctx, m: Memo): MemoRecord {
  const disb = ctx.env.db.list<Disbursement>('Disbursements').find((x) => x.id === m.disbursementId);
  let data: MemoData;
  try { data = JSON.parse(m.data) as MemoData; } catch { data = {} as MemoData; }
  return {
    id: m.id, version: Number(m.version), projectId: m.projectId, activityId: m.activityId, disbursementId: m.disbursementId, unitId: m.unitId,
    docNo: m.docNo, date: m.date, amountSatang: Number(m.amountSatang), revision: Number(m.revision) || 1, status: disb?.status ?? 'VOID',
    docUrl: docUrl(m.docFileId), pdfUrl: pdfUrl(m.pdfFileId), renderStatus: m.renderStatus, renderError: m.renderError,
    data, createdAt: m.createdAt, updatedAt: m.updatedAt,
  };
}

/** สร้าง Doc + PDF; ไม่สำเร็จก็ไม่ยกเลิกการบันทึก (กด "สร้างไฟล์อีกครั้ง" ได้) */
function render(ctx: Ctx, m: Memo, d: MemoData, p: Project): Memo {
  const rev = Number(m.revision) || 1;
  const base = safeFileName(`บันทึกตรวจสอบเอกสาร_${memoDocNo(d).replace(/\//g, '-')}_${d.date}${rev > 1 ? `_ฉบับแก้ไข${rev}` : ''}`, 'doc');
  const folder = `02_Project_Evidence/FY${p.fiscalYear}/${safeFileName(p.projectCode, 'x')}/บันทึกข้อความ`;
  let patch: Partial<Memo>;
  try {
    const r = ctx.env.files.renderMemo(folder, base, d);
    patch = { docFileId: r.docId, pdfFileId: r.pdfId, renderStatus: 'OK', renderError: '' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.env.log('error', 'memo.render', { memoId: m.id, msg });
    patch = { renderStatus: 'ERROR', renderError: cleanText(msg, 300) };
  }
  const next = { ...m, ...patch };
  ctx.env.db.update('Memos', m.id, next);
  return next;
}

export function createMemo(ctx: Ctx, b: { projectId: string; activityId: string; unitId?: string; data: MemoData; idempotencyKey: string }): MemoRecord {
  const key = `memo:${String(b.idempotencyKey)}`;
  const prev = findByIdempotency<Disbursement>(ctx, 'Disbursements', key);
  if (prev) {
    const m = live(ctx.env.db.list<Memo>('Memos')).find((x) => x.disbursementId === prev.id);
    if (m) return toRecord(ctx, m);
  }
  const f = facts(ctx, b.projectId, b.activityId);
  const d = sanitize(ctx, b.data, f);
  const docNo = memoDocNo(d);
  const dup = live(ctx.env.db.list<Memo>('Memos')).find((m) => m.docNo === docNo && ctx.env.db.list<Disbursement>('Disbursements').some((x) => x.id === m.disbursementId && x.status !== 'VOID'));
  if (dup) throw new AppError('VALIDATION_FAILED', `เลขที่หนังสือ ${docNo} ถูกใช้แล้ว`);
  const disb = createDisbursement(ctx, {
    projectId: f.project.id, activityId: f.activity.id, unitId: b.unitId || undefined, status: 'APPROVED', amountSatang: d.requestSatang,
    date: d.date, docNo, description: `บันทึกข้อความ: ${d.expense}`.slice(0, 500), idempotencyKey: key, source: 'MEMO',
  });
  rememberCodes(ctx, f.activity, d);
  rememberHead(ctx, f.project.workgroupId, d);
  const memo: Memo = {
    ...newMeta(ctx), projectId: f.project.id, activityId: f.activity.id, disbursementId: disb.id, unitId: disb.unitId, docNo, date: d.date,
    amountSatang: d.requestSatang, data: JSON.stringify(d), revision: 1, docFileId: '', pdfFileId: '', renderStatus: 'PENDING', renderError: '',
  };
  ctx.env.db.insert('Memos', [memo as unknown as Record<string, unknown>]);
  audit(ctx, 'memo.create', 'Memo', memo.id, { projectId: f.project.id, after: { docNo, amount: d.requestSatang, disbursementId: disb.id } });
  return toRecord(ctx, render(ctx, memo, d, f.project));
}

export function getMemo(ctx: Ctx, b: { id: string }): MemoRecord {
  const m = findById<Memo>(ctx, 'Memos', String(b.id), 'บันทึกข้อความ');
  const p = findById<Project>(ctx, 'Projects', m.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  return toRecord(ctx, m);
}

export function updateMemo(ctx: Ctx, b: { id: string; version: number; data: MemoData; reason?: string }): MemoRecord {
  const cur = findById<Memo>(ctx, 'Memos', String(b.id), 'บันทึกข้อความ');
  if (Number(b.version) !== Number(cur.version)) throw new AppError('VERSION_CONFLICT', 'บันทึกนี้ถูกแก้ไขโดยผู้อื่น — โหลดใหม่ก่อนแก้ไข');
  let disb = findById<Disbursement>(ctx, 'Disbursements', cur.disbursementId, 'รายการเบิกจ่าย');
  if (disb.status === 'VOID') throw new AppError('VALIDATION_FAILED', 'รายการเบิกจ่ายนี้ถูกยกเลิกแล้ว แก้ไขบันทึกไม่ได้');
  const f = facts(ctx, cur.projectId, cur.activityId, { id: disb.id, at: cur.createdAt });
  // ผู้ลงนามคงเป็นผู้จัดทำบันทึกเดิม เว้นแต่ผู้จัดทำแก้เอง (จะใช้ข้อมูลของฉันล่าสุด)
  let oldSigner: MemoData['signer'] | undefined;
  try { oldSigner = (JSON.parse(cur.data) as MemoData).signer; } catch { oldSigner = undefined; }
  const d = sanitize(ctx, b.data, f, ctx.user?.sub === cur.createdBy ? undefined : oldSigner);
  const docNo = memoDocNo(d);
  const moneyChanged = d.requestSatang !== Number(cur.amountSatang) || d.date !== cur.date || docNo !== cur.docNo;
  if (moneyChanged) {
    const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
    if (u.role !== 'superadmin') {
      throw new AppError('FORBIDDEN_SCOPE', 'เปลี่ยนยอดเงิน วันที่ หรือเลขที่หนังสือ ได้เฉพาะ Super Admin (ระบบจะยกเลิกรายการเดิมและบันทึกรายการใหม่แทน)');
    }
    const reason = cleanText(b.reason, 300) || `แก้ไขบันทึกข้อความ ${cur.docNo}`;
    const r = voidDisbursement(ctx, {
      id: disb.id, reason, replacement: { amountSatang: d.requestSatang, date: d.date, docNo, description: disb.description, status: 'APPROVED' },
    });
    disb = r.replacement!;
  }
  rememberCodes(ctx, f.activity, d);
  rememberHead(ctx, f.project.workgroupId, d);
  const next: Memo = {
    ...cur, disbursementId: disb.id, docNo, date: d.date, amountSatang: d.requestSatang, data: JSON.stringify(d),
    revision: (Number(cur.revision) || 1) + 1, renderStatus: 'PENDING', version: Number(cur.version) + 1, updatedAt: nowIso(ctx), updatedBy: ctx.user?.sub ?? '',
  };
  ctx.env.db.update('Memos', cur.id, next);
  audit(ctx, 'memo.update', 'Memo', cur.id, { projectId: cur.projectId, before: { docNo: cur.docNo, amount: cur.amountSatang, revision: cur.revision }, after: { docNo, amount: d.requestSatang, revision: next.revision } });
  return toRecord(ctx, render(ctx, next, d, f.project));
}

export function rerenderMemo(ctx: Ctx, b: { id: string }): MemoRecord {
  const m = findById<Memo>(ctx, 'Memos', String(b.id), 'บันทึกข้อความ');
  const p = findById<Project>(ctx, 'Projects', m.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  return toRecord(ctx, render(ctx, m, JSON.parse(m.data) as MemoData, p));
}

/** ฐานข้อมูลรหัสงบประมาณของปี (อ่านอย่างเดียว — แก้ไขในชีต BudgetCodes ได้โดยผู้ดูแลระบบ) */
export function listBudgetCodes(ctx: Ctx, b: { fiscalYear: number }): Array<BudgetCodeEntry & { id: string; source: string }> {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const order: Record<string, number> = { REGULAR: 0, OTHER: 1, SUBSIDY: 2, INVESTMENT: 3 };
  const num = (s: string) => s.split('.').map((x) => x.padStart(3, '0')).join('.');
  return live(ctx.env.db.list<BudgetCodeEntry & { id: string; source: string; isDeleted?: boolean }>('BudgetCodes'))
    .filter((r) => Number(r.fiscalYear) === Number(b.fiscalYear))
    .map(({ isDeleted: _d, ...r }) => ({ ...r, fiscalYear: Number(r.fiscalYear) }))
    .sort((a, c) => (order[a.section] ?? 9) - (order[c.section] ?? 9) || num(a.activityNo).localeCompare(num(c.activityNo)));
}
