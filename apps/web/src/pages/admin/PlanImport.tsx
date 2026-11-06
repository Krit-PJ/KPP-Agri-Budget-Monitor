import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  formatBaht, normalizePlanTable, parseDelimited, parseMoney, parsePlanTable, readXlsx, toCsv,
  type PlanCheck, type PlanField, type PlanIssue, type PlanMeta, type PlanNode,
} from '@kpp/domain';
import { ApiError, call, DEMO, fileToBase64 } from '../../api/client';
import { ErrorBox, useLookups, useSubmit, useToast } from '../../components/ui';
import { downloadSamplePlan } from '../../api/samplePlan';

/**
 * นำเข้าแผนงบประมาณ 3 ขั้น: เลือกไฟล์ → ตรวจและแก้ไขตามข้อแนะนำ → ยืนยันและนำเข้า
 * - Excel/CSV อ่านในเบราว์เซอร์ (เร็ว ไม่ต้องรอ server); PDF/รูป/Google Sheets อ่านที่ server
 * - ผลตรวจคำนวณใหม่ทันทีทุกครั้งที่แก้ (ใช้กฎชุดเดียวกับ server) และ server ตรวจซ้ำตอนนำเข้า
 * - ช่องที่แก้จากต้นฉบับถูกบันทึกเป็นประวัติ (ค่าเดิม → ค่าใหม่) พร้อมเก็บไฟล์ต้นฉบับ
 */

interface Source {
  fileName: string;
  /** ไฟล์ต้นฉบับ (ส่งไปเก็บตอนนำเข้า) — ไม่มีถ้าอ่านผ่าน server แล้ว */
  file?: File;
  sourceFileId?: string;
  sha256: string;
  original: string[][];
  meta: PlanMeta;
  fromOcr: boolean;
}

const COL: Record<PlanField, number> = { name: 0, unit: 1, qty: 2, amount: 3 };
const LEVEL_LABEL = { ERROR: 'ต้องแก้', WARNING: 'ควรตรวจ', INFO: 'ข้อแนะนำ' } as const;
const issueKey = (i: PlanIssue) => `${i.rowNo}|${i.message}`;

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** อ่าน Excel/CSV ในเบราว์เซอร์ — คืน null ถ้าเป็นชนิดที่ต้องให้ server อ่าน (PDF, รูป, .xls เก่า) */
async function readLocal(bytes: Uint8Array): Promise<{ table: string[][]; meta: PlanMeta } | null> {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const binary = bytes.slice(0, 4096).includes(0);
  let tables: unknown[][][];
  if (zip) tables = readXlsx(bytes).map((s) => s.rows);
  else if (!binary && !(bytes[0] === 0x25 && bytes[1] === 0x50)) {
    let text = new TextDecoder('utf-8').decode(bytes);
    if (text.includes('�')) text = new TextDecoder('windows-874').decode(bytes);
    tables = [parseDelimited(text)];
  } else return null;
  let best: { table: string[][]; meta: PlanMeta; leaves: number } | null = null;
  for (const t of tables) {
    const n = normalizePlanTable(t);
    const leaves = parsePlanTable(n.table).leafCount;
    if (!best || leaves > best.leaves) best = { ...n, leaves };
  }
  if (!best || best.table.length < 2) throw new ApiError('VALIDATION_FAILED', 'ไม่พบตารางแผนงานในไฟล์ — ตรวจว่ามีคอลัมน์ รายการ, หน่วยนับ, ปริมาณงาน, งบประมาณ');
  return best;
}

