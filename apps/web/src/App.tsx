import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Link, MemoryRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';

// build แบบฝังในหน้าอื่น (VITE_ROUTER=memory) ใช้ MemoryRouter เพราะเจ้าของหน้าไม่อนุญาต #/path
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : HashRouter;
import { formatThaiDate, type SessionUser, type VisitCount } from '@kpp/domain';
import { call, DEMO, getSession } from './api/client';
import { Async, Loading, LookupProvider, ToastProvider, useApi } from './components/ui';
import PublicHome from './pages/public/Home';
import PublicProjects from './pages/public/Projects';
import PublicProject from './pages/public/Project';
import About from './pages/public/About';

// ส่วนเจ้าหน้าที่แยกไฟล์: ผู้เข้าชมทั่วไปไม่ต้องดาวน์โหลดโค้ดส่วนจัดการ
const Login = lazy(() => import('./pages/Login'));
const AdminLayout = lazy(() => import('./pages/admin/Layout'));
const Reports = lazy(() => import('./pages/admin/Reports'));

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

/** ตรากรมส่งเสริมการเกษตร + ตราจังหวัดกำแพงเพชร (พื้นขาววงกลม ให้เห็นชัดบนแถบสีเขียว) */
function Logos() {
  const base = import.meta.env.BASE_URL;
  return (
    <span className="brand-logos" aria-hidden="true">
      <img src={`${base}logo-doae.png`} alt="" width={44} height={44} />
      <img src={`${base}logo-kpp.png`} alt="" width={44} height={44} />
    </span>
  );
}

/** ตัวนับผู้เข้าชม: นับครั้งแรกที่เปิดเว็บในแท็บนี้ หน้าอื่นอ่านอย่างเดียว */
function useVisits(): VisitCount | null {
  const [v, setV] = useState<VisitCount | null>(null);
  useEffect(() => {
    let first = true;
    try {
      first = !sessionStorage.getItem('kpp:visited');
      sessionStorage.setItem('kpp:visited', '1');
    } catch { /* โหมดส่วนตัวบางเบราว์เซอร์ */ }
    // หน่วงเล็กน้อย ไม่แย่งคิวกับการโหลดข้อมูลหน้าแรก
    const t = setTimeout(() => { call('public.hit', { count: first }).then(setV).catch(() => undefined); }, 1500);
    return () => clearTimeout(t);
  }, []);
  return v;
}

function SiteFooter() {
  const v = useVisits();
  const n = (x: number) => x.toLocaleString('th-TH');
  return (
    <footer className="site-foot">
      <div className="foot-main">
        <p className="foot-org">© 2569 สำนักงานเกษตรจังหวัดกำแพงเพชร กรมส่งเสริมการเกษตร</p>
        <p>พัฒนาโดย ดร.กิตติ โพธิ์จวง กลุ่มอารักขาพืช สำนักงานเกษตรจังหวัดกำแพงเพชร</p>
        <p className="foot-note">ข้อมูลในระบบนี้ใช้ติดตามและบริหารงานภายใน ยอดเบิกจ่ายทางการให้อ้างอิงระบบ New GFMIS Thai · <Link to="/about">เกี่ยวกับข้อมูล</Link></p>
      </div>
      <p className="foot-count" aria-live="polite">
        {v ? <>ผู้เข้าชมวันนี้ <b className="num">{n(v.today)}</b> ครั้ง · ทั้งหมด <b className="num">{n(v.total)}</b> ครั้ง<span className="foot-since"> ตั้งแต่ {formatThaiDate(v.since)}</span></> : <span className="muted">กำลังนับผู้เข้าชม…</span>}
      </p>
    </footer>
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
            <Logos />
            <span>
              <span className="brand-name">ติดตามโครงการและการเบิกจ่ายงบประมาณ</span><br />
              <span className="brand-sub">สำนักงานเกษตรจังหวัดกำแพงเพชร</span>
            </span>
          </Link>
          <nav className="nav" aria-label="เมนูหลัก">
            <NavLink to="/" end>ภาพรวม</NavLink>
            <NavLink to="/projects">ติดตามโครงการ</NavLink>
            <NavLink to="/report">พิมพ์รายงาน</NavLink>
            {user ? <NavLink to="/admin">จัดการข้อมูล</NavLink> : <NavLink to="/login">เข้าสู่ระบบเจ้าหน้าที่</NavLink>}
          </nav>
        </div>
      </header>
      <main id="main">
        <Async s={lookups} lines={6}>
          {(l) => (
            <LookupProvider value={l}>
              <Suspense fallback={<Loading lines={6} />}>
              <Routes>
                <Route path="/" element={<PublicHome />} />
                <Route path="/projects" element={<PublicProjects />} />
                <Route path="/projects/:id" element={<PublicProject />} />
                <Route path="/about" element={<About />} />
                <Route path="/report" element={<Reports user={user} publicMode={!user} />} />
                <Route path="/login" element={user ? <Navigate to="/admin" replace /> : <Login />} />
                <Route path="/admin/*" element={user ? <AdminLayout user={user} /> : <Navigate to="/login" replace />} />
                <Route path="*" element={<p>ไม่พบหน้าที่ต้องการ <Link to="/">กลับหน้าแรก</Link></p>} />
              </Routes>
              </Suspense>
            </LookupProvider>
          )}
        </Async>
      </main>
      <SiteFooter />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollTop />
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </Router>
  );
}
