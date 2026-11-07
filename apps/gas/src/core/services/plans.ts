/**
 * แผนงบประมาณตามปีงบประมาณ (เช่น แบบ คง.2 ที่กรมฯ จัดสรร)
 * 1) นำเข้าแผน (Excel/CSV/Google Sheets หรือ PDF → OCR ร่าง) → ตรวจยอดทุกระดับ → บันทึกเป็นฐานข้อมูลแผน
 * 2) กลุ่มงานเลือก "กิจกรรมย่อยสุดท้าย" ที่รับผิดชอบ — 1 รายการ ได้ 1 กลุ่มงาน (กิจกรรมหลักใช้ร่วมกันได้)
 * 3) เมื่อเลือก ระบบสร้างโครงการของกลุ่มงาน (ต่อ 1 โครงการในแผน) + กิจกรรม + งบที่ได้รับจัดสรร ให้อัตโนมัติ
 */
import {
  AppError, cleanText, diffPlanTables, normalizePlanTable, parsePlanTable, parsePlanText, planToTable,
  type Activity, type ActivityUnit, type Allocation, type Disbursement, type FundingSource, type PlanCheck, type PlanCommitRequest, type PlanDoc, type PlanDetail,
  type PlanDocSummary, type PlanItem, type PlanPreview, type Project, type Workgroup,
} from '@kpp/domain';
import { canAccessWorkgroup, requireRole } from '../auth';
import { audit, bumpDataVersion, findById, live, newMeta, nowIso, type Ctx } from '../context';
import { decodeUpload, MIME_OF, safeFileName, sniff } from './files';
import { createActivity, createAllocation, createProject, withPlanLink } from './projects';
import { activityState, activityUnitsOf } from './units';

const MAX_ROWS = 3000;

/**
 * อ่านไฟล์แผนที่ server: ลิงก์ Google Sheets, PDF/รูป (OCR ร่าง) และ Excel/CSV (สำรอง — หน้าเว็บอ่านเองได้เร็วกว่า)
 * คืน "ตารางมาตรฐาน" 4 คอลัมน์ให้หน้าเว็บตรวจแก้ต่อ ยังไม่บันทึกแผน
 */
export function previewPlan(ctx: Ctx, b: { fileName: string; base64?: string; sheetUrl?: string }): PlanPreview {
  requireRole(ctx, 'minisuper', 'superadmin');
  if (b.sheetUrl) {
    const url = cleanText(b.sheetUrl, 500);
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError('VALIDATION_FAILED', 'ลิงก์ Google Sheets ไม่ถูกต้อง');
    const best = bestTable(ctx.env.files.readSheetUrl(url).map((t) => t.rows));
    return { ...best, sourceFileId: '', sourceFileName: 'Google Sheets', sha256: '', fromOcr: false };
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
      throw new AppError('IMPORT_REVIEW_REQUIRED', 'อ่านข้อความจากเอกสารไม่สำเร็จ — กรุณาใช้ไฟล์ Excel/CSV ตามแบบฟอร์ม (ไฟล์ต้นฉบับถูกเก็บไว้แล้ว)');
    }
    const parsed = parsePlanText(text);
    return { table: planToTable(parsed), meta: {}, parsed, sourceFileId: stored.id, sourceFileName: name, sha256: stored.sha256, fromOcr: true };
  }
  const best = bestTable(ctx.env.files.readTables(stored.id, mime).map((t) => t.rows));
  return { ...best, sourceFileId: stored.id, sourceFileName: name, sha256: stored.sha256, fromOcr: false };
}

function bestTable(tables: unknown[][][]): Pick<PlanPreview, 'table' | 'meta' | 'parsed'> {
  let best: Pick<PlanPreview, 'table' | 'meta' | 'parsed'> | null = null;
  for (const rows of tables) {
    if (!rows.length) continue;
    const n = normalizePlanTable(rows);
    const parsed = parsePlanTable(n.table);
    if (!best || parsed.leafCount > best.parsed.leafCount) best = { table: n.table, meta: n.meta, parsed };
  }
  if (!best || !best.parsed.nodes.length) throw new AppError('VALIDATION_FAILED', 'ไม่พบรายการแผนงาน/โครงการในไฟล์ — ตรวจว่ามีคอลัมน์ รายการ, หน่วยนับ, ปริมาณงาน, งบประมาณ');
  return best;
}

