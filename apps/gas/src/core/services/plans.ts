/**
 * แผนงบประมาณตามปีงบประมาณ (เช่น แบบ คง.2 ที่กรมฯ จัดสรร)
 * 1) นำเข้าแผน (Excel/CSV/Google Sheets หรือ PDF → OCR ร่าง) → ตรวจยอดทุกระดับ → บันทึกเป็นฐานข้อมูลแผน
 * 2) กลุ่มงานเลือก "กิจกรรมย่อยสุดท้าย" ที่รับผิดชอบ — 1 รายการ ได้ 1 กลุ่มงาน (กิจกรรมหลักใช้ร่วมกันได้)
 * 3) เมื่อเลือก ระบบสร้างโครงการของกลุ่มงาน (ต่อ 1 โครงการในแผน) + กิจกรรม + งบที่ได้รับจัดสรร ให้อัตโนมัติ
 */
import {
  AppError, cleanText, parsePlanTable, parsePlanText, planToTable,
  type Activity, type Allocation, type Disbursement, type FundingSource, type ParsedPlan, type PlanDoc, type PlanDetail, type PlanDocSummary, type PlanItem,
  type PlanPreview, type Project, type Workgroup,
} from '@kpp/domain';
import { canAccessWorkgroup, requireRole } from '../auth';
import { audit, bumpDataVersion, findById, live, newMeta, nowIso, type Ctx } from '../context';
import { decodeUpload, MIME_OF, safeFileName, sniff } from './files';
import { createActivity, createAllocation, createProject, withPlanLink } from './projects';

const toTable = (rows: unknown[][]) => rows.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))));

/** อ่านไฟล์แผน → ตาราง + ผลตรวจ (ยังไม่บันทึก) */
export function previewPlan(ctx: Ctx, b: { fileName: string; base64?: string; sheetUrl?: string }): PlanPreview {
  requireRole(ctx, 'minisuper', 'superadmin');
  if (b.sheetUrl) {
    const url = cleanText(b.sheetUrl, 500);
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError('VALIDATION_FAILED', 'ลิงก์ Google Sheets ไม่ถูกต้อง');
    const tables = ctx.env.files.readSheetUrl(url);
    const best = bestTable(tables.map((t) => t.rows));
    return { table: toTable(best.rows), parsed: best.parsed, sourceFileId: '', sourceFileName: 'Google Sheets', fromOcr: false };
  }
  const bytes = decodeUpload(ctx, String(b.base64 ?? ''));
  const type = sniff(bytes);
  if (!['xlsx', 'xls', 'text', 'pdf', 'jpeg', 'png'].includes(type)) throw new AppError('VALIDATION_FAILED', 'รองรับ Excel, CSV, Google Sheets หรือ PDF/รูปเอกสารแผน');
  const mime = MIME_OF[type as keyof typeof MIME_OF];
  const name = safeFileName(b.fileName, type === 'text' ? 'csv' : type);
  const stored = ctx.env.files.save('00_System/plans', name, mime, bytes);
  if (type === 'pdf' || type === 'jpeg' || type === 'png') {
    let text = '';
    try {
      text = ctx.env.files.ocr(stored.id);
    } catch {
      throw new AppError('IMPORT_REVIEW_REQUIRED', 'อ่านข้อความจากเอกสารไม่สำเร็จ — กรุณาใช้ไฟล์ Excel/CSV ตามแม่แบบ (ไฟล์ต้นฉบับถูกเก็บไว้แล้ว)');
    }
    const parsed = parsePlanText(text);
    return { table: planToTable(parsed), parsed, sourceFileId: stored.id, sourceFileName: name, fromOcr: true };
  }
  const best = bestTable(ctx.env.files.readTables(stored.id, mime).map((t) => t.rows));
  return { table: toTable(best.rows), parsed: best.parsed, sourceFileId: stored.id, sourceFileName: name, fromOcr: false };
}

function bestTable(tables: unknown[][][]): { rows: unknown[][]; parsed: ParsedPlan } {
  let best: { rows: unknown[][]; parsed: ParsedPlan } | null = null;
  for (const rows of tables) {
    if (!rows.length) continue;
    const parsed = parsePlanTable(rows);
    if (!best || parsed.leafCount > best.parsed.leafCount) best = { rows, parsed };
  }
  if (!best || !best.parsed.nodes.length) throw new AppError('VALIDATION_FAILED', 'ไม่พบรายการแผนงาน/โครงการในไฟล์ — ตรวจว่ามีคอลัมน์ รายการ, หน่วยนับ, ปริมาณงาน, งบประมาณ');
  return best;
}

