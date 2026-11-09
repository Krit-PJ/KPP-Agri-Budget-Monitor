import { useLookups } from './ui';

/** กลุ่มงานที่แสดงบนหน้าสาธารณะ (ไม่รวมกลุ่มที่ปิดการเผยแพร่ชั่วคราว) */
export function usePublicGroups() {
  const l = useLookups();
  const all = l.workgroups.filter((g) => !g.noActivities);
  return { shown: all.filter((g) => !g.hidePublic), total: all.length };
}

/**
 * แจ้งขอบเขตข้อมูลเมื่อบางกลุ่มยังไม่เผยแพร่ — กันผู้บริหารเข้าใจว่าเป็นตัวเลขทั้งจังหวัด
 * (แสดงทั้งบนจอและตอนพิมพ์)
 */
export function PublicScopeNote({ className = '' }: { className?: string }) {
  const { shown, total } = usePublicGroups();
  if (shown.length >= total) return null;
  return (
    <p className={`ov-banner scope-note ${className}`} role="note">
      ข้อมูลที่เผยแพร่: <b>{shown.map((g) => g.name).join(', ') || '—'}</b> ({shown.length} จาก {total} กลุ่มงาน)
      <span> — กลุ่มงานอื่นอยู่ระหว่างเตรียมข้อมูล ตัวเลขรวมจึงยังไม่ใช่ทั้งจังหวัด</span>
    </p>
  );
}

/** บรรทัดขอบเขตในหัวรายงานที่พิมพ์ */
export function PublicScopeLine() {
  const { shown, total } = usePublicGroups();
  if (shown.length >= total) return null;
  return <p className="small">เฉพาะกลุ่มงานที่เผยแพร่: {shown.map((g) => g.name).join(', ')} ({shown.length} จาก {total} กลุ่มงาน — ยังไม่ใช่ตัวเลขทั้งจังหวัด)</p>;
}
