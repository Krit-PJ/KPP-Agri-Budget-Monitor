import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import type { SessionUser } from '@kpp/domain';
import Overview from './Overview';
import ProjectsAdmin from './Projects';
import ProjectDetail from './ProjectDetail';
import RecordDisbursement from './RecordDisbursement';
import Reports from './Reports';
import Users from './Users';
import System from './System';
import Plans from './Plans';
import Targets from './Targets';
import Profile from './Profile';
import BudgetCodes from './BudgetCodes';
import Publishing from './Publishing';
import { useApi } from '../../components/ui';

const ROLE_LABEL: Record<SessionUser['role'], string> = { admin: 'Admin', minisuper: 'Mini Super Admin', superadmin: 'Super Admin' };

export default function AdminLayout({ user }: { user: SessionUser }) {
  const canManageUsers = user.role !== 'admin';
  const isSuper = user.role === 'superadmin';
  const prof = useApi('profile.get', {});
  return (
    <div className="admin-shell">
      <nav className="side" aria-label="เมนูเจ้าหน้าที่">
        <div className="who">
          <strong>{user.name}</strong>
          <div className="xs muted">{ROLE_LABEL[user.role]}</div>
          <div className="xs muted">{user.workgroupName}</div>
        </div>
        <p className="side-h">งานประจำ</p>
        <NavLink to="/admin/record">บันทึกผลการเบิกจ่าย</NavLink>
        <NavLink to="/admin/plans">บันทึกแผนงานและผู้รับผิดชอบ</NavLink>
        <NavLink to="/admin/profile">ข้อมูลของฉัน / หัวบันทึกข้อความ</NavLink>
        <NavLink to="/admin/codes">รหัสงบประมาณ</NavLink>
        <p className="side-h">ติดตามและรายงาน</p>
        <NavLink to="/admin" end>หน้าหลัก</NavLink>
        <NavLink to="/admin/reports">รายงาน</NavLink>
        <NavLink to="/admin/targets">เป้าหมายการเบิกจ่าย</NavLink>
        <NavLink to="/admin/projects">รายโครงการ</NavLink>
        {canManageUsers && (
          <>
            <p className="side-h">ผู้ดูแลระบบ</p>
            <NavLink to="/admin/users">ผู้ใช้งาน</NavLink>
            <NavLink to="/admin/publishing">การเผยแพร่ข้อมูลกลุ่มงาน</NavLink>
            {isSuper && <NavLink to="/admin/system">ตั้งค่าระบบ</NavLink>}
          </>
        )}
      </nav>
      <div style={{ minWidth: 0 }}>
        {prof.data && !prof.data.complete && (
          <p className="notice notice-warn profile-banner" role="status">
            กรุณากรอกคำนำหน้าชื่อและตำแหน่งแบบเต็ม เพื่อใช้ลงนามในบันทึกข้อความ — <Link to="/admin/profile">ไปที่ข้อมูลของฉัน</Link>
          </p>
        )}
        <Routes>
          <Route index element={<Overview user={user} />} />
          <Route path="plans" element={<Plans user={user} />} />
          <Route path="projects" element={<ProjectsAdmin user={user} />} />
          <Route path="projects/:id" element={<ProjectDetail user={user} />} />
          <Route path="record" element={<RecordDisbursement user={user} />} />
          <Route path="import" element={<Navigate to="/admin/record?tab=import" replace />} />
          <Route path="targets" element={<Targets user={user} />} />
          <Route path="reports" element={<Reports user={user} />} />
          <Route path="codes" element={<BudgetCodes />} />
          <Route path="profile" element={<Profile user={user} onProfileSaved={prof.reload} />} />
          {canManageUsers && <Route path="users" element={<Users user={user} />} />}
          {canManageUsers && <Route path="publishing" element={<Publishing />} />}
          {isSuper && <Route path="system" element={<System />} />}
          <Route path="*" element={<p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>} />
        </Routes>
      </div>
    </div>
  );
}
