# KPP Agri-Budget Monitor (KPP-ABM)

**ระบบติดตามโครงการและการเบิกจ่ายงบประมาณ สำนักงานเกษตรจังหวัดกำแพงเพชร**

ระบบติดตามโครงการ กิจกรรม งบประมาณที่ได้รับ การโอนเพิ่มหรือลด การเบิกจ่าย งบคงเหลือ และผลการดำเนินงาน
ครอบคลุมงบ 3 แหล่ง:
- งบกรมส่งเสริมการเกษตร
- งบจังหวัดกำแพงเพชร
- งบกลุ่มจังหวัดภาคเหนือตอนล่าง 2

ระบบมีหน้าสาธารณะที่ไม่แสดงข้อมูลส่วนบุคคล และมีส่วนจัดการข้อมูลสำหรับเจ้าหน้าที่

> ยอดในระบบใช้เพื่อการติดตามภายใน ยอดเบิกจ่ายทางการอ้างอิงระบบ New GFMIS Thai

| ส่วน | เทคโนโลยี | ที่อยู่ |
|---|---|---|
| หน้าเว็บ | React + Vite + TypeScript บน GitHub Pages | `apps/web` |
| Backend | Google Apps Script Web App (ไฟล์ `Code.gs` ไฟล์เดียว) | `apps/gas` |
| ฐานข้อมูล | Google Sheets 4 ไฟล์ (IDENTITY / CORE / STAGING / REPORTING) | สร้างอัตโนมัติใน Drive |
| ไฟล์และหลักฐาน | Google Drive (โฟลเดอร์ของโครงการ) | `00_System`, `01_Imports`, `02_Project_Evidence`, `99_Archive` |
| กฎธุรกิจ | TypeScript ใช้ร่วมกันทั้งหน้าเว็บและ backend | `packages/domain` |

**ระบบใช้งานจริง** (deploy 6 พ.ย. 2569, เจ้าของ noonoy.cmu@gmail.com)
- หน้าเว็บ: https://krit-pj.github.io/KPP-Agri-Budget-Monitor/
- API (Apps Script Web App เวอร์ชัน 1): https://script.google.com/macros/s/AKfycbwW_a8BpJnnStYhGyH3-hFqwDiBOTCdi-TjLenv_dupfomy6LYYzclhm6XA7p8jJLZ1zw/exec
  ตั้งไว้ใน Repository variable `KPP_API_URL` ถ้าอัปเดต Code.gs ให้ใช้ "จัดการการทำให้ใช้งานได้ › แก้ไข › เวอร์ชันใหม่" เพื่อให้ URL เดิมใช้ต่อได้

การตัดสินใจหลักบันทึกไว้ใน [`docs/adr`](docs/adr)
สถานะงานเทียบกับข้อกำหนดอยู่ใน [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)

## ความสามารถหลัก

- **Dashboard สาธารณะ**
  - แถบงบประมาณแสดงยอดเบิกจ่าย ยอดผูกพัน และงบคงเหลือ เทียบกับแผนของเดือนปัจจุบัน
  - สรุปแยกตามแหล่งงบและกลุ่มงาน
  - กราฟเบิกจ่ายสะสมเทียบแผน
  - รายการโครงการที่ต้องติดตาม
- **บทบาทผู้ใช้แบบระบบ Agri-Risk Map**
  - Admin เข้าสู่ระบบด้วยเบอร์โทร (ดู [ADR-002](docs/adr/ADR-002-admin-phone-only-login.md) เรื่องความเสี่ยงที่ยอมรับและมาตรการชดเชย)
  - Mini Super Admin
  - Super Admin ใช้ username และรหัสผ่าน
  - ขั้นตอน: ขอสิทธิ์ → อนุมัติ → เข้าสู่ระบบ
  - รายงานการเข้าสู่ระบบ ติดป้ายเมื่อเข้าจากอุปกรณ์ใหม่
- **แผนงบประมาณ (แบบ คง.2)**
  - นำเข้าแผนที่ได้รับจัดสรรตามปีงบประมาณ ระบบตรวจยอดทุกระดับให้
  - กลุ่มงานติ๊กเลือกกิจกรรมย่อยที่รับผิดชอบ กิจกรรมหลักเลือกร่วมกันได้ แต่กิจกรรมย่อยแต่ละรายการมีผู้รับผิดชอบได้กลุ่มเดียว
  - ระบบสร้างโครงการ กิจกรรม และงบให้อัตโนมัติ
  - แผนปี 2570 ครั้งที่ 1 ถอดไว้แล้วที่ `data/plans/`
- **นำเข้าอัตโนมัติ**
  - รับไฟล์ Excel, CSV หรือลิงก์ Google Sheets
  - ระบบหาหัวตารางเอง (รองรับหัวตารางสองชั้น) จับคู่คอลัมน์ด้วยพจนานุกรมภาษาไทย และอ่านวันที่ พ.ศ./ค.ศ. และตัวเลขไทย
  - ตรวจสอบทุกแถว และให้ดูตัวอย่างก่อนนำเข้า
  - นำเข้าซ้ำได้โดยไม่นับยอดซ้ำ
  - วางไฟล์ในโฟลเดอร์ `01_Imports/Inbox` ระบบจะดึงไปตรวจเองทุก 15 นาที
