# ADR-003: บัญชีเจ้าของข้อมูล โครงสร้างไฟล์ และการเก็บจำนวนเงิน

- สถานะ: อนุมัติโดยเจ้าของงาน (2026-11-05)

## บัญชีเจ้าของข้อมูล
- ใช้บัญชี `noonoy.cmu@gmail.com` เป็นเจ้าของโฟลเดอร์ Drive
  "9. KPP_Project and Budget Management" และเป็นผู้ deploy Apps Script
- ความเสี่ยงที่ยอมรับ:
  - บัญชีส่วนตัวใช้โควตาแบบ consumer
  - หากบัญชีถูกปิดหรือผู้ถือย้ายงาน ข้อมูลจะเข้าถึงไม่ได้
- มาตรการ:
  - สำรองข้อมูลรายวันไป `99_Archive/backup`
  - แชร์โฟลเดอร์สิทธิ์ Editor ให้ผู้รับผิดชอบสำรองอย่างน้อย 1 คน
  - มี runbook ย้ายเจ้าของ (`docs/runbooks/transfer-ownership.md`)

## โครงสร้างไฟล์ (ระบบสร้างเองเมื่อรัน `setup`)
| ไฟล์ | เนื้อหา |
|---|---|
| `KPP_ABM_IDENTITY` | Users, AccessRequests, LoginAttempts |
| `KPP_ABM_CORE` | master data, Projects, Activities, Allocations, Disbursements, Progress, Attachments, AuditLogs, Settings |
| `KPP_ABM_STAGING` | ImportJobs, ImportRows |
| `KPP_ABM_REPORTING` | PublicSnapshot (สรุปที่ไม่มี PII) |

ข้อแตกต่างจาก v2:
- Core ใช้ไฟล์เดียวและมีคอลัมน์ `fiscalYear` แทนการแยกไฟล์ตามปี
  - เหตุผล: ข้อมูลประมาณหลักหมื่นแถวต่อปี (ราว 0.4 ล้านเซลล์) ใช้ได้หลายปี และค้นข้ามปีได้ง่าย
- เมื่อใช้เซลล์เกิน 50% ของเพดาน (หน้า System Health แจ้งเตือน) ให้รัน `archiveFiscalYear(พ.ศ.)`
  ย้ายปีเก่าไปไฟล์ archive

## จำนวนเงิน
- เก็บเป็นจำนวนเต็ม "สตางค์" ในคอลัมน์ `amountSatang` เพื่อหลีกเลี่ยงความคลาดเคลื่อนของทศนิยม
- ปัดเศษแบบ half-up ในฟังก์ชันเดียว (`packages/domain/src/money.ts`)
- แสดงผลเป็นบาท ทศนิยม 2 ตำแหน่ง ด้วย `Intl.NumberFormat('th-TH')`