export default function PlanImport({ fy, onDone, onCancel }: { fy: number; onDone: (id: string) => void; onCancel: () => void }) {
  const [src, setSrc] = useState<Source | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const start = (s: Source) => {
    setSrc(s);
    setRows(s.original.map((r) => [...r]));
    setStep(2);
  };
  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>นำเข้าแผนงบประมาณ</h1>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>ยกเลิก</button>
      </div>
      <ol className="steps" aria-label="ขั้นตอนการนำเข้า">
        {['เลือกไฟล์', 'ตรวจและแก้ไข', 'ยืนยันและนำเข้า'].map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={step > i + 1 ? 'done' : ''}>{label}</li>
        ))}
      </ol>
      {step === 1 && <PickFile onRead={start} />}
      {step === 2 && src && <Review src={src} rows={rows} setRows={setRows} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && src && <Confirm fy={fy} src={src} rows={rows} onBack={() => setStep(2)} onDone={onDone} />}
    </>
  );
}

/* ------------------------------------ 1. file ------------------------------------ */

function PickFile({ onRead }: { onRead: (s: Source) => void }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const { busy, error, run } = useSubmit();
  const read = (file?: File) => file && void run(async () => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha256 = await sha256Hex(bytes);
    const local = await readLocal(bytes);
    if (local) return onRead({ fileName: file.name, file, sha256, original: local.table, meta: local.meta, fromOcr: false });
    if (DEMO) throw new ApiError('VALIDATION_FAILED', 'โหมดสาธิตอ่านได้เฉพาะ Excel (.xlsx) และ CSV');
    const pv = await call('plans.preview', { fileName: file.name, mimeType: file.type, base64: await fileToBase64(file) });
    onRead({ fileName: pv.sourceFileName, sourceFileId: pv.sourceFileId, sha256: pv.sha256, original: pv.table, meta: pv.meta, fromOcr: pv.fromOcr });
  });
  const fromSheet = () => void run(async () => {
    const pv = await call('plans.preview', { fileName: 'Google Sheets', sheetUrl });
    onRead({ fileName: 'Google Sheets', sha256: '', original: pv.table, meta: pv.meta, fromOcr: false });
  });
  return (
    <div className="panel">
      {error && <ErrorBox error={error} />}
      <label className="dropzone" style={{ display: 'block' }}>
        <strong>{busy ? 'กำลังอ่านไฟล์…' : 'เลือกไฟล์แผนงบประมาณ'}</strong>
        <span className="small muted">
          Excel หรือ CSV แบบ คง.2 (คอลัมน์ รายการ, หน่วยนับ, ปริมาณงาน, งบประมาณ){DEMO ? '' : ' หรือ PDF/รูปหนังสือจัดสรร ซึ่งระบบจะอ่านเป็นร่างให้ตรวจ'}
        </span>
        <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.tsv,.pdf,image/jpeg,image/png" onChange={(e) => read(e.target.files?.[0])} disabled={busy} />
      </label>
      {!DEMO && (
        <div className="toolbar" style={{ marginTop: 'var(--s4)' }}>
          <label className="field" style={{ flex: 1 }}><span>หรือวางลิงก์ Google Sheets</span><input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} /></label>
          <button className="btn btn-ghost" onClick={fromSheet} disabled={!sheetUrl || busy}>อ่านข้อมูล</button>
        </div>
      )}
      <p className="hint">
        ระดับของแต่ละรายการอ่านจากเลขลำดับ (1, 1.1, 1), 1.1), (1), -) จึงไม่ต้องจัดย่อหน้า
        {' '}<button type="button" className="linkish" style={{ color: 'var(--forest)' }} onClick={() => void downloadSamplePlan()}>ดาวน์โหลดแบบฟอร์มตัวอย่าง (แบบ คง.2 ปี 2570 ครั้งที่ 1)</button>
      </p>
    </div>
  );
}

/* ------------------------------------ 2. review ------------------------------------ */

