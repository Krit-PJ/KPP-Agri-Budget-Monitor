import { useEffect, useState } from 'react';

/**
 * แถบค้นหาที่ติดด้านบนเวลาเลื่อน — ใช้ร่วมกันในหน้า "บันทึกผลการเบิกจ่าย" และ "บันทึกแผนงานและผู้รับผิดชอบ"
 * ช่องค้นหา + ไปที่โครงการ + จำนวนที่พบ + ปุ่มกรอง; หัวข้อโครงการต้องมี id ตรงกับ jump[].id
 */
export interface FinderFilter<K extends string> { key: K; label: string; count: number }

export function StickyFinder<K extends string>({ q, onQ, placeholder, jump, count, filters, filter, onFilter }: {
  q: string;
  onQ: (v: string) => void;
  placeholder: string;
  jump: Array<{ id: string; label: string }>;
  count: number;
  filters: Array<FinderFilter<K>>;
  filter: K;
  onFilter: (k: K) => void;
}) {
  return (
    <>
      <div className="pb-sticky" role="search">
        <div className="pb-sticky-row">
          <label className="field pb-search"><span className="sr-only">ค้นหา</span>
            <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={placeholder} />
          </label>
          <label className="field pb-jump"><span className="sr-only">ไปที่โครงการ</span>
            <select value="" onChange={(e) => { document.getElementById(e.target.value)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              <option value="">ไปที่โครงการ…</option>
              {jump.map((p) => <option key={p.id} value={p.id}>{p.label.length > 70 ? `${p.label.slice(0, 70)}…` : p.label}</option>)}
            </select>
          </label>
          <span className="small muted pb-count" aria-live="polite">พบ {count.toLocaleString('th-TH')} รายการ</span>
        </div>
        <div className="segmented" role="group" aria-label="แสดงรายการ">
          {filters.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => onFilter(f.key)}>{f.label} ({f.count.toLocaleString('th-TH')})</button>
          ))}
        </div>
      </div>
      <BackToTop />
    </>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return show ? <button type="button" className="btn back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="กลับขึ้นบนสุด">↑ บนสุด</button> : null;
}
