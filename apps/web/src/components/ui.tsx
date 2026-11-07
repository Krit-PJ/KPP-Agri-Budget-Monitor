import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  formatBaht, formatBahtShort, PROJECT_STATUS_LABEL, RISK_LABEL, THAI_MONTH_SHORT,
  type ActionName, type ActionRequest, type ActionResponse, type BudgetSummary, type Lookups, type ProjectStatus, type RiskFlag,
} from '@kpp/domain';
import { ApiError, load, peek } from '../api/client';

/* ------------------------------- data hooks ------------------------------- */

export interface Loadable<T> { data: T | null; error: ApiError | null; loading: boolean; refreshing: boolean; reload: () => void }

/** ข้อมูลที่ดึงภายในเวลานี้ถือว่าใหม่ ไม่ดึงซ้ำเมื่อสลับหน้าไปมา */
const FRESH_MS = 20_000;

/**
 * โหลดข้อมูลแบบ stale-while-revalidate: มีข้อมูลเดิมใน cache ก็แสดงทันที แล้วอัปเดตเบื้องหลัง
 * reload() บังคับดึงใหม่ (ใช้หลังบันทึกข้อมูล)
 */
export function useApi<A extends ActionName>(action: A, body: ActionRequest<A>, deps: unknown[] = []): Loadable<ActionResponse<A>> {
  type S = { data: ActionResponse<A> | null; error: ApiError | null; loading: boolean; refreshing: boolean };
  const [state, setState] = useState<S>(() => {
    const e = peek(action, body);
    return { data: e?.data ?? null, error: null, loading: !e, refreshing: false };
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const e = peek(action, body);
    const fresh = !!e && tick === 0 && Date.now() - e.at < FRESH_MS;
    setState({ data: e?.data ?? null, error: null, loading: !e, refreshing: !!e && !fresh });
    if (fresh) return;
    load(action, body)
      .then((data) => alive && setState({ data, error: null, loading: false, refreshing: false }))
      .catch((err: unknown) => {
        if (!alive) return;
        const error = err instanceof ApiError ? err : new ApiError('INTERNAL_ERROR', String(err));
        // มีข้อมูลเดิมอยู่: แสดงต่อไป (เช่น เน็ตหลุดชั่วคราว) — ไม่มี: แสดงข้อผิดพลาด
        setState((s) => (s.data && error.code === 'NETWORK' ? { ...s, refreshing: false } : { data: null, error, loading: false, refreshing: false }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, tick, ...deps]);
  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

const LookupCtx = createContext<Lookups | null>(null);
export const LookupProvider = LookupCtx.Provider;
export function useLookups(): Lookups {
  const l = useContext(LookupCtx);
  if (!l) throw new Error('lookups not loaded');
  return l;
}
export function useNames() {
  const l = useLookups();
  return {
    group: (id: string) => l.workgroups.find((g) => g.id === id)?.name ?? '–',
    fund: (id: string) => l.fundingSources.find((f) => f.id === id)?.name ?? '–',
    fundShort: (id: string) => l.fundingSources.find((f) => f.id === id)?.shortName ?? '–',
  };
}

/* --------------------------------- toast --------------------------------- */

const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">{msg && <div className="toast">{msg}</div>}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* -------------------------------- display -------------------------------- */

export function Baht({ v, short }: { v: number; short?: boolean }) {
  return <span className="num">{short ? formatBahtShort(v) : formatBaht(v)}</span>;
}

export function Pct({ v }: { v: number }) {
  return <span className="num">{v.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%</span>;
}

const STATUS_CLASS: Record<ProjectStatus, string> = { PLANNED: 'b-plan', IN_PROGRESS: 'b-run', COMPLETED: 'b-ok', CANCELLED: '' };
export function StatusBadge({ s }: { s: ProjectStatus }) {
  return <span className={`badge ${STATUS_CLASS[s]}`}>{PROJECT_STATUS_LABEL[s]}</span>;
}

export function RiskBadges({ flags }: { flags: RiskFlag[] }) {
  if (!flags.length) return null;
  return (
    <span className="btn-row">
      {flags.map((f) => <span key={f} className={`badge ${f === 'OVER_BUDGET' ? 'b-risk' : 'b-warn'}`}>{RISK_LABEL[f]}</span>)}
    </span>
  );
}

/** แถบงบประมาณ: เบิกจ่าย | ผูกพัน | คงเหลือ + เส้นแผน */
export function BudgetStrip({ b, targetPct, label }: { b: BudgetSummary; targetPct?: number; label?: string }) {
  const total = Math.max(b.currentBudget, b.disbursed + b.committed, 1);
  const w = (v: number) => `${Math.max(0, (v / total) * 100)}%`;
  const over = b.remaining < 0;
  const committedShown = Math.max(0, Math.min(b.committed, b.currentBudget - b.disbursed));
  return (
    <div>
      <div className="strip" role="img" aria-label={`${label ?? 'งบประมาณ'}: เบิกจ่ายแล้วร้อยละ ${b.spendingPct}${targetPct !== undefined ? ` เทียบแผนร้อยละ ${targetPct}` : ''}`}>
        <div className={`strip-seg ${over ? 'seg-over' : 'seg-disbursed'}`} style={{ width: w(b.disbursed) }} />
        <div className="strip-seg seg-committed" style={{ width: w(committedShown) }} />
        {targetPct !== undefined && targetPct > 0 && (
          <div className="strip-target" style={{ left: `${Math.min(targetPct, 100)}%` }} data-label={`แผน ${targetPct.toLocaleString('th-TH', { maximumFractionDigits: 0 })}%`} />
        )}
      </div>
      <div className="strip-legend">
        <span className="key"><i style={{ background: over ? 'var(--clay)' : 'var(--paddy)' }} />เบิกจ่ายแล้ว <b><Baht v={b.disbursed} short /></b></span>
        <span className="key"><i style={{ background: 'var(--commit)' }} />ผูกพัน <b><Baht v={b.committed} short /></b></span>
        <span className="key"><i style={{ background: '#e3e9e4', border: '1px solid #c9d3cb' }} />คงเหลือ <b><Baht v={b.remaining} short /></b></span>
        {targetPct !== undefined && <span className="key"><i style={{ background: 'var(--straw)', width: 4 }} />เป้าหมายตามแผน ณ เดือนนี้</span>}
      </div>
    </div>
  );
}

export function MiniStrip({ b }: { b: BudgetSummary }) {
  const total = Math.max(b.currentBudget, b.disbursed, 1);
  return (
    <div className="mini-strip" aria-hidden="true">
      <div style={{ width: `${(b.disbursed / total) * 100}%`, background: b.remaining < 0 ? 'var(--clay)' : 'var(--paddy)' }} />
      <div style={{ width: `${(Math.max(0, Math.min(b.committed, b.currentBudget - b.disbursed)) / total) * 100}%`, background: 'var(--commit)' }} />
    </div>
  );
}

/**
 * แถบเปรียบเทียบผลกับเป้า (bullet graph, Stephen Few): แถบ = เบิกจ่าย+ผูกพัน, ขีดตั้ง = เป้า ณ เดือนนี้
 * อ่านได้ทันทีว่าแต่ละกลุ่ม "ทันแผน" หรือ "ช้ากว่าแผน" โดยไม่ต้องเทียบตัวเลข
 */
export function BulletBar({ b, targetPct }: { b: BudgetSummary; targetPct: number }) {
  const total = Math.max(b.currentBudget, b.disbursed, 1);
  const tick = Math.min(100, (targetPct / 100) * (b.currentBudget / total) * 100);
  const behind = targetPct > 0 && b.spendingPct + 0.05 < targetPct;
  return (
    <div className="bullet" aria-hidden="true">
      <div className="bullet-track">
        <div style={{ width: `${(b.disbursed / total) * 100}%`, background: b.remaining < 0 ? 'var(--clay)' : behind ? 'var(--straw)' : 'var(--paddy)' }} />
        <div style={{ width: `${(Math.max(0, Math.min(b.committed, b.currentBudget - b.disbursed)) / total) * 100}%`, background: 'var(--commit)' }} />
      </div>
      {targetPct > 0 && <span className="bullet-tick" style={{ left: `${tick}%` }} />}
    </div>
  );
}

/** เส้นเบิกจ่ายสะสมเทียบแผน (ต.ค.–ก.ย.) */
export function PlanVsActual({ cumulative, targetPct, budget, upToMonth, annualPct, markMonth }: {
  cumulative: number[]; targetPct: number[]; budget: number; upToMonth: number;
  /** เป้าทั้งปี (เส้นประแนวนอน) */
  annualPct?: number;
  /** เดือนที่ต้องเสร็จ (0 = ต.ค.) แสดงเป็นเส้นแนวตั้ง เช่น 8 = มิ.ย. (อบรม/ประชุมต้องเสร็จ) */
  markMonth?: number;
}) {
  const W = 640, H = 220, L = 44, R = 12, T = 12, B = 28;
  const months = [...THAI_MONTH_SHORT.slice(9), ...THAI_MONTH_SHORT.slice(0, 9)];
  const x = (i: number) => L + (i * (W - L - R)) / 11;
  const y = (pct: number) => T + (1 - Math.min(pct, 110) / 110) * (H - T - B);
  const actualPct = cumulative.map((v) => (budget > 0 ? (v / budget) * 100 : 0)).slice(0, Math.max(upToMonth, 1));
  const path = (pts: number[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`เบิกจ่ายสะสมร้อยละ ${actualPct.at(-1)?.toFixed(1) ?? 0} เทียบแผนร้อยละ ${targetPct[upToMonth - 1] ?? 0}`}>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e3e9e4" />
            <text x={L - 8} y={y(g) + 4} textAnchor="end">{g}%</text>
          </g>
        ))}
        {months.map((m, i) => <text key={m} x={x(i)} y={H - 8} textAnchor="middle">{m}</text>)}
        {annualPct !== undefined && (
          <g>
            <line x1={L} x2={W - R} y1={y(annualPct)} y2={y(annualPct)} stroke="var(--forest)" strokeDasharray="2 4" />
            <text x={W - R} y={y(annualPct) - 6} textAnchor="end" style={{ fill: 'var(--forest)' }}>เป้าทั้งปี {annualPct}%</text>
          </g>
        )}
        {markMonth !== undefined && (
          <g>
            <line x1={x(markMonth)} x2={x(markMonth)} y1={T} y2={H - B} stroke="var(--clay)" strokeDasharray="3 3" opacity=".7" />
            <text x={x(markMonth) - 4} y={T + 10} textAnchor="end" style={{ fill: 'var(--clay)' }}>อบรม/ประชุมเสร็จ</text>
          </g>
        )}
        <path d={path(targetPct)} fill="none" stroke="var(--straw)" strokeWidth="2.5" strokeDasharray="6 5" />
        <path d={path(actualPct)} fill="none" stroke="var(--paddy)" strokeWidth="3" strokeLinejoin="round" />
        {actualPct.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="3.5" fill="var(--paddy)" />)}
      </svg>
      <figcaption className="strip-legend">
        <span className="key"><i style={{ background: 'var(--paddy)' }} />เบิกจ่ายสะสมจริง</span>
        <span className="key"><i style={{ background: 'var(--straw)' }} />แผนการเบิกจ่าย</span>
      </figcaption>
    </figure>
  );
}

/* --------------------------------- states -------------------------------- */

export function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skeleton" style={{ height: i ? 18 : 42, margin: '10px 0', width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

const ERROR_HELP: Partial<Record<string, string>> = {
  FORBIDDEN_SCOPE: 'รายการนี้อยู่นอกสิทธิ์ของคุณ ติดต่อ Super Admin หากต้องการสิทธิ์เพิ่ม',
  VERSION_CONFLICT: 'มีผู้อื่นแก้ไขข้อมูลนี้ก่อนคุณ — โหลดข้อมูลล่าสุดแล้วแก้ไขอีกครั้ง',
  BUSY_RETRY: 'ระบบกำลังบันทึกข้อมูลของผู้ใช้อื่น ลองอีกครั้งในไม่กี่วินาที',
  QUOTA_RETRY: 'มีการใช้งานหนาแน่น ลองอีกครั้งในอีกสักครู่',
  NETWORK: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง',
};

export function ErrorBox({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <div>
        <strong>{error.message}</strong>
        {ERROR_HELP[error.code] && <div className="small">{ERROR_HELP[error.code]}</div>}
      </div>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry} style={{ marginLeft: 'auto' }}>ลองอีกครั้ง</button>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/** แสดงผล Loadable แบบมาตรฐาน */
export function Async<T>({ s, children, lines }: { s: Loadable<T>; children: (data: T) => ReactNode; lines?: number }) {
  if (s.loading && !s.data) return <Loading lines={lines} />;
  if (s.error) return <ErrorBox error={s.error} onRetry={s.reload} />;
  if (!s.data) return null;
  return <>{children(s.data)}</>;
}

/* --------------------------------- dialog -------------------------------- */

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-labelledby="sheet-title">
      {open && (
        <>
          <div className="sheet-head">
            <h2 id="sheet-title">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="ปิด">×</button>
          </div>
          <div className="sheet-body">{children}</div>
        </>
      )}
    </dialog>
  );
}

/** ปุ่มบันทึกที่กันการกดซ้ำและแสดง error ของการบันทึก */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', String((e as Error).message ?? e)));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}

/** แปลงข้อความบาทในฟอร์มเป็นสตางค์ */
export function bahtInputToSatang(s: string): number | null {
  const clean = s.replace(/[,\s฿บาท]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export const AUDIT_LABEL: Record<string, string> = {
  'project.create': 'เพิ่มโครงการ', 'project.update': 'แก้ไขโครงการ', 'project.delete': 'ลบโครงการ',
  'activity.create': 'เพิ่มกิจกรรม', 'activity.update': 'แก้ไขกิจกรรม', 'activity.units': 'กำหนดพื้นที่ดำเนินการ',
  'allocation.create': 'บันทึกงบประมาณ', 'allocation.void': 'ยกเลิกรายการงบ',
  'disbursement.create': 'บันทึกการเบิกจ่าย', 'disbursement.status': 'เปลี่ยนสถานะการเบิกจ่าย', 'disbursement.void': 'ยกเลิกรายการเบิกจ่าย',
  'budget.override': 'อนุมัติเกินงบ', 'progress.create': 'รายงานผลการดำเนินงาน',
  'file.upload': 'แนบไฟล์', 'file.ocr': 'อ่านข้อมูลจากรูป', 'import.stage': 'เตรียมนำเข้าไฟล์', 'import.commit': 'นำเข้าข้อมูล', 'import.cancel': 'ยกเลิกการนำเข้า',
  'request_access': 'ขอสิทธิ์ใช้งาน', 'request.approve': 'อนุมัติคำขอสิทธิ์', 'request.reject': 'ไม่อนุมัติคำขอสิทธิ์',
  'user.create': 'เพิ่มผู้ใช้', 'user.update': 'แก้ไขผู้ใช้', 'user.suspend': 'ระงับผู้ใช้', 'user.activate': 'เปิดใช้ผู้ใช้',
  'settings.update': 'แก้ไขการตั้งค่า', 'master.create': 'เพิ่มข้อมูลหลัก', 'master.update': 'แก้ไขข้อมูลหลัก',
};
export const auditLabel = (a: string) => AUDIT_LABEL[a] ?? a;