/** บันทึกแผน — ตรวจซ้ำที่ server เสมอ; มี ERROR บันทึกไม่ได้; WARNING ต้องยืนยัน */
export function commitPlan(ctx: Ctx, b: {
  fiscalYear: number; fundingSourceId: string; round?: number; title?: string; docNo?: string; docDate?: string; budgetType?: string;
  table: unknown[][]; sourceFileId?: string; sourceFileName?: string; acceptWarnings: boolean;
}): PlanDoc {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear);
  if (!Number.isInteger(fy) || fy < 2560 || fy > 2650) throw new AppError('VALIDATION_FAILED', 'ปีงบประมาณไม่ถูกต้อง');
  if (!live(ctx.env.db.list<FundingSource>('FundingSources')).some((f) => f.id === b.fundingSourceId)) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกแหล่งงบ');
  if (!Array.isArray(b.table) || b.table.length > 5000) throw new AppError('VALIDATION_FAILED', 'ข้อมูลแผนไม่ถูกต้อง');
  const parsed = parsePlanTable(b.table.map((r) => (Array.isArray(r) ? r.slice(0, 20).map((c) => cleanText(c, 1000)) : [])));
  const errors = parsed.issues.filter((i) => i.level === 'ERROR');
  if (errors.length) throw new AppError('VALIDATION_FAILED', `แผนมีข้อผิดพลาด ${errors.length} รายการ แก้ไขก่อนบันทึก`, errors.slice(0, 20));
  if (!parsed.leafCount) throw new AppError('VALIDATION_FAILED', 'ไม่พบรายการกิจกรรมย่อยในแผน');
  const warnings = parsed.issues.filter((i) => i.level === 'WARNING').length;
  if (warnings && !b.acceptWarnings) throw new AppError('IMPORT_REVIEW_REQUIRED', `มี ${warnings} รายการที่ต้องตรวจ — ยืนยันว่าตรวจแล้วก่อนบันทึก`);
  const round = Math.max(1, Math.min(20, Number(b.round) || 1));

  // แผนเดิมของปี/แหล่งงบ/งวดเดียวกัน: แทนที่ได้เฉพาะเมื่อยังไม่มีกลุ่มงานเลือกรายการ
  const prev = live(ctx.env.db.list<PlanDoc>('PlanDocs')).find((d) => d.status === 'ACTIVE' && Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId && Number(d.round) === round);
  if (prev) {
    const taken = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === prev.id && i.workgroupId);
    if (taken.length) throw new AppError('VALIDATION_FAILED', `แผนปี ${fy} งวดที่ ${round} มีกลุ่มงานเลือกรายการแล้ว ${taken.length} รายการ — ให้นำเข้าเป็นงวดใหม่ หรือยกเลิกการเลือกก่อน`);
    ctx.env.db.update('PlanDocs', prev.id, { ...prev, status: 'REPLACED', version: prev.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
  }
  const fs = live(ctx.env.db.list<FundingSource>('FundingSources')).find((f) => f.id === b.fundingSourceId)!;
  const doc: PlanDoc = {
    ...newMeta(ctx), fiscalYear: fy, fundingSourceId: b.fundingSourceId, round,
    title: cleanText(b.title, 200) || `แผนงบประมาณ ${fs.name} ปี ${fy} งวดที่ ${round}`,
    docNo: cleanText(b.docNo, 80), docDate: cleanText(b.docDate, 20), budgetType: cleanText(b.budgetType, 60) || 'งบดำเนินงาน',
    totalSatang: parsed.computedTotal, leafCount: parsed.leafCount, sourceFileId: cleanText(b.sourceFileId, 100),
    sourceFileName: cleanText(b.sourceFileName, 200), status: 'ACTIVE', note: '',
  };
  ctx.env.db.insert('PlanDocs', [doc]);
  ctx.env.db.insert('PlanItems', parsed.nodes.map((n) => ({
    ...newMeta(ctx), planDocId: doc.id, fiscalYear: fy, seq: n.seq, parentSeq: n.parentSeq, depth: n.depth, kind: n.kind,
    number: n.number, name: n.name, unit: n.unit, quantity: n.quantity ?? 0, amountSatang: n.amountSatang ?? 0, isLeaf: n.isLeaf,
    planIndex: n.planIndex, projectSeq: n.projectSeq, activitySeq: n.activitySeq, code: n.code,
    workgroupId: '', projectId: '', activityId: '', assignedAt: '', assignedBy: '',
  })));
  audit(ctx, 'plan.import', 'PlanDoc', doc.id, { after: { title: doc.title, fiscalYear: fy, total: doc.totalSatang, leaves: doc.leafCount, replaced: prev?.id ?? '' } });
  bumpDataVersion(ctx);
  return doc;
}

