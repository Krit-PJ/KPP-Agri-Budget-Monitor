# พจนานุกรมข้อมูล (Google Sheets)

Schema version `2026.11.07-2` — สร้างอัตโนมัติจาก `apps/gas/src/core/schema.ts`

- วันที่: `YYYY-MM-DD`; timestamp: UTC ISO 8601
- เงิน: สตางค์ (integer) ห้ามมีข้อความสกุลเงินใน cell
- คอลัมน์ข้อความตั้ง format เป็น Plain text เพื่อคงเลข 0 นำหน้า
- ค่าที่ขึ้นต้น `= + - @` ถูกเติม `'` ป้องกัน formula injection

## ไฟล์ `KPP_ABM_IDENTITY`

### แท็บ `Users` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `phone` | string | เบอร์โทร 10 หลัก (text) — PII ห้ามอยู่ใน Reporting |
| `phoneHash` | string | SHA-256 ของเบอร์ ใช้ตรวจซ้ำ |
| `fullName` | string |  |
| `position` | string |  |
| `workgroupId` | string |  |
| `affiliation` | string |  |
| `role` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `scopeWorkgroups` | string | JSON array กลุ่มงานเพิ่มเติมที่ทำรายการได้ |
| `tokenVersion` | number | เพิ่มค่าเพื่อเพิกถอน token ทั้งหมดของผู้ใช้ |
| `approvedAt` | string |  |
| `approvedBy` | string |  |
| `lastLoginAt` | string |  |
| `knownDevices` | string | hash อุปกรณ์ที่เคยเข้าสู่ระบบ |

### แท็บ `AccessRequests` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `phone` | string | เบอร์โทร 10 หลัก (text) — PII ห้ามอยู่ใน Reporting |
| `fullName` | string |  |
| `position` | string |  |
| `workgroupId` | string |  |
| `affiliation` | string |  |
| `note` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `decidedAt` | string |  |
| `decidedBy` | string |  |
| `reason` | string |  |

### แท็บ `LoginAttempts` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `at` | string |  |
| `role` | string |  |
| `identifierMasked` | string |  |
| `result` | string |  |
| `userId` | string |  |
| `device` | string |  |
| `newDevice` | boolean |  |

## ไฟล์ `KPP_ABM_CORE`

### แท็บ `Organizations` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `code` | string |  |
| `name` | string |  |

### แท็บ `Workgroups` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `orgId` | string |  |
| `code` | string |  |
| `name` | string |  |

### แท็บ `FundingSources` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `code` | string |  |
| `name` | string |  |
| `shortName` | string |  |

### แท็บ `Units` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `code` | string |  |
| `name` | string |  |
| `shortName` | string |  |
| `kind` | string |  |
| `sortOrder` | number |  |

### แท็บ `ActivityUnits` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `projectId` | string |  |
| `activityId` | string |  |
| `unitId` | string |  |
| `budgetSatang` | number |  |
| `targetQty` | number |  |

### แท็บ `Projects` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `fiscalYear` | number | ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.) |
| `fundingSourceId` | string |  |
| `projectCode` | string |  |
| `name` | string |  |
| `workgroupId` | string |  |
| `ownerName` | string |  |
| `startDate` | string |  |
| `endDate` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `physicalProgress` | number |  |
| `quarterTargets` | string | เป้าหมายร้อยละเบิกจ่ายสะสม 4 ไตรมาส เช่น 30,55,80,100 |
| `description` | string |  |
| `published` | boolean | แสดงบนหน้าสาธารณะ |
| `lastProgressAt` | string |  |
| `idempotencyKey` | string | กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ |
| `planDocId` | string |  |
| `planNodeSeq` | number |  |

### แท็บ `Activities` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `projectId` | string |  |
| `activityCode` | string |  |
| `name` | string |  |
| `startDate` | string |  |
| `endDate` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `progressPct` | number |  |
| `idempotencyKey` | string | กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ |
| `planItemId` | string |  |
| `unit` | string |  |
| `targetQty` | number |  |
| `planQuarters` | string |  |

### แท็บ `Allocations` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `projectId` | string |  |
| `activityId` | string |  |
| `type` | string | ORIGINAL | TRANSFER_IN | TRANSFER_OUT |
| `amountSatang` | number | จำนวนเงินหน่วยสตางค์ (จำนวนเต็ม) — 1 บาท = 100 |
| `date` | string |  |
| `docNo` | string |  |
| `note` | string |  |
| `source` | string | MANUAL | IMPORT:{jobId} | ADJUST:{jobId} |
| `idempotencyKey` | string | กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ |

### แท็บ `Disbursements` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `projectId` | string |  |
| `activityId` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `amountSatang` | number | จำนวนเงินหน่วยสตางค์ (จำนวนเต็ม) — 1 บาท = 100 |
| `date` | string |  |
| `docNo` | string |  |
| `description` | string |  |
| `source` | string | MANUAL | IMPORT:{jobId} | ADJUST:{jobId} |
| `idempotencyKey` | string | กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ |
| `voidReason` | string | เหตุผลการยกเลิก (void-and-replace) |
| `replacesId` | string | รายการเดิมที่ถูกแทนที่ |
| `attachmentId` | string |  |
| `unitId` | string |  |

