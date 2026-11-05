// ตรวจหา secret ที่ไม่ควรอยู่ใน repository (ไม่พิมพ์ค่าที่พบ — แสดงเฉพาะไฟล์/บรรทัด)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/"type"\s*:\s*"service_account"/, 'service-account JSON'],
  [/"refresh_token"\s*:\s*"[^"]{20,}"/, 'OAuth refresh token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/ya29\.[0-9A-Za-z_-]{20,}/, 'Google OAuth access token'],
  [/gh[pousr]_[0-9A-Za-z]{36}/, 'GitHub token'],
  [/INIT_SUPER_PASSWORD\s*=\s*'(?!รหัสผ่าน)[^']{6,}'/, 'Super Admin password'],
  [/\b0[689]\d{8}\b/, 'Thai mobile number (PII)'],
];
const ALLOW_PHONE = new Set(['0800000001', '0812345678']); // หมายเลขสาธิต/ตัวอย่างในข้อความช่วยเหลือ (ไม่ใช่ของบุคคล)
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => f && !/(^|\/)(package-lock\.json|.*\.(png|jpg|svg|ico|woff2?))$/.test(f));
let found = 0;
for (const f of files) {
  if (/(^|\/)Secrets\.gs$/.test(f)) { console.error(`${f}: ไฟล์ Secrets.gs ต้องไม่อยู่ใน Git`); found++; continue; }
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [re, label] of PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      if (label.startsWith('Thai mobile') && (ALLOW_PHONE.has(m[0]) || /test\.ts$/.test(f))) continue;
      console.error(`${f}:${i + 1}: พบ ${label}`);
      found++;
    }
  });
}
if (found) { console.error(`\nพบ ${found} รายการ — หยุดใช้ secret นั้น, rotate และลบออกตาม docs/runbooks/operations.md`); process.exit(1); }
console.log(`secret scan: ตรวจ ${files.length} ไฟล์ ไม่พบปัญหา`);
