/** ไฟล์แนบ/หลักฐาน + OCR หนังสือปะหน้านำส่งการใช้จ่าย (ไม่บังคับ) */
import {
  AppError, cleanText, parseCoverLetter, type Attachment, type CoverLetterResult, type Project,
} from '@kpp/domain';
import { requireWorkgroup } from '../auth';
import { audit, findById, getSettings, live, newMeta, type Ctx } from '../context';

export type SniffedType = 'jpeg' | 'png' | 'webp' | 'pdf' | 'xlsx' | 'xls' | 'text' | 'unknown';

/** ตรวจชนิดไฟล์จาก magic bytes (ไม่เชื่อนามสกุล/MIME ที่ browser ส่งมา) */
export function sniff(bytes: Uint8Array): SniffedType {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'jpeg';
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'png';
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45) return 'webp';
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'pdf';
  if (b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04) return 'xlsx';
  if (b(0) === 0xd0 && b(1) === 0xcf && b(2) === 0x11 && b(3) === 0xe0) return 'xls';
  // ข้อความ: ไม่มี NUL ใน 4KB แรก และไม่ใช่ HTML/SVG/script
  const n = Math.min(bytes.length, 4096);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return 'unknown';
  let head = '';
  for (let i = 0; i < Math.min(n, 512); i++) head += String.fromCharCode(bytes[i]);
  if (/<\s*(html|svg|script|!doctype|\?xml)/i.test(head)) return 'unknown';
  return n > 0 ? 'text' : 'unknown';
}

export const MIME_OF: Record<Exclude<SniffedType, 'unknown'>, string> = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', text: 'text/csv',
};

/** ชื่อไฟล์ปลอดภัย: ตัด path/อักขระควบคุม/อักขระพิเศษ */
export function safeFileName(name: string, fallbackExt: string): string {
  // eslint-disable-next-line no-control-regex -- ตั้งใจลบอักขระควบคุมจากชื่อไฟล์
  const base = cleanText(name, 120).replace(/^.*[\\/]/, '').replace(/[<>:"|?*\u0000-\u001f]/g, '_').replace(/^\.+/, '');
  return base || `file.${fallbackExt}`;
}

export function decodeUpload(ctx: Ctx, base64: string): Uint8Array {
  const maxMB = Number(getSettings(ctx).maxUploadMB) || 15;
  const approx = Math.floor((String(base64 || '').length * 3) / 4);
  if (!base64) throw new AppError('VALIDATION_FAILED', 'ไม่พบไฟล์');
  if (approx > maxMB * 1024 * 1024) throw new AppError('VALIDATION_FAILED', `ไฟล์ใหญ่เกิน ${maxMB} MB`);
  try {
    return ctx.env.crypto.base64Decode(base64.replace(/^data:[^,]*,/, ''));
  } catch {
    throw new AppError('VALIDATION_FAILED', 'ไฟล์เสียหาย');
  }
}

const EVIDENCE_TYPES: SniffedType[] = ['jpeg', 'png', 'webp', 'pdf'];

export function uploadFile(ctx: Ctx, b: { projectId: string; entityType: Attachment['entityType']; entityId?: string; kind: Attachment['kind']; fileName: string; mimeType: string; base64: string }): Omit<Attachment, 'ocrText'> {
  const p = findById<Project>(ctx, 'Projects', String(b.projectId), 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  if (!['COVER_LETTER', 'EVIDENCE'].includes(b.kind)) throw new AppError('VALIDATION_FAILED', 'ชนิดเอกสารไม่ถูกต้อง');
  const bytes = decodeUpload(ctx, b.base64);
  const type = sniff(bytes);
  if (!EVIDENCE_TYPES.includes(type)) throw new AppError('VALIDATION_FAILED', 'รองรับเฉพาะรูป JPG/PNG/WEBP หรือ PDF');
  const mime = MIME_OF[type as Exclude<SniffedType, 'unknown'>];
  const fileName = safeFileName(b.fileName, type === 'jpeg' ? 'jpg' : type);
  const folder = `02_Project_Evidence/FY${p.fiscalYear}/${safeFileName(p.projectCode, 'x')}`;
  const stored = ctx.env.files.save(folder, fileName, mime, bytes);
  const dup = live(ctx.env.db.list<Attachment>('Attachments')).find((f) => f.sha256 === stored.sha256 && f.projectId === p.id);
  const row: Attachment = {
    ...newMeta(ctx), entityType: b.entityType || 'project', entityId: cleanText(b.entityId, 60) || p.id, projectId: p.id,
    kind: b.kind, fileName, mimeType: mime, sizeBytes: stored.sizeBytes, sha256: stored.sha256, driveFileId: stored.id,
    ocrStatus: '', ocrText: '',
  };
  ctx.env.db.insert('Attachments', [row as unknown as Record<string, unknown>]);
  audit(ctx, 'file.upload', 'Attachment', row.id, { after: { fileName, kind: b.kind, sha256: stored.sha256, duplicateOf: dup?.id ?? '' }, projectId: p.id });
  const { ocrText: _omit, ...rest } = row;
  return rest;
}

/** OCR + แยกฟิลด์ — คืน "ข้อเสนอ" เท่านั้น ไม่บันทึกรายการเบิกจ่ายเอง */
export function ocrCoverLetter(ctx: Ctx, b: { attachmentId: string }): CoverLetterResult {
  const f = findById<Attachment>(ctx, 'Attachments', String(b.attachmentId), 'ไฟล์แนบ');
  const p = findById<Project>(ctx, 'Projects', f.projectId, 'โครงการ');
  requireWorkgroup(ctx, p.workgroupId);
  let text = f.ocrStatus === 'DONE' ? f.ocrText : '';
  if (!text) {
    try {
      text = ctx.env.files.ocr(f.driveFileId);
      ctx.env.db.update('Attachments', f.id, { ...f, ocrStatus: 'DONE', ocrText: text.slice(0, 40000) });
    } catch (e) {
      ctx.env.db.update('Attachments', f.id, { ...f, ocrStatus: 'FAILED' });
      ctx.env.log('warn', 'ocr_failed', { attachmentId: f.id, message: String((e as Error).message) });
      throw new AppError('IMPORT_REVIEW_REQUIRED', 'อ่านข้อความจากรูปไม่สำเร็จ กรุณากรอกข้อมูลเอง (ไฟล์แนบยังถูกบันทึกไว้)');
    }
  }
  const codes = live(ctx.env.db.list<Project>('Projects')).filter((x) => x.fiscalYear === p.fiscalYear).map((x) => x.projectCode);
  const result = parseCoverLetter(text, codes);
  audit(ctx, 'file.ocr', 'Attachment', f.id, { projectId: p.id, after: { confidence: result.overallConfidence } });
  return result;
}