export function listPlans(ctx: Ctx, b: { fiscalYear?: number }): PlanDocSummary[] {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear) || 0;
  const items = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.isLeaf && i.workgroupId);
  return live(ctx.env.db.list<PlanDoc>('PlanDocs'))
    .filter((d) => d.status === 'ACTIVE' && (!fy || Number(d.fiscalYear) === fy))
    .map((d) => {
      const mine = items.filter((i) => i.planDocId === d.id);
      const groups = new Map<string, { workgroupId: string; count: number; satang: number }>();
      for (const i of mine) {
        const g = groups.get(i.workgroupId) ?? { workgroupId: i.workgroupId, count: 0, satang: 0 };
        g.count++;
        g.satang += Number(i.amountSatang);
        groups.set(i.workgroupId, g);
      }
      return { ...d, assignedCount: mine.length, assignedSatang: mine.reduce((a, i) => a + Number(i.amountSatang), 0), groups: [...groups.values()] };
    })
    .sort((a, b2) => b2.fiscalYear - a.fiscalYear || a.round - b2.round);
}

export function getPlan(ctx: Ctx, b: { id: string }): PlanDetail {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const doc = findById<PlanDoc>(ctx, 'PlanDocs', String(b.id), 'แผนงบประมาณ');
  const items = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === doc.id).sort((x, y) => x.seq - y.seq);
  return { doc, items };
}

/* --------------------------------- assignment -------------------------------- */

function projectCodeFor(doc: PlanDoc, projectNode: PlanItem, wg: Workgroup): string {
  return `P${projectNode.planIndex}-${projectNode.number || projectNode.seq}-${wg.code}`;
}

