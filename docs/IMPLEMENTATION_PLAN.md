# Implementation plan และ requirement traceability

อ้างอิง: Master Prompt v2 (`KPP_ABM_Master_Prompt_v2.md`) และ ADR-001 ถึง ADR-004
สถานะ ณ 2026-11-05:
- ✅ เสร็จและมี test/หลักฐาน
- 🟡 บางส่วน
- ⛔ รอเจ้าของงาน (MUST PAUSE)
- ⏭ เลื่อนไปเฟสถัดไป

## Phase 0 — Audit
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| อ่านระบบต้นแบบ Agri-Risk (Code.gs, api.js) | ✅ | ADR-002 |
| ตัดสินใจ backend = Apps Script | ✅ | ADR-001 |
| บัญชีเจ้าของข้อมูล / โครงสร้างไฟล์ | ✅ | ADR-003 |
| นำเข้าอัตโนมัติ + หนังสือปะหน้า | ✅ | ADR-004 |
| `SYSTEM_BLUEPRINT_TH.md` | ⛔ | ยังไม่ได้รับ จึงใช้ Prompt v2 เป็นเอกสารหลัก |

## Phase 1 — Foundation
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| Monorepo (web / gas / domain) | ✅ | `package.json` workspaces |
| Domain: money (สตางค์, half-up), dates (พ.ศ., ปีงบ), phone, sanitize | ✅ | `packages/domain/test/domain.test.ts` |
| Contracts ใช้ร่วมกัน | ✅ | `packages/domain/src/contracts.ts` (รวมไว้ใน domain แทน `packages/contracts` เพื่อลดจำนวน package) |
| Memory adapters + โหมดสาธิต | ✅ | `apps/gas/src/memory.ts`, `apps/web/src/api/demo.ts` |
| CI: lint, typecheck, test, build, audit, secret scan | ✅ | `.github/workflows/ci.yml` |
| Design tokens + app shell | ✅ | `apps/web/src/styles.css` |

## Phase 2 — Identity & RBAC
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| ขอสิทธิ์ → อนุมัติ → เข้าสู่ระบบด้วยเบอร์ (ADR-002) | ✅ | test `pending/unknown numbers…` |
| Throttling (เบอร์ / ทั้งระบบ / Super Admin) | ✅ | test throttles |
| Super Admin PBKDF2 + bootstrap จาก Secrets.gs | ✅ | test pbkdf2, `setup()` |
| Token HMAC + tokenVersion revoke | ✅ | test suspension revokes |
| RBAC matrix และ IDOR | ✅ | test admin is confined… |
| Mini Super Admin | ✅ | `admin.ts` |
| Re-auth สำหรับ action สำคัญ (`REAUTH_REQUIRED`) | 🟡 | มี error code แล้ว แต่ยังไม่บังคับ (action สำคัญสงวนให้ Super Admin) |
| Firebase Phone OTP | ⛔ | ต้องเปิด billing (Blaze) จึงตัดออกตามการตัดสินใจของเจ้าของงาน |

## Phase 3 — Core management
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| Projects / Activities / Allocations / Disbursements / Progress | ✅ | `services/projects.ts`, UI tabs |
| สูตรงบประมาณ + reconciliation | ✅ | test budget rules |
| บล็อกงบติดลบ + override เฉพาะ Super Admin พร้อมเหตุผล | ✅ | test overspend |
| Void-and-replace, สถานะเดินหน้าอย่างเดียว | ✅ | tests |
| Version conflict, idempotency, lock | ✅ | tests |
| Soft delete + audit before/after (ตัด PII) | ✅ | `context.ts` |
| แนบไฟล์ + หนังสือปะหน้า + OCR (ไม่บังคับ) | ✅ | test cover letter, UI DisbursementForm |

