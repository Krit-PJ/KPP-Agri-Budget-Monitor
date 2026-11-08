import { useState, type FormEvent } from 'react';
import { formatThaiDateTime, maskPhone, type SessionUser } from '@kpp/domain';
import { call } from '../../api/client';
import { Async, Empty, ErrorBox, Sheet, useApi, useLookups, useNames, useSubmit, useToast } from '../../components/ui';
import { PositionField, TitleField } from '../../components/PersonFields';

const TABS = ['คำขอสิทธิ์', 'ผู้ใช้', 'รายงานการเข้าสู่ระบบ'] as const;
const RESULT_LABEL: Record<string, string> = {
  success: 'สำเร็จ', not_found_or_pending: 'ไม่มีสิทธิ์/รออนุมัติ', suspended: 'บัญชีถูกระงับ', invalid: 'รูปแบบไม่ถูกต้อง',
  wrong_credentials: 'รหัสผ่านไม่ถูกต้อง', throttled: 'ถูกระงับชั่วคราว',
};

export default function Users({ user }: { user: SessionUser }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('คำขอสิทธิ์');
  return (
    <>
      <h1>ผู้ใช้งาน</h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'คำขอสิทธิ์' && <Requests user={user} />}
      {tab === 'ผู้ใช้' && <UserList user={user} />}
      {tab === 'รายงานการเข้าสู่ระบบ' && <LoginReport />}
    </>
  );
}

function Requests({ user }: { user: SessionUser }) {
  const n = useNames();
  const toast = useToast();
  const s = useApi('admin.requests', { status: 'pending' });
  const { error, run, busy } = useSubmit();
  const decide = (id: string, approve: boolean, role: 'admin' | 'minisuper' = 'admin') => void run(async () => {
    const reason = approve ? '' : window.prompt('เหตุผลที่ไม่อนุมัติ (แจ้งผู้ขอ)') ?? '';
    await call('admin.decideRequest', { requestId: id, approve, reason, role });
    toast(approve ? 'อนุมัติแล้ว ผู้ขอเข้าสู่ระบบด้วยเบอร์โทรได้ทันที' : 'บันทึกการไม่อนุมัติแล้ว');
    s.reload();
  });
  return (
    <>
      {error && <ErrorBox error={error} />}
      <div className="notice notice-info">ตรวจสอบตัวตนผู้ขอก่อนอนุมัติ (เช่น โทรกลับเบอร์ที่ระบุ) เพราะผู้ที่ได้รับอนุมัติเข้าสู่ระบบด้วยเบอร์โทรอย่างเดียว</div>
      <Async s={s}>
        {(list) => list.length ? (
          <table className="data stack">
            <thead><tr><th>ผู้ขอ</th><th>เบอร์โทร</th><th>กลุ่มงาน</th><th>เมื่อ</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="primary">{r.title ?? ''}{r.fullName}<div className="xs muted">{r.position} {r.affiliation}</div></td>
                  <td data-label="เบอร์โทร">{user.role === 'superadmin' ? r.phone : maskPhone(r.phone)}</td>
                  <td data-label="กลุ่มงาน">{n.group(r.workgroupId)}</td>
                  <td data-label="เมื่อ">{formatThaiDateTime(r.createdAt)}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-sm" disabled={busy} onClick={() => decide(r.id, true)}>อนุมัติ</button>
                      {user.role === 'superadmin' && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => decide(r.id, true, 'minisuper')}>อนุมัติเป็น Mini Super Admin</button>}
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => decide(r.id, false)}>ไม่อนุมัติ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty title="ไม่มีคำขอรออนุมัติ" />}
      </Async>
    </>
  );
}

