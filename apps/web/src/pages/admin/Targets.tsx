import { useEffect, useMemo, useState } from 'react';
import { fullMonthOf, linearMonths, targetCurve, validateSpendTarget, type SessionUser, type SpendTarget } from '@kpp/domain';
import { call, purgePublicCache } from '../../api/client';
import { Async, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker, monthsElapsed } from '../public/Home';

/** เดือนของปีงบ: 1 = ต.ค. … 12 = ก.ย. */
export const FISCAL_MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
export const FISCAL_MONTHS_LONG = ['ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน'];
/** ปี พ.ศ. ของเดือนที่ m ในปีงบ fy (ต.ค.–ธ.ค. อยู่ในปีก่อนหน้า) */
export const monthYear = (fy: number, m: number) => (m <= 3 ? fy - 1 : fy);

/**
 * เป้าหมายการเบิกจ่ายของปีงบประมาณ — ค่าเดียวที่ทุกส่วนใช้: แถบเป้า, "เทียบแผน", เรื่องที่ต้องรู้, กราฟสะสม, รายงาน
 * เป้าทั้งปี = 100%; แก้ได้เฉพาะ Mini Super / Super Admin; เจ้าหน้าที่กลุ่มงานดูได้
 */
export default function Targets({ user }: { user: SessionUser }) {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const s = useApi('targets.get', { fiscalYear: fy }, [fy]);
  const canEdit = user.role !== 'admin';
  return (
    <>
      <h1>เป้าหมายการเบิกจ่าย</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        เป้าทั้งปีคือ 100% — กำหนดร้อยละสะสมได้รายไตรมาสหรือรายเดือน และเลือกได้ว่าต้องเบิกครบภายในเดือนใด.
        ค่าที่ตั้งที่นี่คือเป้าที่แสดงทุกจุด: แถบเบิกจ่าย, &ldquo;เทียบแผน&rdquo;, เรื่องที่ต้องรู้, กราฟสะสม และรายงานพิมพ์
      </p>
      <div className="toolbar"><FiscalYearPicker value={fy} onChange={setFy} /></div>
      <Async s={s} lines={6}>
        {(d) => <TargetForm key={`${fy}:${JSON.stringify(d.target)}`} fy={fy} initial={d.target} canEdit={canEdit} onSaved={s.reload} />}
      </Async>
    </>
  );
}

const QUARTER_LABELS = ['ไตรมาส 1 (สิ้น ธ.ค.)', 'ไตรมาส 2 (สิ้น มี.ค.)', 'ไตรมาส 3 (สิ้น มิ.ย.)', 'ไตรมาส 4 (สิ้น ก.ย.)'];
const clean = (v: string) => v.replace(/[^\d.]/g, '').slice(0, 6);

