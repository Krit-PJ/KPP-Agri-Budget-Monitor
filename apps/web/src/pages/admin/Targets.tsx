import { useEffect, useMemo, useState } from 'react';
import { targetCurve, validateSpendTarget, type SessionUser, type SpendTarget } from '@kpp/domain';
import { call } from '../../api/client';
import { Async, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker, monthsElapsed } from '../public/Home';

/** เดือนของปีงบ: 1 = ต.ค. … 12 = ก.ย. */
export const FISCAL_MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
export const FISCAL_MONTHS_LONG = ['ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน'];
/** ปี พ.ศ. ของเดือนที่ m ในปีงบ fy (ต.ค.–ธ.ค. อยู่ในปีก่อนหน้า) */
export const monthYear = (fy: number, m: number) => (m <= 3 ? fy - 1 : fy);

/**
 * เป้าการเบิกจ่ายของปีงบประมาณ — ค่าเดียวที่ทุกส่วนใช้: แถบเป้า, "เทียบแผน", เรื่องที่ต้องรู้, กราฟสะสม, รายงาน
 * แก้ได้เฉพาะ Mini Super / Super Admin; เจ้าหน้าที่กลุ่มงานดูได้ และกำหนดเดือนที่ต้องเบิกครบรายกิจกรรมในหน้าแผนฯ
 */
export default function Targets({ user }: { user: SessionUser }) {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const s = useApi('targets.get', { fiscalYear: fy }, [fy]);
  const canEdit = user.role !== 'admin';
  return (
    <>
      <h1>เป้าการเบิกจ่าย</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        เป้านี้ใช้ทุกส่วนของระบบ: เส้นเป้าบนแถบ, &ldquo;เทียบแผน&rdquo;, เรื่องที่ต้องรู้, กราฟเบิกจ่ายสะสม และรายงานพิมพ์.
        กิจกรรมใดต้องเบิกครบเร็วกว่านี้ กำหนดได้รายกิจกรรมในหน้า &ldquo;แผนและผู้รับผิดชอบ&rdquo; (อบรม/ประชุม/สัมมนา ต้องครบภายในมิถุนายนเป็นค่าเริ่มต้น)
      </p>
      <div className="toolbar"><FiscalYearPicker value={fy} onChange={setFy} /></div>
      <Async s={s} lines={6}>
        {(d) => <TargetForm key={`${fy}:${JSON.stringify(d.target)}`} fy={fy} initial={d.target} canEdit={canEdit} onSaved={s.reload} />}
      </Async>
    </>
  );
}

