import { beforeEach, describe, expect, it } from 'vitest';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import type { ApiEnvelope, ImportPreview, Lookups, Project, ProjectDetail, PublicProject, PublicSummary, SessionUser } from '@kpp/domain';
import { createMemoryEnv, nobleCrypto, type MemoryEnv } from '../src/memory';
import { handle } from '../src/core/router';
import { setSuperAdmin } from '../src/core/auth';
import { seedDemoData, seedMasterData } from '../src/core/setup';
import { processInbox } from '../src/core/services/imports';
import { setSetting, SYSTEM_USER, type Ctx } from '../src/core/context';
import { pbkdf2Sha256Hex } from '../src/core/pbkdf2';

const PW = 'Correct-Horse-9';
let env: MemoryEnv;

function call<T = unknown>(action: string, body: Record<string, unknown> = {}, token?: string): ApiEnvelope<T> {
  const res = handle(env, { action, token, device: 'vitest', ...body }) as ApiEnvelope<T>;
  return JSON.parse(JSON.stringify(res)) as ApiEnvelope<T>; // ผ่าน JSON เหมือนจริง
}
function ok<T>(action: string, body: Record<string, unknown> = {}, token?: string): T {
  const r = call<T>(action, body, token);
  if (!r.ok) throw new Error(`${action}: ${r.error?.code} ${r.error?.message}`);
  return r.data as T;
}
function code(action: string, body: Record<string, unknown> = {}, token?: string): string | undefined {
  return call(action, body, token).error?.code;
}
function sysCtx(): Ctx {
  return { env, requestId: 't', user: SYSTEM_USER, device: 't' };
}
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

let lookups: Lookups;
let superToken: string;
const wg = (code: string) => lookups.workgroups.find((g) => g.code === code)!.id;
const fs = (code: string) => lookups.fundingSources.find((f) => f.code === code)!.id;

function registerAndApprove(phone: string, groupCode: string): string {
  ok('auth.requestAccess', { phone, fullName: 'ผู้ใช้ทดสอบ ระบบ', position: 'นักวิชาการส่งเสริมการเกษตร', workgroupId: wg(groupCode), affiliation: 'สนง.เกษตรจังหวัด' });
  const req = ok<Array<{ id: string; phone: string }>>('admin.requests', { status: 'pending' }, superToken).find((r) => r.phone === phone)!;
  ok('admin.decideRequest', { requestId: req.id, approve: true }, superToken);
  return ok<{ token: string }>('auth.login', { phone }).token;
}

beforeEach(() => {
  env = createMemoryEnv(new Date('2026-11-05T05:00:00Z'));
  seedMasterData(sysCtx());
  setSuperAdmin(sysCtx(), 'Krit', PW);
  lookups = ok<Lookups>('public.lookups');
  superToken = ok<{ token: string }>('auth.loginSuper', { username: 'krit', password: PW }).token;
});

describe('pbkdf2', () => {
  it('pure implementation matches @noble/hashes', () => {
    const pure = pbkdf2Sha256Hex((k, m) => Array.from(hmac(sha256, Uint8Array.from(k), Uint8Array.from(m))), 'pässword', 'abcd', 1000);
    expect(pure).toBe(nobleCrypto.pbkdf2Hex('pässword', 'abcd', 1000));
  });
  it('stores only a hash of the super admin password', () => {
    const stored = env.props.get('SUPER_HASH')!;
    expect(stored.startsWith('pbkdf2_sha256$')).toBe(true);
    expect(stored).not.toContain(PW);
  });
});

