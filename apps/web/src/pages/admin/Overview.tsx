import { Link } from 'react-router-dom';
import { formatThaiDateTime, RISK_LABEL, type SessionUser } from '@kpp/domain';
import { Async, auditLabel, Baht, BudgetStrip, useApi, useLookups } from '../../components/ui';

export default function Overview({ user }: { user: SessionUser }) {
  const l = useLookups();
  const s = useApi('admin.overview', { fiscalYear: l.currentFiscalYear });
  return (
    <>
      <h1>หน้าหลัก</h1>
      <Async s={s} lines={6}>
        {(d) => (
          <>
            <div className="panel" style={{ marginBottom: 'var(--s5)' }}>
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>
                งบปี {l.currentFiscalYear} {user.workgroupIds === null ? 'ทั้งสำนักงาน' : 'ในกลุ่มงานของคุณ'}: <Baht v={d.totals.currentBudget} short /> บาท
              </h2>
              <BudgetStrip b={d.totals} />
            </div>
            <div className="grid grid-2">
              <section className="panel" aria-labelledby="todo">
                <h2 id="todo" style={{ fontSize: 'var(--fs-lg)' }}>รอดำเนินการ</h2>
                <ul className="row-list">
                  {d.unassignedPlan.items > 0 && (
                    <li>
                      <Link to="/admin/plans">กิจกรรมย่อยในแผนปี {l.currentFiscalYear} ยังไม่มีกลุ่มงานรับผิดชอบ {d.unassignedPlan.items} รายการ</Link>
                      <div className="xs muted">งบ <Baht v={d.unassignedPlan.satang} short /> บาท ยังเบิกจ่ายไม่ได้จนกว่าจะมีผู้รับผิดชอบ</div>
                    </li>
                  )}
                  {d.pendingRequests > 0 && <li><Link to="/admin/users">คำขอสิทธิ์ใช้งาน {d.pendingRequests} รายการ</Link> รอการอนุมัติ</li>}
                  {d.stagedImports.map((j) => (
                    <li key={j.id}>
                      <Link to={`/admin/import?job=${j.id}`}>{j.fileName}</Link> รอยืนยันการนำเข้า
                      <div className="xs muted">
                        {j.channel === 'INBOX' ? 'จากโฟลเดอร์ Inbox ใน Drive' : 'อัปโหลดจากหน้าเว็บ'} เมื่อ {formatThaiDateTime(j.createdAt)}
                        {j.errorRows > 0 && `, ผิดพลาด ${j.errorRows} แถว`}
                      </div>
                    </li>
                  ))}
                  {user.role !== 'admin' && d.newDeviceLogins > 0 && (
                    <li><Link to="/admin/users">มีการเข้าสู่ระบบจากอุปกรณ์ใหม่ {d.newDeviceLogins} ครั้ง</Link> ใน 24 ชั่วโมง ตรวจสอบว่าเป็นเจ้าของบัญชีจริง</li>
                  )}
                  {user.role !== 'admin' && d.failedLogins24h >= 10 && (
                    <li style={{ color: 'var(--clay)' }}>เข้าสู่ระบบไม่สำเร็จ {d.failedLogins24h} ครั้งใน 24 ชั่วโมง อาจมีการสุ่มเบอร์โทร</li>
                  )}
                  {!d.pendingRequests && !d.stagedImports.length && !d.unassignedPlan.items && <li className="muted">ไม่มีงานค้าง</li>}
                </ul>
              </section>
              <section className="panel" aria-labelledby="risks">
                <h2 id="risks" style={{ fontSize: 'var(--fs-lg)' }}>โครงการที่ต้องติดตาม</h2>
                <ul className="row-list">
                  {d.risks.map((r) => (
                    <li key={r.projectId}>
                      <Link to={`/admin/projects/${r.projectId}`}>{r.name}</Link>
                      <div className="small" style={{ color: 'var(--clay)' }}>{r.flags.map((f) => RISK_LABEL[f]).join(', ')}</div>
                    </li>
                  ))}
                  {!d.risks.length && <li className="muted">ทุกโครงการเป็นไปตามแผน</li>}
                </ul>
              </section>
            </div>
            <section className="section">
              <h2 style={{ fontSize: 'var(--fs-lg)' }}>รายการล่าสุด{user.role === 'admin' ? 'ของคุณ' : ''}</h2>
              <ul className="row-list panel">
                {d.recentAudit.map((a) => (
                  <li key={a.id} className="small">{formatThaiDateTime(a.at)} {a.actorName} {auditLabel(a.action)}</li>
                ))}
                {!d.recentAudit.length && <li className="muted small">ยังไม่มีรายการ</li>}
              </ul>
            </section>
          </>
        )}
      </Async>
    </>
  );
}
