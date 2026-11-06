/**
 * โหมดสาธิต: รัน backend core ตัวจริงในเบราว์เซอร์ด้วย in-memory adapter + ข้อมูลจำลอง (ไม่มี PII จริง)
 * สถานะเก็บใน sessionStorage ของแท็บนี้เท่านั้น ปิดแท็บแล้วข้อมูลหาย
 */
import { createMemoryEnv, type MemoryEnv } from '@kpp/gas/memory';
import { handle } from '@kpp/gas/core/router';
import { setSuperAdmin } from '@kpp/gas/core/auth';
import { seedDemoPlan } from '@kpp/gas/core/setup';
import { readXlsx } from '@kpp/domain';
import { samplePlanBytes } from './samplePlan';
import { SYSTEM_USER, newMeta, type Ctx } from '@kpp/gas/core/context';
import { phoneHash } from '@kpp/gas/core/auth';
import type { Workgroup } from '@kpp/domain';

export const DEMO_SUPER = { username: 'demo', password: 'demo-password-1' };
export const DEMO_ADMIN_PHONE = '0800000001';

const KEY = 'kpp-abm-demo-db-v2';
let env: MemoryEnv | null = null;

async function boot(): Promise<MemoryEnv> {
  const e = createMemoryEnv(new Date());
  const ctx: Ctx = { env: e, requestId: 'demo', user: SYSTEM_USER, device: 'demo' };
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(KEY);
  } catch { /* storage ไม่พร้อม — เริ่มใหม่ทุกครั้ง */ }
  if (saved) {
    const s = JSON.parse(saved) as { db: string; props: Array<[string, string]> };
    e.db.load(s.db);
    for (const [k, v] of s.props) e.props.set(k, v);
    return e;
  }
  setSuperAdmin(ctx, DEMO_SUPER.username, DEMO_SUPER.password);
  seedDemoPlan(ctx, readXlsx(await samplePlanBytes())[0].rows);
  const prod = e.db.list<Workgroup>('Workgroups').find((g) => g.code === 'PROD')!;
  e.db.insert('Users', [{
    ...newMeta(ctx), phone: DEMO_ADMIN_PHONE, phoneHash: phoneHash(ctx, DEMO_ADMIN_PHONE), fullName: 'ผู้ดูแลกลุ่มงาน (สาธิต)',
    position: 'นักวิชาการส่งเสริมการเกษตร', workgroupId: prod.id, affiliation: 'สำนักงานเกษตรจังหวัดกำแพงเพชร', role: 'admin',
    status: 'active', scopeWorkgroups: '[]', tokenVersion: 1, approvedAt: new Date().toISOString(), approvedBy: 'ระบบ', lastLoginAt: '', knownDevices: '[]',
  }]);
  persist(e);
  return e;
}

function persist(e: MemoryEnv): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ db: e.db.dump(), props: [...e.props.m.entries()] }));
  } catch { /* quota — ข้ามได้ในโหมดสาธิต */ }
}

let booting: Promise<MemoryEnv> | null = null;

export async function demoCall(payload: Record<string, unknown>): Promise<unknown> {
  env ??= await (booting ??= boot());
  const res = handle(env, payload);
  persist(env);
  // ผ่าน JSON เหมือนเรียกผ่านเครือข่ายจริง
  return JSON.parse(JSON.stringify(res));
}

export function resetDemo(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignore */ }
  env = null;
  booting = null;
}
