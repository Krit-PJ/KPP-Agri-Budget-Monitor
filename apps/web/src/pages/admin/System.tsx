import { useEffect, useState, type FormEvent } from 'react';
import { formatThaiDateTime } from '@kpp/domain';
import { call } from '../../api/client';
import { Async, auditLabel, ErrorBox, useApi, useLookups, useSubmit, useToast } from '../../components/ui';

const TABS = ['การตั้งค่า', 'ข้อมูลหลัก', 'สถานะระบบ', 'บันทึกการใช้งาน'] as const;

export default function System() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('การตั้งค่า');
  return (
    <>
      <h1>ตั้งค่าระบบ</h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'การตั้งค่า' && <Settings />}
      {tab === 'ข้อมูลหลัก' && <Master />}
      {tab === 'สถานะระบบ' && <Health />}
      {tab === 'บันทึกการใช้งาน' && <AuditLog />}
    </>
  );
}

function Settings() {
  const toast = useToast();
  const s = useApi('admin.health', {});
  const [f, setF] = useState<Record<string, string> | null>(null);
  useEffect(() => { if (s.data) setF(s.data.settings); }, [s.data]);
  const { busy, error, run } = useSubmit();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => { await call('admin.saveSettings', { settings: f! }); toast('บันทึกการตั้งค่าแล้ว'); s.reload(); });
  };
  return (
    <Async s={s}>
      {() => f && (
        <form onSubmit={save} className="panel" style={{ maxWidth: 720 }}>
          {error && <ErrorBox error={error} />}
          <label className="field" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" style={{ width: 20, minHeight: 20, marginTop: 4 }} checked={f.autoCommitClean === 'true'} onChange={(e) => setF({ ...f, autoCommitClean: String(e.target.checked) })} />
            <span>นำเข้าไฟล์จากโฟลเดอร์ Inbox อัตโนมัติ เมื่อไฟล์ไม่มีแถวผิดพลาดหรือต้องตรวจเลย<br /><span className="hint">ไฟล์ที่มีปัญหายังต้องให้เจ้าหน้าที่ยืนยันเสมอ</span></span>
          </label>
          <div className="form-grid" style={{ marginTop: 'var(--s4)' }}>
            <label className="field"><span>เป้ารายไตรมาสเริ่มต้น (%) — ใช้เมื่อยังไม่ได้ตั้งในเมนู "เป้าการเบิกจ่าย"</span><input value={f.defaultQuarterTargets} onChange={(e) => setF({ ...f, defaultQuarterTargets: e.target.value })} /></label>
            <label className="field"><span>เป้าเบิกจ่ายทั้งปี (%) ตามมาตรการเร่งรัดฯ</span><input type="number" min={1} max={100} value={f.annualTargetPct ?? '98'} onChange={(e) => setF({ ...f, annualTargetPct: e.target.value })} /></label>
            <label className="field"><span>ขนาดไฟล์สูงสุด (MB)</span><input type="number" min={1} max={25} value={f.maxUploadMB} onChange={(e) => setF({ ...f, maxUploadMB: e.target.value })} /></label>
            <label className="field"><span>เก็บสำเนาสำรอง (วัน)</span><input type="number" min={7} max={365} value={f.backupRetentionDays} onChange={(e) => setF({ ...f, backupRetentionDays: e.target.value })} /></label>
            <label className="field wide"><span>ข้อความแจ้งบนหน้าสาธารณะ</span><textarea value={f.publicNotice} onChange={(e) => setF({ ...f, publicNotice: e.target.value })} /></label>
          </div>
          <button className="btn" style={{ marginTop: 'var(--s4)' }} disabled={busy}>บันทึกการตั้งค่า</button>
        </form>
      )}
    </Async>
  );
}

