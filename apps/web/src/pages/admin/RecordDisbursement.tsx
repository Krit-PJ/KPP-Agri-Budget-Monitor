import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  areaName, formatBaht, formatThaiDate, normalizeKey, todayBangkok,
  type CoverLetterResult, type DisbursementStatus, type EntryActivity, type MemoRecord, type SessionUser,
} from '@kpp/domain';
import { MemoEditor, MemoSaved } from './MemoEditor';
import { ApiError, call, fileToBase64, newKey, shrinkImage } from '../../api/client';
import { Async, bahtInputToSatang, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';
import ImportCenter from './ImportCenter';
import { StickyFinder } from '../../components/StickyFinder';

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
  return (
    <>
      <div className="toolbar"><FiscalYearPicker value={fy} onChange={setFy} /></div>
      <Async s={s} lines={6}>
        {(list) => <Board key={fy} list={list} user={user} initial={initialActivity} onChange={() => setTick((t) => t + 1)} />}
      </Async>
    </>
  );
}

type RFilter = 'all' | 'none' | 'partial' | 'full';
const keyOf = (e: EntryActivity) => e.activityId || `P:${e.projectId}`;
const stateOf = (e: EntryActivity): Exclude<RFilter, 'all'> =>
  !e.history.length ? 'none' : e.budget > 0 && e.disbursed >= e.budget ? 'full' : 'partial';
const STATE_TEXT = { none: 'ยังไม่เคยเบิก', partial: 'เบิกบางส่วน', full: 'เบิกครบแล้ว' } as const;

/**
 * จัดหน้าเหมือน "บันทึกแผนงานและผู้รับผิดชอบ": หัวข้อรายโครงการ → แถวกิจกรรม → ฟอร์มกางใต้แถว (ทีละแถว)
 * แถบค้นหาติดด้านบน (StickyFinder ชิ้นเดียวกับหน้าแผน)
 */
function Board({ list, user, initial, onChange }: { list: EntryActivity[]; user: SessionUser; initial: string; onChange: () => void }) {
  const l = useLookups();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<RFilter>('all');
  // ?a=<activityId> (มาจากหน้าบันทึกแผนงานฯ) → กางฟอร์มของกิจกรรมนั้นและเลื่อนไปหา
  const [open, setOpen] = useState(() => { const f = initial ? list.find((e) => e.activityId === initial || keyOf(e) === initial) : undefined; return f ? keyOf(f) : ''; });
  const group = (id: string) => l.workgroups.find((g) => g.id === id)?.name ?? '';

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => document.getElementById(`ra-${open}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = normalizeKey(q);
  const shown = list.filter((e) => (filter === 'all' || stateOf(e) === filter)
    && (!k || normalizeKey(`${e.activityName} ${e.projectName} ${e.projectCode}`).includes(k)));
  const projects = useMemo(() => {
    const m = new Map<string, EntryActivity[]>();
    for (const e of list) (m.get(e.projectId) ?? m.set(e.projectId, []).get(e.projectId)!).push(e);
    return m;
  }, [list]);
  const shownProjects = [...new Set(shown.map((e) => e.projectId))];
  const count = (f: Exclude<RFilter, 'all'>) => list.filter((e) => stateOf(e) === f).length;

  return (
    <>
      <StickyFinder<RFilter>
        q={q} onQ={setQ} placeholder="ค้นหากิจกรรมหรือโครงการ เช่น อบรม, แปลงเรียนรู้"
        jump={shownProjects.map((pid) => { const e = projects.get(pid)![0]; return { id: `rp-${pid}`, label: `${e.projectCode} ${e.projectName}` }; })}
        count={shown.length}
        filters={[
          { key: 'all', label: 'ทั้งหมด', count: list.length },
          { key: 'none', label: STATE_TEXT.none, count: count('none') },
          { key: 'partial', label: STATE_TEXT.partial, count: count('partial') },
          { key: 'full', label: STATE_TEXT.full, count: count('full') },
        ]}
        filter={filter} onFilter={setFilter}
      />
      {!shown.length && <p className="muted">{list.length ? 'ไม่มีรายการตามตัวกรองนี้ — ลองคำค้นอื่นหรือเลือก "ทั้งหมด"' : 'ไม่มีกิจกรรมในปีงบประมาณนี้ที่คุณมีสิทธิ์บันทึก'}</p>}
      {shownProjects.map((pid) => {
        const all = projects.get(pid)!;
        const head = all[0];
        const pb = all.reduce((a, e) => a + e.budget, 0);
        const pd = all.reduce((a, e) => a + e.disbursed, 0);
        return (
          <section key={pid} id={`rp-${pid}`} className="ob-project rec-project">
            <header className="rec-phead">
              <div>
                <h2>{head.projectName}</h2>
                <p className="xs muted" style={{ margin: 0 }}>{head.projectCode}{group(head.workgroupId) && ` · ${group(head.workgroupId)}`} · {all.length} กิจกรรม</p>
              </div>
              <p className="rec-ptot num">เบิกแล้ว <b>{formatBaht(pd)}</b> / {formatBaht(pb)} บาท <span className="rec-pct">{pb ? ((pd / pb) * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 }) : 0}%</span></p>
            </header>
            <div className="rec-cols" aria-hidden="true"><span>กิจกรรม</span><span className="r">งบประมาณ</span><span className="r">เบิกแล้ว</span><span className="r">คงเหลือ</span><span /></div>
            {shown.filter((e) => e.projectId === pid).map((e) => {
              const key = keyOf(e);
              const isOpen = open === key;
              const st = stateOf(e);
              return (
                <div key={key} id={`ra-${key}`} className={`rec-row ${isOpen ? 'is-open' : ''}`}>
                  <div className="rec-line">
                    <div className="rec-name">
                      <strong>{e.activityName}</strong>
                      <span className="rec-tags">
                        <span className={`rec-chip st-${st}`}>{STATE_TEXT[st]}{e.history.length > 0 && ` · ล่าสุดครั้งที่ ${e.history.length}`}</span>
                        {e.activityId && !e.hasAreas && <Link className="rec-chip st-warn" to="/admin/plans">ยังไม่กำหนดพื้นที่ — กำหนดที่บันทึกแผนงานฯ</Link>}
                      </span>
                    </div>
                    <span className="r num" data-label="งบประมาณ">{formatBaht(e.budget)}</span>
                    <span className="r num" data-label="เบิกแล้ว">{formatBaht(e.disbursed)}</span>
                    <span className={`r num ${e.budget - e.disbursed < 0 ? 'neg' : ''}`} data-label="คงเหลือ">{formatBaht(e.budget - e.disbursed)}</span>
                    <span className="rec-act">
                      <button type="button" className={`btn btn-sm ${isOpen ? 'btn-ghost' : ''}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : key)}>
                        {isOpen ? 'ปิด' : 'บันทึกการเบิกจ่าย'}
                      </button>
                    </span>
                  </div>
                  {isOpen && <div className="rec-panel"><Entry e={e} user={user} onChange={onChange} /></div>}
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

