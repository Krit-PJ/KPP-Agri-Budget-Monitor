import { useEffect, useState } from 'react';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { SessionUser } from '@kpp/domain';
import { DEMO, getSession } from './api/client';
import { Async, LookupProvider, ToastProvider, useApi } from './components/ui';
import PublicHome from './pages/public/Home';
import PublicProjects from './pages/public/Projects';
import PublicProject from './pages/public/Project';
import About from './pages/public/About';
import Login from './pages/Login';
import AdminLayout from './pages/admin/Layout';

function useSessionUser(): SessionUser | null {
  const [u, setU] = useState(() => getSession()?.user ?? null);
  useEffect(() => {
    const on = () => setU(getSession()?.user ?? null);
    window.addEventListener('kpp-auth', on);
    return () => window.removeEventListener('kpp-auth', on);
  }, []);
  return u;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2a6249" />
      <rect x="6" y="19" width="20" height="5" rx="1.5" fill="#F2F5F1" opacity=".35" />
      <rect x="6" y="19" width="12" height="5" rx="1.5" fill="#8BC34A" />
      <path d="M16 6c3 2 4 5 3 9-3-1-4-4-3-9zM16 8c-3 2-4 4-3 7 3-1 4-3 3-7z" fill="#C9A227" />
    </svg>
  );
}

function Shell() {
  const user = useSessionUser();
  const lookups = useApi('public.lookups', {});
  return (
    <>
      <a href="#main" className="skip">ข้ามไปยังเนื้อหา</a>
      {DEMO && <div className="demo-band">โหมดสาธิต — ข้อมูลจำลองในเบราว์เซอร์นี้เท่านั้น ยังไม่เชื่อมต่อ Google Sheets</div>}
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <Mark />
            <span>
              <span className="brand-name">ติดตามโครงการและการเบิกจ่ายงบประมาณ</span><br />
              <span className="brand-sub">สำนักงานเกษตรจังหวัดกำแพงเพชร</span>
            </span>
          </Link>
          <nav className="nav" aria-label="เมนูหลัก">
            <NavLink to="/" end>ภาพรวม</NavLink>
            <NavLink to="/projects">โครงการ</NavLink>
            <NavLink to="/about">เกี่ยวกับข้อมูล</NavLink>
            {user ? <NavLink to="/admin">จัดการข้อมูล</NavLink> : <NavLink to="/login">เข้าสู่ระบบเจ้าหน้าที่</NavLink>}
          </nav>
        </div>
      </header>
      <main id="main">
        <Async s={lookups} lines={6}>
          {(l) => (
            <LookupProvider value={l}>
              <Routes>
                <Route path="/" element={<PublicHome />} />
                <Route path="/projects" element={<PublicProjects />} />
                <Route path="/projects/:id" element={<PublicProject />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={user ? <Navigate to="/admin" replace /> : <Login />} />
                <Route path="/admin/*" element={user ? <AdminLayout user={user} /> : <Navigate to="/login" replace />} />
                <Route path="*" element={<p>ไม่พบหน้าที่ต้องการ <Link to="/">กลับหน้าแรก</Link></p>} />
              </Routes>
            </LookupProvider>
          )}
        </Async>
      </main>
      <footer>
        <p>สำนักงานเกษตรจังหวัดกำแพงเพชร</p>
        <p>ข้อมูลในระบบนี้ใช้ติดตามและบริหารงานภายใน ยอดเบิกจ่ายทางการให้อ้างอิงระบบ New GFMIS Thai</p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollTop />
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </HashRouter>
  );
}
