import { useState } from 'react';
import { BUDGET_CODE_SECTION_NAME, normalizeKey, type BudgetCodeSection } from '@kpp/domain';
import { Async, useApi, useLookups } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';

/** ฐานข้อมูลรหัสงบประมาณ (20 หลัก) / รหัสกิจกรรมหลัก (17 หลัก) — ระบบใช้เติมบันทึกข้อความให้อัตโนมัติ */
export default function BudgetCodes() {
  const l = useLookups();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [q, setQ] = useState('');
  const s = useApi('budgetCodes.list', { fiscalYear: fy }, [fy]);
  const k = normalizeKey(q);
  return (
    <>
      <h1>รหัสงบประมาณและรหัสกิจกรรมหลัก</h1>
      <p className="muted">ตามเอกสาร NEW GFMIS THAI ของกรมส่งเสริมการเกษตร — เมื่อจัดทำบันทึกข้อความ ระบบเลือกรหัสให้ตามโครงการ/กิจกรรมและหมวดงบในแผนโดยอัตโนมัติ</p>
      <div className="toolbar" style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <FiscalYearPicker value={fy} onChange={setFy} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อกิจกรรม โครงการ หรือรหัส" aria-label="ค้นหารหัส" style={{ flex: '1 1 260px' }} />
      </div>
      <Async s={s} lines={8}>
        {(rows) => {
          const shown = rows.filter((r) => !k || normalizeKey(`${r.projectName} ${r.activityName} ${r.itemName} ${r.budgetCode} ${r.mainActivityCode}`).includes(k));
          if (!rows.length) return <p className="muted">ยังไม่มีรหัสของปีงบประมาณ {fy} — แจ้งผู้ดูแลระบบเพิ่มในตาราง BudgetCodes</p>;
          const sections = [...new Set(shown.map((r) => r.section))] as BudgetCodeSection[];
          return (
            <>
              <p className="xs muted">{shown.length} รายการ · แหล่งข้อมูล: {rows[0].source}</p>
              {sections.map((sec) => (
                <section key={sec} className="panel" style={{ marginBottom: 'var(--s4)' }}>
                  <h2 style={{ fontSize: 'var(--fs-lg)' }}>{BUDGET_CODE_SECTION_NAME[sec]}</h2>
                  <div className="table-wrap">
                    <table className="data stack">
                      <thead><tr><th>ลำดับ</th><th>โครงการ / กิจกรรม</th><th>รหัสงบประมาณ</th><th>รหัสกิจกรรมหลัก</th></tr></thead>
                      <tbody>
                        {shown.filter((r) => r.section === sec).map((r) => (
                          <tr key={r.id}>
                            <td data-label="ลำดับ">{r.activityNo}</td>
                            <td className="primary">
                              {r.activityName}
                              <div className="xs muted">{r.projectName}{r.itemName && ` · ${r.itemName}`}</div>
                            </td>
                            <td data-label="รหัสงบประมาณ" className="num">{r.budgetCode}</td>
                            <td data-label="รหัสกิจกรรมหลัก" className="num">{r.mainActivityCode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </>
          );
        }}
      </Async>
    </>
  );
}
