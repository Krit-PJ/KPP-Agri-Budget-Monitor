/**
 * Import Center: upload → detect → stage → preview → commit (ADR-004)
 * แผนการนำเข้าถูกคำนวณใหม่ตอน commit ด้วยข้อมูลล่าสุดและสิทธิ์ของผู้กด commit
 */
import {
  AppError, cleanText, currentFiscalYear, detectHeader, detectKind, parseRows, planImport, summarizeStaged, toCsv,
  todayBangkok, type Activity, type Allocation, type Disbursement, type FundingSource, type ImportJob, type ImportKind,
  type ImportPreview, type ImportRow, type Mapping, type Project, type StagedRow, type Workgroup,
} from '@kpp/domain';
import { requireRole } from '../auth';
import { actor, audit, bumpDataVersion, findById, getSettings, live, newMeta, nowIso, setSetting, type Ctx } from '../context';
import { allowedGroups } from './admin';
import { decodeUpload, MIME_OF, safeFileName, sniff } from './files';
import { createActivity, createAllocation, createDisbursement, createProject } from './projects';

interface JobMeta {
  rev: number;
  sheetName: string;
  headers: string[];
  headerRow: number;
  headerSpan: number;
  mapping: Mapping;
}

function jobMeta(job: ImportJob): JobMeta {
  try {
    return JSON.parse(job.mapping) as JobMeta;
  } catch {
    return { rev: 1, sheetName: '', headers: [], headerRow: 0, headerSpan: 1, mapping: {} };
  }
}

/** เลือกแท็บที่หัวตารางชัดที่สุด */
function pickTable(tables: Array<{ name: string; rows: unknown[][] }>) {
  let best: { name: string; rows: unknown[][]; det: ReturnType<typeof detectHeader> } | null = null;
  let bestScore = -1;
  for (const t of tables) {
    if (!t.rows.length) continue;
    const det = detectHeader(t.rows);
    const score = Object.keys(det.mapping).length * 10 + (det.kind ? 5 : 0);
    if (score > bestScore) {
      best = { ...t, det };
      bestScore = score;
    }
  }
  return best;
}

function planFor(ctx: Ctx, job: ImportJob, rawRows: unknown[][], meta: JobMeta): StagedRow[] {
  const parsed = parseRows(rawRows, { headerRow: meta.headerRow, headerSpan: meta.headerSpan, mapping: meta.mapping });
  const u = actor(ctx);
  const groups = live(ctx.env.db.list<Workgroup>('Workgroups'));
  return planImport(parsed, {
    kind: job.kind, fiscalYear: Number(job.fiscalYear), fundingSourceId: job.fundingSourceId, fileLabel: job.fileName,
    workgroups: groups, fundingSources: live(ctx.env.db.list<FundingSource>('FundingSources')),
    projects: live(ctx.env.db.list<Project>('Projects')), activities: live(ctx.env.db.list<Activity>('Activities')),
    allocations: live(ctx.env.db.list<Allocation>('Allocations')), disbursements: live(ctx.env.db.list<Disbursement>('Disbursements')),
    allowedWorkgroupIds: allowedGroups(ctx),
    defaultWorkgroupId: u.workgroupIds?.length === 1 ? u.workgroupIds[0] : '',
    today: todayBangkok(ctx.env.now()),
  });
}

/** แถวดิบของ job (sparse ตามเลขแถวเดิม) */
function rawMatrix(ctx: Ctx, job: ImportJob, meta: JobMeta): unknown[][] {
  const rows = ctx.env.db.list<ImportRow>('ImportRows').filter((r) => r.jobId === job.id && r.rowKey.startsWith('raw:'));
  const max = rows.reduce((m, r) => Math.max(m, Number(r.rowNo)), meta.headerRow + meta.headerSpan);
  const matrix: unknown[][] = Array.from({ length: max }, () => []);
  matrix[meta.headerRow] = meta.headers;
  for (const r of rows) {
    try {
      matrix[Number(r.rowNo) - 1] = JSON.parse(r.raw) as unknown[];
    } catch { /* แถวเสีย = ข้าม */ }
  }
  return matrix;
}