function Review({ src, rows, setRows, onBack, onNext }: {
  src: Source; rows: string[][]; setRows: (f: (r: string[][]) => string[][]) => void; onBack: () => void; onNext: () => void;
}) {
  const parsed = useMemo(() => parsePlanTable(rows), [rows]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Set<number>>(new Set());
  const [show, setShow] = useState<'review' | 'all'>('review');
  const nodeByRow = useMemo(() => new Map(parsed.nodes.map((n) => [n.rowNo, n])), [parsed]);
  const issuesByRow = useMemo(() => {
    const m = new Map<number, PlanIssue[]>();
    for (const i of parsed.issues) (m.get(i.rowNo) ?? m.set(i.rowNo, []).get(i.rowNo)!).push(i);
    return m;
  }, [parsed]);
  const changed = (r: number) => (src.original[r] ?? []).some((v, c) => v !== rows[r]?.[c]);
  const edits = rows.reduce((n, row, r) => n + (r ? row.filter((v, c) => v !== src.original[r]?.[c]).length : 0), 0);
  const open = parsed.issues.filter((i) => !dismissed.has(issueKey(i)));
  const errors = parsed.issues.filter((i) => i.level === 'ERROR');
  const warnings = open.filter((i) => i.level === 'WARNING');
  const needsLook = (r: number) => (issuesByRow.get(r + 1) ?? []).some((i) => !dismissed.has(issueKey(i))) || changed(r) || editing.has(r);
  const visible = rows.map((_, r) => r).filter((r) => r > 0 && (show === 'all' || needsLook(r)));

  const setCell = (r: number, c: number, v: string) => setRows((t) => t.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  const apply = (i: PlanIssue) => i.field && i.suggest !== undefined && setCell(i.rowNo - 1, COL[i.field], i.suggest);
  const applyAll = () => setRows((t) => {
    const next = t.map((r) => [...r]);
    for (const i of parsed.issues) if (i.field && i.suggest !== undefined && !dismissed.has(issueKey(i))) next[i.rowNo - 1][COL[i.field]] = i.suggest;
    return next;
  });
  const fixable = open.filter((i) => i.suggest !== undefined).length;
  const totalOk = parsed.declaredTotal === null || parsed.declaredTotal === parsed.computedTotal;

  return (
    <>
      <div className={`notice ${errors.length ? 'notice-error' : 'notice-ok'}`}>
        <div>
          <strong>{errors.length ? `ต้องแก้ ${errors.length} รายการก่อนนำเข้า` : 'ยอดเงินทุกระดับถูกต้อง'}</strong>
          <div className="small">
            {src.fileName}: รวม {formatBaht(parsed.computedTotal)} บาท
            {parsed.declaredTotal !== null && (totalOk ? ' ตรงกับยอดรวมทั้งสิ้นในเอกสาร' : ` แต่เอกสารระบุ ${formatBaht(parsed.declaredTotal)} บาท`)}
            , กิจกรรมย่อยให้กลุ่มงานเลือก {parsed.leafCount} รายการ
            {edits > 0 && `, แก้จากต้นฉบับ ${edits} ช่อง`}
          </div>
        </div>
      </div>
      {src.fromOcr && <div className="notice notice-warn">ข้อมูลนี้อ่านจากภาพเอกสาร ตรวจทุกบรรทัดกับต้นฉบับ หรือดาวน์โหลด CSV ไปแก้ใน Excel แล้วนำเข้าใหม่</div>}
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="แสดงแถว">
          <button aria-pressed={show === 'review'} onClick={() => setShow('review')}>ที่ต้องตรวจ ({rows.filter((_, r) => r > 0 && needsLook(r)).length})</button>
          <button aria-pressed={show === 'all'} onClick={() => setShow('all')}>ทั้งหมด ({rows.length - 1})</button>
        </div>
        {fixable > 1 && <button className="btn btn-ghost btn-sm" onClick={applyAll}>ใช้ค่าที่แนะนำทั้งหมด ({fixable})</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(rows)}>ดาวน์โหลด CSV</button>
      </div>
      {visible.length === 0 ? (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>ไม่มีรายการที่ต้องตรวจ กด "ถัดไป" เพื่อยืนยันการนำเข้า หรือเลือก "ทั้งหมด" เพื่อดูทุกแถว</p></div>
      ) : (
        <ul className="imp-list panel" aria-label="รายการในแผน">
          {visible.map((r) => (
            <ReviewRow
              key={r}
              row={rows[r]}
              orig={src.original[r]}
              node={nodeByRow.get(r + 1)}
              issues={issuesByRow.get(r + 1) ?? []}
              dismissed={dismissed}
              editing={editing.has(r) || (issuesByRow.get(r + 1) ?? []).some((i) => i.level !== 'INFO' && !dismissed.has(issueKey(i)))}
              onEdit={() => setEditing((s) => new Set(s).add(r))}
              onCell={(c, v) => setCell(r, c, v)}
              onApply={apply}
              onDismiss={(i) => setDismissed((s) => new Set(s).add(issueKey(i)))}
              onRevert={() => setRows((t) => t.map((row, i) => (i === r ? [...src.original[r]] : row)))}
            />
          ))}
        </ul>
      )}
      <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn" onClick={onNext} disabled={errors.length > 0}>ถัดไป: ยืนยันการนำเข้า</button>
        <button className="btn btn-ghost" onClick={onBack}>เลือกไฟล์อื่น</button>
        {errors.length > 0 && <span className="small" style={{ color: 'var(--clay)' }}>แก้รายการที่ "ต้องแก้" ก่อน</span>}
        {!errors.length && warnings.length > 0 && <span className="small muted">มี {warnings.length} รายการ "ควรตรวจ" ยืนยันได้ในขั้นถัดไป</span>}
      </div>
    </>
  );
}

function ReviewRow({ row, orig, node, issues, dismissed, editing, onEdit, onCell, onApply, onDismiss, onRevert }: {
  row: string[]; orig: string[] | undefined; node: PlanNode | undefined; issues: PlanIssue[]; dismissed: Set<string>; editing: boolean;
  onEdit: () => void; onCell: (c: number, v: string) => void; onApply: (i: PlanIssue) => void; onDismiss: (i: PlanIssue) => void; onRevert: () => void;
}) {
  const diff = (c: number) => orig !== undefined && orig[c] !== row[c];
  const money = parseMoney(row[3]);
  const field = (c: number, label: string, cls: string, inputMode?: 'decimal' | 'numeric') => (
    editing ? (
      <label className={cls}>
        <span className="sr-only">{label}</span>
        <input value={row[c] ?? ''} onChange={(e) => onCell(c, e.target.value)} inputMode={inputMode} className={diff(c) ? 'is-edited' : ''} aria-label={label} />
      </label>
    ) : (
      <span className={`${cls} ${diff(c) ? 'is-edited' : ''}`}>
        {c === 3 ? (money.ok && !money.empty ? formatBaht(money.satang) : row[3]) : c === 2 && row[2] ? Number(row[2]).toLocaleString('th-TH') : row[c]}
      </span>
    )
  );
  const active = issues.filter((i) => !dismissed.has(issueKey(i)));
  return (
    <li className={`imp-row ${node?.isLeaf ? 'is-leaf' : ''}`} style={{ ['--depth' as string]: node?.depth ?? 0 }}>
      <div className="imp-cells">
        {field(0, 'รายการ', 'imp-name')}
        {field(1, 'หน่วยนับ', 'imp-unit')}
        {field(2, 'ปริมาณงาน', 'imp-qty', 'numeric')}
        {field(3, 'งบประมาณ (บาท)', 'imp-amt num', 'decimal')}
      </div>
      {(active.length > 0 || !editing || diff(0) || diff(1) || diff(2) || diff(3)) && (
        <div className="imp-notes">
          {active.map((i) => (
            <div key={issueKey(i)} className={`imp-issue lvl-${i.level.toLowerCase()}`}>
              <span className="imp-level">{LEVEL_LABEL[i.level]}</span>
              <span>{i.message}</span>
              {i.suggest !== undefined && <button className="btn btn-sm" onClick={() => onApply(i)}>{i.fix ?? 'ใช้ค่าที่แนะนำ'}</button>}
              {i.level !== 'ERROR' && <button className="linkish xs" onClick={() => onDismiss(i)}>คงตามต้นฉบับ</button>}
            </div>
          ))}
          <span className="imp-actions">
            {!editing && <button className="linkish xs" onClick={onEdit}>แก้ไขแถวนี้</button>}
            {(diff(0) || diff(1) || diff(2) || diff(3)) && <button className="linkish xs" onClick={onRevert}>คืนค่าตามต้นฉบับ</button>}
          </span>
        </div>
      )}
    </li>
  );
}

function downloadCsv(rows: string[][]) {
  const url = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'แผนงบประมาณ-ตรวจแล้ว.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------ 3. confirm ------------------------------------ */

function Confirm({ fy, src, rows, onBack, onDone }: { fy: number; src: Source; rows: string[][]; onBack: () => void; onDone: (id: string) => void }) {
  const l = useLookups();
  const toast = useToast();
  const parsed = useMemo(() => parsePlanTable(rows), [rows]);
  const fundFromDoc = l.fundingSources.find((f) => f.code === src.meta.fundCode)?.id;
  const [meta, setMeta] = useState({
    fiscalYear: src.meta.fiscalYear && l.fiscalYears.includes(src.meta.fiscalYear) ? src.meta.fiscalYear : fy,
    fundingSourceId: fundFromDoc ?? l.fundingSources.find((f) => f.code === 'DOAE')?.id ?? '',
    round: src.meta.round ?? 1,
    title: src.meta.title ?? '',
    budgetType: src.meta.budgetType ?? 'งบดำเนินงาน',
    docNo: '',
    docDate: '',
  });
  const [check, setCheck] = useState<PlanCheck | null>(null);
  const [replace, setReplace] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { busy, error, run } = useSubmit();

  useEffect(() => {
    let alive = true;
    setCheck(null);
    call('plans.check', { sha256: src.sha256, fiscalYear: meta.fiscalYear, fundingSourceId: meta.fundingSourceId, round: meta.round })
      .then((c) => alive && setCheck(c))
      .catch(() => alive && setCheck(null));
    return () => { alive = false; };
  }, [src.sha256, meta.fiscalYear, meta.fundingSourceId, meta.round]);

  const edits = rows.reduce((n, row, r) => n + (r ? row.filter((v, c) => v !== src.original[r]?.[c]).length : 0), 0);
  const warnings = parsed.issues.filter((i) => i.level === 'WARNING').length;
  const projects = parsed.summary.find((s) => s.kind === 'PROJECT')?.count ?? 0;
  const blockedByExisting = !!check?.existing && (check.existing.assignedCount > 0 || !replace);
  const canSubmit = !!check && !check.duplicateOf && !blockedByExisting && confirmed && !busy;

  const submit = () => void run(async () => {
    const doc = await call('plans.commit', {
      ...meta, table: rows, originalTable: src.original, acceptWarnings: true, replaceExisting: replace,
      ...(src.file ? { fileName: src.fileName, base64: await fileToBase64(src.file) } : { sourceFileId: src.sourceFileId, sourceFileName: src.fileName, sourceSha256: src.sha256 }),
    });
    toast(`นำเข้าแผนแล้ว ${doc.leafCount} กิจกรรมย่อย`);
    onDone(doc.id);
  });
  const fill = (k: keyof typeof meta) => (src.meta[k as keyof PlanMeta] !== undefined || (k === 'fundingSourceId' && fundFromDoc) ? <span className="xs muted"> (อ่านจากเอกสาร)</span> : null);

  return (
    <div className="panel">
      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        <Field label="ปีงบประมาณ" note={fill('fiscalYear')}>
          <select value={meta.fiscalYear} onChange={(e) => setMeta({ ...meta, fiscalYear: Number(e.target.value) })}>
            {[...new Set([...l.fiscalYears, meta.fiscalYear])].sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="แหล่งงบ" note={fill('fundingSourceId')}>
          <select value={meta.fundingSourceId} onChange={(e) => setMeta({ ...meta, fundingSourceId: e.target.value })} required>
            {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="ครั้งที่" note={fill('round')}>
          <input type="number" min={1} max={20} value={meta.round} onChange={(e) => setMeta({ ...meta, round: Number(e.target.value) || 1 })} />
        </Field>
        <Field label="ประเภทงบ" note={fill('budgetType')}>
          <input value={meta.budgetType} onChange={(e) => setMeta({ ...meta, budgetType: e.target.value })} />
        </Field>
        <Field label="เลขที่หนังสือจัดสรร (ถ้ามี)"><input value={meta.docNo} onChange={(e) => setMeta({ ...meta, docNo: e.target.value })} placeholder="เช่น กษ 1004/ว 1594" /></Field>
        <Field label="ลงวันที่ (ถ้ามี)"><input type="date" value={meta.docDate} onChange={(e) => setMeta({ ...meta, docDate: e.target.value })} /></Field>
        <Field label="ชื่อแผน" note={fill('title')} wide>
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="เว้นว่างให้ระบบตั้งชื่อ" />
        </Field>
      </div>

      {check?.duplicateOf && (
        <div className="notice notice-error">ไฟล์นี้นำเข้าแล้วเป็น "{check.duplicateOf.title}" ไม่ต้องนำเข้าซ้ำ</div>
      )}
      {check?.existing && !check.duplicateOf && (
        <div className="notice notice-warn">
          <div>
            <strong>มีแผนปี {meta.fiscalYear} ครั้งที่ {meta.round} อยู่แล้ว: {check.existing.title}</strong>
            <div className="btn-row" style={{ marginTop: 'var(--s2)' }}>
              {check.existing.assignedCount === 0 && (
                <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} style={{ width: 20, minHeight: 20 }} />
                  แทนที่แผนเดิม
                </label>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMeta({ ...meta, round: check.nextRound })}>นำเข้าเป็นครั้งที่ {check.nextRound}</button>
            </div>
            {check.existing.assignedCount > 0 && <div className="small">แผนเดิมมีกลุ่มงานเลือกรายการแล้ว {check.existing.assignedCount} รายการ จึงแทนที่ไม่ได้</div>}
          </div>
        </div>
      )}

      <dl className="kv imp-summary">
        <dt>ยอดรวม</dt><dd className="num">{formatBaht(parsed.computedTotal)} บาท</dd>
        <dt>โครงการ / กิจกรรมย่อย</dt><dd>{projects} โครงการ / {parsed.leafCount} กิจกรรมย่อย</dd>
        <dt>แก้จากต้นฉบับ</dt><dd>{edits ? `${edits} ช่อง (บันทึกค่าเดิมและค่าใหม่ไว้ในประวัติ)` : 'ไม่มี'}</dd>
        <dt>ไฟล์ต้นฉบับ</dt><dd>{src.fileName}{src.file || src.sourceFileId ? ' (เก็บไว้ใน Google Drive)' : ''}</dd>
      </dl>

      <label className="field" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 'var(--s3)' }}>
        <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>ตรวจแล้ว ข้อมูลตรงกับหนังสือจัดสรร{warnings ? ` (รวม ${warnings} รายการที่ควรตรวจ)` : ''}</span>
      </label>
      <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn" onClick={submit} disabled={!canSubmit}>{busy ? 'กำลังนำเข้า…' : 'นำเข้า'}</button>
        <button className="btn btn-ghost" onClick={onBack}>กลับไปตรวจแก้</button>
        {!check && <span className="small muted">กำลังตรวจแผนที่มีอยู่…</span>}
      </div>
    </div>
  );
}

function Field({ label, note, wide, children }: { label: string; note?: ReactNode; wide?: boolean; children: ReactNode }) {
  return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}{note}</span>{children}</label>;
}
