import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { areaName, type SessionUser } from '@kpp/domain';
import { useApi, useLookups } from './ui';

/**
 * "กำลังทำงาน" — กลุ่มงาน + พื้นที่ดำเนินการ ที่ใช้ร่วมทุกหน้าของงานเจ้าหน้าที่ (ADR-010)
 * - ค่าเริ่มต้น: กลุ่มของผู้ใช้ (ถ้ามีกลุ่มเดียว) มิฉะนั้น ทุกกลุ่ม
 * - เปลี่ยนได้ทุกบทบาท: กลุ่มอื่น = ดูอย่างเดียว (server ตรวจสิทธิ์แก้ไขเสมอ)
 * - จำค่าตลอดการใช้งานในแท็บนี้ (sessionStorage ตามนโยบายไม่เก็บข้อมูลผู้ใช้ใน localStorage) และรับค่าจากลิงก์ ?wg=&wu=
 */
export interface WorkContext {
  /** กลุ่มงานที่เลือก ('' = ทุกกลุ่ม) */
  g: string;
  /** พื้นที่ดำเนินการที่เลือก ('' = ทุกพื้นที่) */
  u: string;
  setG: (g: string) => void;
  setU: (u: string) => void;
  /** กลุ่มที่ผู้ใช้แก้ไขได้ (null = ทุกกลุ่ม) */
  mine: string[] | null;
  canEdit: (workgroupId: string) => boolean;
  groupName: (id: string) => string;
  unitName: (id: string) => string;
  /** พื้นที่ที่กลุ่มที่เลือกมีงบ (ปีปัจจุบัน) */
  units: Array<{ id: string; name: string }>;
  /** ข้อความขอบเขต เช่น "กลุ่มอารักขาพืช · อำเภอไทรงาม" */
  label: string;
}

const Ctx = createContext<WorkContext | null>(null);

/** ใช้ได้นอกงานเจ้าหน้าที่ (หน้าสาธารณะ) — คืน null */
export function useWorkOptional(): WorkContext | null {
  return useContext(Ctx);
}

export function useWork(): WorkContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('WorkContextProvider missing');
  return c;
}

function readInitial(user: SessionUser): { g: string; u: string } {
  const sp = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const def = { g: user.workgroupIds?.length === 1 ? user.workgroupIds[0] : '', u: '' };
  let saved = def;
  try {
    const raw = sessionStorage.getItem(`kpp.work.${user.sub}`);
    if (raw) saved = { ...def, ...(JSON.parse(raw) as { g: string; u: string }) };
  } catch { /* storage ไม่พร้อม */ }
  return { g: sp.get('wg') ?? saved.g, u: sp.get('wu') ?? saved.u };
}

export function WorkContextProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const l = useLookups();
  const [state, setState] = useState(() => readInitial(user));
  const rep = useApi('reports.data', { fiscalYear: l.currentFiscalYear });
  useEffect(() => {
    try { sessionStorage.setItem(`kpp.work.${user.sub}`, JSON.stringify(state)); } catch { /* ไม่เป็นไร */ }
  }, [state, user.sub]);

  const value = useMemo<WorkContext>(() => {
    const groupName = (id: string) => l.workgroups.find((x) => x.id === id)?.name ?? '';
    const unitName = (id: string) => { const x = l.units.find((y) => y.id === id); return x ? areaName(x) : ''; };
    const withBudget = new Set((rep.data?.rows ?? []).filter((r) => r.budget > 0 && (!state.g || r.workgroupId === state.g)).map((r) => r.unitId));
    const units = l.units.filter((x) => withBudget.has(x.id)).map((x) => ({ id: x.id, name: x.kind === 'PROVINCE' ? 'ระดับจังหวัด' : `อำเภอ${areaName(x)}` }));
    const mine = user.workgroupIds;
    return {
      ...state,
      setG: (g) => setState({ g, u: '' }),
      setU: (u) => setState((s) => ({ ...s, u })),
      mine,
      canEdit: (id) => mine === null || mine.includes(id),
      groupName,
      unitName,
      units,
      label: [state.g ? groupName(state.g) : 'ทุกกลุ่มงาน', state.u ? units.find((x) => x.id === state.u)?.name ?? unitName(state.u) : ''].filter(Boolean).join(' · '),
    };
  }, [state, l, rep.data, user.workgroupIds]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** แถบ "กำลังทำงาน" ในเมนูซ้าย */
export function WorkContextBar() {
  const w = useWork();
  const l = useLookups();
  const groups = l.workgroups.filter((g) => !g.noActivities);
  const readOnly = !!w.g && !w.canEdit(w.g);
  return (
    <div className={`work-ctx ${readOnly ? 'is-ro' : ''}`} role="group" aria-label="กลุ่มงานและพื้นที่ที่กำลังทำงาน">
      <span className="work-ctx-h">กำลังทำงาน</span>
      <label className="field"><span className="sr-only">กลุ่มงาน</span>
        <select value={w.g} onChange={(e) => w.setG(e.target.value)}>
          <option value="">ทุกกลุ่มงาน</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{w.mine?.includes(g.id) ? ' (กลุ่มของฉัน)' : ''}</option>)}
        </select>
      </label>
      <label className="field"><span className="sr-only">พื้นที่ดำเนินการ</span>
        <select value={w.u} onChange={(e) => w.setU(e.target.value)}>
          <option value="">ทุกพื้นที่ดำเนินการ{w.units.length ? ` (${w.units.length})` : ''}</option>
          {w.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      {readOnly && <span className="xs work-ctx-ro">กลุ่มอื่น — ดูอย่างเดียว</span>}
      {w.mine && w.mine.length > 0 && w.g !== w.mine[0] && w.mine.length === 1 && (
        <button type="button" className="linklike xs" onClick={() => w.setG(w.mine![0])}>กลับไปกลุ่มของฉัน</button>
      )}
    </div>
  );
}
