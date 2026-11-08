import { useEffect, useId, useMemo, useState } from 'react';
import {
  areaName, bahtText, formatMoneyPlain, formatThaiDate, formatThaiDateLong, memoDocNo, memoOverrideStale, memoParagraphs, memoRemaining,
  todayBangkok, validateMemo, type EntryActivity, type MemoContext, type MemoData, type MemoRecord, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, newKey } from '../../api/client';
import { Async, ErrorBox, Sheet, bahtInputToSatang, useApi, useLookups, useSubmit, useToast } from '../../components/ui';
import { ThaiDatePicker } from '../../components/ThaiDatePicker';
import { A4Fit, MemoDocument, printMemo } from '../../components/MemoDocument';
import { Link } from 'react-router-dom';

/**
 * จัดทำบันทึกข้อความ "ตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ"
 * ช่องสีเหลือง = เจ้าหน้าที่กรอก · ช่องสีฟ้า = ระบบเติมให้ (คำนวณจากงบของกิจกรรม)
 */
export function MemoEditor({ e, user, existing, onSaved, onClose }: {
  e: EntryActivity; user: SessionUser; existing?: MemoRecord; onSaved: (m: MemoRecord) => void; onClose?: () => void;
}) {
  const s = useApi('memos.context', { projectId: e.projectId, activityId: e.activityId }, [e.activityId]);
  return (
    <Async s={s} lines={8}>
      {(ctx) => <Editor ctx={ctx} e={e} user={user} existing={existing} onSaved={onSaved} onClose={onClose} />}
    </Async>
  );
}

type CheckKey = 'ok' | 'returnFix' | 'forward';