/**
 * ขั้นที่ 2: จัดทำบันทึกข้อความ (ค่าเริ่มต้น — บันทึกแล้วนับเป็นเบิกจ่ายทันที) หรือบันทึกยอดอย่างเดียว + ประวัติการเบิก
 */
function Entry({ e, user, onChange }: { e: EntryActivity; user: SessionUser; onChange: () => void }) {
  const l = useLookups();
  const unitName = (id: string) => areaName(l.units.find((u) => u.id === id));
  const [mode, setMode] = useState<'memo' | 'quick'>(e.activityId ? 'memo' : 'quick');
  const [saved, setSaved] = useState<MemoRecord | null>(null);
  const [editing, setEditing] = useState<MemoRecord | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const { error, run } = useSubmit();
  const openMemo = (id: string) => void run(async () => {
    const m = await call('memos.get', { id });
    setMode('memo');
    setSaved(m);
    setEditing(undefined);
    document.getElementById(`memo-top-${keyOf(e)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  return (
    <>
      <div id={`memo-top-${keyOf(e)}`} />
      {e.activityId && (
        <div className="segmented mode-switch" role="group" aria-label="วิธีบันทึก">
          <button type="button" aria-pressed={mode === 'memo'} onClick={() => setMode('memo')}>จัดทำบันทึกข้อความ</button>
          <button type="button" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>บันทึกยอดอย่างเดียว</button>
        </div>
      )}
      {error && <ErrorBox error={error} />}
      {mode === 'memo' && e.activityId ? (
        saved && !editing
          ? <MemoSaved key={`${saved.id}-${saved.revision}`} m={saved} onNew={() => { setSaved(null); setFormKey((k) => k + 1); }} onEdit={() => setEditing(saved)} />
          : (
            <MemoEditor key={editing ? `edit-${editing.id}-${editing.version}` : `new-${formKey}`} e={e} user={user} existing={editing}
              onClose={editing ? () => setEditing(undefined) : undefined}
              onSaved={(m) => { setSaved(m); setEditing(undefined); onChange(); }} />
          )
      ) : <QuickEntry e={e} user={user} onChange={onChange} />}
      <History e={e} user={user} unitName={unitName} onChange={onChange} onOpenMemo={openMemo} />
    </>
  );
}

/** บันทึกยอดอย่างเดียว (ไม่จัดทำบันทึกข้อความ) */
function QuickEntry({ e, user, onChange }: { e: EntryActivity; user: SessionUser; onChange: () => void }) {
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
      <section className="entry-info" aria-label="งบรายพื้นที่">
        <h3 className="rec-h3">งบรายพื้นที่ดำเนินการ</h3>
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

      <form className="rec-form" onSubmit={submit} aria-label="กรอกการเบิกจ่าย">
        <h3 className="rec-h3">กรอกการเบิกจ่าย <span className="entry-no">ครั้งที่ {no}</span></h3>
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
    </>
  );
}

function History({ e, user, unitName, onChange, onOpenMemo }: { e: EntryActivity; user: SessionUser; unitName: (id: string) => string; onChange: () => void; onOpenMemo: (id: string) => void }) {
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
    <section className="rec-hist" aria-label="ประวัติการเบิกจ่าย">
      <h3 className="rec-h3">ประวัติการเบิกจ่ายของกิจกรรมนี้</h3>
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
                  <td data-label="เลขที่หนังสือ">{h.docNo || '–'}{h.hasFile && <span className="xs muted"> · มีรูปหนังสือ</span>}
                    {h.memoId && <> <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenMemo(h.memoId!)}>บันทึกข้อความ</button></>}</td>
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