### แท็บ `ProgressReports` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `projectId` | string |  |
| `activityId` | string |  |
| `reportDate` | string |  |
| `progressPct` | number |  |
| `detail` | string |  |
| `issues` | string |  |
| `idempotencyKey` | string | กันการบันทึกซ้ำเมื่อกดซ้ำ/ส่งซ้ำ |

### แท็บ `Attachments` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `entityType` | string |  |
| `entityId` | string |  |
| `projectId` | string |  |
| `kind` | string |  |
| `fileName` | string |  |
| `mimeType` | string |  |
| `sizeBytes` | number |  |
| `sha256` | string | SHA-256 ของไฟล์ |
| `driveFileId` | string | ID ไฟล์ใน Drive (ภายในเท่านั้น) |
| `ocrStatus` | string |  |
| `ocrText` | string | ข้อความ OCR (ภายในเท่านั้น) |

### แท็บ `AuditLogs` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `at` | string |  |
| `requestId` | string |  |
| `actorId` | string |  |
| `actorName` | string |  |
| `actorRole` | string |  |
| `action` | string |  |
| `entityType` | string |  |
| `entityId` | string |  |
| `projectId` | string |  |
| `before` | string | ค่าเดิม (JSON, ตัด PII) |
| `after` | string | ค่าใหม่ (JSON, ตัด PII) |
| `reason` | string |  |

### แท็บ `Settings` (key: `key`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `key` | string |  |
| `value` | string |  |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |

### แท็บ `PlanDocs` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `fiscalYear` | number | ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.) |
| `fundingSourceId` | string |  |
| `round` | number |  |
| `title` | string |  |
| `docNo` | string |  |
| `docDate` | string |  |
| `budgetType` | string |  |
| `totalSatang` | number |  |
| `leafCount` | number |  |
| `sourceFileId` | string |  |
| `sourceFileName` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `note` | string |  |
| `sourceSha256` | string |  |
| `editCount` | number |  |

### แท็บ `PlanItems` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `planDocId` | string |  |
| `fiscalYear` | number | ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.) |
| `seq` | number |  |
| `parentSeq` | number |  |
| `depth` | number |  |
| `kind` | string |  |
| `number` | string |  |
| `name` | string |  |
| `unit` | string |  |
| `quantity` | number |  |
| `amountSatang` | number | จำนวนเงินหน่วยสตางค์ (จำนวนเต็ม) — 1 บาท = 100 |
| `isLeaf` | boolean |  |
| `planIndex` | number |  |
| `projectSeq` | number |  |
| `activitySeq` | number |  |
| `code` | string |  |
| `workgroupId` | string |  |
| `projectId` | string |  |
| `activityId` | string |  |
| `assignedAt` | string |  |
| `assignedBy` | string |  |

## ไฟล์ `KPP_ABM_STAGING`

### แท็บ `ImportJobs` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `createdAt` | string | เวลาสร้าง UTC ISO 8601 |
| `createdBy` | string | ผู้สร้าง (user id / SUPER:… / SYSTEM / PUBLIC) |
| `updatedAt` | string | เวลาแก้ไขล่าสุด UTC |
| `updatedBy` | string | ผู้แก้ไขล่าสุด |
| `version` | number | เลข version สำหรับ optimistic lock |
| `isDeleted` | boolean | soft delete |
| `fileName` | string |  |
| `sha256` | string | SHA-256 ของไฟล์ |
| `driveFileId` | string | ID ไฟล์ใน Drive (ภายในเท่านั้น) |
| `channel` | string |  |
| `kind` | string |  |
| `fiscalYear` | number | ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.) |
| `fundingSourceId` | string |  |
| `headerRow` | number |  |
| `mapping` | string | JSON การจับคู่คอลัมน์ + หัวตาราง |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `totalRows` | number |  |
| `validRows` | number |  |
| `warningRows` | number |  |
| `errorRows` | number |  |
| `committedRows` | number |  |
| `committedAt` | string |  |
| `committedBy` | string |  |
| `message` | string |  |

### แท็บ `ImportRows` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `jobId` | string |  |
| `rowNo` | number |  |
| `rowKey` | string |  |
| `status` | string | สถานะ (ดู enum ใน packages/domain/src/types.ts) |
| `messages` | string |  |
| `raw` | string |  |
| `normalized` | string |  |
| `committed` | boolean |  |

## ไฟล์ `KPP_ABM_REPORTING`

### แท็บ `Snapshots` (key: `id`)

| คอลัมน์ | ชนิด | คำอธิบาย |
|---|---|---|
| `id` | string | UUID (primary key — ห้ามใช้เลขแถว) |
| `kind` | string |  |
| `fiscalYear` | number | ปีงบประมาณ พ.ศ. (ต.ค.–ก.ย.) |
| `generatedAt` | string |  |
| `sourceVersion` | string |  |
| `json` | string |  |