function storePlan(ctx: Ctx, job: ImportJob, meta: JobMeta, staged: StagedRow[]): ImportJob {
  ctx.env.db.insert('ImportRows', staged.map((s) => ({
    id: ctx.env.uuid(), jobId: job.id, rowNo: s.rowNo, rowKey: `plan:r${meta.rev}`, status: s.status,
    messages: s.messages.join(' | ').slice(0, 2000), raw: '', normalized: JSON.stringify({ label: s.label, effect: s.effect }).slice(0, 4000), committed: false,
  })));
  const sum = summarizeStaged(staged);
  const next: ImportJob = {
    ...job, mapping: JSON.stringify(meta), totalRows: sum.total, validRows: sum.valid, warningRows: sum.warning, errorRows: sum.error,
    version: job.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub,
  };
  ctx.env.db.update('ImportJobs', job.id, next as unknown as Record<string, unknown>);
  return next;
}

function preview(job: ImportJob, meta: JobMeta, staged: StagedRow[]): ImportPreview {
  return { job, headers: meta.headers, mapping: meta.mapping, rows: staged, summary: summarizeStaged(staged) };
}

function readUpload(ctx: Ctx, b: { fileName: string; base64?: string; sheetUrl?: string }, folder: string) {
  if (b.sheetUrl) {
    const url = cleanText(b.sheetUrl, 500);
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError('VALIDATION_FAILED', 'ลิงก์ Google Sheets ไม่ถูกต้อง');
    const tables = ctx.env.files.readSheetUrl(url);
    return { tables, sha256: ctx.env.crypto.sha256Hex(JSON.stringify(tables)), driveFileId: '', fileName: cleanText(b.fileName, 120) || 'Google Sheets' };
  }
  const bytes = decodeUpload(ctx, String(b.base64 ?? ''));
  const type = sniff(bytes);
  if (!['xlsx', 'xls', 'text'].includes(type)) throw new AppError('VALIDATION_FAILED', 'รองรับไฟล์ CSV, TSV, XLSX, XLS หรือลิงก์ Google Sheets');
  const mime = MIME_OF[type as 'xlsx' | 'xls' | 'text'];
  const fileName = safeFileName(b.fileName, type === 'text' ? 'csv' : type);
  const stored = ctx.env.files.save(folder, fileName, mime, bytes);
  const tables = ctx.env.files.readTables(stored.id, mime);
  return { tables, sha256: stored.sha256, driveFileId: stored.id, fileName };
}

export function stageFile(
  ctx: Ctx,
  b: { fileName: string; mimeType?: string; base64?: string; sheetUrl?: string; fiscalYear?: number; fundingSourceId?: string; kind?: ImportKind; allowDuplicate?: boolean },
  channel: ImportJob['channel'] = 'UPLOAD',
  preloaded?: { tables: Array<{ name: string; rows: unknown[][] }>; sha256: string; driveFileId: string; fileName: string },
): ImportPreview {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
  const up = preloaded ?? readUpload(ctx, b, `01_Imports/Original/FY${fy}`);
  const dup = live(ctx.env.db.list<ImportJob>('ImportJobs')).find((j) => j.sha256 === up.sha256 && ['STAGED', 'COMMITTED', 'PARTIAL'].includes(j.status));
  if (dup && !b.allowDuplicate) {
    throw new AppError('DUPLICATE_IMPORT', `ไฟล์นี้เคยนำเข้าแล้วเมื่อ ${dup.createdAt.slice(0, 10)} (${dup.fileName})`, { jobId: dup.id });
  }
  const table = pickTable(up.tables);
  if (!table) throw new AppError('VALIDATION_FAILED', 'ไม่พบข้อมูลในไฟล์');
  const det = table.det;
  const kind: ImportKind = b.kind ?? det.kind ?? 'BUDGET_SUMMARY';
  const sources = live(ctx.env.db.list<FundingSource>('FundingSources'));
  const fundingSourceId = sources.some((s) => s.id === b.fundingSourceId) ? String(b.fundingSourceId) : '';
  const meta: JobMeta = { rev: 1, sheetName: table.name, headers: det.headers, headerRow: det.headerRow, headerSpan: det.headerSpan, mapping: det.mapping };
  const job: ImportJob = {
    ...newMeta(ctx), fileName: up.fileName, sha256: up.sha256, driveFileId: up.driveFileId, channel, kind, fiscalYear: fy,
    fundingSourceId, headerRow: det.headerRow, mapping: JSON.stringify(meta), status: 'STAGED', totalRows: 0, validRows: 0,
    warningRows: 0, errorRows: 0, committedRows: 0, committedAt: '', committedBy: '',
    message: det.kind ? '' : 'ระบบไม่แน่ใจชนิดข้อมูล — โปรดตรวจการจับคู่คอลัมน์',
  };
  ctx.env.db.insert('ImportJobs', [job as unknown as Record<string, unknown>]);
  // เก็บแถวดิบใน staging เท่านั้น
  const firstData = det.headerRow + det.headerSpan;
  ctx.env.db.insert('ImportRows', table.rows.slice(firstData).map((r, i) => ({
    id: ctx.env.uuid(), jobId: job.id, rowNo: firstData + i + 1, rowKey: 'raw:', status: '', messages: '',
    raw: JSON.stringify(r.slice(0, 60).map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c))).slice(0, 8000), normalized: '', committed: false,
  })).filter((x) => x.raw !== '[]' && !/^\[(""|,|null)*\]$/.test(x.raw)));
  const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
  const saved = storePlan(ctx, job, meta, staged);
  audit(ctx, 'import.stage', 'ImportJob', job.id, { after: { fileName: job.fileName, kind, rows: staged.length, channel } });
  return preview(saved, meta, staged);
}