function activePlans(ctx: Ctx): PlanDoc[] {
  return live(ctx.env.db.list<PlanDoc>('PlanDocs')).filter((d) => d.status === 'ACTIVE');
}

/** ตรวจก่อนนำเข้า (ไม่เขียนข้อมูล): ไฟล์ซ้ำ และแผนของปี/แหล่งงบ/ครั้งที่เดียวกัน */
export function checkPlan(ctx: Ctx, b: { sha256?: string; fiscalYear: number; fundingSourceId: string; round?: number }): PlanCheck {
  requireRole(ctx, 'minisuper', 'superadmin');
  const docs = activePlans(ctx);
  const sha = cleanText(b.sha256, 80).toLowerCase();
  const dup = sha ? docs.find((d) => d.sourceSha256 === sha) : undefined;
  const fy = Number(b.fiscalYear);
  const round = Math.max(1, Number(b.round) || 1);
  const same = docs.filter((d) => Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId);
  const ex = same.find((d) => Number(d.round) === round);
  const assignedCount = ex ? live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === ex.id && i.workgroupId).length : 0;
  return {
    duplicateOf: dup ? { id: dup.id, title: dup.title, createdAt: dup.createdAt } : null,
    existing: ex ? { id: ex.id, title: ex.title, assignedCount } : null,
    nextRound: same.reduce((m, d) => Math.max(m, Number(d.round)), 0) + 1,
  };
}

const cleanTable = (t: unknown): string[][] =>
  (Array.isArray(t) ? t : []).slice(0, MAX_ROWS + 1).map((r) => (Array.isArray(r) ? r.slice(0, 4).map((c) => cleanText(c, 1000)) : []));

/**
 * บันทึกแผน — ตรวจซ้ำที่ server เสมอ
 * - มี ERROR บันทึกไม่ได้; WARNING ต้องยืนยัน; INFO เป็นข้อแนะนำ
 * - ไฟล์เดียวกัน (sha256) นำเข้าซ้ำไม่ได้
 * - แผนของปี/แหล่งงบ/ครั้งที่เดียวกัน: ต้องเลือกแทนที่ (เมื่อยังไม่มีกลุ่มงานเลือกรายการ) หรือเปลี่ยนเป็นครั้งถัดไป
 * - ช่องที่แก้จากต้นฉบับบันทึกใน AuditLogs (ค่าเดิม → ค่าใหม่) และเก็บไฟล์ต้นฉบับใน Drive
 */
