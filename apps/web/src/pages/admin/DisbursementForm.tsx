import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  areaName, formatBaht, formatThaiDate, todayBangkok, type CoverLetterResult, type DisbursementStatus, type ProjectDetail, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, fileToBase64, newKey, shrinkImage } from '../../api/client';
import { bahtInputToSatang, ErrorBox, useLookups, useSubmit, useToast } from '../../components/ui';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function Conf({ c }: { c?: number }) {
  if (c === undefined) return null;
  const hi = c >= 0.8;
  return <span className={`conf ${hi ? 'conf-hi' : 'conf-lo'}`}>{hi ? 'อ่านได้ชัด' : 'โปรดตรวจ'}</span>;
}

/**
 * บันทึกการเบิกจ่าย 1 รายการ
 * - กรอกน้อยที่สุด: จำนวนเงิน (วันที่ = วันนี้, สถานะ = อนุมัติเบิก เป็นค่าเริ่มต้น)
 * - แนบรูปหนังสือปะหน้าได้ (ไม่บังคับ) แล้วให้ระบบอ่านเลขที่/วันที่/จำนวนเงินมาเติม — ผู้ใช้ตรวจและกดบันทึกเอง
 */
export default function DisbursementForm({ d, user, onDone }: { d: ProjectDetail; user: SessionUser; onDone: () => void }) {
  const toast = useToast();
  const [key] = useState(() => newKey('disb'));
  const l = useLookups();
  const [f, setF] = useState({ amount: '', date: todayBangkok(), docNo: '', description: '', status: 'APPROVED' as DisbursementStatus, activityId: '', unitId: '', override: '' });
  const actUnits = d.activities.find((a) => a.id === f.activityId)?.units ?? [];
  const [file, setFile] = useState<{ id: string; name: string; preview: string } | null>(null);
  const [ocr, setOcr] = useState<CoverLetterResult | null>(null);
  const [stage, setStage] = useState<'' | 'upload' | 'ocr'>('');
  const [fileErr, setFileErr] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, run, setError } = useSubmit();
  useEffect(() => () => { if (file?.preview) URL.revokeObjectURL(file.preview); }, [file]);

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setFileErr(null);
    setOcr(null);
    setStage('upload');
    try {
      const { blob, name } = await shrinkImage(picked);
      const att = await call('files.upload', {
        projectId: d.project.id, entityType: 'disbursement', kind: 'COVER_LETTER', fileName: name, mimeType: blob.type, base64: await fileToBase64(blob),
      });
      setFile({ id: att.id, name, preview: blob.type.startsWith('image/') ? URL.createObjectURL(blob) : '' });
      setStage('ocr');
      const r = await call('files.ocrCoverLetter', { attachmentId: att.id });
      setOcr(r);
      setF((cur) => ({
        ...cur,
        amount: r.amount && !cur.amount ? String(r.amount.value / 100) : cur.amount,
        date: r.date && r.date.value <= todayBangkok() ? r.date.value : cur.date,
        docNo: r.docNo && !cur.docNo ? r.docNo.value : cur.docNo,
        description: r.subject && !cur.description ? r.subject.value.slice(0, 200) : cur.description,
      }));
    } catch (e) {
      setFileErr(e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 'แนบไฟล์ไม่สำเร็จ'));
    } finally {
      setStage('');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const satang = bahtInputToSatang(f.amount);
    if (!satang) return setError(new ApiError('VALIDATION_FAILED', 'กรอกจำนวนเงินเป็นตัวเลข เช่น 12500 หรือ 12,500.50'));
    void run(async () => {
      await call('disbursements.create', {
        projectId: d.project.id, activityId: f.activityId || undefined, unitId: f.unitId || undefined, status: f.status, amountSatang: satang, date: f.date,
        docNo: f.docNo, description: f.description, attachmentId: file?.id, idempotencyKey: key, overrideReason: f.override || undefined,
      });
      toast(`บันทึกการเบิกจ่าย ${formatBaht(satang)} บาทแล้ว`);
      onDone();
    });
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const satang = bahtInputToSatang(f.amount) ?? 0;
  const willExceed = f.status !== 'COMMITTED' && satang > d.budget.remaining;

  return (
    <form onSubmit={submit}>
      <section aria-labelledby="cl-title" style={{ marginBottom: 'var(--s5)' }}>
        <h3 id="cl-title" style={{ fontSize: 'var(--fs-md)' }}>หนังสือปะหน้านำส่งการใช้จ่าย <span className="muted small">(ไม่บังคับ)</span></h3>
        {!file ? (
          <button type="button" className="dropzone" style={{ width: '100%' }} onClick={() => inputRef.current?.click()} disabled={!!stage}>
            <strong>{stage === 'upload' ? 'กำลังแนบไฟล์…' : 'ถ่ายรูปหรือเลือกไฟล์หนังสือ'}</strong>
            <span className="small muted">รูป JPG/PNG หรือ PDF ระบบจะอ่านเลขที่หนังสือ วันที่ และจำนวนเงินมาเติมให้</span>
          </button>
        ) : (
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            {file.preview ? <img src={file.preview} alt="ตัวอย่างหนังสือปะหน้าที่แนบ" className="thumb" /> : <p className="small">แนบ {file.name} แล้ว</p>}
            <div className="small">
              {stage === 'ocr' && <p aria-live="polite">กำลังอ่านข้อความจากหนังสือ…</p>}
              {ocr && (
                <>
                  <p><strong>ข้อมูลที่อ่านได้</strong> ตรวจกับต้นฉบับก่อนบันทึก</p>
                  <dl className="kv">
                    <dt>เลขที่</dt><dd className="ocr-field">{ocr.docNo?.value ?? 'ไม่พบ'} <Conf c={ocr.docNo?.confidence} /></dd>
                    <dt>ลงวันที่</dt><dd className="ocr-field">{ocr.date ? formatThaiDate(ocr.date.value) : 'ไม่พบ'} <Conf c={ocr.date?.confidence} /></dd>
                    <dt>จำนวนเงิน</dt><dd className="ocr-field">{ocr.amount ? `${formatBaht(ocr.amount.value)} บาท` : 'ไม่พบ'} <Conf c={ocr.amount?.confidence} /></dd>
                  </dl>
                  {ocr.warnings.map((w) => <p key={w} className="notice notice-warn" style={{ marginTop: 8 }}>{w}</p>)}
                </>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setOcr(null); }}>เปลี่ยนไฟล์</button>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} capture="environment" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {fileErr && <ErrorBox error={fileErr} />}
      </section>

      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        <label className="field">
          <span className="req">จำนวนเงิน (บาท)</span>
          <input inputMode="decimal" value={f.amount} onChange={set('amount')} autoFocus required aria-describedby="amt-hint" />
          <span id="amt-hint" className="hint" style={willExceed ? { color: 'var(--clay)' } : undefined}>
            {willExceed ? `เกินงบคงเหลือ ${formatBaht(d.budget.remaining)} บาท` : `งบคงเหลือ ${formatBaht(d.budget.remaining)} บาท`}
          </span>
        </label>
        <label className="field"><span className="req">วันที่</span><input type="date" value={f.date} max={todayBangkok()} onChange={set('date')} required /></label>
        <label className="field"><span>สถานะ</span>
          <select value={f.status} onChange={set('status')}>
            <option value="APPROVED">อนุมัติเบิก</option>
            <option value="PAID">จ่ายแล้ว</option>
            <option value="COMMITTED">ผูกพัน/กันเงิน (ยังไม่เบิก)</option>
          </select>
        </label>
        <label className="field"><span>เลขที่หนังสือ/เอกสาร</span><input value={f.docNo} onChange={set('docNo')} /></label>
        {!!d.activities.length && (
          <label className="field"><span>กิจกรรม</span>
            <select value={f.activityId} onChange={(e) => setF({ ...f, activityId: e.target.value, unitId: '' })}>
              <option value="">ระดับโครงการ</option>
              {d.activities.map((a) => <option key={a.id} value={a.id}>{a.activityCode} {a.name}</option>)}
            </select>
          </label>
        )}
        {(actUnits.length > 1) && (
          <label className="field"><span className="req">พื้นที่ดำเนินการ</span>
            <select value={f.unitId} onChange={set('unitId')} required>
              <option value="">เลือกพื้นที่</option>
              {actUnits.map((s) => <option key={s.unitId} value={s.unitId}>{areaName(l.units.find((u) => u.id === s.unitId))}</option>)}
            </select>
          </label>
        )}
        {actUnits.length === 1 && <p className="small muted field">พื้นที่ดำเนินการ: {areaName(l.units.find((u) => u.id === actUnits[0].unitId))}</p>}
        <label className="field wide"><span>รายการ</span><input value={f.description} onChange={set('description')} placeholder="เช่น ค่าวัสดุอบรมเกษตรกร" /></label>
        {willExceed && user.role === 'superadmin' && (
          <label className="field wide"><span className="req">เหตุผลการอนุมัติเกินงบ</span><input value={f.override} onChange={set('override')} /></label>
        )}
      </div>
      <button className="btn" style={{ marginTop: 'var(--s5)' }} disabled={busy || !!stage || (willExceed && user.role !== 'superadmin')}>
        {busy ? 'กำลังบันทึก…' : 'บันทึกการเบิกจ่าย'}
      </button>
    </form>
  );
}
