import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  GARUDA_JPEG_BASE64, MEMO_STAFF_FIELDS, MEMO_WEB_FONT_PT, formatThaiDateLong, memoBody, memoParagraphParts, memoText, wrapSegments,
  type MemoData, type MemoField, type MemoPart,
} from '@kpp/domain';
import './memo.css';

const GARUDA = `data:image/jpeg;base64,${GARUDA_JPEG_BASE64}`;
const DOTS = '................................................';

/** โหลดฟอนต์ Sarabun (ฟอนต์เดียวกับ Google Doc ที่ระบบสร้าง) ครั้งแรกที่ใช้ */
function useSarabun() {
  useEffect(() => {
    if (document.getElementById('font-sarabun')) return;
    const l = document.createElement('link');
    l.id = 'font-sarabun';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap';
    document.head.appendChild(l);
  }, []);
}

const THAI = /[\u0E00-\u0E7F]/;
/**
 * ข้อความไทยตัดบรรทัดตามคำ — จำนวนเงิน+บาท, ข้อความในวงเล็บ, รหัส ไม่ถูกตัดกลาง
 * justify: แทรกช่องว่างกว้างศูนย์ระหว่างคำไทย ให้เบราว์เซอร์กระจายระยะที่ขอบเขตคำ
 * (ไม่เช่นนั้นจะไปกองที่เว้นวรรคไม่กี่จุด หรือแยกตัวอักษรในคำแบบ "ประสิ ท ธิ")
 */
export function ThaiText({ text, justify }: { text: string; justify?: boolean }) {
  const toks = wrapSegments(text);
  const out: ReactNode[] = [];
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    if (justify && prev && THAI.test(t.t.slice(0, 1)) && THAI.test(prev.t.slice(-1))) out.push(<span key={`j${i}`} className="jsp"> </span>);
    out.push(t.keep ? <span key={i} className="nw">{t.t}</span> : t.t);
  });
  return <>{out}</>;
}

function Box({ on, label, onToggle }: { on: boolean; label: string; onToggle?: () => void }) {
  if (!onToggle) return <span className={`m-box ${on ? 'is-on' : ''}`} role="img" aria-label={`${label}: ${on ? 'เลือก' : 'ไม่เลือก'}`} />;
  return <button type="button" className={`m-box is-btn ${on ? 'is-on' : ''}`} role="checkbox" aria-checked={on} aria-label={label} onClick={onToggle} />;
}

/** โหมดนำทาง: ไฮไลต์ช่องบนหน้าเอกสาร (เหลือง = เจ้าหน้าที่กรอก, ฟ้า = ระบบเติม) และคลิกเพื่อไปที่ช่องในฟอร์ม */
export interface MemoGuide { onField?: (f: MemoField) => void }

const FIELD_LABEL: Record<MemoField, string> = {
  orgLine: 'ส่วนราชการ', fax: 'โทรสาร', docNumber: 'เลขที่หนังสือ', date: 'วันที่', to: 'เรียน', refNo: 'เลขที่หนังสืออ้างถึง',
  refDate: 'วันที่หนังสืออ้างถึง', refFrom: 'หน่วยที่ส่งมา', expense: 'รายการค่าใช้จ่าย', projectName: 'โครงการ', mainActivityName: 'กิจกรรม',
  fund: 'แหล่งงบ', budgetCode: 'รหัสงบประมาณ', mainActivityCode: 'รหัสกิจกรรมหลัก', subActivityName: 'กิจกรรมย่อย', budget: 'งบประมาณ',
  previous: 'เบิกมาแล้ว', request: 'ขอเบิกครั้งนี้', remaining: 'คงเหลือ', checks: 'ผลการตรวจสอบ', signer: 'ผู้ตรวจสอบ', head: 'หัวหน้ากลุ่ม',
};