describe('authentication & RBAC matrix', () => {
  it('unauthenticated and tampered tokens are rejected', () => {
    expect(code('projects.list')).toBe('AUTH_REQUIRED');
    expect(code('projects.list', {}, 'abc.def')).toBe('AUTH_REQUIRED');
    const [body, sig] = superToken.split('.');
    const forged = nobleCrypto.b64urlEncodeUtf8(nobleCrypto.b64urlDecodeUtf8(body).replace('superadmin', 'superadmin '));
    expect(code('projects.list', {}, `${forged}.${sig}`)).toBe('AUTH_REQUIRED');
  });

  it('expired tokens are rejected', () => {
    env.setNow(new Date('2026-11-05T14:00:00Z'));
    expect(code('projects.list', {}, superToken)).toBe('TOKEN_EXPIRED');
  });

  it('pending/unknown numbers cannot log in, approved can (phone-only, ADR-002)', () => {
    ok('auth.requestAccess', { phone: '0812345678', fullName: 'สมชาย ทดสอบ', position: 'นักวิชาการ', workgroupId: wg('PROD'), affiliation: 'x' });
    expect(code('auth.login', { phone: '0812345678' })).toBe('ACCOUNT_PENDING');
    expect(code('auth.login', { phone: '0899999999' })).toBe('ACCOUNT_PENDING'); // same message as pending
    const req = ok<Array<{ id: string }>>('admin.requests', { status: 'pending' }, superToken)[0];
    ok('admin.decideRequest', { requestId: req.id, approve: true }, superToken);
    const login = ok<{ token: string; user: SessionUser }>('auth.login', { phone: '081-234-5678' });
    expect(login.user.role).toBe('admin');
    expect(login.user.workgroupIds).toEqual([wg('PROD')]);
    expect(JSON.stringify(login)).not.toContain('0812345678');
  });

  it('throttles repeated failed phone logins', () => {
    for (let i = 0; i < 5; i++) expect(code('auth.login', { phone: '0811111111' })).toBe('ACCOUNT_PENDING');
    expect(code('auth.login', { phone: '0811111111' })).toBe('LOGIN_THROTTLED');
  });

  it('throttles super admin password guessing', () => {
    for (let i = 0; i < 5; i++) expect(code('auth.loginSuper', { username: 'Krit', password: 'wrong' })).toBe('AUTH_REQUIRED');
    expect(code('auth.loginSuper', { username: 'Krit', password: PW })).toBe('LOGIN_THROTTLED');
  });

  it('suspension revokes existing tokens immediately', () => {
    const t = registerAndApprove('0822222222', 'PROD');
    expect(call('projects.list', {}, t).ok).toBe(true);
    const user = ok<Array<{ id: string; phone: string }>>('admin.users', {}, superToken)[0];
    ok('admin.setUserStatus', { id: user.id, status: 'suspended' }, superToken);
    expect(code('projects.list', {}, t)).toBe('ACCOUNT_SUSPENDED');
    expect(code('auth.login', { phone: '0822222222' })).toBe('ACCOUNT_SUSPENDED');
    ok('admin.setUserStatus', { id: user.id, status: 'active' }, superToken);
    expect(code('projects.list', {}, t)).toBe('TOKEN_REVOKED');
  });

  it('admin is confined to own workgroup (create, read, IDOR) and cannot do super-only actions', () => {
    const t = registerAndApprove('0833333333', 'PROD');
    const mine = ok<Project>('projects.create', { idempotencyKey: 'k1', fundingSourceId: fs('DOAE'), projectCode: 'A-1', name: 'โครงการของฉัน' }, t);
    expect(mine.workgroupId).toBe(wg('PROD'));
    expect(code('projects.create', { idempotencyKey: 'k2', fundingSourceId: fs('DOAE'), workgroupId: wg('STRAT'), projectCode: 'A-2', name: 'ข้ามกลุ่มงาน' }, t)).toBe('FORBIDDEN_SCOPE');
    const other = ok<Project>('projects.create', { idempotencyKey: 'k3', fundingSourceId: fs('DOAE'), workgroupId: wg('STRAT'), projectCode: 'S-1', name: 'ของกลุ่มอื่น' }, superToken);
    expect(code('projects.get', { id: other.id }, t)).toBe('FORBIDDEN_SCOPE');
    expect(code('projects.update', { id: other.id, version: 1, patch: { name: 'แฮ็ก' } }, t)).toBe('FORBIDDEN_SCOPE');
    expect(code('disbursements.create', { projectId: other.id, status: 'PAID', amountSatang: 100, date: '2026-11-01', idempotencyKey: 'x' }, t)).toBe('FORBIDDEN_SCOPE');
    expect(ok<Project[]>('projects.list', {}, t).map((p) => p.id)).toEqual([mine.id]);
    expect(code('admin.users', {}, t)).toBe('FORBIDDEN_SCOPE');
    expect(code('admin.health', {}, t)).toBe('FORBIDDEN_SCOPE');
    expect(code('admin.saveSettings', { settings: { autoCommitClean: 'true' } }, t)).toBe('FORBIDDEN_SCOPE');
    // client-supplied role/scope fields are ignored
    expect(code('admin.users', { role: 'superadmin', workgroupIds: null }, t)).toBe('FORBIDDEN_SCOPE');
  });
});