function TargetForm({ fy, initial, canEdit, onSaved }: { fy: number; initial: SpendTarget; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [mode, setMode] = useState<SpendTarget['mode']>(initial.mode);
  const [q, setQ] = useState<string[]>((initial.mode === 'quarter' ? initial.quarters : [30, 55, 80, 100]).map(String));
  const [month, setMonth] = useState(initial.mode === 'deadline' ? initial.month : 11);
  const [pctV, setPctV] = useState(String(initial.mode === 'deadline' ? initial.pct : 100));
  const [asking, setAsking] = useState(false);
  useEffect(() => setAsking(false), [mode, q, month, pctV]);

  const target: SpendTarget = mode === 'quarter'
    ? { mode, quarters: q.map((v) => Number(v)), month: 12, pct: 100 }
    : { mode, quarters: [0, 0, 0, 0], month, pct: Number(pctV) };
  const invalid = q.some((v) => v.trim() === '') && mode === 'quarter' ? 'กรอกเป้าให้ครบ 4 ไตรมาส' : validateSpendTarget(target);
  const curve = useMemo(() => (invalid ? null : targetCurve(target)), [invalid, JSON.stringify(target)]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = monthsElapsed(fy);
  const describe = mode === 'quarter'
    ? `สิ้นไตรมาส 1–4: ${q.map((v) => `${v}%`).join(' / ')}`
    : `เบิกให้ถึง ${pctV}% ภายในสิ้น${FISCAL_MONTHS_LONG[month - 1]} ${monthYear(fy, month)}`;

  const save = () => void run(async () => {
    await call('targets.save', { fiscalYear: fy, target });
    toast('บันทึกเป้าการเบิกจ่ายแล้ว ทุกหน้าจะใช้เป้าใหม่');
    onSaved();
  });

  return (
    <div className="panel" style={{ maxWidth: 860 }}>
      {error && <ErrorBox error={error} />}
      <fieldset className="area-mode" disabled={!canEdit}>
        <legend>วิธีกำหนดเป้า ปีงบประมาณ พ.ศ. {fy}</legend>
        <label className="area-opt"><input type="radio" name="tmode" checked={mode === 'quarter'} onChange={() => setMode('quarter')} /> รายไตรมาส (ร้อยละสะสม ณ สิ้นไตรมาส)</label>
        <label className="area-opt"><input type="radio" name="tmode" checked={mode === 'deadline'} onChange={() => setMode('deadline')} /> กำหนดเดือนที่ต้องเบิกให้ถึงเป้า</label>
      </fieldset>

      {mode === 'quarter' ? (
        <div className="form-grid target-q">
          {['ไตรมาส 1 (สิ้น ธ.ค.)', 'ไตรมาส 2 (สิ้น มี.ค.)', 'ไตรมาส 3 (สิ้น มิ.ย.)', 'ไตรมาส 4 (สิ้น ก.ย.)'].map((label, i) => (
            <label key={label} className="field"><span>{label}</span>
              <span className="input-suffix"><input inputMode="decimal" value={q[i]} disabled={!canEdit} onChange={(e) => setQ(q.map((v, k) => (k === i ? e.target.value.replace(/[^\d.]/g, '') : v)))} /><em>%</em></span>
            </label>
          ))}
        </div>
      ) : (
        <div className="form-grid">
          <label className="field"><span>ต้องเบิกให้ถึง</span>
            <span className="input-suffix"><input inputMode="decimal" value={pctV} disabled={!canEdit} onChange={(e) => setPctV(e.target.value.replace(/[^\d.]/g, ''))} /><em>%</em></span>
          </label>
          <label className="field"><span>ภายในสิ้นเดือน</span>
            <select value={month} disabled={!canEdit} onChange={(e) => setMonth(Number(e.target.value))}>
              {FISCAL_MONTHS_LONG.map((name, i) => <option key={name} value={i + 1}>{name} {monthYear(fy, i + 1)}</option>)}
            </select>
          </label>
          <p className="small muted wide" style={{ margin: 0 }}>ระบบเพิ่มเป้าเท่า ๆ กันทุกเดือนตั้งแต่ ต.ค. จนถึงเดือนที่กำหนด{Number(pctV) < 100 ? ' แล้วเพิ่มต่อจนครบ 100% ในเดือน ก.ย.' : ''}</p>
        </div>
      )}

      {invalid && <p className="small" style={{ color: 'var(--clay)' }}>{invalid}</p>}

      {curve && (
        <div className="target-preview" aria-label="เป้าสะสมรายเดือน">
          {curve.map((v, i) => (
            <div key={i} className={`tp-col ${m === i + 1 ? 'is-now' : ''} ${i % 3 === 2 ? 'is-q' : ''}`}>
              <span className="tp-v num">{Math.round(v)}%</span>
              <span className="tp-bar"><i style={{ height: `${Math.max(2, v)}%` }} /></span>
              <span className="tp-m">{FISCAL_MONTHS[i]}</span>
            </div>
          ))}
        </div>
      )}

      {canEdit ? (asking ? (
        <div className="confirm-box" role="alertdialog" aria-label="ยืนยันการบันทึก">
          <p><strong>ยืนยันเป้าการเบิกจ่ายปีงบประมาณ พ.ศ. {fy}</strong></p>
          <p className="small">{describe} — ทุกหน้าของระบบจะเปลี่ยนไปใช้เป้านี้ทันที</p>
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