/** หน้า A4 ของบันทึกข้อความ (ขนาดจริง) — ใช้ทั้งตัวอย่างบนจอ ยืนยันก่อนบันทึก และพิมพ์ (พิมพ์ไม่มีไฮไลต์) */
export function MemoDocument({ d, onToggle, guide }: { d: MemoData; onToggle?: (k: 'ok' | 'returnFix' | 'forward') => void; guide?: MemoGuide | null }) {
  useSarabun();
  const tx = (s: string) => memoText(d, s);
  const justify = d.align === 'justify';
  /** ค่าในช่อง f — โหมดนำทางห่อด้วยไฮไลต์ที่คลิกได้; ค่าว่างแสดงชื่อช่องแทนจุดไข่ปลา */
  const F = ({ f, s, nowrap }: { f: MemoField; s: string; nowrap?: boolean }) => {
    const text = tx(s);
    const content = text ? (nowrap ? <span className="nw">{text}</span> : <ThaiText text={text} justify={justify} />) : null;
    if (!guide) return content ?? <>{DOTS}</>;
    const kind = MEMO_STAFF_FIELDS.has(f) ? 'staff' : 'auto';
    const label = FIELD_LABEL[f];
    return (
      <span className={`g-fld g-${kind} ${text ? '' : 'is-empty'}`} data-f={f} title={`${label} — ${kind === 'staff' ? 'เจ้าหน้าที่กรอก' : 'ระบบเติมให้'} (คลิกเพื่อแก้ไข)`}
        role={guide.onField ? 'button' : undefined} tabIndex={guide.onField ? 0 : undefined}
        onClick={guide.onField ? () => guide.onField!(f) : undefined}
        onKeyDown={guide.onField ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); guide.onField!(f); } } : undefined}>
        {content ?? `[${label}]`}
      </span>
    );
  };
  const T = ({ s }: { s: string }) => <ThaiText text={tx(s)} />;
  const override = (d.bodyOverride ?? []).some((x) => x.trim());
  const body = override ? memoBody(d).map((t) => [{ t } as MemoPart]) : memoParagraphParts(d, { keepEmpty: !!guide });
  const style = { '--m-body': `${MEMO_WEB_FONT_PT.body}pt`, '--m-label': `${MEMO_WEB_FONT_PT.label}pt`, '--m-title': `${MEMO_WEB_FONT_PT.title}pt` } as React.CSSProperties;
  return (
    <article className={`memo-page align-${d.align} ${guide ? 'is-guide' : ''}`} style={style} lang="th" aria-label="บันทึกข้อความ">
      <header className="m-head">
        <img src={GARUDA} alt="ตราครุฑ" className="m-garuda" />
        <h1 className="m-title">บันทึกข้อความ</h1>
      </header>
      <p className="m-line"><b className="m-label">ส่วนราชการ</b> <F f="orgLine" s={d.orgLine} />{(d.fax || guide) && <> <span className="nw">โทรสาร</span> <F f="fax" s={d.fax} nowrap /></>}</p>
      <div className="m-row">
        <p className="m-line"><b className="m-label">ที่</b> {d.docPrefix && <span className="nw">{tx(d.docPrefix.replace(/\/$/, ''))}/</span>}<F f="docNumber" s={d.docNumber} nowrap /></p>
        <p className="m-line"><b className="m-label">วันที่</b> <F f="date" s={formatThaiDateLong(d.date)} nowrap /></p>
      </div>
      <p className="m-line"><b className="m-label">เรื่อง</b> <T s={d.subject} /></p>
      <p className="m-line m-gap">เรียน&nbsp;&nbsp;<F f="to" s={d.to} /></p>
      <div className="m-body">
        {body.map((parts, i) => (
          <p key={i} className={i === 0 ? 'm-first' : ''}>
            {parts.map((x, j) => (x.f ? <F key={j} f={x.f} s={x.t} /> : <ThaiText key={j} text={tx(x.t)} justify={justify} />))}
          </p>
        ))}
      </div>
      <div className={`m-checks ${guide ? 'g-zone g-staff-zone' : ''}`}>
        <p>ตรวจสอบแล้ว</p>
        <p className="m-check"><Box on={d.checks.ok} label="ถูกต้องตามคู่มือโครงการ" onToggle={onToggle && (() => onToggle('ok'))} /> ถูกต้องตามคู่มือโครงการ</p>
        <p className="m-check"><Box on={d.checks.returnFix} label="ส่งคืนแก้ไข" onToggle={onToggle && (() => onToggle('returnFix'))} /> ส่งคืนแก้ไข เนื่องจาก {d.checks.returnFix && d.checks.returnReason.trim() ? <T s={d.checks.returnReason.trim()} /> : DOTS}</p>
        <p className="m-check"><Box on={d.checks.forward} label="ส่งฝ่ายบริหารทั่วไปเพื่อดำเนินการต่อไป" onToggle={onToggle && (() => onToggle('forward'))} /> ส่งฝ่ายบริหารทั่วไปเพื่อดำเนินการต่อไป</p>
      </div>
      <div className="m-sigs">
        {([['signer', d.signer], ['head', d.head]] as const).map(([f, p]) => (
          <div key={f} className="m-sig">
            <p>(ลงชื่อ)........................................................</p>
            <p>(<F f={f} s={p.name} nowrap />)</p>
            <p>ตำแหน่ง {p.position ? <T s={p.position} /> : DOTS}</p>
            {p.line2 && <p><T s={p.line2} /></p>}
          </div>
        ))}
      </div>
      <div className="m-approve">
        <p>อนุมัติ</p>
        <p className="m-gap2">(ลงชื่อ)........................................................</p>
        <p>({DOTS})</p>
        <p>ตำแหน่ง {DOTS}</p>
      </div>
    </article>
  );
}

/** ย่อหน้า A4 ให้พอดีความกว้างจอ (มือถือ/แท็บเล็ต) โดยไม่เปลี่ยนการจัดหน้า */
export function A4Fit({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, h: 0 });
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const pageW = i.offsetWidth || 794;
      const scale = Math.min(1, o.clientWidth / pageW);
      setFit({ scale, h: i.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="a4-fit" style={{ height: fit.h || undefined }}>
      <div ref={inner} className="a4-fit-inner" style={{ transform: `scale(${fit.scale})` }}>{children}</div>
    </div>
  );
}

/** สั่งพิมพ์เฉพาะหน้าบันทึกข้อความ (ใช้ "บันทึกเป็น PDF" ของเบราว์เซอร์ได้) */
export function printMemo(d: MemoData): void {
  document.querySelector('.memo-print-root')?.remove();
  const host = document.createElement('div');
  host.className = 'memo-print-root';
  document.body.appendChild(host);
  document.body.classList.add('printing-memo');
  const root: Root = createRoot(host);
  const done = () => {
    document.body.classList.remove('printing-memo');
    root.unmount();
    host.remove();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  root.render(<MemoDocument d={d} />);
  // รอฟอนต์/รูปพร้อมก่อนพิมพ์
  void document.fonts.ready.then(() => setTimeout(() => window.print(), 300));
}