describe('budget rules, idempotency, conflicts, void-and-replace', () => {
  let p: Project;
  beforeEach(() => {
    p = ok<Project>('projects.create', { idempotencyKey: 'p', fundingSourceId: fs('PROVINCE'), workgroupId: wg('STRAT'), projectCode: 'B-1', name: 'โครงการทดสอบงบ', originalBudgetSatang: 100_000_00 }, superToken);
  });

  it('blocks overspend; super admin may override with reason', () => {
    ok('disbursements.create', { projectId: p.id, status: 'PAID', amountSatang: 60_000_00, date: '2026-11-01', idempotencyKey: 'd1' }, superToken);
    expect(code('disbursements.create', { projectId: p.id, status: 'APPROVED', amountSatang: 50_000_00, date: '2026-11-02', idempotencyKey: 'd2' }, superToken)).toBe('BUDGET_EXCEEDED');
    expect(call('disbursements.create', { projectId: p.id, status: 'APPROVED', amountSatang: 50_000_00, date: '2026-11-02', idempotencyKey: 'd2', overrideReason: 'อนุมัติพิเศษตามหนังสือสั่งการ' }, superToken).ok).toBe(true);
    const d = ok<ProjectDetail>('projects.get', { id: p.id }, superToken);
    expect(d.budget.remaining).toBe(-10_000_00);
    expect(d.audit.some((a) => a.action === 'budget.override')).toBe(true);
  });

  it('duplicate submit with the same idempotency key creates one record', () => {
    const a = ok<{ id: string }>('disbursements.create', { projectId: p.id, status: 'PAID', amountSatang: 1000, date: '2026-11-01', idempotencyKey: 'same' }, superToken);
    const b = ok<{ id: string }>('disbursements.create', { projectId: p.id, status: 'PAID', amountSatang: 1000, date: '2026-11-01', idempotencyKey: 'same' }, superToken);
    expect(a.id).toBe(b.id);
    expect(ok<ProjectDetail>('projects.get', { id: p.id }, superToken).budget.disbursed).toBe(1000);
  });

  it('stale version → VERSION_CONFLICT (no silent overwrite)', () => {
    ok('projects.update', { id: p.id, version: 1, patch: { name: 'แก้ครั้งที่หนึ่ง' } }, superToken);
    const r = call('projects.update', { id: p.id, version: 1, patch: { name: 'แก้ทับ' } }, superToken);
    expect(r.error?.code).toBe('VERSION_CONFLICT');
    expect(ok<ProjectDetail>('projects.get', { id: p.id }, superToken).project.name).toBe('แก้ครั้งที่หนึ่ง');
  });

  it('busy lock → BUSY_RETRY and nothing written', () => {
    env.lock.busy = true;
    expect(code('disbursements.create', { projectId: p.id, status: 'PAID', amountSatang: 1, date: '2026-11-01', idempotencyKey: 'z' }, superToken)).toBe('BUSY_RETRY');
    env.lock.busy = false;
    expect(ok<ProjectDetail>('projects.get', { id: p.id }, superToken).disbursements).toHaveLength(0);
  });

  it('void-and-replace keeps the original amount and reconciles', () => {
    const d = ok<{ id: string }>('disbursements.create', { projectId: p.id, status: 'PAID', amountSatang: 30_000_00, date: '2026-11-01', idempotencyKey: 'v1' }, superToken);
    const t = registerAndApprove('0844444444', 'STRAT');
    expect(code('disbursements.void', { id: d.id, reason: 'พิมพ์ผิด' }, t)).toBe('FORBIDDEN_SCOPE');
    ok('disbursements.void', { id: d.id, reason: 'พิมพ์จำนวนเงินผิด', replacement: { amountSatang: 3_000_00, date: '2026-11-01', status: 'PAID' } }, superToken);
    const det = ok<ProjectDetail>('projects.get', { id: p.id }, superToken);
    const old = det.disbursements.find((x) => x.id === d.id)!;
    expect(old.status).toBe('VOID');
    expect(old.amountSatang).toBe(30_000_00);
    expect(det.disbursements.find((x) => x.replacesId === d.id)?.amountSatang).toBe(3_000_00);
    expect(det.budget.disbursed).toBe(3_000_00);
    expect(det.budget.currentBudget).toBe(det.budget.disbursed + det.budget.remaining);
  });

  it('status only moves forward', () => {
    const d = ok<{ id: string; version: number }>('disbursements.create', { projectId: p.id, status: 'COMMITTED', amountSatang: 100, date: '2026-11-01', idempotencyKey: 's' }, superToken);
    const n = ok<{ version: number }>('disbursements.setStatus', { id: d.id, version: d.version, status: 'PAID' }, superToken);
    expect(code('disbursements.setStatus', { id: d.id, version: n.version, status: 'APPROVED' }, superToken)).toBe('VALIDATION_FAILED');
  });

  it('progress report updates activity and project progress automatically', () => {
    const a = ok<{ id: string }>('activities.create', { projectId: p.id, name: 'กิจกรรม 1', idempotencyKey: 'a1' }, superToken);
    ok('activities.create', { projectId: p.id, name: 'กิจกรรม 2', idempotencyKey: 'a2' }, superToken);
    ok('progress.create', { projectId: p.id, activityId: a.id, progressPct: 100, idempotencyKey: 'pr' }, superToken);
    const det = ok<ProjectDetail>('projects.get', { id: p.id }, superToken);
    expect(det.project.physicalProgress).toBe(50);
    expect(det.activities.find((x) => x.id === a.id)?.status).toBe('COMPLETED');
  });
});