/** เลือกรายการย่อยสุดท้ายให้กลุ่มงาน — รายการที่กลุ่มอื่นเลือกแล้วจะไม่ถูกเปลี่ยน */
export function assignPlanItems(ctx: Ctx, b: { itemIds: string[]; workgroupId: string }): { assigned: number; skipped: Array<{ id: string; reason: string }> } {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const wg = live(ctx.env.db.list<Workgroup>('Workgroups')).find((g) => g.id === b.workgroupId);
  if (!wg) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกกลุ่มงาน');
  if (!canAccessWorkgroup(u, wg.id)) throw new AppError('FORBIDDEN_SCOPE', 'เลือกรายการให้กลุ่มงานอื่นไม่ได้');
  const ids = [...new Set((b.itemIds ?? []).map(String))].slice(0, 300);
  if (!ids.length) throw new AppError('VALIDATION_FAILED', 'ยังไม่ได้เลือกรายการ');
  const all = live(ctx.env.db.list<PlanItem>('PlanItems'));
  const skipped: Array<{ id: string; reason: string }> = [];
  let assigned = 0;
  for (const id of ids) {
    const item = all.find((i) => i.id === id);
    if (!item) { skipped.push({ id, reason: 'ไม่พบรายการ' }); continue; }
    if (!item.isLeaf) { skipped.push({ id, reason: 'เลือกได้เฉพาะกิจกรรมย่อยสุดท้าย' }); continue; }
    if (item.workgroupId === wg.id) continue; // เลือกไว้แล้ว (กดซ้ำได้)
    if (item.workgroupId) { skipped.push({ id, reason: 'กลุ่มงานอื่นเลือกรายการนี้แล้ว' }); continue; }
    const doc = findById<PlanDoc>(ctx, 'PlanDocs', item.planDocId, 'แผนงบประมาณ');
    if (doc.status !== 'ACTIVE') { skipped.push({ id, reason: 'แผนนี้ถูกแทนที่แล้ว' }); continue; }
    const projectNode = all.find((i) => i.planDocId === doc.id && i.seq === item.projectSeq) ?? item;
    const planNode = all.find((i) => i.planDocId === doc.id && i.planIndex === item.planIndex && i.kind === 'PLAN');

    // โครงการของกลุ่มงานนี้ภายใต้โครงการเดียวกันในแผน (สร้างครั้งแรกที่เลือก)
    let project = live(ctx.env.db.list<Project>('Projects')).find((p) => p.planDocId === doc.id && Number(p.planNodeSeq) === projectNode.seq && p.workgroupId === wg.id);
    if (!project) {
      const attempt = ctx.env.db.list<Project>('Projects').filter((p) => p.planDocId === doc.id && Number(p.planNodeSeq) === projectNode.seq && p.workgroupId === wg.id).length;
      project = createProject(ctx, withPlanLink({
        idempotencyKey: `plan:${doc.id}:${projectNode.seq}:${wg.id}:${attempt}`, fiscalYear: doc.fiscalYear, fundingSourceId: doc.fundingSourceId,
        workgroupId: wg.id, projectCode: projectCodeFor(doc, projectNode, wg) + (attempt ? `-${attempt + 1}` : ''), name: projectNode.name,
        description: planNode ? planNode.name : '', status: 'PLANNED' as const, published: true,
      }, { planDocId: doc.id, planNodeSeq: projectNode.seq }));
    }
    const activity = createActivity(ctx, withPlanLink({
      idempotencyKey: `plan:${item.id}:${item.version}`, projectId: project.id, activityCode: item.code, name: item.name,
      unit: item.unit, targetQty: Number(item.quantity) || 0,
    }, { planDocId: doc.id, planNodeSeq: projectNode.seq, planItemId: item.id }));
    if (Number(item.amountSatang) > 0) {
      createAllocation(ctx, {
        idempotencyKey: `plan:${item.id}:${item.version}:alloc`, projectId: project.id, activityId: activity.id, type: 'ORIGINAL',
        amountSatang: Number(item.amountSatang), note: `${doc.title}${doc.docNo ? ` (${doc.docNo})` : ''}`, source: `PLAN:${item.id}`,
      });
    }
    const next = { ...item, workgroupId: wg.id, projectId: project.id, activityId: activity.id, assignedAt: nowIso(ctx), assignedBy: u.sub, version: item.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
    ctx.env.db.update('PlanItems', item.id, next);
    Object.assign(item, next);
    audit(ctx, 'plan.assign', 'PlanItem', item.id, { projectId: project.id, after: { workgroupId: wg.id, code: item.code, amount: item.amountSatang } });
    assigned++;
  }
  if (assigned) bumpDataVersion(ctx);
  return { assigned, skipped };
}

/** ยกเลิกการเลือก — ทำได้เมื่อกิจกรรมยังไม่มีรายการเบิกจ่าย/ผูกพัน */
export function unassignPlanItems(ctx: Ctx, b: { itemIds: string[] }): { unassigned: number; skipped: Array<{ id: string; reason: string }> } {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const ids = [...new Set((b.itemIds ?? []).map(String))].slice(0, 300);
  const all = live(ctx.env.db.list<PlanItem>('PlanItems'));
  const skipped: Array<{ id: string; reason: string }> = [];
  let unassigned = 0;
  for (const id of ids) {
    const item = all.find((i) => i.id === id);
    if (!item || !item.workgroupId) { skipped.push({ id, reason: 'รายการนี้ยังไม่มีกลุ่มงานเลือก' }); continue; }
    if (!canAccessWorkgroup(u, item.workgroupId)) { skipped.push({ id, reason: 'เป็นรายการของกลุ่มงานอื่น' }); continue; }
    const used = live(ctx.env.db.list<Disbursement>('Disbursements')).some((d) => d.activityId === item.activityId && d.status !== 'VOID');
    if (used) { skipped.push({ id, reason: 'มีรายการเบิกจ่ายแล้ว — ยกเลิกรายการเบิกจ่ายก่อน' }); continue; }
    const at = nowIso(ctx);
    for (const a of live(ctx.env.db.list<Allocation>('Allocations')).filter((x) => x.source === `PLAN:${item.id}`)) {
      ctx.env.db.update('Allocations', a.id, { ...a, isDeleted: true, version: a.version + 1, updatedAt: at, updatedBy: u.sub });
    }
    const act = live(ctx.env.db.list<Activity>('Activities')).find((a) => a.id === item.activityId);
    if (act) ctx.env.db.update('Activities', act.id, { ...act, isDeleted: true, version: act.version + 1, updatedAt: at, updatedBy: u.sub });
    const project = live(ctx.env.db.list<Project>('Projects')).find((p) => p.id === item.projectId);
    if (project) {
      const stillUsed = live(ctx.env.db.list<Activity>('Activities')).some((a) => a.projectId === project.id) ||
        live(ctx.env.db.list<Allocation>('Allocations')).some((a) => a.projectId === project.id) ||
        live(ctx.env.db.list<Disbursement>('Disbursements')).some((d) => d.projectId === project.id && d.status !== 'VOID');
      if (!stillUsed) ctx.env.db.update('Projects', project.id, { ...project, isDeleted: true, version: project.version + 1, updatedAt: at, updatedBy: u.sub });
    }
    const prevGroup = item.workgroupId;
    const next = { ...item, workgroupId: '', projectId: '', activityId: '', assignedAt: '', assignedBy: '', version: item.version + 1, updatedAt: at, updatedBy: u.sub };
    ctx.env.db.update('PlanItems', item.id, next);
    Object.assign(item, next);
    audit(ctx, 'plan.unassign', 'PlanItem', item.id, { projectId: project?.id ?? '', before: { workgroupId: prevGroup, code: item.code } });
    unassigned++;
  }
  if (unassigned) bumpDataVersion(ctx);
  return { unassigned, skipped };
}

/** ใช้ในโหมดสาธิต/ทดสอบ: นำเข้าแผนจากตารางโดยตรง */
export function importPlanTable(ctx: Ctx, table: unknown[][], meta: { fiscalYear: number; fundingSourceId: string; round: number; title: string; docNo?: string; docDate?: string }): PlanDoc {
  return commitPlan(ctx, { ...meta, table, acceptWarnings: true });
}