function Master() {
  const l = useLookups();
  const toast = useToast();
  const [table, setTable] = useState<'workgroups' | 'fundingSources' | 'organizations'>('workgroups');
  const [item, setItem] = useState({ id: '', code: '', name: '', orgId: l.organizations[0]?.id ?? '', shortName: '' });
  const { busy, error, run } = useSubmit();
  const list = table === 'workgroups' ? l.workgroups : table === 'fundingSources' ? l.fundingSources : l.organizations;
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('admin.saveMaster', { table, item: { ...item, id: item.id || undefined } });
      toast('บันทึกแล้ว ข้อมูลจะแสดงเมื่อโหลดหน้าใหม่');
      setItem({ ...item, id: '', code: '', name: '', shortName: '' });
    });
  };
  return (
    <div className="grid grid-2">
      <div>
        <div className="segmented" style={{ marginBottom: 'var(--s4)' }}>
          <button aria-pressed={table === 'workgroups'} onClick={() => setTable('workgroups')}>กลุ่มงาน</button>
          <button aria-pressed={table === 'organizations'} onClick={() => setTable('organizations')}>หน่วยงาน</button>
          <button aria-pressed={table === 'fundingSources'} onClick={() => setTable('fundingSources')}>แหล่งงบ</button>
        </div>
        <ul className="row-list panel">
          {list.map((x) => (
            <li key={x.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{x.name} <span className="xs muted">{x.code}</span></span>
              <button className="btn btn-ghost btn-sm" onClick={() => setItem({ ...item, id: x.id, code: x.code, name: x.name, orgId: (x as { orgId?: string }).orgId ?? item.orgId, shortName: (x as { shortName?: string }).shortName ?? '' })}>แก้ไข</button>
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={save} className="panel">
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>{item.id ? 'แก้ไข' : 'เพิ่ม'}</h2>
        {error && <ErrorBox error={error} />}
        <label className="field"><span>รหัส</span><input value={item.code} onChange={(e) => setItem({ ...item, code: e.target.value })} required /></label>
        <label className="field"><span>ชื่อ</span><input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} required /></label>
        {table === 'workgroups' && (
          <label className="field"><span>หน่วยงาน</span>
            <select value={item.orgId} onChange={(e) => setItem({ ...item, orgId: e.target.value })}>{l.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          </label>
        )}
        {table === 'fundingSources' && <label className="field"><span>ชื่อย่อ</span><input value={item.shortName} onChange={(e) => setItem({ ...item, shortName: e.target.value })} /></label>}
        <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
          <button className="btn" disabled={busy}>บันทึก</button>
          {item.id && <button type="button" className="btn btn-ghost" onClick={() => setItem({ ...item, id: '', code: '', name: '' })}>เพิ่มรายการใหม่แทน</button>}
        </div>
      </form>
    </div>
  );
}

function Health() {
  const s = useApi('admin.health', {});
  const { run, busy } = useSubmit();
  const toast = useToast();
  return (
    <Async s={s}>
      {(h) => (
        <div className="grid grid-2">
          <section className="panel">
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>พื้นที่ Google Sheets</h2>
            <ul className="row-list">
              {h.cellUsage.map((c) => (
                <li key={c.file} className="fund-row">
                  <span>{c.file}</span><span className="num" style={{ color: c.pctOfLimit > 50 ? 'var(--clay)' : undefined }}>{c.pctOfLimit}%</span>
                  <div className="mini-strip"><div style={{ width: `${Math.min(c.pctOfLimit, 100)}%`, background: c.pctOfLimit > 50 ? 'var(--clay)' : 'var(--paddy)' }} /></div>
                </li>
              ))}
            </ul>
            <p className="hint">เกิน 50% ให้ย้ายข้อมูลปีงบเก่าไปไฟล์ archive ตามคู่มือ</p>
          </section>
          <section className="panel">
            <h2 style={{ fontSize: 'var(--fs-lg)' }}>การทำงานอัตโนมัติ</h2>
            <dl className="kv">
              <dt>เวอร์ชัน schema</dt><dd>{h.setupVersion}</dd>
              <dt>งานตั้งเวลา</dt><dd>{h.triggers.join(', ') || 'ยังไม่ได้ติดตั้ง'}</dd>
              <dt>สำรองข้อมูลล่าสุด</dt><dd>{formatThaiDateTime(h.lastBackupAt)}</dd>
              <dt>รอคิวบันทึกไม่สำเร็จ (24 ชม.)</dt><dd>{h.lockTimeouts24h}</dd>
              <dt>ข้อผิดพลาดภายใน (24 ชม.)</dt><dd>{h.errors24h}</dd>
            </dl>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--s3)' }} disabled={busy} onClick={() => void run(async () => { await call('admin.rebuildSnapshot', {}); toast('สร้างสรุปข้อมูลสาธารณะแล้ว'); })}>สร้างสรุปข้อมูลสาธารณะใหม่</button>
          </section>
        </div>
      )}
    </Async>
  );
}

function AuditLog() {
  const s = useApi('admin.audit', { limit: 300 });
  return (
    <Async s={s}>
      {(list) => (
        <table className="data stack">
          <thead><tr><th>เวลา</th><th>ผู้ทำรายการ</th><th>รายการ</th><th>เหตุผล</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="primary">{formatThaiDateTime(a.at)}</td>
                <td data-label="ผู้ทำรายการ">{a.actorName}</td>
                <td data-label="รายการ">{auditLabel(a.action)} <span className="xs muted">{a.entityType}</span></td>
                <td data-label="เหตุผล">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Async>
  );
}