- **หนังสือปะหน้านำส่งการใช้จ่าย** (ไม่บังคับ)
  - ถ่ายรูปหรือแนบ PDF ตอนบันทึกการเบิกจ่าย
  - ระบบอ่านเลขที่หนังสือ วันที่ และจำนวนเงินด้วย OCR ของ Google Drive แล้วเติมลงฟอร์ม
  - ผู้ใช้ตรวจแล้วกดบันทึกเอง
- **ความถูกต้องของข้อมูลการเงิน**
  - เก็บจำนวนเงินเป็นสตางค์ (จำนวนเต็ม)
  - คำนวณยอดจากธุรกรรมทุกครั้ง
  - บล็อกการเบิกเกินงบ
  - แก้ไขรายการด้วยการยกเลิกแล้วบันทึกใหม่ (void-and-replace)
  - ตรวจ version กันการบันทึกทับกัน
  - ใช้ idempotency key กันการกดซ้ำ
  - script lock กันการเขียนพร้อมกัน
  - บันทึก audit ทุกการเปลี่ยนแปลง

## เริ่มพัฒนา (เครื่องนักพัฒนา)

```bash
npm ci
npm run dev        # http://localhost:5173 — โหมดสาธิต (รัน backend จริงในเบราว์เซอร์ ข้อมูลจำลอง)
npm run verify     # lint + typecheck + test + build
```

บัญชีในโหมดสาธิต:
- Super Admin: `demo` / `demo-password-1`
- Admin: เบอร์ `0800000001`

ข้อมูลเก็บใน sessionStorage ของแท็บนั้น และหายเมื่อปิดแท็บ

## ติดตั้งใช้งานจริง

ขั้นตอนละเอียดอยู่ใน [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md) โดยสรุป:

1. `npm ci && npm run build:gas` แล้วได้ `apps/gas/dist/Code.gs`, `appsscript.json` และ `Secrets.example.gs`
2. ล็อกอินบัญชีเจ้าของโฟลเดอร์ Drive ([ADR-003](docs/adr/ADR-003-data-owner-and-storage.md)) แล้วสร้างโปรเจกต์ที่ script.google.com
   - วาง `Code.gs`
   - ตั้งค่า `appsscript.json`
   - สร้าง `Secrets.gs` จากไฟล์ตัวอย่าง
3. รันฟังก์ชัน `setup` หนึ่งครั้ง ระบบจะ:
   - สร้างโฟลเดอร์และ Google Sheets
   - เติม master data
   - ตั้งรหัส Super Admin (เก็บเป็น PBKDF2 hash)
   - ติดตั้ง trigger
4. **ลบ `Secrets.gs` ออกจากโปรเจกต์ทันที**
5. Deploy เป็น Web App (Execute as: Me, Who has access: Anyone) แล้วคัดลอก URL `/exec`
6. ใน GitHub:
   - Settings → Variables → `KPP_API_URL` = URL ข้อ 5
   - Settings → Pages → Source = GitHub Actions
   - Settings → Environments → `github-pages` → Required reviewers (approval gate)
7. Push ไปที่ `main` แล้ว workflow จะ build และ deploy หน้าเว็บ

## โครงสร้าง

```
apps/web            หน้าเว็บ React (public + admin)
apps/gas            Apps Script backend: src/core (ตรรกะ ทดสอบได้บน Node), src/gas (adapter ของ Google), build.mjs
packages/domain     money, dates, budget rules, importer, cover-letter parser, contracts
docs/adr            การตัดสินใจทางสถาปัตยกรรม
docs/api            รายการ action ของ API
docs/data-dictionary  พจนานุกรมข้อมูลของชีต
docs/runbooks       deploy, backup/restore, rotate credentials, ย้ายเจ้าของ, incident
docs/security       threat model
fixtures/import     ไฟล์ตัวอย่างสำหรับทดสอบนำเข้า (ข้อมูลจำลอง)
scripts             secret scan
```

## การทดสอบ

`npm test` รัน unit test และ integration test โดยไม่ต้องใช้ Google จริง ครอบคลุม:
- กฎงบประมาณ การปัดเศษ และ reconciliation
- การแปลงวันที่และจำนวนเงินภาษาไทย
- การจับคู่คอลัมน์
- RBAC matrix และ IDOR
- throttling ของการเข้าสู่ระบบ และการเพิกถอน token
- version conflict, idempotency และ lock busy
- void-and-replace
- import (ไฟล์ซ้ำ, formula injection, ไฟล์ปลอม MIME)
- OCR หนังสือปะหน้า
- public API ไม่มี PII
