/** ข้อมูลรายงาน (ภายใน): กิจกรรม × หน่วยดำเนินการ ตามสิทธิ์กลุ่มงานของผู้ใช้ — หน้าเว็บจัดรูปแบบ/ส่งออกเอง */
import { currentFiscalYear, fiscalMonthIndex, type ReportData } from '@kpp/domain';
import { requireRole } from '../auth';
import { nowIso, type Ctx } from '../context';
import { loadDataset, today } from './projects';
import { buildUnitRows } from './units';

export function reportData(ctx: Ctx, b: { fiscalYear: number }): ReportData {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
  const ds = loadDataset(ctx);
  // เจ้าหน้าที่ดูรายงานได้ทุกกลุ่ม (ADR-010) — หน้าเว็บกรองตามกลุ่ม/พื้นที่ที่เลือก
  const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy);
  const fyNow = currentFiscalYear(ctx.env.now());
  const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(today(ctx));
  return { fiscalYear: fy, generatedAt: nowIso(ctx), monthIndex: m, rows: buildUnitRows(ctx, ds, projects, m) };
}
