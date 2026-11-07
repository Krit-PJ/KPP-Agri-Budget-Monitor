/** เป้าการเบิกจ่ายของปีงบประมาณ (ทุกส่วนของระบบใช้ค่านี้: แถบเป้า, เทียบแผน, กราฟ, รายงาน) */
import { AppError, targetCurve, validateSpendTarget, type SpendTarget } from '@kpp/domain';
import { requireRole } from '../auth';
import { audit, bumpDataVersion, setSetting, spendTargetFor, type Ctx } from '../context';

const fyOf = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 2500 || n > 2700) throw new AppError('VALIDATION_FAILED', 'ปีงบประมาณไม่ถูกต้อง');
  return n;
};

export function getTargets(ctx: Ctx, b: { fiscalYear: number }): { fiscalYear: number; target: SpendTarget; curve: number[] } {
  requireRole(ctx, 'admin', 'minisuper', 'superadmin');
  const fy = fyOf(b.fiscalYear);
  const target = spendTargetFor(ctx, fy);
  return { fiscalYear: fy, target, curve: targetCurve(target) };
}

/** ผู้ดูแล (Mini Super / Super Admin) เท่านั้น เพราะกระทบทั้งหน่วยงาน */
export function saveTargets(ctx: Ctx, b: { fiscalYear: number; target: SpendTarget }): { fiscalYear: number; target: SpendTarget; curve: number[] } {
  requireRole(ctx, 'minisuper', 'superadmin');
  const fy = fyOf(b.fiscalYear);
  const t = b.target ?? ({} as SpendTarget);
  const clean: SpendTarget = {
    mode: t.mode === 'deadline' ? 'deadline' : 'quarter',
    quarters: Array.isArray(t.quarters) ? t.quarters.slice(0, 4).map(Number) : [],
    month: Number(t.month),
    pct: Number(t.pct),
  };
  if (clean.mode === 'quarter') { clean.month = 12; clean.pct = 100; } else clean.quarters = [];
  const err = validateSpendTarget(clean.mode === 'deadline' ? { ...clean, quarters: [0, 0, 0, 0] } : clean);
  if (err) throw new AppError('VALIDATION_FAILED', err);
  const before = spendTargetFor(ctx, fy);
  setSetting(ctx, `spendTarget:${fy}`, JSON.stringify(clean));
  audit(ctx, 'targets.save', 'Settings', `spendTarget:${fy}`, { before, after: clean });
  bumpDataVersion(ctx);
  return { fiscalYear: fy, target: clean, curve: targetCurve(clean) };
}