function loadJob(ctx: Ctx, jobId: string): ImportJob {
  const job = findById<ImportJob>(ctx, 'ImportJobs', String(jobId), 'งานนำเข้า');
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  if (u.role === 'admin' && job.createdBy !== u.sub && job.channel !== 'INBOX') throw new AppError('FORBIDDEN_SCOPE', 'งานนำเข้านี้เป็นของผู้ใช้อื่น');
  return job;
}

export function getImport(ctx: Ctx, b: { jobId: string }): ImportPreview {
  const job = loadJob(ctx, b.jobId);
  const meta = jobMeta(job);
  return preview(job, meta, planFor(ctx, job, rawMatrix(ctx, job, meta), meta));
}

export function listImports(ctx: Ctx): ImportJob[] {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  return live(ctx.env.db.list<ImportJob>('ImportJobs'))
    .filter((j) => u.role !== 'admin' || j.createdBy === u.sub || j.channel === 'INBOX')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}

export function remapImport(ctx: Ctx, b: { jobId: string; mapping?: Partial<Record<string, number>>; fiscalYear?: number; fundingSourceId?: string; kind?: ImportKind }): ImportPreview {
  let job = loadJob(ctx, b.jobId);
  if (job.status !== 'STAGED') throw new AppError('VALIDATION_FAILED', 'งานนี้ไม่ได้อยู่ในสถานะรอยืนยัน');
  const meta = jobMeta(job);
  if (b.mapping) {
    const clean: Mapping = {};
    for (const [k, v] of Object.entries(b.mapping)) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0 && n < meta.headers.length) (clean as Record<string, number>)[k] = n;
    }
    meta.mapping = clean;
  }
  meta.rev += 1;
  const sources = live(ctx.env.db.list<FundingSource>('FundingSources'));
  job = {
    ...job,
    kind: b.kind ?? detectKind(meta.mapping) ?? job.kind,
    fiscalYear: Number(b.fiscalYear) || job.fiscalYear,
    fundingSourceId: b.fundingSourceId !== undefined ? (sources.some((s) => s.id === b.fundingSourceId) ? b.fundingSourceId : '') : job.fundingSourceId,
  };
  const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
  const saved = storePlan(ctx, job, meta, staged);
  return preview(saved, meta, staged);
}