const CSV = [
  'รายงานผลการเบิกจ่าย ปีงบประมาณ 2570',
  'รหัสโครงการ,ชื่อโครงการ,กลุ่มงาน,แหล่งงบ,งบประมาณที่ได้รับ,เบิกจ่ายสะสม',
  'I-1,โครงการนำเข้าหนึ่ง,กลุ่มส่งเสริมและพัฒนาการผลิต,งบจังหวัด,"1,000,000","250,000"',
  'I-2,=HYPERLINK("http://evil"),กลุ่มส่งเสริมและพัฒนาการผลิต,งบจังหวัด,500000,0',
  'I-3,โครงการผิด,ไม่มีกลุ่มนี้,งบจังหวัด,1,0',
].join('\n');

describe('import center', () => {
  it('stages, previews, commits once, blocks duplicates, and stays idempotent', () => {
    const pv = ok<ImportPreview>('imports.upload', { fileName: 'report.csv', mimeType: 'text/csv', base64: b64(CSV) }, superToken);
    expect(pv.job.kind).toBe('BUDGET_SUMMARY');
    expect(pv.summary).toMatchObject({ total: 3, error: 1, newProjects: 2 });
    // ยังไม่มีอะไรเขียนลง Core
    expect(ok<Project[]>('projects.list', {}, superToken)).toHaveLength(0);
    const res = ok<{ committed: number; skipped: number }>('imports.commit', { jobId: pv.job.id, acceptWarnings: false }, superToken);
    expect(res).toMatchObject({ committed: 2, skipped: 1 });
    const list = ok<Array<Project & { budget: { currentBudget: number; disbursed: number } }>>('projects.list', {}, superToken);
    const i1 = list.find((p) => p.projectCode === 'I-1')!;
    expect(i1.budget.currentBudget).toBe(1_000_000_00);
    expect(i1.budget.disbursed).toBe(250_000_00);
    // formula injection: stored as text, never as a live formula
    const raw = env.db.tables.get('Projects')!.find((r) => r.projectCode === 'I-2')!;
    expect(raw.name).toBe('=HYPERLINK("http://evil")');
    // duplicate file
    expect(code('imports.upload', { fileName: 'report.csv', mimeType: 'text/csv', base64: b64(CSV) }, superToken)).toBe('DUPLICATE_IMPORT');
    // forced re-import → no new money
    const again = ok<ImportPreview>('imports.upload', { fileName: 'report.csv', mimeType: 'text/csv', base64: b64(CSV), allowDuplicate: true }, superToken);
    expect(again.summary.budgetDelta).toBe(0);
    expect(again.summary.disbursedDelta).toBe(0);
    // error rows export
    const csv = ok<{ csv: string }>('imports.errorsCsv', { jobId: pv.job.id }, superToken).csv;
    expect(csv).toContain('ไม่มีกลุ่มนี้');
  });

  it('re-plans at commit time with the committer scope', () => {
    const t = registerAndApprove('0855555555', 'STRAT');
    const pv = ok<ImportPreview>('imports.upload', { fileName: 'r.csv', mimeType: 'text/csv', base64: b64(CSV) }, t);
    expect(pv.summary.valid + pv.summary.warning).toBe(0); // all rows are another workgroup
    expect(code('imports.commit', { jobId: pv.job.id, acceptWarnings: true }, t)).toBe('VALIDATION_FAILED');
  });

  it('requires explicit acceptance of warnings', () => {
    const csv = 'ชื่อโครงการ,กลุ่มงาน,งบประมาณ\nไม่มีรหัส,กลุ่มยุทธศาสตร์และสารสนเทศ,100';
    const pv = ok<ImportPreview>('imports.upload', { fileName: 'w.csv', base64: b64(csv), fundingSourceId: fs('DOAE') }, superToken);
    expect(pv.summary.warning).toBe(1);
    expect(code('imports.commit', { jobId: pv.job.id, acceptWarnings: false }, superToken)).toBe('IMPORT_REVIEW_REQUIRED');
    expect(ok<{ committed: number }>('imports.commit', { jobId: pv.job.id, acceptWarnings: true }, superToken).committed).toBe(1);
  });

  it('rejects disguised/unsupported files', () => {
    expect(code('imports.upload', { fileName: 'x.csv', base64: b64('<html><script>alert(1)</script></html>') }, superToken)).toBe('VALIDATION_FAILED');
    expect(code('imports.upload', { fileName: 'x.csv', base64: Buffer.from([0x25, 0x50, 0x44, 0x46, 0, 1]).toString('base64') }, superToken)).toBe('VALIDATION_FAILED');
    setSetting(sysCtx(), 'maxUploadMB', '1');
    expect(code('imports.upload', { fileName: 'big.csv', base64: b64('a,b\n'.repeat(400_000)) }, superToken)).toBe('VALIDATION_FAILED');
  });

  it('Drive inbox: stages files; auto-commits clean files only when enabled', () => {
    const clean = 'รหัสโครงการ,ชื่อโครงการ,กลุ่มงาน,แหล่งงบ,งบประมาณที่ได้รับ\nX-1,โครงการ inbox,กลุ่มอารักขาพืช,งบกรม,1000';
    env.files.inbox.push({ id: 'in1', name: 'inbox.csv', mimeType: 'text/csv', bytes: new TextEncoder().encode(clean) });
    const r1 = processInbox(sysCtx());
    expect(r1[0].result).toContain('รอยืนยัน');
    setSetting(sysCtx(), 'autoCommitClean', 'true');
    env.files.inbox.push({ id: 'in2', name: 'inbox2.csv', mimeType: 'text/csv', bytes: new TextEncoder().encode(clean.replace('X-1', 'X-2')) });
    const r2 = processInbox(sysCtx());
    expect(r2[0].result).toContain('นำเข้าอัตโนมัติ');
  });
});

