// สร้าง docs/data-dictionary/SHEETS.md และ docs/api/ACTIONS.md จาก schema/router (รัน: npm run docs)
import { writeFileSync } from 'node:fs';
import { FILE_NAMES, TABLES, SCHEMA_VERSION, primaryKeyOf, type TableName } from '../apps/gas/src/core/schema';
import { ROUTES } from '../apps/gas/src/core/router';
import { PUBLIC_ACTIONS } from '../packages/domain/src/contracts';

const DESC: Record<string, string> = {
  id: 'UUID (primary key — ห้ามใช้เลขแถว)', createdAt: 'เวลาสร้าง UTC ISO 8601', createdBy: 'ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC)',
  updatedAt: 'เวลาแก้ไขล่าสุด UTC', updatedBy: 'ผู้แก้ไขล่าสุด', version: 'เลข version สำหรับ optimistic lock', isDeleted: 'soft delete',
  amountSatang: 'จำนวนเงินหน่วยสตางค์ (จำนวนเต็ม) — 1 บาท = 100', fiscalYear: 'ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.)',
  idempotencyKey: 'กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ', phone: 'เบอร์โทร 10 หลัก (text) — PII ห้ามอยู่ใน Reporting',
  phoneHash: 'SHA-256 ของเบอร์ ใช้ตรวจซ้ำ', tokenVersion: 'เพิ่มค่าเพื่อเพิกถอน token ทั้งหมดของผู้ใช้',
  status: 'สถานะ (ดู enum ใน packages/domain/src/types.ts)', type: 'ORIGINAL | TRANSFER_IN | TRANSFER_OUT',
  source: 'MANUAL | IMPORT:{jobId} | ADJUST:{jobId}', voidReason: 'เหตุผลการยกเลิก (void-and-replace)', replacesId: 'รายการเดิมที่ถูกแทนที่',
  quarterTargets: 'เป้าหมายร้อยละเบิกจ่ายสะสม 4 ไตรมาส เช่น 30,55,80,100', published: 'แสดงบนหน้าสาธารณะ',
  driveFileId: 'ID ไฟล์ใน Drive (ภายในเท่านั้น)', sha256: 'SHA-256 ของไฟล์', ocrText: 'ข้อความ OCR (ภายในเท่านั้น)',
  before: 'ค่าเดิม (JSON, ตัด PII)', after: 'ค่าใหม่ (JSON, ตัด PII)', knownDevices: 'hash อุปกรณ์ที่เคยเข้าสู่ระบบ',
  scopeWorkgroups: 'JSON array กลุ่มงานเพิ่มเติมที่ทำรายการได้', mapping: 'JSON การจับคู่คอลัมน์ + หัวตาราง',
};

let md = `# พจนานุกรมข้อมูล (Google Sheets)\n\nSchema version \`${SCHEMA_VERSION}\` — สร้างอัตโนมัติจาก \`apps/gas/src/core/schema.ts\`\n\n`;
md += '- วันที่: `YYYY-MM-DD`; timestamp: UTC ISO 8601\n- เงิน: สตางค์ (integer) ห้ามมีข้อความสกุลเงินใน cell\n- คอลัมน์ข้อความตั้ง format เป็น Plain text เพื่อคงเลข 0 นำหน้า\n- ค่าที่ขึ้นต้น `= + - @` ถูกเติม `\'` ป้องกัน formula injection\n\n';
for (const [file, name] of Object.entries(FILE_NAMES)) {
  md += `## ไฟล์ \`${name}\`\n\n`;
  for (const [t, def] of Object.entries(TABLES) as Array<[TableName, (typeof TABLES)[TableName]]>) {
    if (def.file !== file) continue;
    md += `### แท็บ \`${t}\` (key: \`${primaryKeyOf(t)}\`)\n\n| คอลัมน์ | ชนิด | คำอธิบาย |\n|---|---|---|\n`;
    for (const [c, ty] of def.columns) md += `| \`${c}\` | ${ty} | ${DESC[c] ?? ''} |\n`;
    md += '\n';
  }
}
writeFileSync('docs/data-dictionary/SHEETS.md', md);

let api = '# API actions (Apps Script Web App)\n\nเรียกด้วย `POST <WEB_APP_URL>` header `Content-Type: text/plain;charset=utf-8` body JSON `{ "action": "...", "token": "...", ...params }`\n';
api += 'หรือ `GET <WEB_APP_URL>?action=public.summary&fiscalYear=2570` สำหรับ public เท่านั้น\n\n';
api += 'Response: `{ ok, data, meta: { requestId, version, serverTime }, error: { code, message, details? } }` (HTTP 200 เสมอ — ADR-001)\n\n';
api += 'Types ของ request/response: `packages/domain/src/contracts.ts` (interface `Actions`)\n\n| action | ต้องเข้าสู่ระบบ | เขียนข้อมูล (lock) | rate limit |\n|---|---|---|---|\n';
for (const [a, r] of Object.entries(ROUTES)) api += `| \`${a}\` | ${PUBLIC_ACTIONS.has(a as never) ? 'ไม่' : 'ใช่'} | ${r.write ? 'ใช่' : ''} | ${r.limit} |\n`;
api += '\n## Error codes\n\n`AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_PENDING`, `ACCOUNT_SUSPENDED`, `LOGIN_THROTTLED`, `REAUTH_REQUIRED`, `FORBIDDEN_SCOPE`, `NOT_FOUND`, `VERSION_CONFLICT`, `VALIDATION_FAILED`, `DUPLICATE_IMPORT`, `IMPORT_REVIEW_REQUIRED`, `BUDGET_EXCEEDED`, `BUSY_RETRY`, `QUOTA_RETRY`, `UNKNOWN_ACTION`, `INTERNAL_ERROR`\n';
writeFileSync('docs/api/ACTIONS.md', api);
console.log('docs generated');