/** commit: วางแผนใหม่ด้วยข้อมูลล่าสุด แล้วเขียนตามแผน (idempotent — กดซ้ำ/ทำต่อได้) */
export function commitImport(ctx: Ctx, b: { jobId: string; acceptWarnings: boolean }): { committed: number; skipped: number; job: ImportJob } {
  const job = loadJob(ctx, b.jobId);
  if (!['STAGED', 'PARTIAL'].includes(job.status)) throw new AppError('VALIDATION_FAILED', 'งานนี้นำเข้าแล้วหรือถูกยกเลิก');
  const meta = jobMeta(job);
  const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
  const sum = summarizeStaged(staged);
  if (sum.warning > 0 && !b.acceptWarnings) {
    throw new AppError('IMPORT_REVIEW_REQUIRED', `มี ${sum.warning} แถวที่ต้องตรวจสอบ — ยืนยันว่าตรวจแล้วก่อนนำเข้า`, sum);
  }
  if (sum.valid + sum.warning === 0) throw new AppError('VALIDATION_FAILED', 'ไม่มีแถวที่นำเข้าได้');
  const started = Date.now();
  const refs = new Map<string, string>();
  let committed = 0;
  let skipped = 0;
  let timedOut = false;
  const failures: string[] = [];
  for (const row of staged) {
    if (row.status === 'ERROR') { skipped++; continue; }
    if (Date.now() - started > 270_000) { timedOut = true; break; } // เหลือเวลาก่อนเพดาน 6 นาที
    const key = `imp:${job.id}:${row.rowNo}`;
    try {
      const p = row.plan;
      if (p.createProject) {
        const created = createProject(ctx, {
          idempotencyKey: `${key}:p`, fiscalYear: p.createProject.fiscalYear, fundingSourceId: p.createProject.fundingSourceId,
          projectCode: p.createProject.projectCode, name: p.createProject.name, workgroupId: p.createProject.workgroupId,
          ownerName: p.createProject.ownerName, startDate: p.createProject.startDate, endDate: p.createProject.endDate,
          status: p.createProject.status, published: true,
        });
        refs.set(p.createProject.ref, created.id);
      }
      if (p.updateProject) {
        const cur = findById<Project>(ctx, 'Projects', p.updateProject.projectId, 'โครงการ');
        ctx.env.db.update('Projects', cur.id, { ...cur, ...p.updateProject.patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
        audit(ctx, 'project.update', 'Project', cur.id, { before: cur, after: p.updateProject.patch, projectId: cur.id, reason: `นำเข้า ${job.fileName}` });
      }
      const resolve = (ref: string) => (ref.startsWith('new:') ? refs.get(ref) ?? '' : ref);
      if (p.createActivity) {
        const a = createActivity(ctx, { idempotencyKey: `${key}:a`, projectId: resolve(p.createActivity.projectRef), activityCode: p.createActivity.activityCode, name: p.createActivity.name });
        refs.set(p.createActivity.ref, a.id);
      }
      p.allocations.forEach((a, i) => createAllocation(ctx, {
        idempotencyKey: `${key}:al${i}`, projectId: resolve(a.projectRef), activityId: resolve(a.activityRef) || undefined,
        type: a.type, amountSatang: a.amountSatang, note: a.note, source: `IMPORT:${job.id}`,
      }));
      p.disbursements.forEach((d, i) => createDisbursement(ctx, {
        idempotencyKey: `${key}:d${i}`, projectId: resolve(d.projectRef), activityId: resolve(d.activityRef) || undefined,
        status: d.status, amountSatang: d.amountSatang, date: d.date, docNo: d.docNo, description: d.description,
        source: `${d.adjust ? 'ADJUST' : 'IMPORT'}:${job.id}`,
      }));
      committed++;
    } catch (e) {
      skipped++;
      failures.push(`แถว ${row.rowNo}: ${(e as Error).message}`);
    }
  }
  const status = timedOut || failures.length ? 'PARTIAL' : 'COMMITTED';
  const at = nowIso(ctx);
  const next: ImportJob = {
    ...job, status, committedRows: committed, committedAt: at, committedBy: actor(ctx).sub,
    message: timedOut ? 'ใช้เวลานาน — กด "นำเข้าต่อ" เพื่อทำส่วนที่เหลือ (ไม่เกิดรายการซ้ำ)' : failures.slice(0, 20).join(' | '),
    version: job.version + 1, updatedAt: at, updatedBy: actor(ctx).sub,
  };
  ctx.env.db.update('ImportJobs', job.id, next as unknown as Record<string, unknown>);
  setSetting(ctx, 'lastImportAt', at);
  audit(ctx, 'import.commit', 'ImportJob', job.id, { after: { committed, skipped, status, failures: failures.slice(0, 20) } });
  bumpDataVersion(ctx);
  return { committed, skipped, job: next };
}

export function cancelImport(ctx: Ctx, b: { jobId: string }): { ok: true } {
  const job = loadJob(ctx, b.jobId);
  if (job.status !== 'STAGED') throw new AppError('VALIDATION_FAILED', 'ยกเลิกได้เฉพาะงานที่รอยืนยัน');
  ctx.env.db.update('ImportJobs', job.id, { ...job, status: 'CANCELLED', version: job.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
  audit(ctx, 'import.cancel', 'ImportJob', job.id);
  return { ok: true };
}

export function errorsCsv(ctx: Ctx, b: { jobId: string }): { fileName: string; csv: string } {
  const job = loadJob(ctx, b.jobId);
  const meta = jobMeta(job);
  const matrix = rawMatrix(ctx, job, meta);
  const staged = planFor(ctx, job, matrix, meta);
  const rows: unknown[][] = [['แถวที่', 'สถานะ', 'รายการ', 'ข้อความ', ...meta.headers]];
  for (const s of staged) {
    if (s.status === 'VALID') continue;
    rows.push([s.rowNo, s.status === 'ERROR' ? 'ผิดพลาด' : 'ต้องตรวจสอบ', s.label, s.messages.join(' | '), ...(matrix[s.rowNo - 1] ?? [])]);
  }
  return { fileName: `errors-${job.fileName.replace(/\.[^.]+$/, '')}.csv`, csv: toCsv(rows) };
}

/** Trigger: ดึงไฟล์จาก Drive Inbox มาเตรียมนำเข้า (และนำเข้าทันทีถ้าเปิด autoCommitClean และไฟล์สะอาด) */
export function processInbox(ctx: Ctx): Array<{ file: string; result: string }> {
  const out: Array<{ file: string; result: string }> = [];
  const settings = getSettings(ctx);
  const fy = currentFiscalYear(ctx.env.now());
  for (const f of ctx.env.files.listInbox()) {
    try {
      const bytes = f.bytes();
      const type = sniff(bytes);
      if (!['xlsx', 'xls', 'text'].includes(type)) {
        ctx.env.files.moveToFolder(f.id, '01_Imports/Rejected');
        out.push({ file: f.name, result: 'ชนิดไฟล์ไม่รองรับ — ย้ายไป Rejected' });
        continue;
      }
      const mime = MIME_OF[type as 'xlsx' | 'xls' | 'text'];
      ctx.env.files.moveToFolder(f.id, `01_Imports/Original/FY${fy}`);
      const tables = ctx.env.files.readTables(f.id, mime);
      const pv = stageFile(ctx, { fileName: f.name, fiscalYear: fy }, 'INBOX', { tables, sha256: ctx.env.crypto.sha256Hex(bytes), driveFileId: f.id, fileName: f.name });
      if (settings.autoCommitClean === 'true' && pv.summary.error === 0 && pv.summary.warning === 0 && pv.summary.valid > 0) {
        const r = commitImport(ctx, { jobId: pv.job.id, acceptWarnings: false });
        out.push({ file: f.name, result: `นำเข้าอัตโนมัติ ${r.committed} แถว` });
      } else out.push({ file: f.name, result: `รอยืนยัน (${pv.summary.valid} ผ่าน, ${pv.summary.warning} ตรวจ, ${pv.summary.error} ผิด)` });
    } catch (e) {
      out.push({ file: f.name, result: `ผิดพลาด: ${(e as Error).message}` });
      if (!(e instanceof AppError && e.code === 'DUPLICATE_IMPORT')) ctx.env.log('error', 'inbox_failed', { file: f.name, message: String((e as Error).message) });
    }
  }
  if (out.length) bumpDataVersion(ctx);
  return out;
}