## Phase 4 — Import center
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| CSV/TSV/XLSX/XLS/Google Sheets link | ✅ / 🟡 | CSV ทดสอบแล้ว; XLSX แปลงผ่าน Drive API ต้องทดสอบบน Apps Script จริง |
| ตรวจหัวตาราง (รวมหัวสองชั้น), จับคู่คอลัมน์ภาษาไทย, normalize | ✅ | `importer.test.ts`, `fixtures.test.ts` |
| Staging → preview → commit (re-plan ด้วยสิทธิ์ผู้ commit) | ✅ | tests import center |
| ไฟล์ซ้ำ, idempotent, resume (PARTIAL) | ✅ | tests |
| Formula injection, MIME sniffing, ขนาดไฟล์ | ✅ | tests |
| Drive Inbox + autoCommitClean | ✅ | test Drive inbox |
| Export error rows CSV | ✅ | test |
| Template นำเข้ารายงาน GFMIS โดยเฉพาะ | 🟡 | ใช้ BUDGET_SUMMARY ทั่วไป ต้องได้ตัวอย่างไฟล์ GFMIS จริงมาปรับคำพ้อง |
| PDF/OCR ของตารางรายงานทั้งฉบับ | ⏭ | เฟสหลัง (ตอนนี้ OCR ใช้กับหนังสือปะหน้า) |

## Phase 5 — Reporting & public portal
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| Public actions ไม่มี PII | ✅ | test public API privacy |
| Dashboard: KPI, แหล่งงบ, กลุ่มงาน, แผนเทียบผลรายเดือน, risk list, data quality | ✅ | screenshots |
| Filter/search/sort, หน้าโครงการ, มือถือ (ตาราง → การ์ด) | ✅ | screenshots 360–1280px |
| Snapshot ลงไฟล์ REPORTING | ✅ | `writeSnapshot`, trigger รายวัน |
| ตัวกรองผู้รับผิดชอบ/ช่วงเวลาบน dashboard | 🟡 | ผู้รับผิดชอบไม่แสดงสาธารณะตามข้อกำหนด PII; ตัวกรองช่วงเวลายังไม่ทำ |

## Phase 3b — ฐานข้อมูลแผนงบประมาณ (ADR-005, 2026-11-06)
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| แบบ คง.2 ปี 2570 ครั้งที่ 1 (ไฟล์ Excel ต้นฉบับ) + ตรวจยอดทุกระดับ | ✅ | `data/plans/…xlsx`, `docs/data-checks/2570-DOAE-r1.md` |
| Parser ลำดับชั้นจากเลขลำดับ + ตรวจยอด + เลขผิดปกติ | ✅ | `plan.test.ts` |
| นำเข้าแผนตามปีงบ/แหล่งงบ/งวด (Excel/CSV/Sheets; PDF → ร่าง OCR) | ✅ / 🟡 | CSV ทดสอบแล้ว; PDF OCR ต้องทดสอบบน Apps Script จริง |
| กลุ่มงานเลือกกิจกรรมย่อย (1 รายการ = 1 กลุ่ม, กิจกรรมหลักใช้ร่วม) | ✅ | `apps/gas/test/plans.test.ts` |
| สร้างโครงการ/กิจกรรม/งบให้อัตโนมัติ + ยกเลิกได้ถ้ายังไม่เบิกจ่าย | ✅ | tests |
| นำเข้า 3 ขั้น: หัวตารางหลายชั้น, อ่านหัวเอกสาร, แก้ตามข้อแนะนำ, กันไฟล์ซ้ำ, ประวัติการแก้ | ✅ | `plan.test.ts`, `plans.test.ts` |
| หน้ารายการแผน: เปิดทีละโครงการ, แถวกิจกรรมย่อยพร้อมเส้นทาง, เลือกทั้งโครงการ | ✅ | `Plans.tsx` |

## Phase 3c — ความเร็วและ dashboard (2026-11-07)
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| รวมคำขออ่านเป็น `batch`, cache ฝั่งเว็บแบบ stale-while-revalidate, โหลดล่วงหน้า | ✅ | `api/client.ts`, batch test |
| แยกโค้ดส่วนเจ้าหน้าที่ (lazy): ไฟล์หลักลดจาก 384 KB เหลือ 254 KB | ✅ | `vite build` |
| cache ชีตข้ามคำขอใน CacheService (เปลี่ยนรุ่นหลัง commit การเขียน) | ✅ | `adapter.ts` — ต้องวัดผลบน Apps Script จริง |
| Dashboard: 3 เรื่องที่ต้องรู้, bullet bar เทียบเป้า, เป้าทั้งปี 98%, กำหนดอบรม/ประชุมไตรมาส 3, แยกตามแผนงาน | ✅ | `Home.tsx` |

