import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import type { SessionUser } from '@kpp/domain';
import { call, clearSession } from '../../api/client';
import Overview from './Overview';
import ProjectsAdmin from './Projects';
import ProjectDetail from './ProjectDetail';
import ImportCenter from './ImportCenter';
import Users from './Users';
import System from './System';
import Plans from './Plans';

const ROLE_LABEL: Record<SessionUser['role'], string> = { admin: 'Admin', minisuper: 'Mini Super Admin', superadmin: 'Super Admin' };

export default function AdminLayout({ user }: { user: SessionUser }) {
  const nav = useNavigate();
  const canManageUsers = user.role !== 'admin';
  const isSuper = user.role === 'superadmin';
  const logout = async () => {
    try {
      await call('auth.logout', {});
    } catch { /* ออกจากระบบฝั่งเครื่องอยู่ดี */ }
    clearSession();
    nav('/');
  };
  return (
    <div className="admin-shell">
      <nav className="side" aria-label="เมนูผู้ดูแล">
        <div className="who">
          <strong>{user.name}</strong>
          <div className="xs muted">{ROLE_LABEL[user.role]}</div>
          <div className="xs muted">{user.workgroupName}</div>
        </div>
        <NavLink to="/admin" end>งานที่ต้องทำ</NavLink>
        <NavLink to="/admin/plans">แผนงบประมาณ</NavLink>
        <NavLink to="/admin/projects">โครงการและการเบิกจ่าย</NavLink>
        <NavLink to="/admin/import">นำเข้าผลการเบิกจ่าย</NavLink>
        {canManageUsers && <NavLink to="/admin/users">ผู้ใช้และสิทธิ์</NavLink>}
        {isSuper && <NavLink to="/admin/system">ตั้งค่าระบบ</NavLink>}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--s3)' }} onClick={() => void logout()}>ออกจากระบบ</button>
      </nav>
      <div style={{ minWidth: 0 }}>
        <Routes>
          <Route index element={<Overview user={user} />} />
          <Route path="plans" element={<Plans user={user} />} />
          <Route path="projects" element={<ProjectsAdmin user={user} />} />
          <Route path="projects/:id" element={<ProjectDetail user={user} />} />
          <Route path="import" element={<ImportCenter user={user} />} />
          {canManageUsers && <Route path="users" element={<Users user={user} />} />}
          {isSuper && <Route path="system" element={<System />} />}
          <Route path="*" element={<p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>} />
        </Routes>
      </div>
    </div>
  );
}
