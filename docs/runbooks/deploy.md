# คู่มือติดตั้งและอัปเดตระบบ

> ทุกขั้นที่สร้าง credential, เปลี่ยนสิทธิ์ Drive หรือ deploy production ต้องให้เจ้าของงานเป็นผู้ทำหรืออนุมัติ

## 0. สิ่งที่ต้องมี
- บัญชีเจ้าของข้อมูล (ADR-003: `noonoy.cmu@gmail.com`) มีสิทธิ์ Editor ในโฟลเดอร์ "9. KPP_Project and Budget Management"
- Node.js 20+ บนเครื่องที่ใช้ build
- GitHub repository `KPP-Agri-Budget-Monitor`

## 1. Build backend
```bash
npm ci
npm run build:gas
# ได้ apps/gas/dist/Code.gs, appsscript.json, Secrets.example.gs
```
หรือดาวน์โหลด artifact ชื่อ `apps-script-Code.gs` จาก GitHub Actions (workflow CI)

## 2. สร้างโปรเจกต์ Apps Script (ครั้งแรก)
1. ล็อกอินบัญชีเจ้าของข้อมูล แล้วเปิด https://script.google.com → New project → ตั้งชื่อ `KPP-ABM API`
2. Project Settings → ติ๊ก "Show appsscript.json manifest file in editor"
3. เปิด `appsscript.json` แล้ววางเนื้อหาจาก `apps/gas/dist/appsscript.json`
   (ไฟล์นี้เปิด Advanced Drive Service v3 ซึ่งใช้แปลง XLSX และทำ OCR)
4. แทนที่ `Code.gs` ด้วยเนื้อหา `apps/gas/dist/Code.gs`
5. สร้างไฟล์ใหม่ `Secrets.gs` แล้ววางจาก `Secrets.example.gs` และใส่ค่า:
   - `ROOT_FOLDER_ID` = `1h-WWQZ2mWLdeotUY-M8sivPGmhpDA-AI`
   - `INIT_SUPER_USER` = ชื่อผู้ใช้ Super Admin
   - `INIT_SUPER_PASSWORD` = รหัสผ่านอย่างน้อย 10 ตัวอักษร ส่งผ่านช่องทางนอกระบบ ห้ามพิมพ์ลงแชตหรือเอกสาร
6. เลือกฟังก์ชัน `setup` แล้วกด Run และอนุญาตสิทธิ์ (Sheets, Drive, Docs, Triggers)
7. ตรวจ Execution log ว่าสร้างโฟลเดอร์ ไฟล์ และ trigger ครบ
8. **ลบไฟล์ `Secrets.gs`** แล้วกด Save
9. Deploy → New deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
   - คัดลอก Web app URL (ลงท้าย `/exec`)

## 3. ตั้งค่า GitHub
1. Settings → Secrets and variables → Actions → Variables → `KPP_API_URL` = URL ที่คัดลอกไว้
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**
3. Settings → Environments → `github-pages` → Required reviewers: เจ้าของงาน
4. Push ไปที่ `main` แล้วอนุมัติ deployment
5. เปิด `https://<user>.github.io/KPP-Agri-Budget-Monitor/`
6. ล็อกอิน Super Admin แล้วตรวจหน้า "ตั้งค่าระบบ → สถานะระบบ"

## 4. อัปเดต backend รุ่นใหม่
1. `npm run build:gas` แล้ววาง `Code.gs` ทับของเดิม
2. รัน `setup` อีกครั้ง
   - idempotent: เติมเฉพาะคอลัมน์หรือตารางใหม่ ไม่ลบข้อมูล
   - ตอนนี้ไม่มี Super Admin ใหม่ จึงไม่ต้องมี Secrets.gs
3. Deploy → Manage deployments → แก้ไขรายการเดิม → Version: New version
   - URL จะไม่เปลี่ยน
   - เก็บหมายเลข version ก่อนหน้าไว้สำหรับ rollback

## 5. Rollback
- Backend: Manage deployments → แก้ไข → เลือก version ก่อนหน้า → Deploy
- หน้าเว็บ: Actions → Deploy web to GitHub Pages → Run workflow บน commit ก่อนหน้า หรือ `git revert` แล้ว push
- ข้อมูล: ดู [backup-restore.md](backup-restore.md)

## 6. ตรวจหลัง deploy (smoke test)
- [ ] หน้าแรกแสดงแถบงบประมาณ และไม่มีแถบ "โหมดสาธิต"
- [ ] Super Admin ล็อกอินได้ ส่วนรหัสผิด 5 ครั้งต้องถูกระงับชั่วคราว
- [ ] ส่งคำขอสิทธิ์ อนุมัติ แล้ว Admin ล็อกอินด้วยเบอร์ได้
- [ ] นำเข้า `fixtures/import/budget-summary.csv` แล้วยืนยัน ยอดในหน้าแรกต้องเปลี่ยน
- [ ] แนบรูปหนังสือปะหน้า แล้วระบบเติมจำนวนเงินได้
- [ ] ตรวจว่ามีโฟลเดอร์ `99_Archive/backup/<วันที่>` หลังเวลา 02:00 ของวันถัดไป
