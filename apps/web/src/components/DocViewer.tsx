import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** ขนาดหน้า A4 ที่ 96 dpi */
const PAGE_W = 793.7;
const MIN = 0.3;
const MAX = 3;
type Mode = 'width' | 'page' | 'custom';

/**
 * พื้นที่ดูเอกสารแบบโปรแกรมอ่าน PDF: พอดีความกว้าง / พอดีหน้า / ซูมเอง (+ − หรือ Ctrl + ล้อเมาส์, จีบนิ้วบนมือถือ)
 * เต็มจอ และปุ่มเพิ่มเติมจากผู้เรียกใช้ (เช่น พิมพ์ ซ่อนฟอร์ม)
 */
export function DocViewer({ children, left, right, label = 'ตัวอย่างเอกสาร' }: {
  children: ReactNode; left?: ReactNode; right?: ReactNode; label?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('width');
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ w: PAGE_W, h: 1123 });
  const [full, setFull] = useState(false);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const fit = useCallback((m: Mode) => {
    const st = stage.current;
    const pg = page.current;
    if (!st || !pg) return;
    const pad = window.innerWidth < 640 ? 16 : 48;
    const w = pg.offsetWidth || PAGE_W;
    const h = pg.offsetHeight || 1123;
    setSize({ w, h });
    if (m === 'width') setScale(Math.max(MIN, Math.min(MAX, (st.clientWidth - pad) / w)));
    if (m === 'page') setScale(Math.max(MIN, Math.min(MAX, Math.min((st.clientWidth - pad) / w, (st.clientHeight - pad) / h))));
  }, []);

  useLayoutEffect(() => {
    if (mode === 'custom') {
      const pg = page.current;
      if (pg) setSize({ w: pg.offsetWidth, h: pg.offsetHeight });
    } else fit(mode);
    const ro = new ResizeObserver(() => (mode === 'custom' ? page.current && setSize({ w: page.current.offsetWidth, h: page.current.offsetHeight }) : fit(mode)));
    if (stage.current) ro.observe(stage.current);
    if (page.current) ro.observe(page.current);
    return () => ro.disconnect();
  }, [mode, fit]);

  const zoom = (f: number) => { setMode('custom'); setScale((s) => Math.max(MIN, Math.min(MAX, Math.round(s * f * 100) / 100))); };

  // Ctrl/⌘ + ล้อเมาส์ = ซูม (ไม่ซูมทั้งหน้าเว็บ) · จีบนิ้วบนทัชแพดก็ส่ง ctrlKey มาเช่นกัน
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMode('custom');
      setScale((s) => Math.max(MIN, Math.min(MAX, s * (e.deltaY < 0 ? 1.08 : 1 / 1.08))));
    };
    st.addEventListener('wheel', onWheel, { passive: false });
    return () => st.removeEventListener('wheel', onWheel);
  }, []);

  // จีบนิ้วสองนิ้วบนมือถือ
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    let start = 0;
    let base = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => { if (e.touches.length === 2) { start = dist(e.touches); base = scaleRef.current; } };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !start) return;
      e.preventDefault();
      setMode('custom');
      setScale(Math.max(MIN, Math.min(MAX, base * (dist(e.touches) / start))));
    };
    const onEnd = () => { start = 0; };
    st.addEventListener('touchstart', onStart, { passive: true });
    st.addEventListener('touchmove', onMove, { passive: false });
    st.addEventListener('touchend', onEnd);
    return () => { st.removeEventListener('touchstart', onStart); st.removeEventListener('touchmove', onMove); st.removeEventListener('touchend', onEnd); };
  }, []);
  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === shell.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFull = () => {
    const el = shell.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setFull((f) => !f));
    else setFull((f) => !f);
  };

  return (
    <div ref={shell} className={`dv ${full ? 'is-full' : ''}`} aria-label={label}>
      <div className="dv-bar" role="toolbar" aria-label="เครื่องมือดูเอกสาร">
        {left}
        <div className="dv-zoom">
          <button type="button" className="dv-btn" onClick={() => zoom(1 / 1.15)} aria-label="ย่อ">−</button>
          <span className="dv-pct" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button type="button" className="dv-btn" onClick={() => zoom(1.15)} aria-label="ขยาย">+</button>
        </div>
        <div className="dv-modes" role="group" aria-label="ขนาดการแสดงผล">
          <button type="button" className="dv-btn" aria-pressed={mode === 'page'} onClick={() => setMode('page')}>พอดีหน้า</button>
          <button type="button" className="dv-btn" aria-pressed={mode === 'width'} onClick={() => setMode('width')}>พอดีกว้าง</button>
          <button type="button" className="dv-btn dv-hide-sm" aria-pressed={mode === 'custom' && Math.abs(scale - 1) < 0.01} onClick={() => { setMode('custom'); setScale(1); }}>100%</button>
        </div>
        <button type="button" className="dv-btn dv-hide-sm" onClick={toggleFull} aria-pressed={full}>{full ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</button>
        <span className="dv-spacer" />
        {right}
      </div>
      <div ref={stage} className="dv-stage" tabIndex={0} aria-label={`${label} — ใช้ Ctrl + ล้อเมาส์ หรือจีบนิ้วเพื่อซูม`}>
        <div className="dv-canvas" style={{ width: size.w * scale, height: size.h * scale }}>
          <div ref={page} className="dv-page" style={{ transform: `scale(${scale})` }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
