import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizePhone, isValidPhone } from '@kpp/domain';
import { call, DEMO, saveSession } from '../api/client';
import { ErrorBox, useLookups, useSubmit } from '../components/ui';

type Mode = 'admin' | 'super' | 'request';

export default function Login() {
  const [mode, setMode] = useState<Mode>('admin');
  return (
    <div style={{ maxWidth: 520 }}>
      <h1>เข้าสู่ระบบเจ้าหน้าที่</h1>
      <div className="segmented" role="group" aria-label="เลือกวิธีเข้าสู่ระบบ" style={{ marginBottom: 'var(--s5)' }}>
        <button aria-pressed={mode === 'admin'} onClick={() => setMode('admin')}>เจ้าหน้าที่ (เบอร์โทร)</button>
        <button aria-pressed={mode === 'super'} onClick={() => setMode('super')}>Super Admin</button>
        <button aria-pressed={mode === 'request'} onClick={() => setMode('request')}>ขอสิทธิ์ใช้งาน</button>
      </div>
      <div className="panel">
        {mode === 'admin' && <PhoneLogin onRequest={() => setMode('request')} />}
        {mode === 'super' && <SuperLogin />}
        {mode === 'request' && <RequestAccess onDone={() => setMode('admin')} />}
      </div>
    </div>
  );
}

function PhoneLogin({ onRequest }: { onRequest: () => void }) {
  const nav = useNavigate();
  const [phone, setPhone] = useState(DEMO ? '0800000001' : '');
  const { busy, error, run } = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await call('auth.login', { phone });
      saveSession(r.token, r.user);
      nav('/admin');
    });
  };
  return (
    <form onSubmit={submit} noValidate>
      {error && <ErrorBox error={error} />}
      <label className="field">
        <span>หมายเลขโทรศัพท์ที่ได้รับอนุมัติ</span>
        <input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" required />
      </label>
      {DEMO && <p className="hint">โหมดสาธิต: ใช้ 0800000001 (ผู้ดูแลกลุ่มส่งเสริมและพัฒนาการผลิต)</p>}
      <div className="btn-row" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn" disabled={busy || !phone}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
        <button type="button" className="btn btn-ghost" onClick={onRequest}>ยังไม่มีสิทธิ์ ขอสิทธิ์ใช้งาน</button>
      </div>
    </form>
  );
}

function SuperLogin() {
  const nav = useNavigate();
  const [u, setU] = useState(DEMO ? 'demo' : '');
  const [p, setP] = useState(DEMO ? 'demo-password-1' : '');
  const { busy, error, run } = useSubmit();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await call('auth.loginSuper', { username: u, password: p });
      saveSession(r.token, r.user);
      nav('/admin');
    });
  };
  return (
    <form onSubmit={submit}>
      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        <label className="field"><span>ชื่อผู้ใช้</span><input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} required /></label>
        <label className="field"><span>รหัสผ่าน</span><input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required /></label>
      </div>
      {DEMO && <p className="hint">โหมดสาธิต: demo / demo-password-1</p>}
      <button className="btn" style={{ marginTop: 'var(--s4)' }} disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ'}</button>
    </form>
  );
}

function RequestAccess({ onDone }: { onDone: () => void }) {
  const l = useLookups();
  const [f, setF] = useState({ phone: '', fullName: '', position: '', workgroupId: '', affiliation: 'สำนักงานเกษตรจังหวัดกำแพงเพชร', note: '' });
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const phoneBad = f.phone !== '' && !isValidPhone(normalizePhone(f.phone));
  if (sent) {
    return (
      <div className="notice notice-ok" role="status">
        <div>
          <strong>ส่งคำขอแล้ว</strong>
          <p>เมื่อผู้ดูแลระบบอนุมัติ คุณเข้าสู่ระบบด้วยหมายเลข {normalizePhone(f.phone)} ได้ทันที</p>
          <button className="btn btn-sm" onClick={onDone}>ไปหน้าเข้าสู่ระบบ</button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void run(async () => { await call('auth.requestAccess', f); setSent(true); }); }}>
      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        <label className="field"><span className="req">ชื่อ-สกุล</span><input value={f.fullName} onChange={set('fullName')} autoComplete="name" required /></label>
        <label className="field">
          <span className="req">หมายเลขโทรศัพท์</span>
          <input type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} aria-invalid={phoneBad} aria-describedby="ph-hint" required />
          <span id="ph-hint" className="hint">{phoneBad ? 'ตรวจสอบหมายเลขอีกครั้ง เช่น 0812345678' : 'ใช้เป็นชื่อผู้ใช้เข้าสู่ระบบ'}</span>
        </label>
        <label className="field"><span className="req">ตำแหน่ง</span><input value={f.position} onChange={set('position')} required /></label>
        <label className="field"><span className="req">กลุ่มงาน</span>
          <select value={f.workgroupId} onChange={set('workgroupId')} required>
            <option value="">เลือกกลุ่มงาน</option>
            {l.workgroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field wide"><span>สังกัด</span><input value={f.affiliation} onChange={set('affiliation')} /></label>
      </div>
      <p className="hint" style={{ marginTop: 'var(--s3)' }}>ข้อมูลนี้ใช้เพื่อยืนยันตัวตนและบันทึกผู้ทำรายการเท่านั้น</p>
      <button className="btn" disabled={busy || phoneBad}>{busy ? 'กำลังส่ง…' : 'ส่งคำขอสิทธิ์'}</button>
    </form>
  );
}
