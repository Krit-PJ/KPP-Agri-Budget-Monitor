# Threat model (STRIDE แบบย่อ)

| # | ภัยคุกคาม | ช่องทาง | มาตรการในระบบ | หลักฐาน (test) | ความเสี่ยงคงเหลือ |
|---|---|---|---|---|---|
| T1 | สวมรอย Admin ด้วยเบอร์โทร | เบอร์โทรไม่ใช่ความลับ (ADR-002) | throttle ต่อเบอร์และทั้งระบบ, ข้อความเดียวสำหรับไม่พบหรือรออนุมัติ, ป้ายอุปกรณ์ใหม่, สิทธิ์เสี่ยงสงวนให้ Super Admin, audit | `throttles repeated failed phone logins` | **สูง — เจ้าของงานยอมรับ** |
| T2 | เดารหัส Super Admin | brute force | PBKDF2-HMAC-SHA256 (20k รอบ + salt), constant-time compare, ระงับ 15 นาทีหลังผิด 5 ครั้ง | `throttles super admin password guessing` | ต่ำ-กลาง (จำนวนรอบต่ำกว่าที่ OWASP แนะนำ เพราะข้อจำกัดเวลาของ Apps Script) |
| T3 | ปลอมหรือแก้ token | แก้ payload | HMAC-SHA256 + secret ใน Script Properties, ตรวจ exp/tokenVersion | `tampered tokens are rejected` | ต่ำ |
| T4 | token ถูกขโมย | XSS, เครื่องสาธารณะ | sessionStorage, อายุ 8 ชม., ออกจากระบบทุกอุปกรณ์ได้, CSP, ไม่ใช้ innerHTML | `suspension revokes existing tokens` | กลาง |
| T5 | ข้ามกลุ่มงาน/IDOR | ส่ง id ของกลุ่มอื่น | โหลด entity ที่ server แล้วตรวจ scope ทุก action, ไม่เชื่อ role จาก client | `admin is confined to own workgroup` | ต่ำ |
| T6 | Formula injection | ค่า `=HYPERLINK(...)` ในไฟล์นำเข้า | escapeCell ก่อนเขียนลง Sheets และก่อน export CSV | `stages, previews, commits once…` | ต่ำ |
| T7 | ไฟล์อันตราย | HTML/SVG ปลอมนามสกุล | ตรวจ magic bytes, รับเฉพาะชนิดที่กำหนด, จำกัดขนาด, ไฟล์ Drive เป็น private, ไม่ render ไฟล์ upload | `rejects disguised/unsupported files` | ต่ำ |
| T8 | ข้อมูลเงินซ้ำ | กดซ้ำ, เน็ตหลุด, นำเข้าไฟล์ซ้ำ | idempotency key, SHA-256 ตรวจไฟล์ซ้ำ, นำเข้ายอดสะสมแบบส่วนต่าง | `duplicate submit…`, re-import test | ต่ำ |
| T9 | race condition / lost update | ผู้ใช้หลายคนพร้อมกัน | script lock ทุกการเขียน, optimistic version → VERSION_CONFLICT | `busy lock`, `stale version` | ต่ำ |
| T10 | quota หมด / DoS | ยิง request จำนวนมาก | rate limit แยก public/auth/admin/import, cache ข้อมูลสาธารณะ | – | กลาง (Apps Script ไม่รู้ IP ของผู้เรียก) |
| T11 | PII รั่วทาง public | ส่ง field ภายในออกไป | DTO สาธารณะแยก (ไม่มีชื่อผู้รับผิดชอบ/เบอร์/Drive ID) | `never exposes phone numbers…` | ต่ำ |
| T12 | secret หลุดเข้า Git | commit Secrets.gs | .gitignore, scripts/check-secrets.mjs ใน CI | CI | ต่ำ |
| T13 | ข้อมูลผูกกับบัญชีส่วนตัว | บัญชีถูกปิด | backup รายวัน, runbook ย้ายเจ้าของ (ADR-003) | – | **กลาง — เจ้าของงานยอมรับ** |
| T14 | OCR อ่านผิดแล้วบันทึกอัตโนมัติ | OCR | OCR เป็นเพียงข้อเสนอ ผู้ใช้ต้องกดบันทึกเอง, เทียบตัวเลขกับตัวอักษร | `returns suggestions without writing money` | ต่ำ |
| T15 | Insider แก้ข้อมูลในชีตตรง | ผู้มีสิทธิ์ Editor ใน Drive | จำกัดผู้มีสิทธิ์ในโฟลเดอร์, audit ใน CORE, reconciliation กับ GFMIS | – | กลาง |

## Headers
GitHub Pages และ Apps Script ตั้ง HTTP header เองไม่ได้ ระบบจึงใช้:
- CSP ผ่าน `<meta>` (ใส่ตอน build) ซึ่งจำกัด `connect-src` ไว้ที่ script.google.com
- `Referrer-Policy` ผ่าน meta
- HSTS ได้จาก github.io เอง
- กรณีใช้ custom domain ควรวาง Cloudflare หรือ proxy ไว้หน้าเว็บเพื่อตั้ง header เพิ่ม
