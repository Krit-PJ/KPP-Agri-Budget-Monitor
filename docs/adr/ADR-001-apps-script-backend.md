# ADR-001: ใช้ Google Apps Script Web App เป็น Backend

- สถานะ: อนุมัติแล้ว (เจ้าของงานเลือก Master Prompt v2, 2026-11-05)
- บริบท: เจ้าของงานกำหนดให้ใช้ GitHub เป็น Frontend และ Google Sheets/Drive เป็นฐานข้อมูล โดยไม่เปิด billing
  ส่วน Prompt v1 กำหนด Cloud Run + Firebase Phone OTP ซึ่งต้องเปิดแผน Blaze/billing

## การตัดสินใจ
- Frontend: React + Vite + TypeScript บน GitHub Pages
- Backend: Google Apps Script Web App เดียว (`/exec`) แบบ action-based RPC
  - `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS` เหมือนระบบ Agri-Risk Map
- ตรรกะธุรกิจเขียนเป็น TypeScript (`packages/domain`, `apps/gas/src/core`) ซึ่งไม่ผูกกับ Google
  แล้ว bundle ด้วย esbuild เป็นไฟล์ `Code.gs` ไฟล์เดียว
- โหมดสาธิต (Demo) ของหน้าเว็บรันตรรกะ backend ตัวเดียวกันในเบราว์เซอร์ด้วย in-memory adapter

## ผลกระทบ
- ไม่มีค่าใช้จ่ายคลาวด์ และ deploy ได้โดยวางไฟล์ `Code.gs` ไฟล์เดียว
- ข้อจำกัดที่ยอมรับ:
  - ไม่รองรับ CORS preflight → POST ต้องใช้ `text/plain` และส่ง token ใน body
  - ตอบ HTTP 200 เสมอ → สถานะจริงอยู่ใน `error.code` ของ envelope
  - รันได้ 6 นาทีต่อครั้ง และพร้อมกันได้ 30 execution → import แบ่งเป็น chunk และใช้ CacheService
- ใช้ LockService script lock คุมทุกการเขียน (serialized writes)

## ทางออกเมื่อเกินขีดจำกัด
หากมีผู้ใช้พร้อมกันเกิน ~50 คน หรือข้อมูลเกิน 50% ของเพดานเซลล์ ให้ทำ ADR ใหม่เพื่อย้ายไป Cloud Run + ฐานข้อมูลจริง
repository layer ถูกแยกไว้แล้ว จึงเปลี่ยนเฉพาะ adapter ได้
