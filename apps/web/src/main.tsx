import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { currentFiscalYear } from '@kpp/domain';
import App, { applyTextSize } from './App';
import { getSession, prefetch } from './api/client';
import './styles.css';

/**
 * เริ่มดึงข้อมูลของหน้าแรกที่เปิดพร้อมกับข้อมูลหลัก (lookups) ก่อน React แสดงผล
 * คำขอทั้งสองรวมเป็นคำขอเดียวโดยอัตโนมัติ — body ต้องตรงกับที่หน้านั้นเรียก จึงใช้ cache ร่วมกันได้
 */
function prefetchForRoute(): void {
  const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0];
  const fiscalYear = currentFiscalYear(new Date());
  prefetch('public.lookups', {});
  if (path === '/') prefetch('public.summary', { fiscalYear });
  else if (path === '/projects') prefetch('public.projects', { fiscalYear });
  else if (/^\/projects\/[\w-]+$/.test(path)) prefetch('public.project', { id: path.split('/')[2] });
  else if (path.startsWith('/admin') && getSession()) {
    void import('./pages/admin/Layout');
    if (path === '/admin' || path === '/admin/') prefetch('admin.overview', { fiscalYear });
    else if (path === '/admin/plans') prefetch('plans.list', { fiscalYear });
    else if (path === '/admin/projects') prefetch('projects.list', { fiscalYear });
  }
}
prefetchForRoute();

// ใช้ขนาดตัวอักษรที่ผู้ชมเลือกไว้ก่อนแสดงผล (ไม่กระพริบ)
applyTextSize();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