describe('cover letter upload + OCR (optional)', () => {
  it('rejects disguised files, stores images, and returns suggestions without writing money', () => {
    const p = ok<Project>('projects.create', { idempotencyKey: 'c', fundingSourceId: fs('DOAE'), workgroupId: wg('PROD'), projectCode: 'C-1', name: 'โครงการปะหน้า', originalBudgetSatang: 100_000_00 }, superToken);
    expect(code('files.upload', { projectId: p.id, entityType: 'disbursement', kind: 'COVER_LETTER', fileName: 'a.jpg', mimeType: 'image/jpeg', base64: b64('<svg onload=alert(1)>') }, superToken)).toBe('VALIDATION_FAILED');
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
    const f = ok<{ id: string; driveFileId: string }>('files.upload', { projectId: p.id, entityType: 'disbursement', kind: 'COVER_LETTER', fileName: '../../etc/หนังสือ.jpg', mimeType: 'image/jpeg', base64: jpeg }, superToken);
    const s = ok<{ amount: { value: number }; docNo: { value: string } }>('files.ocrCoverLetter', { attachmentId: f.id }, superToken);
    expect(s.amount.value).toBe(45_500_00);
    expect(s.docNo.value).toBe('กษ 0012/245');
    expect(ok<ProjectDetail>('projects.get', { id: p.id }, superToken).disbursements).toHaveLength(0);
    const d = ok<{ attachmentId: string }>('disbursements.create', { projectId: p.id, status: 'APPROVED', amountSatang: s.amount.value, date: '2026-11-05', docNo: s.docNo.value, attachmentId: f.id, idempotencyKey: 'cl' }, superToken);
    expect(d.attachmentId).toBe(f.id);
    const att = ok<ProjectDetail>('projects.get', { id: p.id }, superToken).attachments[0];
    expect(att.fileName).toBe('หนังสือ.jpg');
    expect(att).not.toHaveProperty('ocrText');
  });
});