function Editor({ ctx, e, user, existing, onSaved, onClose }: {
  ctx: MemoContext; e: EntryActivity; user: SessionUser; existing?: MemoRecord; onSaved: (m: MemoRecord) => void; onClose?: () => void;
}) {
  const l = useLookups();
  const toast = useToast();
  const ids = useId();
  const unitName = (id: string) => areaName(l.units.find((u) => u.id === id));
  const refNameOf = (unitId: string) => ctx.units.find((u) => u.id === unitId)?.name.replace(/^ระดับจังหวัด.*/, '') ?? '';
  const [unitId, setUnitId] = useState(existing?.unitId ?? (e.units.length === 1 ? e.units[0].unitId : ''));
  const [d, setD] = useState<MemoData>(() => existing ? { ...existing.data } : { ...ctx.draft, refFrom: refNameOf(e.units.length === 1 ? e.units[0].unitId : '') });
  const [amt, setAmt] = useState(existing ? formatMoneyPlain(existing.amountSatang) : '');
  const [editBody, setEditBody] = useState(!!existing?.data.bodyOverride?.length);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [key] = useState(() => newKey('memo'));
  const { busy, error, run, setError } = useSubmit();
  const isSuper = user.role === 'superadmin';

  const satang = bahtInputToSatang(amt) ?? 0;
  const data: MemoData = useMemo(() => ({ ...d, requestSatang: satang }), [d, satang]);
  const remaining = memoRemaining(data);
  const unit = e.units.find((u) => u.unitId === unitId);
  const unitLeft = unit ? unit.budget - unit.used + (existing && existing.unitId === unitId ? existing.amountSatang : 0) : 0;
  const stale = memoOverrideStale(data);
  const lockedMoney = !!existing && !isSuper;
  const set = <K extends keyof MemoData>(k: K, v: MemoData[K]) => setD((c) => ({ ...c, [k]: v }));
  const setHead = (k: keyof MemoData['head'], v: string) => setD((c) => ({ ...c, head: { ...c.head, [k]: v } }));
  const toggle = (k: CheckKey) => setD((c) => {
    const on = !c.checks[k];
    const checks = { ...c.checks, [k]: on };
    // ถูกต้องตามคู่มือ กับ ส่งคืนแก้ไข เลือกได้อย่างใดอย่างหนึ่ง
    if (on && k === 'ok') checks.returnFix = false;
    if (on && k === 'returnFix') checks.ok = false;
    return { ...c, checks };
  });

  // เปลี่ยนพื้นที่ → เติม "ของอำเภอ…" ให้ ถ้ายังไม่ได้พิมพ์เอง
  useEffect(() => {
    if (existing) return;
    setD((c) => (!c.refFrom || ctx.units.some((u) => u.name === c.refFrom) ? { ...c, refFrom: refNameOf(unitId) } : c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const problems = (): string[] => {
    const p = validateMemo(data);
    if (!unitId) p.unshift('เลือกอำเภอ/พื้นที่ที่ใช้งบ');
    if (data.budgetCode && !/^\d{20}$/.test(data.budgetCode)) p.push('รหัสงบประมาณต้องเป็นตัวเลข 20 หลัก');
    if (data.mainActivityCode && !/^\d{17}$/.test(data.mainActivityCode)) p.push('รหัสกิจกรรมหลักต้องเป็นตัวเลข 17 หลัก');
    if (stale) p.push('ข้อความที่แก้เองมียอดเงินไม่ตรงกับยอดล่าสุด — กด "ใช้ข้อความอัตโนมัติ" หรือแก้ตัวเลข');
    return p;
  };

  const review = () => {
    const p = problems();
    if (p.length) return setError(new ApiError('VALIDATION_FAILED', p.join(' · ')));
    setError(null);
    setConfirm(true);
  };

  const save = () => void run(async () => {
    const rec = existing
      ? await call('memos.update', { id: existing.id, version: existing.version, data, reason: reason || undefined })
      : await call('memos.create', { projectId: e.projectId, activityId: e.activityId, unitId, data, idempotencyKey: key });
    setConfirm(false);
    toast(existing ? `บันทึกฉบับแก้ไขครั้งที่ ${rec.revision} แล้ว` : `บันทึกแล้ว — นับเป็นเบิกจ่าย ${formatMoneyPlain(rec.amountSatang)} บาท`);
    onSaved(rec);
  });

  const bodyText = (data.bodyOverride?.length ? data.bodyOverride : memoParagraphs(data)).join('\n');
  const field = (label: string, node: React.ReactNode, kind: 'staff' | 'auto', opts: { req?: boolean; wide?: boolean; hint?: string } = {}) => (
    <label className={`field fld-${kind} ${opts.wide ? 'wide' : ''}`}>
      <span className={opts.req ? 'req' : ''}>{label}</span>{node}{opts.hint && <span className="hint">{opts.hint}</span>}
    </label>
  );

  return (
    <div className="memo-editor">
      <div className="memo-form">
        <p className="memo-legend" aria-label="ความหมายของสีช่อง">
          <span><i className="lg-staff" /> เจ้าหน้าที่กรอก</span>
          <span><i className="lg-auto" /> ระบบเติมให้ (แก้ได้บางช่อง)</span>
        </p>
        {!ctx.profileComplete && (
          <p className="notice notice-warn">ข้อมูลผู้ลงนามยังไม่ครบ — <Link to="/admin/profile">กรอกคำนำหน้าและตำแหน่งที่ "ข้อมูลของฉัน"</Link></p>
        )}
        {!ctx.groupConfigured && (
          <p className="notice notice-warn">กลุ่มงานยังไม่ได้ตั้งค่าหัวบันทึก (ส่วนหน้าเลขที่/หัวหน้ากลุ่ม) — กรอกในช่องสีฟ้าด้านล่างได้ หรือ <Link to="/admin/profile">ดูการตั้งค่ากลุ่ม</Link></p>
        )}
        {existing && (
          <p className="notice">แก้ไขบันทึกเลขที่ <b>{existing.docNo}</b> (ฉบับที่ {existing.revision}) — บันทึกแล้วจะได้ฉบับที่ {existing.revision + 1}{lockedMoney && ' · ยอดเงิน วันที่ และเลขที่ แก้ได้เฉพาะ Super Admin'}</p>
        )}

        <fieldset>
          <legend>หัวบันทึก</legend>
          <div className="form-grid">
            {field('ส่วนราชการ', <input value={d.orgLine} onChange={(ev) => set('orgLine', ev.target.value)} />, 'auto', { wide: true })}
            {field('โทรสาร', <input value={d.fax} onChange={(ev) => set('fax', ev.target.value)} />, 'auto')}
            {field('เรียน', <input value={d.to} onChange={(ev) => set('to', ev.target.value)} />, 'auto')}
            {field('ส่วนหน้าเลขที่', <input value={d.docPrefix} onChange={(ev) => set('docPrefix', ev.target.value)} placeholder="เช่น กพ 0009.3" readOnly={lockedMoney} />, 'auto')}
            {field('เลขที่หนังสือ', <input value={d.docNumber} onChange={(ev) => set('docNumber', ev.target.value.replace(/^\//, ''))} inputMode="numeric" placeholder="เลขที่ลงทะเบียนส่ง" required readOnly={lockedMoney} />, 'staff', { req: true, hint: `จะแสดงเป็น "ที่ ${memoDocNo(d) || '…'}"` })}
            {field('วันที่', (
              <ThaiDatePicker value={d.date} min="2020-01-01" max={todayBangkok()} today={todayBangkok()} disabled={lockedMoney}
                onPick={(v) => set('date', v)} buttonText={formatThaiDateLong(d.date) || 'เลือกวันที่'} />
            ), 'staff', { req: true })}
          </div>
        </fieldset>

        <fieldset>
          <legend>หนังสือที่ส่งเอกสารมา</legend>
          <div className="form-grid">
            {field('อำเภอ / พื้นที่ที่ใช้งบ', e.units.length === 1
              ? <input value={unitName(e.units[0].unitId)} readOnly />
              : (
                <select value={unitId} onChange={(ev) => setUnitId(ev.target.value)} required disabled={!!existing}>
                  <option value="">เลือกพื้นที่</option>
                  {e.units.map((u) => <option key={u.unitId} value={u.unitId}>{unitName(u.unitId)} (คงเหลือ {formatMoneyPlain(u.budget - u.used)})</option>)}
                </select>
              ), 'staff', { req: true })}
            {field('ตามหนังสือที่', <input value={d.refNo} onChange={(ev) => set('refNo', ev.target.value)} placeholder="เช่น กพ 0109/2269" />, 'staff')}
            {field('ลงวันที่', (
              <ThaiDatePicker value={d.refDate} min="2020-01-01" max={todayBangkok()} today={todayBangkok()}
                onPick={(v) => set('refDate', v)} buttonText={d.refDate ? formatThaiDateLong(d.refDate) : 'เลือกวันที่'}
                footer={(close) => <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set('refDate', ''); close(); }}>ไม่ระบุ</button>} />
            ), 'staff')}
            {field('ของ', (
              <>
                <input value={d.refFrom} onChange={(ev) => set('refFrom', ev.target.value)} list={`${ids}-units`} placeholder="เช่น อำเภอเมืองกำแพงเพชร" />
                <datalist id={`${ids}-units`}>{ctx.units.map((u) => <option key={u.id} value={u.name} />)}</datalist>
              </>
            ), 'staff')}
            {field('ขอเบิกเงินค่า', (
              <>
                <input value={d.expense} onChange={(ev) => set('expense', ev.target.value)} list={`${ids}-exp`} placeholder="พิมพ์หรือเลือก เช่น ค่าจัดซื้อวัสดุสนับสนุน" required />
                <datalist id={`${ids}-exp`}>{ctx.expenseSuggestions.map((x) => <option key={x} value={x} />)}</datalist>
              </>
            ), 'staff', { req: true, wide: true })}
          </div>
        </fieldset>

        <fieldset>
          <legend>โครงการ / กิจกรรม</legend>
          <div className="form-grid">
            {field('โครงการ', <div className="auto-v">{d.projectName}</div>, 'auto', { wide: true })}
            {d.mainActivityName && field('กิจกรรม', <div className="auto-v">{d.mainActivityName}</div>, 'auto', { wide: true })}
            {field('กิจกรรมย่อย', <div className="auto-v">{d.subActivityName}</div>, 'auto', { wide: true })}
            {field('แหล่งงบประมาณ', <div className="auto-v">{d.fund || '–'}</div>, 'auto')}
            {ctx.codesSaved
              ? field('รหัสงบประมาณ / รหัสกิจกรรมหลัก', <div className="auto-v num">{d.budgetCode} <small>/</small> {d.mainActivityCode}</div>, 'auto', { hint: 'บันทึกไว้กับกิจกรรมแล้ว' })
              : (
                <>
                  {field('รหัสงบประมาณ (20 หลัก)', <input value={d.budgetCode} onChange={(ev) => set('budgetCode', ev.target.value.replace(/\D/g, '').slice(0, 20))} inputMode="numeric" placeholder="07011152034002000000" />, 'staff', { hint: `${d.budgetCode.length}/20 หลัก · กรอกครั้งแรกครั้งเดียว ระบบจำไว้` })}
                  {field('รหัสกิจกรรมหลัก (17 หลัก)', <input value={d.mainActivityCode} onChange={(ev) => set('mainActivityCode', ev.target.value.replace(/\D/g, '').slice(0, 17))} inputMode="numeric" placeholder="07011690009900000" />, 'staff', { hint: `${d.mainActivityCode.length}/17 หลัก` })}
                </>
              )}
          </div>
        </fieldset>

        <fieldset>
          <legend>ยอดเงิน (เชื่อมกับงบประมาณของกิจกรรม)</legend>
          <div className="money-grid">
            {field('ยอดเงินงบประมาณ (รวมทั้งหมดของกิจกรรม)', <div className="auto-v num">{formatMoneyPlain(d.budgetSatang)} บาท <small>({bahtText(d.budgetSatang)})</small></div>, 'auto')}
            {field('ขอเบิก/ยืมมาแล้ว (รวมทุกครั้งทุกอำเภอ)', <div className="auto-v num">{formatMoneyPlain(d.previousSatang)} บาท <small>({bahtText(d.previousSatang)})</small></div>, 'auto')}
            {field('ขอเบิกครั้งนี้ (บาท)', (
              <input className="big num" inputMode="decimal" value={amt} onChange={(ev) => setAmt(ev.target.value)} placeholder="เช่น 4,000" required readOnly={lockedMoney} aria-describedby={`${ids}-amt`} />
            ), 'staff', { req: true })}
            {field('งบประมาณคงเหลือ (หลังครั้งนี้)', <div className={`auto-v num ${remaining < 0 ? 'neg' : ''}`}>{formatMoneyPlain(remaining)} บาท <small>({bahtText(remaining)})</small></div>, 'auto')}
          </div>
          <p id={`${ids}-amt`} className="hint" style={remaining < 0 || (unit && satang > unitLeft) ? { color: 'var(--clay)' } : undefined}>
            {satang > 0 && <>ตัวอักษร: {bahtText(satang)} · </>}
            {remaining < 0 ? 'เกินงบประมาณคงเหลือของกิจกรรม' : unit && satang > unitLeft ? `เกินงบคงเหลือของ${unitName(unitId)} (${formatMoneyPlain(unitLeft)} บาท) — ตรวจอีกครั้ง` : unit ? `${unitName(unitId)} คงเหลือ ${formatMoneyPlain(unitLeft)} บาท` : ''}
          </p>
        </fieldset>

        <fieldset className="memo-body-edit">
          <legend>ข้อความเนื้อหา</legend>
          <div className="memo-actions" style={{ marginBottom: 'var(--s2)' }}>
            <div className="segmented" role="group" aria-label="การจัดข้อความ">
              <button type="button" aria-pressed={d.align === 'left'} onClick={() => set('align', 'left')}>ชิดซ้าย</button>
              <button type="button" aria-pressed={d.align === 'justify'} onClick={() => set('align', 'justify')}>ชิดขอบทั้งสองด้าน</button>
            </div>
            <label className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={d.thaiNumerals} onChange={(ev) => set('thaiNumerals', ev.target.checked)} style={{ width: 20, minHeight: 20 }} /> ใช้เลขไทย
            </label>
          </div>
          {editBody ? (
            <>
              <textarea value={bodyText} aria-label="ข้อความเนื้อหา (หนึ่งบรรทัด = หนึ่งย่อหน้า)"
                onChange={(ev) => set('bodyOverride', ev.target.value.split('\n'))} />
              <div className="memo-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set('bodyOverride', undefined); setEditBody(false); }}>ใช้ข้อความอัตโนมัติ</button>
                <span className="hint">หนึ่งบรรทัด = หนึ่งย่อหน้า · บรรทัดแรกย่อหน้า 2.5 ซม. ให้เอง</span>
              </div>
              {stale && <p className="memo-warn" role="alert">ยอดเงินในข้อความไม่ตรงกับยอดล่าสุด — แก้ตัวเลขหรือกด "ใช้ข้อความอัตโนมัติ"</p>}
            </>
          ) : (
            <div className="memo-actions">
              <span className="hint">ระบบเขียนข้อความจากข้อมูลด้านบนให้ (ดูตัวอย่างหน้าเอกสาร)</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { set('bodyOverride', memoParagraphs(data)); setEditBody(true); }}>แก้ไขข้อความเอง</button>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>ผลการตรวจสอบ (เจ้าหน้าที่กลุ่มเป็นผู้เลือก)</legend>
          <div className="memo-checks">
            <label><input type="checkbox" checked={d.checks.ok} onChange={() => toggle('ok')} /> ถูกต้องตามคู่มือโครงการ</label>
            <label><input type="checkbox" checked={d.checks.returnFix} onChange={() => toggle('returnFix')} /> ส่งคืนแก้ไข</label>
            {d.checks.returnFix && field('เนื่องจาก', <input value={d.checks.returnReason} onChange={(ev) => setD((c) => ({ ...c, checks: { ...c.checks, returnReason: ev.target.value } }))} required />, 'staff', { req: true })}
            <label><input type="checkbox" checked={d.checks.forward} onChange={() => toggle('forward')} /> ส่งฝ่ายบริหารทั่วไปเพื่อดำเนินการต่อไป</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>ผู้ลงนาม</legend>
          <div className="form-grid">
            {field('ผู้ตรวจสอบ (ข้อมูลของฉัน)', <div className="auto-v">{d.signer.name || '–'}<small>{d.signer.position}</small></div>, 'auto', { hint: existing ? 'คงผู้จัดทำเดิม' : undefined })}
            {field('หัวหน้ากลุ่ม / ผู้รักษาการ', <input value={d.head.name} onChange={(ev) => setHead('name', ev.target.value)} placeholder="ชื่อพร้อมคำนำหน้า" />, 'auto')}
            {field('ตำแหน่ง', <input value={d.head.position} onChange={(ev) => setHead('position', ev.target.value)} />, 'auto')}
            {field('บรรทัดที่สอง', <input value={d.head.line2 ?? ''} onChange={(ev) => setHead('line2', ev.target.value)} placeholder="เช่น รักษาการหัวหน้ากลุ่มอารักขาพืช" />, 'auto')}
          </div>
        </fieldset>

        {error && <ErrorBox error={error} />}
        <div className="memo-actions">
          <button type="button" className="btn btn-lg" onClick={review} disabled={busy}>ตรวจทานก่อนบันทึก</button>
          <button type="button" className="btn btn-ghost" onClick={() => printMemo(data)}>พิมพ์ฉบับร่าง</button>
          {onClose && <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>}
        </div>
      </div>

      <section className="memo-preview" aria-label="ตัวอย่างหน้าเอกสาร">
        <h3 className="rec-h3">ตัวอย่างหน้าเอกสาร (A4)</h3>
        <A4Fit><MemoDocument d={data} onToggle={toggle} /></A4Fit>
      </section>

      <Sheet open={confirm} title="ยืนยันบันทึกข้อความ" onClose={() => setConfirm(false)} className="memo-confirm">
        <p className="small">
          ตรวจทานหน้าเอกสาร — เมื่อกด <b>ยืนยันและบันทึก</b> ระบบจะบันทึกการเบิกจ่าย <b className="num">{formatMoneyPlain(satang)} บาท</b>
          {' '}(นับเป็นเบิกจ่ายแล้วทันที) วันที่ {formatThaiDate(data.date)} และเก็บไฟล์ Google Doc + PDF ไว้ใน Google Drive ของโครงการ
        </p>
        {existing && isSuper && (existing.amountSatang !== satang || existing.date !== data.date || existing.docNo !== memoDocNo(data)) && (
          <label className="field"><span>เหตุผลที่แก้ยอดเงิน/วันที่/เลขที่</span><input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="ระบบจะยกเลิกรายการเดิมและบันทึกรายการใหม่แทน" /></label>
        )}
        <A4Fit><MemoDocument d={data} onToggle={toggle} /></A4Fit>
        {error && <ErrorBox error={error} />}
        <div className="memo-confirm-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>กลับไปแก้ไข</button>
          <button type="button" className="btn btn-ghost" onClick={() => printMemo(data)}>พิมพ์</button>
          <button type="button" className="btn btn-lg" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึกและสร้างไฟล์…' : 'ยืนยันและบันทึก'}</button>
        </div>
      </Sheet>
    </div>
  );
}

/** หลังบันทึก: ลิงก์ไฟล์ใน Drive + พิมพ์ */
export function MemoSaved({ m, onNew, onEdit }: { m: MemoRecord; onNew: () => void; onEdit: () => void }) {
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [rec, setRec] = useState(m);
  return (
    <div className="memo-ok-card" role="status">
      <h3>บันทึกแล้ว — ที่ {rec.docNo} ลงวันที่ {formatThaiDateLong(rec.date)}</h3>
      <p className="small">นับเป็นเบิกจ่ายแล้ว {formatMoneyPlain(rec.amountSatang)} บาท · ฉบับที่ {rec.revision}</p>
      {error && <ErrorBox error={error} />}
      <div className="memo-actions">
        {rec.pdfUrl && <a className="btn" href={rec.pdfUrl} target="_blank" rel="noopener noreferrer">เปิด PDF</a>}
        {rec.docUrl && <a className="btn btn-ghost" href={rec.docUrl} target="_blank" rel="noopener noreferrer">เปิด Google Doc (แก้ไขได้)</a>}
        <button type="button" className="btn btn-ghost" onClick={() => printMemo(rec.data)}>พิมพ์</button>
        <button type="button" className="btn btn-ghost" onClick={onEdit}>แก้ไขบันทึกนี้</button>
        <button type="button" className="btn btn-ghost" onClick={onNew}>จัดทำบันทึกฉบับใหม่</button>
      </div>
      {rec.renderStatus === 'ERROR' && (
        <p className="memo-warn">สร้างไฟล์ใน Drive ไม่สำเร็จ ({rec.renderError}) — การเบิกจ่ายบันทึกแล้ว
          {' '}<button type="button" className="btn btn-sm" disabled={busy} onClick={() => void run(async () => { const r = await call('memos.render', { id: rec.id }); setRec(r); if (r.renderStatus === 'OK') toast('สร้างไฟล์แล้ว'); })}>สร้างไฟล์อีกครั้ง</button>
        </p>
      )}
      {!rec.docUrl && rec.renderStatus === 'OK' && <p className="hint">โหมดสาธิต: ไม่ได้สร้างไฟล์จริงใน Google Drive</p>}
    </div>
  );
}