function UserList({ user }: { user: SessionUser }) {
  const n = useNames();
  const l = useLookups();
  const toast = useToast();
  const s = useApi('admin.users', {});
  const [open, setOpen] = useState(false);
  const blank = { id: '', phone: '', title: '', fullName: '', position: '', workgroupId: '', affiliation: 'สำนักงานเกษตรจังหวัดกำแพงเพชร', role: 'admin' as 'admin' | 'minisuper', scope: [] as string[] };
  const [f, setF] = useState(blank);
  const { error, run, busy } = useSubmit();
  const setStatus = (id: string, status: 'active' | 'suspended') => void run(async () => {
    if (status === 'suspended' && !window.confirm('ระงับบัญชีนี้? ผู้ใช้จะถูกออกจากระบบทันที')) return;
    await call('admin.setUserStatus', { id, status });
    toast(status === 'suspended' ? 'ระงับบัญชีแล้ว' : 'เปิดใช้บัญชีแล้ว');
    s.reload();
  });
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('admin.saveUser', { id: f.id || undefined, phone: f.phone, title: f.title, fullName: f.fullName, position: f.position, workgroupId: f.workgroupId, affiliation: f.affiliation, role: f.role, scopeWorkgroups: f.scope });
      toast(f.id ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มผู้ใช้แล้ว');
      setOpen(false);
      s.reload();
    });
  };
  return (
    <>
      <div className="section-head"><span /><button className="btn" onClick={() => { setF(blank); setOpen(true); }}>เพิ่มผู้ใช้</button></div>
      {error && !open && <ErrorBox error={error} />}
      <Async s={s}>
        {(list) => (
          <table className="data stack">
            <thead><tr><th>ชื่อ</th><th>เบอร์โทร</th><th>กลุ่มงาน</th><th>บทบาท</th><th>เข้าใช้ล่าสุด</th><th /></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} style={u.status === 'suspended' ? { opacity: 0.6 } : undefined}>
                  <td className="primary">{u.title ?? ''}{u.fullName}<div className="xs muted">{u.position}</div></td>
                  <td data-label="เบอร์โทร">{u.phone}</td>
                  <td data-label="กลุ่มงาน">{n.group(u.workgroupId)}</td>
                  <td data-label="บทบาท">{u.role === 'minisuper' ? 'Mini Super Admin' : 'Admin'}{u.status === 'suspended' && <span className="badge b-risk" style={{ marginLeft: 6 }}>ระงับ</span>}</td>
                  <td data-label="เข้าใช้ล่าสุด">{formatThaiDateTime(u.lastLoginAt)}</td>
                  <td>
                    {user.role === 'superadmin' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        let scope: string[] = [];
                        try { scope = JSON.parse(u.scopeWorkgroups || '[]') as string[]; } catch { scope = []; }
                        setF({ id: u.id, phone: u.phone, title: u.title ?? '', fullName: u.fullName, position: u.position, workgroupId: u.workgroupId, affiliation: u.affiliation, role: u.role === 'minisuper' ? 'minisuper' : 'admin', scope });
                        setOpen(true);
                      }}>แก้ไข</button>
                    )}
                    {(u.role === 'admin' || user.role === 'superadmin') && u.id !== user.sub && (
                      u.status === 'active'
                        ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus(u.id, 'suspended')}>ระงับ</button>
                        : <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setStatus(u.id, 'active')}>เปิดใช้</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
      <Sheet open={open} title={f.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'} onClose={() => setOpen(false)}>
        <form onSubmit={save}>
          {error && <ErrorBox error={error} />}
          <div className="form-grid">
            <TitleField value={f.title} onChange={(title) => setF({ ...f, title })} />
            <label className="field"><span className="req">ชื่อ-สกุล</span><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="ไม่ต้องใส่คำนำหน้า" required /></label>
            <label className="field"><span className="req">เบอร์โทร</span><input type="tel" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></label>
            <PositionField value={f.position} onChange={(position) => setF({ ...f, position })} required />
            <label className="field"><span className="req">กลุ่มงานหลัก</span>
              <select value={f.workgroupId} onChange={(e) => setF({ ...f, workgroupId: e.target.value })} required>
                <option value="">เลือก</option>
                {l.workgroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="field"><span>บทบาท</span>
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'admin' | 'minisuper' })}>
                <option value="admin">Admin (เฉพาะกลุ่มงาน)</option>
                {user.role === 'superadmin' && <option value="minisuper">Mini Super Admin (ทุกกลุ่มงาน)</option>}
              </select>
            </label>
            {f.role === 'admin' && (
              <fieldset className="wide" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="small">กลุ่มงานเพิ่มเติมที่ทำรายการได้</legend>
                {l.workgroups.filter((g) => g.id !== f.workgroupId).map((g) => (
                  <label key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="small">
                    <input type="checkbox" style={{ width: 18, minHeight: 18 }} checked={f.scope.includes(g.id)}
                      onChange={(e) => setF({ ...f, scope: e.target.checked ? [...f.scope, g.id] : f.scope.filter((x) => x !== g.id) })} />
                    {g.name}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
          <button className="btn" style={{ marginTop: 'var(--s4)' }} disabled={busy}>{f.id ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}</button>
        </form>
      </Sheet>
    </>
  );
}

function LoginReport() {
  const [days, setDays] = useState(7);
  const s = useApi('admin.loginReport', { days }, [days]);
  return (
    <>
      <div className="toolbar">
        <label className="field"><span>ช่วงเวลา</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>24 ชั่วโมง</option><option value={7}>7 วัน</option><option value={30}>30 วัน</option><option value={90}>90 วัน</option>
          </select>
        </label>
      </div>
      <Async s={s}>
        {(list) => (
          <table className="data stack">
            <thead><tr><th>เวลา</th><th>บทบาท</th><th>ผู้ใช้</th><th>ผล</th><th>อุปกรณ์</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="primary">{formatThaiDateTime(a.at)}</td>
                  <td data-label="บทบาท">{a.role}</td>
                  <td data-label="ผู้ใช้">{a.identifierMasked}</td>
                  <td data-label="ผล"><span className={`badge ${a.result === 'success' ? 'b-ok' : 'b-risk'}`}>{RESULT_LABEL[a.result] ?? a.result}</span>{a.newDevice && <span className="badge b-warn" style={{ marginLeft: 6 }}>อุปกรณ์ใหม่</span>}</td>
                  <td data-label="อุปกรณ์">{a.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
    </>
  );
}