function TargetForm({ fy, initial, canEdit, onSaved }: { fy: number; initial: SpendTarget; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [mode, setMode] = useState<SpendTarget['mode']>(initial.mode);
  const [q, setQ] = useState<string[]>((initial.mode === 'quarter' ? initial.quarters : [30, 55, 80, 100]).map(String));
  const [months, setMonths] = useState<string[]>((initial.mode === 'monthly' ? initial.months : targetCurve(initial).map(Math.round)).map(String));
  const [fillTo, setFillTo] = useState(String(fullMonthOf(initial.mode === 'monthly' ? initial.months : [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 100])));
  const [asking, setAsking] = useState(false);
  useEffect(() => setAsking(false), [mode, q, months]);

  const target: SpendTarget = mode === 'quarter'
    ? { mode, quarters: q.map(Number), months: [] }
    : { mode, quarters: [], months: months.map(Number) };
  const blank = (mode === 'quarter' ? q : months).some((v) => v.trim() === '');
  const invalid = blank ? 'กรอกเป้าให้ครบทุกช่อง' : validateSpendTarget(target);
  const curve = useMemo(() => (invalid ? null : targetCurve(target)), [invalid, JSON.stringify(target)]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = curve ? fullMonthOf(curve) : 0;
  const m = monthsElapsed(fy);
  const fullText = full ? `เบิกครบ 100% ภายในสิ้น${FISCAL_MONTHS_LONG[full - 1]} ${monthYear(fy, full)}` : '';

  // แก้เดือนใดเป็น 100 → เดือนหลังจากนั้นเป็น 100 ให้เอง (เป้าสะสมเกิน 100 ไม่ได้)
  const setMonth = (i: number, raw: string) => setMonths((ms) => ms.map((v, k) => (k === i ? clean(raw) : k > i && Number(clean(raw)) >= 100 ? '100' : v)));
  const badMonth = (i: number) => {
    const v = Number(months[i]);
    return months[i].trim() === '' || v < 0 || v > 100 || (i > 0 && v < Number(months[i - 1]));
  };
  const badQuarter = (i: number) => {
    const v = Number(q[i]);
    return q[i].trim() === '' || v < 0 || v > 100 || (i > 0 && v < Number(q[i - 1]));
  };

  const save = () => void run(async () => {
    await call('targets.save', { fiscalYear: fy, target });
    purgePublicCache();
    toast('บันทึกเป้าหมายการเบิกจ่ายแล้ว ทุกหน้าใช้เป้าใหม่ทันที');
    onSaved();
  });

  return (
    <div className="panel" style={{ maxWidth: 900 }}>
      {error && <ErrorBox error={error} />}
      <fieldset className="area-mode" disabled={!canEdit}>
        <legend>วิธีกำหนดเป้า ปีงบประมาณ พ.ศ. {fy}</legend>
        <label className="area-opt"><input type="radio" name="tmode" checked={mode === 'quarter'} onChange={() => setMode('quarter')} /> รายไตรมาส (ร้อยละสะสม ณ สิ้นไตรมาส)</label>
        <label className="area-opt"><input type="radio" name="tmode" checked={mode === 'monthly'} onChange={() => setMode('monthly')} /> รายเดือน (กำหนดเองทุกเดือน)</label>
      </fieldset>

      {mode === 'quarter' ? (
        <div className="form-grid target-q">
          {QUARTER_LABELS.map((label, i) => (
            <label key={label} className="field"><span>{label}</span>
              <span className="input-suffix">
                <input inputMode="decimal" value={q[i]} disabled={!canEdit} className={badQuarter(i) ? 'is-invalid' : ''} onChange={(e) => setQ(q.map((v, k) => (k === i ? clean(e.target.value) : v)))} aria-label={`เป้า${label}`} /><em>%</em>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <>
          {canEdit && (
            <div className="fill-helper">
              <span>เติมให้อัตโนมัติ: เพิ่มเท่า ๆ กันทุกเดือน ให้ครบ 100% ภายในสิ้นเดือน</span>
              <select value={fillTo} onChange={(e) => setFillTo(e.target.value)} aria-label="เดือนที่ต้องเบิกครบ">
                {FISCAL_MONTHS_LONG.map((name, i) => <option key={name} value={i + 1}>{name} {monthYear(fy, i + 1)}</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonths(linearMonths(Number(fillTo)).map(String))}>เติมค่า</button>
              <span className="xs muted">แล้วแก้รายเดือนต่อได้</span>
            </div>
          )}
          <div className="month-grid">
            {FISCAL_MONTHS.map((name, i) => (
              <label key={name} className={`month-cell ${m === i + 1 ? 'is-now' : ''}`}>
                <span>{name} {String(monthYear(fy, i + 1)).slice(2)}</span>
                <span className="input-suffix">
                  <input inputMode="decimal" value={months[i]} disabled={!canEdit} className={badMonth(i) ? 'is-invalid' : ''} onChange={(e) => setMonth(i, e.target.value)} aria-label={`เป้าสะสมสิ้น${FISCAL_MONTHS_LONG[i]}`} /><em>%</em>
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      {invalid ? <p className="small" style={{ color: 'var(--clay)' }}>{invalid}</p> : <p className="small" style={{ margin: 'var(--s3) 0 0' }}><strong>{fullText}</strong></p>}

      {curve && (
        <div className="target-preview" aria-label="เป้าสะสมรายเดือน">
          {curve.map((v, i) => (
            <div key={i} className={`tp-col ${m === i + 1 ? 'is-now' : ''} ${i % 3 === 2 ? 'is-q' : ''} ${i + 1 === full ? 'is-full' : ''}`}>
              <span className="tp-v num">{Math.round(v)}%</span>
              <span className="tp-bar"><i style={{ height: `${Math.max(2, v)}%` }} /></span>
              <span className="tp-m">{FISCAL_MONTHS[i]}</span>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (asking ? (
        <div className="confirm-box" role="alertdialog" aria-label="ยืนยันการบันทึก">
          <p><strong>ยืนยันเป้าหมายการเบิกจ่ายปีงบประมาณ พ.ศ. {fy}</strong></p>
          <p className="small">
            {mode === 'quarter' ? `สิ้นไตรมาส 1–4: ${q.map((v) => `${v}%`).join(' / ')}` : `รายเดือน ต.ค.–ก.ย.: ${months.map((v) => `${v}%`).join(' / ')}`} — {fullText}. ทุกหน้าของระบบจะใช้เป้านี้ทันที
          </p>
          <div className="btn-row">
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'ยืนยันและบันทึก'}</button>
            <button className="btn btn-ghost" onClick={() => setAsking(false)}>กลับไปแก้ไข</button>
          </div>
        </div>
      ) : (
        <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
          <button className="btn" onClick={() => setAsking(true)} disabled={!!invalid}>บันทึก</button>
        </div>
      )) : <p className="small muted">เฉพาะ Mini Super Admin หรือ Super Admin เปลี่ยนเป้านี้ได้</p>}
    </div>
  );
}