## Phase 6 — Hardening & delivery
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| Threat model | ✅ | `docs/security/threat-model.md` |
| Backup รายวัน + retention + runbook กู้คืน | ✅ / 🟡 | ต้องซ้อมกู้คืนจริงหลัง deploy |
| Runbooks: deploy, rollback, rotate, ย้ายเจ้าของ, incident | ✅ | `docs/runbooks` |
| Smoke test ของ bundle Code.gs | ✅ | `bundle.test.ts` |
| ทดสอบบน Apps Script จริง (quota, lock, XLSX, OCR) | ⛔ | ต้องให้เจ้าของงาน deploy ด้วยบัญชีเจ้าของข้อมูล |
| Load test 20–50 ผู้ใช้พร้อมกัน | ⏭ | หลัง deploy staging |
| ข้อความ Privacy notice ฉบับจริง | ⛔ | ร่างไว้ในหน้า "เกี่ยวกับข้อมูล" รอ DPO ตรวจ |

## UAT checklist (ผู้ใช้จริง)
- [ ] เจ้าหน้าที่ขอสิทธิ์ด้วยมือถือ แล้ว Super Admin อนุมัติ จากนั้นเจ้าหน้าที่เข้าระบบได้
- [ ] เพิ่มโครงการพร้อมงบได้ในไม่เกิน 1 นาที
- [ ] บันทึกการเบิกจ่ายจากมือถือด้วยรูปหนังสือปะหน้า และตัวเลขที่ระบบเติมให้ถูกต้อง
- [ ] นำเข้าไฟล์ Excel ที่สำนักงานใช้อยู่จริง 3 ไฟล์ (งบกรม/จังหวัด/กลุ่มจังหวัด) โดยไม่ต้องแก้หัวคอลัมน์
- [ ] ยอดรวมในหน้าแรกตรงกับรายงาน GFMIS ณ วันเดียวกัน (หรืออธิบายส่วนต่างได้)
- [ ] Admin กลุ่ม A มองไม่เห็นและแก้ไขโครงการกลุ่ม B ไม่ได้
- [ ] ระงับผู้ใช้แล้วผู้ใช้ถูกออกจากระบบทันที
- [ ] หน้าสาธารณะไม่มีชื่อหรือเบอร์เจ้าหน้าที่

## Known risks / technical debt
1. Admin เข้าระบบด้วยเบอร์โทรอย่างเดียว (ADR-002) เป็นความเสี่ยงที่ยอมรับแล้ว ควรทบทวนเมื่อใช้ข้อมูลรับรองทางการเงิน
2. ข้อมูลผูกกับบัญชี Gmail ส่วนตัว (ADR-003)
3. Admin endpoint อ่านทั้งตารางต่อ request ซึ่งพอสำหรับข้อมูลหลักหมื่นแถว ถ้าเกิน 50,000 รายการต่อปีควรทำ index/partition
4. PBKDF2 20,000 รอบ ต่ำกว่าที่ OWASP แนะนำ (600,000) เพราะข้อจำกัดเวลาของ Apps Script และชดเชยด้วย throttling
5. GitHub Pages ตั้ง HTTP security header เองไม่ได้ จึงใช้ CSP ผ่าน meta

## Phase 3d — ผู้รับผิดชอบ 2 ระดับ และรายงาน (2026-11-07, ADR-006)
| รายการ | สถานะ | หลักฐาน |
|---|---|---|
| หน่วยดำเนินการ (สนง.เกษตรจังหวัด + 11 อำเภอ), แบ่งงบ/เป้าต่อหน่วย, เบิกจ่ายรายหน่วย | ✅ | `units.ts`, tests "หน่วยดำเนินการ" |
| หน้าแผนและผู้รับผิดชอบหน้าเดียว: เลือก/เปลี่ยนกลุ่มในแถว, แผงเลือกหน่วย, ทำหลายรายการ | ✅ | `Plans.tsx` |
| แผนการใช้จ่ายรายไตรมาสต่อกิจกรรม (ไม่บังคับ) | ✅ | `planToDate` tests |
| Dashboard ตารางกลุ่มงานกางดูรายอำเภอ + งบ/แผน/เบิกจ่าย/ผูกพัน/คงเหลือ/% คงเหลือ | ✅ | `Home.tsx` |
| รายงาน 4 แบบ: พิมพ์/PDF (A4 แนวนอน), Excel, CSV | ✅ | `Reports.tsx`, `writeXlsx` test |
| ชื่อเมนูตามงาน | ✅ | `Layout.tsx` |
