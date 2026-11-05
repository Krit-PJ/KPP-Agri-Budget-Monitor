// Bundle core + adapters เป็น Code.gs ไฟล์เดียวสำหรับ Apps Script
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const ENTRIES = ['doGet', 'doPost', 'setup', 'setSuperAdmin', 'installTriggers', 'autoImportInbox', 'dailyMaintenance'];
const footer = ENTRIES.map((n) => `function ${n}() { return KPP.${n}.apply(null, arguments); }`).join('\n');
const pkg = JSON.parse(readFileSync(here('../../package.json'), 'utf8'));

mkdirSync(here('./dist'), { recursive: true });
await build({
  entryPoints: [here('./src/gas/main.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'KPP',
  platform: 'neutral',
  target: 'es2020',
  outfile: here('./dist/Code.js'),
  alias: { '@kpp/domain': here('../../packages/domain/src/index.ts') },
  banner: { js: `/* KPP Agri-Budget Monitor — Apps Script backend v${pkg.version} (สร้างอัตโนมัติจาก apps/gas — ห้ามแก้ไขไฟล์นี้โดยตรง) */` },
  footer: { js: footer },
  legalComments: 'none',
  logLevel: 'warning',
});
// clasp ใช้ .js ได้ แต่สำหรับการคัดลอกวางใน editor ให้มี Code.gs ด้วย
writeFileSync(here('./dist/Code.gs'), readFileSync(here('./dist/Code.js'), 'utf8'));
copyFileSync(here('./static/appsscript.json'), here('./dist/appsscript.json'));
copyFileSync(here('./static/Secrets.example.gs'), here('./dist/Secrets.example.gs'));
console.log('built apps/gas/dist/Code.gs');
