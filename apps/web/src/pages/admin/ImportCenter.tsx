import { useEffect, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FIELD_LABEL, formatBaht, formatThaiDateTime, IMPORT_FIELDS, toCsv, type ImportKind, type ImportPreview, type RowStatus, type SessionUser,
} from '@kpp/domain';
import { ApiError, call, DEMO, fileToBase64 } from '../../api/client';
import { Async, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';

const KIND_LABEL: Record<ImportKind, string> = {
  BUDGET_SUMMARY: 'สรุปงบประมาณรายโครงการ (งบที่ได้รับ/เบิกจ่ายสะสม)',
  DISBURSEMENT_LIST: 'รายการเบิกจ่ายทีละรายการ',
};
const STATUS_LABEL: Record<RowStatus, string> = { VALID: 'พร้อมนำเข้า', WARNING: 'ต้องตรวจ', ERROR: 'ผิดพลาด' };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const TEMPLATE = [
  ['รหัสโครงการ', 'ชื่อโครงการ', 'ชื่อกิจกรรม', 'กลุ่มงาน', 'แหล่งงบ', 'งบประมาณที่ได้รับ', 'โอนเพิ่ม', 'โอนลด', 'ผูกพัน', 'เบิกจ่ายสะสม', 'ผู้รับผิดชอบ', 'วันเริ่มต้น', 'วันสิ้นสุด'],
  ['2570-001', 'โครงการตัวอย่าง', '', 'กลุ่มส่งเสริมและพัฒนาการผลิต', 'งบกรมส่งเสริมการเกษตร', '500,000', '', '', '', '120,000', 'ชื่อผู้รับผิดชอบ', '1 ต.ค. 2569', '30 ก.ย. 2570'],
];

export default function ImportCenter({ user }: { user: SessionUser }) {
  const l = useLookups();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [fund, setFund] = useState('');
  const [drag, setDrag] = useState(false);
  const [pv, setPv] = useState<ImportPreview | null>(null);
  const [filter, setFilter] = useState<RowStatus | ''>('');
  const [accept, setAccept] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const { busy, error, run, setError } = useSubmit();
  const jobs = useApi('imports.list', {}, [pv?.job.id, pv?.job.status]);

  const jobParam = params.get('job');
  useEffect(() => {
    if (jobParam && jobParam !== pv?.job.id) void run(async () => setPv(await call('imports.get', { jobId: jobParam })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobParam]);

  const open = (p: ImportPreview) => {
    setPv(p);
    setAccept(false);
    setFilter(p.summary.error ? 'ERROR' : p.summary.warning ? 'WARNING' : '');
    setParams({ job: p.job.id }, { replace: true });
  };

  const upload = (file: File | undefined, allowDuplicate = false) => {
    if (!file) return;
    void run(async () => {
      try {
        open(await call('imports.upload', { fileName: file.name, mimeType: file.type, base64: await fileToBase64(file), fiscalYear: fy, fundingSourceId: fund || undefined, allowDuplicate }));
      } catch (e) {
        if (e instanceof ApiError && e.code === 'DUPLICATE_IMPORT' && window.confirm(`${e.message}\nต้องการตรวจไฟล์นี้อีกครั้งหรือไม่? (ยอดที่นำเข้าแล้วจะไม่ถูกนับซ้ำ)`)) {
          open(await call('imports.upload', { fileName: file.name, mimeType: file.type, base64: await fileToBase64(file), fiscalYear: fy, fundingSourceId: fund || undefined, allowDuplicate: true }));
        } else throw e;
      }
    });
  };
  const fromSheet = () => void run(async () => open(await call('imports.upload', { fileName: 'Google Sheets', mimeType: '', sheetUrl, fiscalYear: fy, fundingSourceId: fund || undefined })));
  const remap = (patch: { mapping?: Record<string, number>; fiscalYear?: number; fundingSourceId?: string; kind?: ImportKind }) =>
    void run(async () => open(await call('imports.remap', { jobId: pv!.job.id, ...patch })));
  const commit = () => void run(async () => {
    const r = await call('imports.commit', { jobId: pv!.job.id, acceptWarnings: accept });
    toast(`นำเข้าแล้ว ${r.committed} แถว${r.skipped ? ` ข้าม ${r.skipped} แถว` : ''}`);
    setPv({ ...pv!, job: r.job });
  });
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    upload(e.dataTransfer.files[0]);
  };

  const rows = pv ? pv.rows.filter((r) => !filter || r.status === filter) : [];
  const done = pv && ['COMMITTED', 'CANCELLED'].includes(pv.job.status);

  return (
    <>
      <h1>นำเข้าข้อมูล</h1>
      {!pv && (
        <>
          <p className="muted" style={{ maxWidth: '68ch' }}>
            ใช้ไฟล์ Excel หรือ CSV ที่มีอยู่แล้วได้เลย ระบบจะหาหัวตาราง จับคู่คอลัมน์ แปลงวันที่และจำนวนเงิน แล้วให้ตรวจก่อนนำเข้า
            {user.role === 'admin' && ' คุณนำเข้าได้เฉพาะโครงการในกลุ่มงานของคุณ'}
          </p>
          <div className="toolbar">
            <label className="field"><span>ปีงบประมาณ</span>
              <select value={fy} onChange={(e) => setFy(Number(e.target.value))}>{l.fiscalYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </label>
            <label className="field"><span>แหล่งงบ (ถ้าไฟล์ไม่มีคอลัมน์นี้)</span>
              <select value={fund} onChange={(e) => setFund(e.target.value)}>
                <option value="">ให้ระบบอ่านจากไฟล์</option>
                {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          </div>
          <label className={`dropzone${drag ? ' drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
            <strong>{busy ? 'กำลังอ่านไฟล์…' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์'}</strong>
            <span className="small muted">รองรับ .xlsx .xls .csv .tsv{DEMO && ' (โหมดสาธิตรองรับเฉพาะ CSV/TSV)'}</span>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={busy} />
          </label>
          {error && <ErrorBox error={error} />}
          <div className="grid grid-2 section">
            <div className="panel">
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>นำเข้าจาก Google Sheets</h2>
              <div className="toolbar">
                <label className="field" style={{ flex: 1 }}><span>ลิงก์ Google Sheets</span><input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label>
                <button className="btn btn-ghost" onClick={fromSheet} disabled={!sheetUrl || busy}>ตรวจข้อมูล</button>
              </div>
              <p className="hint">แชร์ไฟล์ให้บัญชีผู้ดูแลระบบอ่านได้ก่อน</p>
            </div>
            <div className="panel">
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>นำเข้าอัตโนมัติจาก Google Drive</h2>
              <p className="small">วางไฟล์ไว้ในโฟลเดอร์ <strong>01_Imports/Inbox</strong> ของระบบ ระบบจะตรวจทุก 15 นาที แล้วแจ้งในหน้างานที่ต้องทำ</p>
              <button className="btn btn-ghost btn-sm" onClick={() => download('แม่แบบนำเข้างบประมาณ.csv', toCsv(TEMPLATE))}>ดาวน์โหลดแม่แบบไฟล์</button>
            </div>
          </div>
          <section className="section">
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>ประวัติการนำเข้า</h2>
            <Async s={jobs}>
              {(list) => list.length ? (
                <table className="data stack">
                  <thead><tr><th>ไฟล์</th><th>เมื่อ</th><th>สถานะ</th><th className="r">แถว</th></tr></thead>
                  <tbody>
                    {list.map((j) => (
                      <tr key={j.id}>
                        <td className="primary"><button className="btn btn-ghost btn-sm" onClick={() => setParams({ job: j.id })}>{j.fileName}</button></td>
                        <td data-label="เมื่อ">{formatThaiDateTime(j.createdAt)}</td>
                        <td data-label="สถานะ">{({ STAGED: 'รอยืนยัน', COMMITTING: 'กำลังนำเข้า', COMMITTED: 'นำเข้าแล้ว', PARTIAL: 'นำเข้าบางส่วน', CANCELLED: 'ยกเลิก', FAILED: 'ล้มเหลว' })[j.status]}</td>
                        <td data-label="แถว" className="r">{j.committedRows || j.validRows + j.warningRows}/{j.totalRows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="muted small">ยังไม่เคยนำเข้า</p>}
            </Async>
          </section>
        </>
      )}

      {pv && (
        <>
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>{pv.job.fileName}</h2>
              <p className="small muted" style={{ margin: 0 }}>{KIND_LABEL[pv.job.kind]} ปีงบ {pv.job.fiscalYear}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPv(null); setParams({}); setError(null); }}>นำเข้าไฟล์อื่น</button>
          </div>
          {pv.job.message && <div className="notice notice-warn">{pv.job.message}</div>}
          {error && <ErrorBox error={error} />}
          <div className="stats-row panel" style={{ marginBottom: 'var(--s4)' }}>
            <button className="stat stat-btn" onClick={() => setFilter('VALID')}><span className="v" style={{ color: 'var(--paddy)' }}>{pv.summary.valid}</span><span className="l">พร้อมนำเข้า</span></button>
            <button className="stat stat-btn" onClick={() => setFilter('WARNING')}><span className="v" style={{ color: 'var(--straw-ink)' }}>{pv.summary.warning}</span><span className="l">ต้องตรวจ</span></button>
            <button className="stat stat-btn" onClick={() => setFilter('ERROR')}><span className="v" style={{ color: 'var(--clay)' }}>{pv.summary.error}</span><span className="l">ผิดพลาด (ไม่นำเข้า)</span></button>
            <div className="stat"><span className="v">{pv.summary.newProjects}</span><span className="l">โครงการใหม่</span></div>
            <div className="stat"><span className="v">{formatBaht(pv.summary.budgetDelta)}</span><span className="l">งบที่เพิ่มขึ้น (บาท)</span></div>
            <div className="stat"><span className="v">{formatBaht(pv.summary.disbursedDelta)}</span><span className="l">เบิกจ่ายที่เพิ่มขึ้น (บาท)</span></div>
          </div>

          {pv.job.status === 'STAGED' && (
            <div className="toolbar">
              <label className="field"><span>ชนิดข้อมูล</span>
                <select value={pv.job.kind} onChange={(e) => remap({ kind: e.target.value as ImportKind })} disabled={busy}>
                  {(Object.keys(KIND_LABEL) as ImportKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </label>
              <label className="field"><span>แหล่งงบเริ่มต้น</span>
                <select value={pv.job.fundingSourceId} onChange={(e) => remap({ fundingSourceId: e.target.value })} disabled={busy}>
                  <option value="">อ่านจากไฟล์</option>
                  {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
              <button className="btn btn-ghost" onClick={() => setShowMap(!showMap)} aria-expanded={showMap}>{showMap ? 'ซ่อนการจับคู่คอลัมน์' : 'แก้การจับคู่คอลัมน์'}</button>
            </div>
          )}

          {showMap && pv.job.status === 'STAGED' && (
            <div className="panel" style={{ marginBottom: 'var(--s4)' }}>
              <p className="small">ระบบจับคู่ให้อัตโนมัติ แก้เฉพาะคอลัมน์ที่ไม่ถูกต้อง</p>
              <div className="form-grid">
                {IMPORT_FIELDS.map((field) => (
                  <label key={field} className="field"><span>{FIELD_LABEL[field]}</span>
                    <select value={pv.mapping[field] ?? ''} onChange={(e) => {
                      const m = { ...pv.mapping } as Record<string, number>;
                      if (e.target.value === '') delete m[field]; else m[field] = Number(e.target.value);
                      remap({ mapping: m });
                    }} disabled={busy}>
                      <option value="">ไม่ใช้</option>
                      {pv.headers.map((h, i) => <option key={i} value={i}>{h || `คอลัมน์ ${i + 1}`}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="btn-row" style={{ marginBottom: 'var(--s3)' }}>
            {(['', 'VALID', 'WARNING', 'ERROR'] as const).map((s) => (
              <button key={s} className={`btn btn-sm ${filter === s ? '' : 'btn-ghost'}`} onClick={() => setFilter(s)}>{s ? STATUS_LABEL[s] : 'ทั้งหมด'}</button>
            ))}
            {(pv.summary.error > 0 || pv.summary.warning > 0) && (
              <button className="btn btn-ghost btn-sm" onClick={() => void run(async () => { const r = await call('imports.errorsCsv', { jobId: pv.job.id }); download(r.fileName, r.csv); })}>
                ดาวน์โหลดแถวที่ต้องแก้ (CSV)
              </button>
            )}
          </div>
          <table className="data stack">
            <thead><tr><th>แถว</th><th>รายการ</th><th>ผลการตรวจ</th><th className="r">งบ +/-</th><th className="r">เบิกจ่าย +</th></tr></thead>
            <tbody>
              {rows.slice(0, 300).map((r) => (
                <tr key={r.rowNo}>
                  <td className="primary">แถว {r.rowNo} <span className={`badge ${r.status === 'VALID' ? 'b-ok' : r.status === 'WARNING' ? 'b-warn' : 'b-risk'}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td data-label="รายการ">{r.label}</td>
                  <td data-label="ผลการตรวจ" className="small">{r.messages.join(' / ') || 'ถูกต้อง'}</td>
                  <td data-label="งบ +/-" className="r">{r.effect.budgetDelta ? formatBaht(r.effect.budgetDelta) : ''}</td>
                  <td data-label="เบิกจ่าย +" className="r">{r.effect.disbursedDelta ? formatBaht(r.effect.disbursedDelta) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 300 && <p className="small muted">แสดง 300 แถวแรกจาก {rows.length} แถว</p>}

          {!done && (
            <div className="panel section" style={{ position: 'sticky', bottom: 8 }}>
              {pv.summary.warning > 0 && (
                <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 'var(--s3)' }}>
                  <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={accept} onChange={(e) => setAccept(e.target.checked)} />
                  <span>ตรวจแถวที่ต้องตรวจแล้ว ({pv.summary.warning} แถว) และยืนยันให้นำเข้า</span>
                </label>
              )}
              <div className="btn-row">
                <button className="btn" onClick={commit} disabled={busy || pv.summary.valid + pv.summary.warning === 0 || (pv.summary.warning > 0 && !accept)}>
                  {busy ? 'กำลังนำเข้า…' : pv.job.status === 'PARTIAL' ? 'นำเข้าต่อ' : `นำเข้า ${pv.summary.valid + pv.summary.warning} แถว`}
                </button>
                {pv.job.status === 'STAGED' && <button className="btn btn-ghost" onClick={() => void run(async () => { await call('imports.cancel', { jobId: pv.job.id }); setPv(null); setParams({}); })}>ยกเลิกงานนี้</button>}
              </div>
              {pv.summary.error > 0 && <p className="hint" style={{ marginTop: 8 }}>แถวที่ผิดพลาด {pv.summary.error} แถวจะไม่ถูกนำเข้า แก้ในไฟล์แล้วนำเข้าใหม่ได้ ระบบไม่นับยอดซ้ำ</p>}
            </div>
          )}
          {pv.job.status === 'COMMITTED' && <div className="notice notice-ok section">นำเข้าแล้ว {pv.job.committedRows} แถว เมื่อ {formatThaiDateTime(pv.job.committedAt)}</div>}
        </>
      )}
    </>
  );
}