export function commitPlan(ctx: Ctx, b: PlanCommitRequest): PlanDoc {
  const u = requireRole(ctx, 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear);
  if (!Number.isInteger(fy) || fy < 2560 || fy > 2650) throw new AppError('VALIDATION_FAILED', 'ปีงบประมาณไม่ถูกต้อง');
  const fs = live(ctx.env.db.list<FundingSource>('FundingSources')).find((f) => f.id === b.fundingSourceId);
  if (!fs) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกแหล่งงบ');
  if (!Array.isArray(b.table) || b.table.length > MAX_ROWS + 1) throw new AppError('VALIDATION_FAILED', 'ข้อมูลแผนไม่ถูกต้อง');
  const table = cleanTable(b.table);
  const parsed = parsePlanTable(table);
  const errors = parsed.issues.filter((i) => i.level === 'ERROR');
  if (errors.length) throw new AppError('VALIDATION_FAILED', `แผนมีข้อผิดพลาด ${errors.length} รายการ แก้ไขก่อนนำเข้า`, errors.slice(0, 20));
  if (!parsed.leafCount) throw new AppError('VALIDATION_FAILED', 'ไม่พบรายการกิจกรรมย่อยในแผน');
  const warnings = parsed.issues.filter((i) => i.level === 'WARNING').length;
  if (warnings && !b.acceptWarnings) throw new AppError('IMPORT_REVIEW_REQUIRED', `มี ${warnings} รายการที่ต้องตรวจ — ยืนยันว่าตรวจแล้วก่อนนำเข้า`);
  const round = Math.max(1, Math.min(20, Number(b.round) || 1));

  // ไฟล์ต้นฉบับ: เก็บใน Drive + ลายนิ้วมือกันซ้ำ
  let sourceFileId = cleanText(b.sourceFileId, 100);
  let sourceFileName = cleanText(b.sourceFileName, 200);
  let sha = /^[0-9a-f]{64}$/.test(String(b.sourceSha256 ?? '')) && sourceFileId ? String(b.sourceSha256) : '';
  if (sha) {
    const dup = activePlans(ctx).find((d) => d.sourceSha256 === sha);
    if (dup) throw new AppError('DUPLICATE_IMPORT', `ไฟล์นี้นำเข้าแล้วเป็น "${dup.title}"`, { planDocId: dup.id });
  }
  if (b.base64) {
    const bytes = decodeUpload(ctx, String(b.base64));
    const type = sniff(bytes);
    if (!['xlsx', 'xls', 'text', 'pdf', 'jpeg', 'png'].includes(type)) throw new AppError('VALIDATION_FAILED', 'ไฟล์ต้นฉบับไม่ใช่ Excel/CSV/PDF/รูป');
    sha = ctx.env.crypto.sha256Hex(bytes);
    const dup = activePlans(ctx).find((d) => d.sourceSha256 === sha);
    if (dup) throw new AppError('DUPLICATE_IMPORT', `ไฟล์นี้นำเข้าแล้วเป็น "${dup.title}"`, { planDocId: dup.id });
    sourceFileName = safeFileName(b.fileName ?? sourceFileName, type === 'text' ? 'csv' : type);
    sourceFileId = ctx.env.files.save('00_System/plans', sourceFileName, MIME_OF[type as keyof typeof MIME_OF], bytes).id;
  }

  // แผนเดิมของปี/แหล่งงบ/ครั้งที่เดียวกัน
  const prev = activePlans(ctx).find((d) => Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId && Number(d.round) === round);
  if (prev) {
    const taken = live(ctx.env.db.list<PlanItem>('PlanItems')).filter((i) => i.planDocId === prev.id && i.workgroupId).length;
    if (taken) throw new AppError('VALIDATION_FAILED', `แผนปี ${fy} ครั้งที่ ${round} มีกลุ่มงานเลือกรายการแล้ว ${taken} รายการ — นำเข้าเป็นครั้งถัดไป หรือยกเลิกการเลือกก่อน`);
    if (!b.replaceExisting) throw new AppError('IMPORT_REVIEW_REQUIRED', `มีแผนปี ${fy} ครั้งที่ ${round} อยู่แล้ว ("${prev.title}") — เลือกแทนที่แผนเดิม หรือนำเข้าเป็นครั้งถัดไป`, { existingId: prev.id });
    ctx.env.db.update('PlanDocs', prev.id, { ...prev, status: 'REPLACED', version: prev.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
  }

  const edits = b.originalTable ? diffPlanTables(cleanTable(b.originalTable), table) : [];
  const doc: PlanDoc = {
    ...newMeta(ctx), fiscalYear: fy, fundingSourceId: fs.id, round,
    title: cleanText(b.title, 200) || `แผนงบประมาณ ${fs.name} ปี ${fy} ครั้งที่ ${round}`,
    docNo: cleanText(b.docNo, 80), docDate: cleanText(b.docDate, 20), budgetType: cleanText(b.budgetType, 60) || 'งบดำเนินงาน',
    totalSatang: parsed.computedTotal, leafCount: parsed.leafCount, sourceFileId, sourceFileName, status: 'ACTIVE',
    note: edits.length ? `แก้จากต้นฉบับ ${edits.length} ช่อง` : '', sourceSha256: sha, editCount: edits.length,
  };
  ctx.env.db.insert('PlanDocs', [doc]);
  ctx.env.db.insert('PlanItems', parsed.nodes.map((n) => ({
    ...newMeta(ctx), planDocId: doc.id, fiscalYear: fy, seq: n.seq, parentSeq: n.parentSeq, depth: n.depth, kind: n.kind,
    number: n.number, name: n.name, unit: n.unit, quantity: n.quantity ?? 0, amountSatang: n.amountSatang ?? 0, isLeaf: n.isLeaf,
    planIndex: n.planIndex, projectSeq: n.projectSeq, activitySeq: n.activitySeq, code: n.code,
    workgroupId: '', projectId: '', activityId: '', assignedAt: '', assignedBy: '',
  })));
  audit(ctx, 'plan.import', 'PlanDoc', doc.id, {
    before: edits.length ? { edits: edits.slice(0, 150) } : undefined,
    after: { title: doc.title, fiscalYear: fy, round, total: doc.totalSatang, leaves: doc.leafCount, replaced: prev?.id ?? '', file: sourceFileName, editCount: edits.length },
  });
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
  // สถานะของกิจกรรมที่สร้างจากแผน: งบ เบิกจ่าย หน่วยดำเนินการ แผนรายไตรมาส
  const actIds = new Set(items.filter((i) => i.activityId).map((i) => i.activityId));
  const acts = live(ctx.env.db.list<Activity>('Activities')).filter((a) => actIds.has(a.id));
  const allocs = live(ctx.env.db.list<Allocation>('Allocations')).filter((x) => actIds.has(x.activityId));
  const disbs = live(ctx.env.db.list<Disbursement>('Disbursements')).filter((x) => actIds.has(x.activityId));
  const shares = activityUnitsOf(ctx).filter((x) => actIds.has(x.activityId));
  const activities: PlanDetail['activities'] = {};
  for (const a of acts) activities[a.id] = activityState(ctx, a, allocs, disbs, shares);
  return { doc, items, activities };
}

/* --------------------------------- assignment -------------------------------- */

function projectCodeFor(doc: PlanDoc, projectNode: PlanItem, wg: Workgroup): string {
  return `P${projectNode.planIndex}-${projectNode.number || projectNode.seq}-${wg.code}`;
}

/**
 * กำหนดกลุ่มงานให้กิจกรรมย่อยสุดท้าย
 * - reassign = ย้ายจากกลุ่มเดิม: ได้เมื่อยังไม่มีการเบิกจ่าย และผู้ใช้มีสิทธิ์ทั้งกลุ่มเดิมและกลุ่มใหม่
 *   (ย้ายหน่วยดำเนินการและแผนรายไตรมาสไปด้วย)
 */
export function assignPlanItems(ctx: Ctx, b: { itemIds: string[]; workgroupId: string; reassign?: boolean }): { assigned: number; skipped: Array<{ id: string; reason: string }> } {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const wg = live(ctx.env.db.list<Workgroup>('Workgroups')).find((g) => g.id === b.workgroupId);
  if (!wg) throw new AppError('VALIDATION_FAILED', 'กรุณาเลือกกลุ่มงาน');
  if (wg.noActivities) throw new AppError('VALIDATION_FAILED', `${wg.name}ไม่รับผิดชอบกิจกรรมในแผน`);
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
    let carry: { shares: ActivityUnit[]; planQuarters: string } | null = null;
    if (item.workgroupId) {
      if (!b.reassign) { skipped.push({ id, reason: 'กลุ่มงานอื่นเลือกรายการนี้แล้ว' }); continue; }
      if (!canAccessWorkgroup(u, item.workgroupId)) { skipped.push({ id, reason: 'ย้ายรายการของกลุ่มงานอื่นได้เฉพาะผู้ดูแลระบบ' }); continue; }
      const oldAct = live(ctx.env.db.list<Activity>('Activities')).find((a) => a.id === item.activityId);
      carry = { shares: activityUnitsOf(ctx, item.activityId), planQuarters: oldAct?.planQuarters ?? '' };
      const r = unassignPlanItems(ctx, { itemIds: [id] });
      if (r.skipped.length) { skipped.push({ id, reason: r.skipped[0].reason }); continue; }
      Object.assign(item, findById<PlanItem>(ctx, 'PlanItems', id, 'รายการ'));
    }
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
    if (carry && (carry.shares.length || carry.planQuarters)) {
      if (carry.shares.length) {
        ctx.env.db.insert('ActivityUnits', carry.shares.map((s) => ({
          ...newMeta(ctx), projectId: project!.id, activityId: activity.id, unitId: s.unitId, budgetSatang: Number(s.budgetSatang), targetQty: Number(s.targetQty),
        })));
      }
      if (carry.planQuarters) {
        const fresh = findById<Activity>(ctx, 'Activities', activity.id, 'กิจกรรม');
        ctx.env.db.update('Activities', fresh.id, { ...fresh, planQuarters: carry.planQuarters, version: fresh.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
      }
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
    for (const s of activityUnitsOf(ctx, item.activityId)) ctx.env.db.update('ActivityUnits', s.id, { ...s, isDeleted: true, version: s.version + 1, updatedAt: at, updatedBy: u.sub });
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
  return commitPlan(ctx, { ...meta, table: normalizePlanTable(table).table, acceptWarnings: true, replaceExisting: true });
}

