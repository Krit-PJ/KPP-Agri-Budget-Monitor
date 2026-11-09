import { useState } from 'react';
import { Link } from 'react-router-dom';
import { call, purgePublicCache } from '../../api/client';
import { ErrorBox, useLookups, useSubmit, useToast } from '../../components/ui';

/**
 * การเผยแพร่ข้อมูลกลุ่มงานบนหน้าสาธารณะ (ภาพรวม / ติดตามโครงการ / พิมพ์รายงาน)
 * ปิด = ไม่ส่งข้อมูลของกลุ่มออกทาง API สาธารณะ แต่เจ้าหน้าที่ของกลุ่มยังบันทึกแผนและการเบิกจ่ายได้ตามปกติ
 */
export default function Publishing() {
  const l = useLookups();
  const toast = useToast();
  const { busy, error, run } = useSubmit();
  const [pending, setPending] = useState('');
  const groups = l.workgroups.filter((g) => !g.noActivities);
  const shown = groups.filter((g) => !g.hidePublic).length;
  const toggle = (id: string, name: string, visible: boolean) => {
    setPending(id);
    void run(async () => {
      try {
        await call('admin.setWorkgroupPublic', { id, visible });
        purgePublicCache();
        window.dispatchEvent(new Event('kpp:lookups-changed'));
        toast(visible ? `เปิดเผยแพร่${name}แล้ว` : `ปิดการเผยแพร่${name}แล้ว`);
      } finally {
        setPending('');
      }
    });
  };
  return (
    <>
      <h1>การเผยแพร่ข้อมูลกลุ่มงาน</h1>
      <p className="muted">
        เลือกกลุ่มงานที่จะแสดงบนหน้าสาธารณะ (ภาพรวม · ติดตามโครงการ · พิมพ์รายงาน) — ตัวเลขรวมจะนับเฉพาะกลุ่มที่เปิด
        และมีข้อความกำกับให้ผู้อ่านทราบ. กลุ่มที่ปิดยังบันทึกแผนและการเบิกจ่ายได้ตามปกติ เพื่อเตรียมข้อมูลให้ครบก่อนเปิด
      </p>
      {error && <ErrorBox error={error} />}
      <section className="panel pub-list" aria-label="กลุ่มงาน">
        <p className="small" style={{ marginTop: 0 }}>เปิดเผยแพร่ <b>{shown}</b> จาก {groups.length} กลุ่มงาน · พื้นที่ดำเนินการ (อำเภอเป้าหมาย) แสดงตามงบของกลุ่มที่เปิดโดยอัตโนมัติ</p>
        <ul className="pub-groups">
          {groups.map((g) => {
            const on = !g.hidePublic;
            return (
              <li key={g.id} className={on ? 'is-on' : ''}>
                <div>
                  <strong>{g.name}</strong>
                  <span className={`rec-chip ${on ? 'st-full' : 'st-warn'}`}>{on ? 'เผยแพร่อยู่' : 'ยังไม่เผยแพร่'}</span>
                </div>
                <label className="switch">
                  <input type="checkbox" role="switch" checked={on} disabled={busy}
                    aria-label={`เผยแพร่ข้อมูล${g.name}`} onChange={(e) => toggle(g.id, g.name, e.target.checked)} />
                  <span aria-hidden="true" />
                  <em>{pending === g.id ? 'กำลังบันทึก…' : on ? 'เปิด' : 'ปิด'}</em>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="small muted" style={{ marginBottom: 0 }}>ดูผลลัพธ์ได้ที่ <Link to="/">หน้าภาพรวม</Link> — การเปลี่ยนแปลงทุกครั้งบันทึกในประวัติการแก้ไข</p>
      </section>
    </>
  );
}
