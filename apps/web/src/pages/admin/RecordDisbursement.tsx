import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  areaName, formatBaht, formatThaiDate, normalizeKey, todayBangkok,
  type CoverLetterResult, type DisbursementStatus, type EntryActivity, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, fileToBase64, newKey, shrinkImage } from '../../api/client';
import { Async, bahtInputToSatang, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import ImportCenter from './ImportCenter';

const STATUS_TEXT: Record<string, string> = { COMMITTED: 'ผูกพัน', APPROVED: 'อนุมัติเบิก', PAID: 'จ่ายแล้ว' };
const ACCEPT = 'image/*,application/pdf';

/**
 * บันทึกผลการเบิกจ่าย — จุดเดียวสำหรับเจ้าหน้าที่: กรอกทีละรายการ (ค่าเริ่มต้น) หรือนำเข้าจากไฟล์
 * ลิงก์: ?tab=import | ?a=<activityId> (มาจากหน้าแผนฯ)
 */
export default function RecordDisbursement({ user }: { user: SessionUser }) {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'import' ? 'import' : 'form';
  return (
    <>
      <h1>บันทึกผลการเบิกจ่าย</h1>
      <div className="segmented rec-tabs" role="tablist" aria-label="วิธีบันทึก">
        <button role="tab" aria-selected={tab === 'form'} aria-pressed={tab === 'form'} onClick={() => setSp({}, { replace: true })}>กรอกทีละรายการ</button>
        <button role="tab" aria-selected={tab === 'import'} aria-pressed={tab === 'import'} onClick={() => setSp({ tab: 'import' }, { replace: true })}>นำเข้าจากไฟล์</button>
      </div>
      {tab === 'import' ? <ImportCenter user={user} embedded /> : <EntryForm user={user} initialActivity={sp.get('a') ?? ''} />}
    </>
  );
}

function EntryForm({ user, initialActivity }: { user: SessionUser; initialActivity: string }) {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [tick, setTick] = useState(0);
  const s = useApi('disbursements.entryList', { fiscalYear: fy }, [fy, tick]);
  const [sel, setSel] = useState(initialActivity);
  return (
    <>
      <div className="toolbar"><FiscalYearPicker value={fy} onChange={(y) => { setFy(y); setSel(''); }} /></div>
      <Async s={s} lines={6}>
        {(list) => {
          const keyOf = (e: EntryActivity) => e.activityId || `P:${e.projectId}`;
          const cur = list.find((e) => keyOf(e) === sel || e.activityId === sel);
          return cur
            ? <Entry key={keyOf(cur)} e={cur} user={user} onChange={() => setTick((t) => t + 1)} onBack={() => setSel('')} />
            : <Picker list={list} onPick={(e) => setSel(keyOf(e))} />;
        }}
      </Async>
    </>
  );
}

/** ขั้นที่ 1: ค้นหาและเลือกกิจกรรม (เฉพาะของกลุ่มตน) */
function Picker({ list, onPick }: { list: EntryActivity[]; onPick: (e: EntryActivity) => void }) {
  const l = useLookups();
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const k = normalizeKey(q);
    return list.filter((e) => !k || normalizeKey(`${e.activityName} ${e.projectName} ${e.projectCode}`).includes(k));
  }, [list, q]);
  const group = (id: string) => l.workgroups.find((g) => g.id === id)?.name ?? '';
  return (
    <section className="panel" aria-labelledby="pick-h">
      <h2 id="pick-h">1. เลือกกิจกรรมที่จะบันทึก</h2>
      <label className="field"><span>ค้นหาชื่อกิจกรรมหรือโครงการ</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="เช่น อบรม, แปลงเรียนรู้, ศัตรูพืช" autoFocus />
      </label>
      <p className="small muted">พบ {shown.length.toLocaleString('th-TH')} กิจกรรม</p>
      {shown.length ? (
        <ul className="pick-list">
          {shown.slice(0, 60).map((e) => (
            <li key={e.activityId || `P:${e.projectId}`}>
              <button type="button" onClick={() => onPick(e)}>
                <span className="pick-name">{e.activityName}</span>
                <span className="pick-sub">{e.projectName}{group(e.workgroupId) && ` · ${group(e.workgroupId)}`}</span>
                <span className="pick-num">คงเหลือ {formatBaht(e.budget - e.disbursed)} บาท · บันทึกแล้ว {e.history.length} ครั้ง</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">ไม่พบกิจกรรม {list.length ? 'ลองคำอื่น' : 'ในปีงบประมาณนี้ที่คุณมีสิทธิ์บันทึก'}</p>}
      {shown.length > 60 && <p className="small muted">แสดง 60 รายการแรก — พิมพ์คำค้นเพิ่มเพื่อให้แคบลง</p>}
    </section>
  );
}

/** ขั้นที่ 2: ข้อมูลสำคัญ + ฟอร์มกรอก (ให้น้อยที่สุด) + ประวัติการเบิก */
function Entry({ e, user, onChange, onBack }: { e: EntryActivity; user: SessionUser; onChange: () => void; onBack: () => void }) {
  const l = useLookups();
  const toast = useToast();
  const unitName = (id: string) => areaName(l.units.find((u) => u.id === id));
  const blank = { unitId: e.units.length === 1 ? e.units[0].unitId : '', amount: '', docNo: '', date: todayBangkok(), status: 'APPROVED' as DisbursementStatus, description: '' };
  const [f, setF] = useState(blank);
  const [key, setKey] = useState(newKey);
  const [file, setFile] = useState<{ id: string; name: string; preview: string; kb: number } | null>(null);
  const [ocr, setOcr] = useState<CoverLetterResult | null>(null);
  const [stage, setStage] = useState<'' | 'upload' | 'ocr'>('');
  const [fileErr, setFileErr] = useState<ApiError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, run, setError } = useSubmit();
  useEffect(() => () => { if (file?.preview) URL.revokeObjectURL(file.preview); }, [file]);

  const remaining = e.budget - e.disbursed;
  const satang = bahtInputToSatang(f.amount) ?? 0;
  const unit = e.units.find((u) => u.unitId === f.unitId);
  const unitLeft = unit ? unit.budget - unit.used : 0;
  const overUnit = !!unit && satang > unitLeft;
  const overAll = f.status !== 'COMMITTED' && satang > remaining;
  // ครั้งที่: ลำดับตามวันที่ (ระบบเลขให้)
  const no = e.history.filter((h) => h.date <= f.date).length + 1;

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    setFileErr(null);
    setOcr(null);
    setStage('upload');
    try {
      const { blob, name } = await shrinkImage(picked);
      const att = await call('files.upload', { projectId: e.projectId, entityType: 'disbursement', kind: 'COVER_LETTER', fileName: name, mimeType: blob.type, base64: await fileToBase64(blob) });
      setFile({ id: att.id, name, preview: blob.type.startsWith('image/') ? URL.createObjectURL(blob) : '', kb: Math.round(blob.size / 1024) });
      setStage('ocr');
      const r = await call('files.ocrCoverLetter', { attachmentId: att.id });
      setOcr(r);
      setF((c) => ({
        ...c,
        amount: r.amount && !c.amount ? String(r.amount.value / 100) : c.amount,
        date: r.date && r.date.value <= todayBangkok() ? r.date.value : c.date,
        docNo: r.docNo && !c.docNo ? r.docNo.value : c.docNo,
      }));
    } catch (err) {
      setFileErr(err instanceof ApiError ? err : new ApiError('INTERNAL_ERROR', 'แนบไฟล์ไม่สำเร็จ'));
    } finally {
      setStage('');
    }
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!satang) return setError(new ApiError('VALIDATION_FAILED', 'กรอกจำนวนเงินเป็นตัวเลข เช่น 12500 หรือ 12,500.50'));
    if (!f.unitId) return setError(new ApiError('VALIDATION_FAILED', 'เลือกอำเภอ/พื้นที่ที่ใช้งบ'));
    void run(async () => {
      await call('disbursements.create', {
        projectId: e.projectId, activityId: e.activityId || undefined, unitId: f.unitId, status: f.status, amountSatang: satang, date: f.date,
        docNo: f.docNo, description: f.description, attachmentId: file?.id, idempotencyKey: key,
      });
      toast(`บันทึกแล้ว — ครั้งที่ ${no} จำนวน ${formatBaht(satang)} บาท`);
      setF({ ...blank, unitId: f.unitId });
      setFile(null);
      setOcr(null);
      setKey(newKey());
      onChange();
    });
  };
  const set = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← เลือกกิจกรรมอื่น</button>
      <section className="panel section entry-info" aria-labelledby="info-h">
        <h2 id="info-h">{e.activityName}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>{e.projectCode} {e.projectName}</p>
        <div className="entry-kpis">
          <div><span>งบประมาณ</span><b className="num">{formatBaht(e.budget)}</b></div>
          <div><span>เบิกแล้ว</span><b className="num">{formatBaht(e.disbursed)}</b></div>
          <div><span>คงเหลือ</span><b className="num">{formatBaht(remaining)}</b></div>
        </div>
        <table className="data entry-units">
          <thead><tr><th>พื้นที่ดำเนินการ</th><th className="r">งบ (บาท)</th><th className="r">ใช้แล้ว</th><th className="r">คงเหลือ</th></tr></thead>
          <tbody>
            {e.units.map((u) => (
              <tr key={u.unitId} className={u.unitId === f.unitId ? 'is-sel' : ''}>
                <td>{unitName(u.unitId)}</td><td className="r num">{formatBaht(u.budget)}</td><td className="r num">{formatBaht(u.used)}</td>
                <td className={`r num ${u.budget - u.used < 0 ? 'neg' : ''}`}>{formatBaht(u.budget - u.used)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="panel section" onSubmit={submit} aria-labelledby="form-h">
        <h2 id="form-h">2. กรอกการเบิกจ่าย <span className="entry-no">ครั้งที่ {no}</span></h2>
        {error && <ErrorBox error={error} />}
        <div className="form-grid">
          <label className="field"><span className="req">อำเภอ / พื้นที่</span>
            {e.units.length === 1
              ? <input value={unitName(e.units[0].unitId)} readOnly />
              : (
                <select value={f.unitId} onChange={set('unitId')} required>
                  <option value="">เลือกพื้นที่</option>
                  {e.units.map((u) => <option key={u.unitId} value={u.unitId}>{unitName(u.unitId)} (คงเหลือ {formatBaht(u.budget - u.used)})</option>)}
                </select>
              )}
          </label>
          <label className="field"><span className="req">จำนวนเงิน (บาท)</span>
            <input inputMode="decimal" value={f.amount} onChange={set('amount')} required aria-describedby="amt-h" />
            <span id="amt-h" className="hint" style={overUnit || overAll ? { color: 'var(--clay)' } : undefined}>
              {overAll ? `เกินงบคงเหลือของกิจกรรม (${formatBaht(remaining)} บาท)` : overUnit ? `เกินงบคงเหลือของพื้นที่นี้ (${formatBaht(unitLeft)} บาท) — ตรวจอีกครั้ง` : unit ? `พื้นที่นี้คงเหลือ ${formatBaht(unitLeft)} บาท` : ''}
            </span>
          </label>
          <label className="field"><span>เลขที่หนังสือ</span><input value={f.docNo} onChange={set('docNo')} placeholder="เช่น กพ 0009/1234" /></label>
          <label className="field"><span className="req">วันที่ของหนังสือ</span><input type="date" value={f.date} max={todayBangkok()} onChange={set('date')} required /><span className="hint">ใช้เป็นวันที่เบิกจ่าย</span></label>
        </div>

        <div className="entry-file">
          <span className="field-label">รูปหนังสือปะหน้านำส่ง <span className="muted small">(ไม่บังคับ · ระบบย่อให้ไม่เกิน 1 MB)</span></span>
          {!file ? (
            <button type="button" className="dropzone" onClick={() => inputRef.current?.click()} disabled={!!stage}>
              <strong>{stage === 'upload' ? 'กำลังย่อและแนบรูป…' : 'ถ่ายรูปหรือเลือกไฟล์หนังสือ'}</strong>
              <span className="small muted">ระบบอ่านเลขที่หนังสือ วันที่ และจำนวนเงินมากรอกให้ ตรวจอีกครั้งก่อนบันทึก</span>
            </button>
          ) : (
            <div className="entry-file-row">
              {file.preview ? <img src={file.preview} alt="รูปหนังสือปะหน้าที่แนบ" className="thumb" /> : <span className="small">แนบ {file.name}</span>}
              <div className="small">
                <p style={{ margin: 0 }}>แนบแล้ว ({file.kb.toLocaleString('th-TH')} KB)</p>
                {stage === 'ocr' && <p aria-live="polite">กำลังอ่านข้อความจากหนังสือ…</p>}
                {ocr && <p className="muted">อ่านได้: {ocr.docNo?.value ?? '–'} · {ocr.date ? formatThaiDate(ocr.date.value) : '–'} · {ocr.amount ? `${formatBaht(ocr.amount.value)} บาท` : '–'}</p>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setOcr(null); }}>เปลี่ยนรูป</button>
              </div>
            </div>
          )}
          <input ref={inputRef} type="file" accept={ACCEPT} capture="environment" hidden onChange={(ev) => { void pick(ev.target.files?.[0]); ev.target.value = ''; }} />
          {fileErr && <ErrorBox error={fileErr} />}
        </div>

        <details className="entry-more">
          <summary>ตัวเลือกเพิ่มเติม (สถานะ, รายการ)</summary>
          <div className="form-grid">
            <label className="field"><span>สถานะ</span>
              <select value={f.status} onChange={set('status')}>
                <option value="APPROVED">อนุมัติเบิก (นับเป็นเบิกจ่ายแล้ว)</option>
                <option value="PAID">จ่ายแล้ว</option>
                <option value="COMMITTED">ผูกพัน/กันเงิน (ยังไม่เบิก)</option>
              </select>
            </label>
            <label className="field wide"><span>รายการ</span><input value={f.description} onChange={set('description')} placeholder="เช่น ค่าวัสดุอบรมเกษตรกร" /></label>
          </div>
        </details>

        <button className="btn btn-lg" disabled={busy || !!stage || (overAll && user.role !== 'superadmin')}>{busy ? 'กำลังบันทึก…' : `บันทึกการเบิกจ่าย ครั้งที่ ${no}`}</button>
      </form>

      <History e={e} user={user} unitName={unitName} onChange={onChange} />
    </>
  );
}

function History({ e, user, unitName, onChange }: { e: EntryActivity; user: SessionUser; unitName: (id: string) => string; onChange: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [voiding, setVoiding] = useState('');
  const [reason, setReason] = useState('');
  const canVoid = (status: string) => status === 'COMMITTED' || user.role === 'superadmin';
  const doVoid = (id: string, no: number) => void run(async () => {
    await call('disbursements.void', { id, reason });
    toast(`ยกเลิกรายการครั้งที่ ${no} แล้ว`);
    setVoiding('');
    setReason('');
    onChange();
  });
  return (
    <section className="panel section" aria-labelledby="hist-h">
      <h2 id="hist-h">ประวัติการเบิกจ่ายของกิจกรรมนี้</h2>
      {error && <ErrorBox error={error} />}
      {e.history.length ? (
        <div className="table-wrap">
          <table className="data stack">
            <thead><tr><th>ครั้งที่</th><th>วันที่</th><th>เลขที่หนังสือ</th><th>พื้นที่</th><th className="r">จำนวนเงิน (บาท)</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {[...e.history].reverse().map((h) => (
                <tr key={h.id}>
                  <td data-label="ครั้งที่" className="primary">ครั้งที่ {h.no}</td>
                  <td data-label="วันที่">{formatThaiDate(h.date)}</td>
                  <td data-label="เลขที่หนังสือ">{h.docNo || '–'}{h.hasFile && <span className="xs muted"> · มีรูปหนังสือ</span>}</td>
                  <td data-label="พื้นที่">{unitName(h.unitId)}</td>
                  <td data-label="จำนวนเงิน (บาท)" className="r num">{formatBaht(h.amountSatang)}</td>
                  <td data-label="สถานะ">{STATUS_TEXT[h.status] ?? h.status}</td>
                  <td>
                    {voiding === h.id ? (
                      <span className="void-box">
                        <input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="เหตุผล เช่น กรอกผิด" aria-label="เหตุผลการยกเลิก" />
                        <button type="button" className="btn btn-sm" disabled={busy || reason.trim().length < 3} onClick={() => doVoid(h.id, h.no)}>ยืนยันยกเลิก</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVoiding('')}>ไม่ยกเลิก</button>
                      </span>
                    ) : canVoid(h.status)
                      ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setVoiding(h.id); setReason(''); }}>ยกเลิกรายการ</button>
                      : <span className="xs muted">ยกเลิกได้โดย Super Admin</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">ยังไม่มีการเบิกจ่าย — รายการแรกที่บันทึกจะเป็นครั้งที่ 1</p>}
    </section>
  );
}
