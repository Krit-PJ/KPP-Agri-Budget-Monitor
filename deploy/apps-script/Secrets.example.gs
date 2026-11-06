/**
 * คัดลอกไฟล์นี้เป็น "Secrets.gs" ในโปรเจกต์ Apps Script แล้วใส่ค่าจริง
 * ใช้เฉพาะตอนรัน setup ครั้งแรก — ระบบเก็บรหัส Super Admin เป็น PBKDF2 hash ใน Script Properties
 * หลังรัน setup สำเร็จ ให้ "ลบไฟล์ Secrets.gs ออกจากโปรเจกต์" ทันที และห้ามนำขึ้น GitHub
 */
var ROOT_FOLDER_ID = 'ใส่ ID โฟลเดอร์ Drive ของระบบ';   // ส่วนท้ายของลิงก์ drive.google.com/drive/folders/<ID>
var INIT_SUPER_USER = 'ชื่อผู้ใช้ Super Admin';
var INIT_SUPER_PASSWORD = 'รหัสผ่านอย่างน้อย 8 ตัวอักษร';
