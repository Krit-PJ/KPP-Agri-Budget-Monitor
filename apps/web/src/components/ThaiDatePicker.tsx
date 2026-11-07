import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** ปฏิทินภาษาไทย (พ.ศ.) — ปุ่มไอคอนปฏิทิน กดแล้วเลือก วัน-เดือน-ปี; ค่าเป็น YYYY-MM-DD (ค.ศ.) */
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" />
    </svg>
  );
}

export function ThaiDatePicker({ value, min, max, today, onPick, buttonText, buttonClass = '', disabled, footer }: {
  value: string;
  min: string;
  max: string;
  today: string;
  onPick: (iso: string) => void;
  buttonText: ReactNode;
  buttonClass?: string;
  disabled?: boolean;
  /** ปุ่มเพิ่มเติมท้ายปฏิทิน เช่น "ไม่กำหนด" — เรียก close() เพื่อปิด */
  footer?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const start = value || (today < min ? min : today > max ? max : today);
  const [view, setView] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const s = value || (today < min ? min : today > max ? max : today);
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
    const onDown = (e: MouseEvent | TouchEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    // โฟกัสวันที่เลือกไว้ (หรือวันแรกที่เลือกได้)
    setTimeout(() => wrap.current?.querySelector<HTMLButtonElement>('.tdp-day.is-sel, .tdp-day.is-today, .tdp-day:not([disabled])')?.focus(), 0);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => { setOpen(false); btn.current?.focus(); };
  const shift = (d: number) => setView((v) => { const m = v.m + d; return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const canPrev = iso(view.y, view.m, 1) > min;
  const canNext = iso(view.y, view.m, days) < max;

  return (
    <div className="tdp" ref={wrap}>
      <button ref={btn} type="button" className={`tdp-btn ${buttonClass}`} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarIcon /><span>{buttonText}</span>
      </button>
      {open && (
        <>
          <div className="tdp-backdrop" aria-hidden="true" onClick={close} />
          <div className="tdp-pop" role="dialog" aria-modal="false" aria-labelledby={titleId}>
            <div className="tdp-head">
              <button type="button" className="tdp-nav" onClick={() => shift(-1)} disabled={!canPrev} aria-label="เดือนก่อนหน้า">‹</button>
              <strong id={titleId} aria-live="polite">{MONTHS[view.m]} {view.y + 543}</strong>
              <button type="button" className="tdp-nav" onClick={() => shift(1)} disabled={!canNext} aria-label="เดือนถัดไป">›</button>
            </div>
            <div className="tdp-grid" role="grid">
              {DOW.map((d, i) => <span key={d} className="tdp-dow" role="columnheader" aria-label={DOW_FULL[i]}>{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const v = iso(view.y, view.m, d);
                const off = v < min || v > max;
                return (
                  <button key={v} type="button" className={`tdp-day ${v === value ? 'is-sel' : ''} ${v === today ? 'is-today' : ''}`} disabled={off}
                    aria-pressed={v === value} aria-label={`${d} ${MONTHS[view.m]} ${view.y + 543}`}
                    onClick={() => { onPick(v); close(); }}>{d}</button>
                );
              })}
            </div>
            <div className="tdp-foot">
              {footer?.(close)}
              <button type="button" className="btn btn-ghost btn-sm" onClick={close}>ปิด</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