describe('public API privacy', () => {
  it('never exposes phone numbers, owner names, Drive IDs or internal notes', () => {
    registerAndApprove('0866666666', 'PROD');
    seedDemoData(sysCtx());
    const s = ok<PublicSummary>('public.summary');
    expect(s.counts.total).toBeGreaterThan(0);
    expect(s.totals.currentBudget).toBe(s.totals.disbursed + s.totals.remaining);
    const list = ok<PublicProject[]>('public.projects');
    const one = ok<PublicProject>('public.project', { id: list[0].id });
    const blob = JSON.stringify([s, list, one, ok('public.lookups')]);
    for (const banned of ['0866666666', '086-xxx', 'ownerName', 'เจ้าหน้าที่ (ข้อมูลสาธิต)', 'driveFileId', 'phone', 'idempotencyKey', 'createdBy']) {
      expect(blob).not.toContain(banned);
    }
  });

  it('unpublished projects are hidden from public', () => {
    const p = ok<Project>('projects.create', { idempotencyKey: 'h', fundingSourceId: fs('DOAE'), workgroupId: wg('PROD'), projectCode: 'H-1', name: 'ภายในเท่านั้น', published: false }, superToken);
    expect(ok<PublicProject[]>('public.projects').some((x) => x.id === p.id)).toBe(false);
    expect(code('public.project', { id: p.id })).toBe('NOT_FOUND');
  });

  it('unknown actions and internal errors do not leak details', () => {
    expect(code('admin.dropTables')).toBe('UNKNOWN_ACTION');
    const r = call('projects.get', { id: { $ne: 1 } }, superToken);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/at \w+ \(|stack/i);
  });
});
