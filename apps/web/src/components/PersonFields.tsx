import { useId, useState } from 'react';
import { COMMON_POSITIONS, NAME_TITLES } from '@kpp/domain';

const OTHER = '__other__';

/** คำนำหน้าชื่อ: เลือกจากรายการ หรือ "อื่น ๆ" แล้วพิมพ์เอง (เช่น ยศ) */
export function TitleField({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const known = !value || NAME_TITLES.includes(value);
  const [other, setOther] = useState(!known);
  return (
    <label className="field field-title"><span className={required ? 'req' : ''}>คำนำหน้าชื่อ</span>
      <select value={other ? OTHER : value} required={required && !other}
        onChange={(e) => { if (e.target.value === OTHER) { setOther(true); onChange(''); } else { setOther(false); onChange(e.target.value); } }}>
        <option value="">เลือก</option>
        {NAME_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
        <option value={OTHER}>อื่น ๆ (พิมพ์เอง)</option>
      </select>
      {other && <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="เช่น ว่าที่ ร.ต." aria-label="คำนำหน้าชื่อ (พิมพ์เอง)" required={required} />}
    </label>
  );
}

/** ตำแหน่งแบบเต็ม: เลือกจากรายการที่ใช้บ่อย หรือพิมพ์เองได้ */
export function PositionField({ value, onChange, required, label = 'ตำแหน่ง (แบบเต็ม)' }: { value: string; onChange: (v: string) => void; required?: boolean; label?: string }) {
  const id = useId();
  return (
    <label className="field"><span className={required ? 'req' : ''}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} list={id} required={required}
        placeholder="เช่น นักวิชาการส่งเสริมการเกษตรชำนาญการ" autoComplete="organization-title" />
      <datalist id={id}>{COMMON_POSITIONS.map((p) => <option key={p} value={p} />)}</datalist>
      <span className="hint">พิมพ์บางส่วนแล้วเลือก หรือพิมพ์เองทั้งหมดก็ได้ (ใช้ลงนามในบันทึกข้อความ)</span>
    </label>
  );
}
