import { useState, type FormEvent } from 'react';
import { withTitle, type MyProfile, type SessionUser, type WorkgroupMemoSettings } from '@kpp/domain';
import { call, purgePublicCache } from '../../api/client';
import { Async, ErrorBox, useApi, useSubmit, useToast } from '../../components/ui';
import { PositionField, TitleField } from '../../components/PersonFields';

/** ข้อมูลของฉัน — คำนำหน้า ชื่อ และตำแหน่งแบบเต็ม (ใช้เป็นผู้ลงนามฝั่งซ้ายของบันทึกข้อความ) */
export default function Profile({ user, onProfileSaved }: { user: SessionUser; onProfileSaved?: () => void }) {
  const s = useApi('profile.get', {});
  return (
    <>
      <h1>ข้อมูลของฉัน</h1>
      <p className="muted">ใช้เป็นชื่อผู้ลงนามในบันทึกข้อความที่คุณจัดทำ — กรอกคำนำหน้าและตำแหน่งแบบเต็มตามที่ใช้ในหนังสือราชการ</p>
      <Async s={s}>{(p) => <ProfileForm p={p} onSaved={() => { s.reload(); onProfileSaved?.(); }} />}</Async>
      <h2 style={{ marginTop: 'var(--s6)' }}>หัวบันทึกข้อความของกลุ่มงาน</h2>
      <GroupSettings user={user} />
    </>
  );
}

function ProfileForm({ p, onSaved }: { p: MyProfile; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ title: p.title, fullName: p.fullName, position: p.position });
  const { busy, error, run } = useSubmit();
  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await call('profile.save', f);
      purgePublicCache();
      toast('บันทึกข้อมูลของฉันแล้ว');
      onSaved();
    });
  };
  return (
    <form className="panel profile-card" onSubmit={save}>
      {error && <ErrorBox error={error} />}
      {!p.complete && <p className="notice notice-warn" role="status">ยังไม่ครบ — กรอกคำนำหน้าและตำแหน่งแบบเต็มก่อนจัดทำบันทึกข้อความ</p>}
      <div className="form-grid">
        <TitleField value={f.title} onChange={(title) => setF({ ...f, title })} required />
        <label className="field"><span className="req">ชื่อ-สกุล</span><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="ไม่ต้องใส่คำนำหน้า" required /></label>
        <div className="wide"><PositionField value={f.position} onChange={(position) => setF({ ...f, position })} required /></div>
      </div>
      <p className="sig-preview" aria-label="ตัวอย่างการลงนาม">
        <span>(ลงชื่อ)................................................</span>
        <span>({withTitle(f.title, f.fullName) || 'ชื่อ-สกุล'})</span>
        <span>ตำแหน่ง {f.position || '…'}</span>
      </p>
      <button className="btn" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูลของฉัน'}</button>
    </form>
  );
}

const EMPTY_HINT = {
  memoOrg: 'เช่น กลุ่มอารักขาพืช สำนักงานเกษตรจังหวัดกำแพงเพชร',
  memoFax: 'เช่น 0-5571-6858',
  memoPrefix: 'เช่น กพ 0009.3',
  headName: 'เช่น นายธนจิรพัชร พัฒนศักดิ์ภิญโญ',
  headPosition: 'เช่น นักวิชาการส่งเสริมการเกษตรชำนาญการ',
  headLine2: 'เช่น รักษาการหัวหน้ากลุ่มอารักขาพืช',
};

/** ส่วนราชการ โทรสาร ส่วนหน้าเลขที่ และผู้ลงนามฝั่งขวา — แก้ไขได้โดย Mini Super / Super Admin */
function GroupSettings({ user }: { user: SessionUser }) {
  const s = useApi('memos.groupSettings', {});
  const canEdit = user.role !== 'admin';
  return (
    <>
      <p className="muted small">{canEdit ? 'ค่าที่ตั้งไว้จะเติมให้อัตโนมัติในบันทึกข้อความของกลุ่ม (เจ้าหน้าที่แก้เฉพาะฉบับได้)' : 'ค่าที่ตั้งไว้จะเติมให้อัตโนมัติ — หากต้องการเปลี่ยน แจ้ง Mini Super Admin หรือ Super Admin'}</p>
      <Async s={s}>
        {(list) => (
          <div className="memo-groups">
            {list.map((g) => <GroupCard key={g.id} g={g} canEdit={canEdit} onSaved={s.reload} />)}
          </div>
        )}
      </Async>
    </>
  );
}

function GroupCard({ g, canEdit, onSaved }: { g: WorkgroupMemoSettings; canEdit: boolean; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(g);
  const [edit, setEdit] = useState(false);
  const { busy, error, run } = useSubmit();
  const field = (k: keyof typeof EMPTY_HINT, label: string, wide = false) => (
    <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span>
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={EMPTY_HINT[k]} readOnly={!edit} />
    </label>
  );
  const ready = !!(g.memoPrefix && g.headName);
  return (
    <form className="panel memo-group" onSubmit={(e) => { e.preventDefault(); void run(async () => { await call('memos.saveGroupSettings', f); toast(`บันทึกหัวบันทึกของ${g.name}แล้ว`); setEdit(false); onSaved(); }); }}>
      <header className="memo-group-h">
        <h3>{g.name}</h3>
        <span className={`rec-chip ${ready ? 'st-full' : 'st-warn'}`}>{ready ? 'ตั้งค่าแล้ว' : 'ยังไม่ครบ'}</span>
        {canEdit && !edit && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>แก้ไข</button>}
      </header>
      {error && <ErrorBox error={error} />}
      <div className="form-grid">
        {field('memoOrg', 'ส่วนราชการ', true)}
        {field('memoFax', 'โทรสาร')}
        {field('memoPrefix', 'ส่วนหน้าเลขที่หนังสือ ("ที่")')}
        {field('headName', 'ผู้ลงนามฝั่งขวา (ชื่อพร้อมคำนำหน้า)')}
        {field('headPosition', 'ตำแหน่ง')}
        {field('headLine2', 'บรรทัดที่สอง (เช่น รักษาการหัวหน้ากลุ่ม)', true)}
      </div>
      {edit && (
        <div className="row-gap">
          <button className="btn" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setF(g); setEdit(false); }}>ยกเลิก</button>
        </div>
      )}
    </form>
  );
}
