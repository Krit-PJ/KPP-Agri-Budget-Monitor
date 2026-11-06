/** ข้อมูลรายงาน (ภายใน): กิจกรรม × หน่วยดำเนินการ ตามสิทธิ์กลุ่มงานของผู้ใช้ — หน้าเว็บจัดรูปแบบ/ส่งออกเอง */
import { currentFiscalYear, fiscalMonthIndex, type ReportData } from '@kpp/domain';
import { canAccessWorkgroup, requireRole } from '../auth';
import { nowIso, type Ctx } from '../context';
import { loadDataset, today } from './projects';
import { buildUnitRows } from './units';

export function reportData(ctx: Ctx, b: { fiscalYear: number }): ReportData {
  const u = requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
  const ds = loadDataset(ctx);
  const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy && canAccessWorkgroup(u, p.workgroupId));
  const fyNow = currentFiscalYear(ctx.env.now());
  const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(today(ctx));
  return { fiscalYear: fy, generatedAt: nowIso(ctx), monthIndex: m, rows: buildUnitRows(ctx, ds, projects, m) };
}
