import { useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { areaName, areaSummary, formatBaht, formatThaiDate, formatThaiDateTime, pct, toCsv, writeXlsx, type ReportRow, type SessionUser, type XlsxCell } from '@kpp/domain';
import { Async, useApi, useLookups, useNames } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';

/**
 * รายงาน (ภายใน): สร้างจากข้อมูลชุดเดียว (กิจกรรม × พื้นที่ดำเนินการ) แล้วแสดง/พิมพ์/ส่งออกด้วยตารางเดียวกัน
 * - PDF: ใช้คำสั่งพิมพ์ของเบราว์เซอร์ ("บันทึกเป็น PDF") เพื่อให้สระ/วรรณยุกต์ไทยถูกต้อง
 * - Excel: ตัวเลขเป็นตัวเลขจริง มีแถวรวม; CSV: สำหรับนำไปใช้ต่อ
 */

type Kind = 'exec' | 'group' | 'activity' | 'unit' | 'meeting';
const KINDS: Array<{ k: Kind; title: string }> = [
  { k: 'exec', title: 'รายงานสรุปผลการใช้จ่ายงบประมาณสำหรับผู้บริหาร' },
  { k: 'group', title: 'สรุปผลการเบิกจ่ายตามกลุ่มงาน' },
  { k: 'activity', title: 'ผลการเบิกจ่ายรายโครงการ กิจกรรม และพื้นที่ดำเนินการ' },
  { k: 'unit', title: 'ผลการเบิกจ่ายรายพื้นที่ดำเนินการ (จังหวัด/อำเภอ)' },
  { k: 'meeting', title: 'กิจกรรมอบรม/ประชุม/สัมมนาที่ยังเบิกจ่ายไม่ครบ (ต้องเสร็จภายในไตรมาส 3)' },
];

type ColKind = 'text' | 'money' | 'pct' | 'int';
interface Col { label: string; kind: ColKind; width: number }
interface Line { cells: Array<string | number>; level?: number; bold?: boolean }
interface Model { cols: Col[]; lines: Line[] }

const MONTHS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.'];
const baht = (s: number) => Math.round(s) / 100;

interface Agg { budget: number; plan: number; disbursed: number; committed: number; remaining: number; acts: Set<string>; qty: number }
function agg(rows: ReportRow[]): Agg {
  const a: Agg = { budget: 0, plan: 0, disbursed: 0, committed: 0, remaining: 0, acts: new Set(), qty: 0 };
  for (const r of rows) {
    a.budget += r.budget; a.plan += r.plan; a.disbursed += r.disbursed; a.committed += r.committed; a.remaining += r.remaining; a.qty += r.targetQty;
    if (r.activityId) a.acts.add(r.activityId);
  }
  return a;
}
const MONEY_COLS: Col[] = [
  { label: 'งบประมาณ (บาท)', kind: 'money', width: 15 },
  { label: 'แผน ณ เดือนนี้ (บาท)', kind: 'money', width: 15 },
  { label: 'เบิกจ่าย (บาท)', kind: 'money', width: 15 },
  { label: 'ร้อยละเบิกจ่าย', kind: 'pct', width: 9 },
  { label: 'ผูกพัน (บาท)', kind: 'money', width: 13 },
  { label: 'คงเหลือ (บาท)', kind: 'money', width: 15 },
  { label: 'ร้อยละคงเหลือ', kind: 'pct', width: 9 },
];
const moneyCells = (a: Agg) => [baht(a.budget), baht(a.plan), baht(a.disbursed), pct(a.disbursed, a.budget), baht(a.committed), baht(a.remaining), a.budget ? 100 - pct(a.disbursed, a.budget) : 0];

/** ประโยคสรุปเทียบแผน: เข้าใจได้โดยไม่ต้องดูตาราง */
function planSentence(a: Agg, m: number): string {
  if (!a.budget) return 'ยังไม่มีงบประมาณในเงื่อนไขนี้';
  if (!m) return 'ยังไม่ถึงช่วงเบิกจ่ายตามแผน';
  const planPct = pct(a.plan, a.budget);
  const actual = pct(a.disbursed, a.budget);
  const f = (v: number) => v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (a.disbursed >= a.plan) return `ผลการเบิกจ่ายร้อยละ ${f(actual)} เป็นไปตามแผนสะสมถึงสิ้นเดือน${MONTHS[m - 1]} (ร้อยละ ${f(planPct)})`;
  return `ผลการเบิกจ่ายร้อยละ ${f(actual)} ต่ำกว่าแผนสะสมถึงสิ้นเดือน${MONTHS[m - 1]} (ร้อยละ ${f(planPct)}) อยู่ ${f(planPct - actual)} จุด — ต้องเบิกเพิ่ม ${formatBaht(a.plan - a.disbursed)} บาท จึงจะทันแผน`;
}
/** หมายเหตุรายกลุ่ม: ใช้ข้อความ (ไม่พึ่งสี) เพื่อพิมพ์ขาวดำแล้วยังอ่านได้ */
function noteOf(a: Agg, m: number): string {
  if (!m || !a.budget) return '';
  return a.disbursed >= a.plan ? 'ตามแผน' : `▼ ต่ำกว่าแผน ${(pct(a.plan, a.budget) - pct(a.disbursed, a.budget)).toLocaleString('th-TH', { maximumFractionDigits: 1 })} จุด`;
}

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) (m.get(key(x)) ?? m.set(key(x), []).get(key(x))!).push(x);
  return m;
}

/** publicMode: ผู้ไม่ได้เข้าสู่ระบบ — เฉพาะรายงานสำหรับผู้บริหาร จากโครงการที่เผยแพร่ */
function ReportLogos() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="report-logos" aria-hidden="true">
      <img src={`${base}logo-doae.png`} alt="" width={64} height={64} />
      <img src={`${base}logo-kpp.png`} alt="" width={64} height={64} />
    </div>
  );
}

export default function Reports({ user, publicMode = false }: { user: SessionUser | null; publicMode?: boolean }) {
  const l = useLookups();
  const n = useNames();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [kind, setKind] = useState<Kind>('exec');
  const [showAreas, setShowAreas] = useState(false);
  const [fund, setFund] = useState('');
  const [sp] = useSearchParams();
  // ลิงก์จากหน้าภาพรวม: ?g=<กลุ่มงาน>&p=<โครงการ> → พิมพ์รายงานของที่เลือกไว้
  const [group, setGroup] = useState(sp.get('g') || (!publicMode && user?.workgroupIds?.length === 1 ? user.workgroupIds[0] : ''));
  const [project, setProject] = useState(sp.get('p') ?? '');
  const s = useApi((publicMode || !user ? 'public.report' : 'reports.data') as 'reports.data', { fiscalYear: fy }, [fy, publicMode]);
  const allGroups = publicMode || !user || user.workgroupIds === null;
  const groups = l.workgroups.filter((g) => !g.noActivities && (allGroups || user!.workgroupIds!.includes(g.id)));
  const kinds = publicMode ? KINDS.filter((x) => x.k === 'exec') : KINDS;
  const title = KINDS.find((x) => x.k === kind)!.title;

  const model = useMemo((): Model | null => {
    if (!s.data) return null;
    const unitName = (id: string) => areaName(l.units.find((u) => u.id === id));
    const unitOrder = (id: string) => l.units.findIndex((u) => u.id === id);
    const rows = s.data.rows.filter((r) => (!fund || r.fundingSourceId === fund) && (!group || r.workgroupId === group) && (!project || r.projectId === project));
    const total = (label: string, extra: Array<string | number> = []): Line => ({ cells: [label, ...extra, ...moneyCells(agg(rows))], bold: true });
    if (kind === 'exec') {
      // รายละเอียด: ลำดับ | โครงการ/กิจกรรม | กลุ่มที่รับผิดชอบ | พื้นที่ดำเนินการ | งบทั้งสิ้น | เบิกจ่ายแล้ว | คงเหลือ | ร้อยละ
      const ex = (a: Agg) => [baht(a.budget), baht(a.disbursed), baht(a.remaining), pct(a.disbursed, a.budget)];
      const lines: Line[] = [];
      let no = 0;
      const byProject = groupBy(rows, (r) => r.projectId);
      for (const [, pr] of [...byProject].sort((a, b) => a[1][0].projectCode.localeCompare(b[1][0].projectCode))) {
        const p = pr[0];
        lines.push({ cells: ['', p.projectName, n.group(p.workgroupId), '', ...ex(agg(pr))], level: 0, bold: true });
        for (const [, ar] of groupBy(pr, (r) => r.activityId)) {
          const a = ar[0];
          const area = areaSummary(ar.filter((r) => r.budget > 0 || r.disbursed > 0).map((r) => r.unitId), l.units, 3);
          lines.push({ cells: [++no, a.activityName, n.group(a.workgroupId), area, ...ex(agg(ar))], level: 1 });
          if (showAreas && ar.length > 1) {
            for (const r of [...ar].sort((x, y) => unitOrder(x.unitId) - unitOrder(y.unitId))) {
              lines.push({ cells: ['', unitName(r.unitId), '', r.targetQty ? `${r.targetQty.toLocaleString('th-TH')} ${r.unit}` : '', ...ex(agg([r]))], level: 2 });
            }
          }
        }
      }
      lines.push({ cells: ['', 'รวมทั้งสิ้น', '', '', ...ex(agg(rows))], bold: true });
      return {
        cols: [
          { label: 'ลำดับ', kind: 'int', width: 6 }, { label: 'โครงการ / กิจกรรม', kind: 'text', width: 52 }, { label: 'กลุ่มที่รับผิดชอบ', kind: 'text', width: 24 },
          { label: 'พื้นที่ดำเนินการ', kind: 'text', width: 24 }, { label: 'งบประมาณทั้งสิ้น (บาท)', kind: 'money', width: 16 },
          { label: 'เบิกจ่ายแล้ว (บาท)', kind: 'money', width: 16 }, { label: 'คงเหลือ (บาท)', kind: 'money', width: 16 }, { label: 'ร้อยละเบิกจ่าย', kind: 'pct', width: 10 },
        ],
        lines,
      };
    }
    if (kind === 'group') {
      const by = groupBy(rows, (r) => r.workgroupId);
      return {
        cols: [{ label: 'กลุ่มงาน', kind: 'text', width: 36 }, { label: 'กิจกรรม', kind: 'int', width: 8 }, ...MONEY_COLS],
        lines: [...l.workgroups.filter((g) => by.has(g.id)).map((g) => { const a = agg(by.get(g.id)!); return { cells: [g.name, a.acts.size, ...moneyCells(a)] }; }),
          total('รวมทั้งสิ้น', [agg(rows).acts.size])],
      };
    }
    if (kind === 'unit') {
      const by = groupBy(rows, (r) => r.unitId);
      return {
        cols: [{ label: 'พื้นที่ดำเนินการ', kind: 'text', width: 30 }, { label: 'กิจกรรม', kind: 'int', width: 8 }, ...MONEY_COLS],
        lines: [...[...by.keys()].sort((a, b) => unitOrder(a) - unitOrder(b)).map((u) => { const a = agg(by.get(u)!); return { cells: [unitName(u), a.acts.size, ...moneyCells(a)] }; }),
          total('รวมทั้งสิ้น', [agg(rows).acts.size])],
      };
    }
    if (kind === 'meeting') {
      const list = rows.filter((r) => r.isMeeting && r.remaining > 0);
      const by = groupBy(list, (r) => r.workgroupId);
      const lines: Line[] = [];
      for (const g of l.workgroups.filter((x) => by.has(x.id))) {
        lines.push({ cells: [g.name, '', ''], level: 0, bold: true });
        for (const r of by.get(g.id)!) {
          lines.push({ cells: [`${r.activityCode} ${r.activityName}`, unitName(r.unitId), r.targetQty ? `${r.targetQty.toLocaleString('th-TH')} ${r.unit}` : '', ...moneyCells(agg([r]))], level: 1 });
        }
      }
      return {
        cols: [{ label: 'กิจกรรม', kind: 'text', width: 50 }, { label: 'พื้นที่ดำเนินการ', kind: 'text', width: 16 }, { label: 'เป้าหมาย', kind: 'text', width: 12 }, ...MONEY_COLS],
        lines: [...lines.map((x) => (x.bold ? { ...x, cells: [...x.cells, '', '', '', '', '', '', ''] } : x)), { cells: ['รวมทั้งสิ้น', '', '', ...moneyCells(agg(list))], bold: true }],
      };
    }
    // activity: โครงการ › กิจกรรม › หน่วย
    const lines: Line[] = [];
    const byProject = groupBy(rows, (r) => r.projectId);
    for (const [, pr] of [...byProject].sort((a, b) => a[1][0].projectCode.localeCompare(b[1][0].projectCode))) {
      const p = pr[0];
      lines.push({ cells: [`${p.projectCode} ${p.projectName}`, n.group(p.workgroupId), '', ...moneyCells(agg(pr))], level: 0, bold: true });
      for (const [, ar] of groupBy(pr, (r) => r.activityId)) {
        const a = ar[0];
        const target = a.unit ? `${agg(ar).qty.toLocaleString('th-TH')} ${a.unit}` : '';
        if (ar.length === 1) {
          lines.push({ cells: [`${a.activityCode} ${a.activityName}`, unitName(a.unitId), target, ...moneyCells(agg(ar))], level: 1 });
        } else {
          lines.push({ cells: [`${a.activityCode} ${a.activityName}`, `${ar.length} พื้นที่`, target, ...moneyCells(agg(ar))], level: 1 });
          for (const r of ar.sort((x, y) => unitOrder(x.unitId) - unitOrder(y.unitId))) {
            lines.push({ cells: [unitName(r.unitId), '', r.targetQty ? `${r.targetQty.toLocaleString('th-TH')} ${r.unit}` : '', ...moneyCells(agg([r]))], level: 2 });
          }
        }
      }
    }
    lines.push({ cells: ['รวมทั้งสิ้น', '', '', ...moneyCells(agg(rows))], bold: true });
    return {
      cols: [{ label: 'โครงการ / กิจกรรม / พื้นที่ดำเนินการ', kind: 'text', width: 55 }, { label: 'ผู้รับผิดชอบ', kind: 'text', width: 22 }, { label: 'เป้าหมาย', kind: 'text', width: 12 }, ...MONEY_COLS],
      lines,
    };
  }, [s.data, kind, fund, group, project, l, n, showAreas]);

  const projectName = project ? s.data?.rows.find((r) => r.projectId === project)?.projectName ?? '' : '';
  const scope = [fund ? n.fund(fund) : 'ทุกแหล่งงบ', group ? n.group(group) : 'ทุกกลุ่มงาน', ...(projectName ? [projectName] : [])].join(' / ');
  const projectOptions = [...new Map((s.data?.rows ?? []).filter((r) => !group || r.workgroupId === group).map((r) => [r.projectId, r.projectName])).entries()];
  const execRows = (s.data?.rows ?? []).filter((r) => (!fund || r.fundingSourceId === fund) && (!group || r.workgroupId === group) && (!project || r.projectId === project));
  const execGroups = l.workgroups.filter((g) => !g.noActivities).map((g) => ({ g, a: agg(execRows.filter((r) => r.workgroupId === g.id)) })).filter((x) => x.a.budget > 0);
  const execTotal = agg(execRows);
  const m = s.data?.monthIndex ?? 0;
  const asOf = s.data ? `ข้อมูล ณ ${formatThaiDateTime(s.data.generatedAt)}${m ? ` (แผนสะสมถึงสิ้นเดือน ${MONTHS[m - 1]})` : ''}` : '';
  const fileBase = `รายงาน-${KINDS.findIndex((x) => x.k === kind) + 1}-ปี${fy}`;

  const download = (bytes: Uint8Array | string, name: string, type: string) => {
    const blob = new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const toExcel = (md: Model) => {
    if (kind === 'exec') return toExcelExec(md);
    const w = md.cols.length;
    const last = String.fromCharCode(64 + w);
    const fmt = (k: ColKind): 'money' | 'pct' | 'int' | undefined => (k === 'text' ? undefined : k);
    const rows: XlsxCell[][] = [
      [{ v: l.organizations[0]?.name ?? 'สำนักงานเกษตรจังหวัดกำแพงเพชร', s: 't' }],
      [{ v: `${title} ปีงบประมาณ พ.ศ. ${fy}`, s: 'b' }],
      [`${scope} — ${asOf}`],
      md.cols.map((c) => ({ v: c.label, s: 'h' as const })),
      ...md.lines.map((ln) => ln.cells.map((v, i) => ({
        v: i === 0 && ln.level ? `${'    '.repeat(ln.level)}${v}` : v,
        s: ln.bold ? ('b' as const) : undefined, fmt: fmt(md.cols[i]?.kind ?? 'text'),
      }))),
      [],
      ['หมายเหตุ: ยอดเบิกจ่ายทางการให้อ้างอิงระบบ New GFMIS Thai'],
    ];
    download(writeXlsx([{ name: KINDS.find((x) => x.k === kind)!.title.slice(0, 31), rows, widths: md.cols.map((c) => c.width), merges: [`A1:${last}1`, `A2:${last}2`, `A3:${last}3`], freezeRow: 4 }]),
      `${fileBase}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  const toExcelExec = (md: Model) => {
    const org = l.organizations[0]?.name ?? 'สำนักงานเกษตรจังหวัดกำแพงเพชร';
    const sum: XlsxCell[][] = [
      [{ v: org, s: 't' }],
      [{ v: `${title} ปีงบประมาณ พ.ศ. ${fy}`, s: 'b' }],
      [`${scope} — ${asOf}`],
      [],
      [{ v: 'งบประมาณทั้งสิ้น (บาท)', s: 'h' }, { v: 'เบิกจ่ายแล้ว (บาท)', s: 'h' }, { v: 'คงเหลือ (บาท)', s: 'h' }, { v: 'ร้อยละเบิกจ่าย', s: 'h' }],
      [{ v: baht(execTotal.budget), s: 'b', fmt: 'money' }, { v: baht(execTotal.disbursed), s: 'b', fmt: 'money' }, { v: baht(execTotal.remaining), s: 'b', fmt: 'money' }, { v: pct(execTotal.disbursed, execTotal.budget), s: 'b', fmt: 'pct' }],
      [planSentence(execTotal, m)],
      [],
      ['ลำดับ', 'กลุ่มงาน', 'งบประมาณทั้งสิ้น (บาท)', 'เบิกจ่ายแล้ว (บาท)', 'คงเหลือ (บาท)', 'ร้อยละ', 'หมายเหตุ'].map((v) => ({ v, s: 'h' as const })),
      ...execGroups.map(({ g, a }, i) => [i + 1, g.name, { v: baht(a.budget), fmt: 'money' as const }, { v: baht(a.disbursed), fmt: 'money' as const }, { v: baht(a.remaining), fmt: 'money' as const }, { v: pct(a.disbursed, a.budget), fmt: 'pct' as const }, noteOf(a, m)]),
      [{ v: '', s: 'b' }, { v: 'รวมทั้งสิ้น', s: 'b' }, { v: baht(execTotal.budget), s: 'b', fmt: 'money' }, { v: baht(execTotal.disbursed), s: 'b', fmt: 'money' }, { v: baht(execTotal.remaining), s: 'b', fmt: 'money' }, { v: pct(execTotal.disbursed, execTotal.budget), s: 'b', fmt: 'pct' }, ''],
    ];
    const fmt = (k: ColKind): 'money' | 'pct' | 'int' | undefined => (k === 'text' ? undefined : k);
    const detail: XlsxCell[][] = [
      md.cols.map((c) => ({ v: c.label, s: 'h' as const })),
      ...md.lines.map((ln) => ln.cells.map((v, i) => ({ v: i === 1 && ln.level === 2 ? `      ${v}` : v, s: ln.bold ? ('b' as const) : undefined, fmt: fmt(md.cols[i]?.kind ?? 'text') }))),
    ];
    download(writeXlsx([
      { name: 'สรุปสำหรับผู้บริหาร', rows: sum, widths: [24, 40, 20, 20, 18, 10, 18], merges: ['A1:G1', 'A2:G2', 'A3:G3', 'A7:G7'], landscape: false },
      { name: 'รายละเอียด', rows: detail, widths: md.cols.map((c) => c.width), freezeRow: 1 },
    ]), `${fileBase}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  const toCsvFile = (md: Model) => download('﻿' + toCsv([md.cols.map((c) => c.label), ...md.lines.map((ln) => ln.cells.map(String))]), `${fileBase}.csv`, 'text/csv;charset=utf-8');

  return (
    <>
      <div className="no-print">
        <h1>{publicMode ? 'พิมพ์รายงานสำหรับผู้บริหาร' : 'รายงาน'}</h1>
        {publicMode && <p className="small muted" style={{ marginTop: 0 }}>เลือกปีและเงื่อนไข แล้วกด &ldquo;พิมพ์ / บันทึกเป็น PDF&rdquo; รายงานอื่นของเจ้าหน้าที่ดูได้หลังเข้าสู่ระบบ</p>}
        <div className="toolbar">
          <FiscalYearPicker value={fy} onChange={setFy} />
          {kinds.length > 1 && (
            <label className="field"><span>รายงาน</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {kinds.map((x, i) => <option key={x.k} value={x.k}>{i + 1}. {x.title}</option>)}
              </select>
            </label>
          )}
          <label className="field"><span>แหล่งงบ</span>
            <select value={fund} onChange={(e) => setFund(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className="field"><span>กลุ่มงาน</span>
            <select value={group} onChange={(e) => { setGroup(e.target.value); setProject(''); }}>
              {(allGroups || groups.length > 1) && <option value="">ทั้งหมด</option>}
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label className="field"><span>โครงการ</span>
            <select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">ทุกโครงการ</option>
              {projectOptions.map(([id, name]) => <option key={id} value={id}>{name.length > 60 ? `${name.slice(0, 60)}…` : name}</option>)}
            </select>
          </label>
        </div>
        {kind === 'exec' && (
          <label className="field" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 'var(--s3)' }}>
            <input type="checkbox" checked={showAreas} onChange={(e) => setShowAreas(e.target.checked)} style={{ width: 20, minHeight: 20 }} />
            <span>แสดงรายอำเภอในหน้ารายละเอียด</span>
          </label>
        )}
        {model && (
          <div className="btn-row" style={{ marginBottom: 'var(--s4)' }}>
            <button className="btn" onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
            <button className="btn btn-ghost" onClick={() => toExcel(model)}>ดาวน์โหลด Excel</button>
            <button className="btn btn-ghost" onClick={() => toCsvFile(model)}>ดาวน์โหลด CSV</button>
            <span className="small muted">PDF: เลือกเครื่องพิมพ์ "บันทึกเป็น PDF" {kind === 'exec' ? '(หน้าสรุปพิมพ์แนวตั้ง หน้ารายละเอียดแนวนอน)' : 'และกระดาษ A4 แนวนอน'}</span>
          </div>
        )}
      </div>
      <Async s={s} lines={8}>
        {() => model && kind === 'exec' ? (
          <article className="report exec">
            <section className="exec-summary">
              <header className="report-head">
                <ReportLogos />
                <p className="report-org">{l.organizations[0]?.name ?? 'สำนักงานเกษตรจังหวัดกำแพงเพชร'}</p>
                <h2>{title}</h2>
                <p>ปีงบประมาณ พ.ศ. {fy} — {scope}</p>
                <p>{asOf}</p>
              </header>
              <div className="exec-kpis">
                <div><span>งบประมาณทั้งสิ้น</span><strong className="num">{formatBaht(execTotal.budget)}</strong><em>บาท</em></div>
                <div>
                  <span>เบิกจ่ายแล้ว</span><strong className="num">{formatBaht(execTotal.disbursed)}</strong><em>บาท</em>
                  {execTotal.committed > 0 && <small>มีผูกพันอีก {formatBaht(execTotal.committed)} บาท</small>}
                </div>
                <div><span>คงเหลือ</span><strong className="num">{formatBaht(execTotal.remaining)}</strong><em>บาท</em></div>
                <div className="exec-pct"><span>ร้อยละเบิกจ่าย</span><strong className="num">{pct(execTotal.disbursed, execTotal.budget).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><em>ของงบทั้งสิ้น</em></div>
              </div>
              <p className="exec-sentence">{planSentence(execTotal, m)}</p>
              <table className="report-table exec-table">
                <thead><tr><th>ลำดับ</th><th>กลุ่มงาน</th><th className="r">งบประมาณทั้งสิ้น (บาท)</th><th className="r">เบิกจ่ายแล้ว (บาท)</th><th className="r">คงเหลือ (บาท)</th><th className="r">ร้อยละ</th><th>หมายเหตุ</th></tr></thead>
                <tbody>
                  {execGroups.map(({ g, a }, i) => (
                    <tr key={g.id}>
                      <td className="r">{i + 1}</td><td>{g.name}</td>
                      <td className="r">{formatBaht(a.budget)}</td><td className="r">{formatBaht(a.disbursed)}</td><td className="r">{formatBaht(a.remaining)}</td>
                      <td className="r">{pct(a.disbursed, a.budget).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td>{noteOf(a, m)}</td>
                    </tr>
                  ))}
                  <tr className="is-bold">
                    <td /><td>รวมทั้งสิ้น</td><td className="r">{formatBaht(execTotal.budget)}</td><td className="r">{formatBaht(execTotal.disbursed)}</td><td className="r">{formatBaht(execTotal.remaining)}</td>
                    <td className="r">{pct(execTotal.disbursed, execTotal.budget).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td><td>{noteOf(execTotal, m)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="exec-foot">"เบิกจ่ายแล้ว" = อนุมัติเบิกและจ่ายแล้ว ไม่รวมยอดผูกพัน — ยอดเบิกจ่ายทางการให้อ้างอิงระบบ New GFMIS Thai</p>
            </section>
            <section className="exec-detail">
              <h2 className="exec-detail-title">รายละเอียดรายโครงการและกิจกรรม ปีงบประมาณ พ.ศ. {fy}</h2>
              <div className="report-scroll">
                <table className="report-table exec-table">
                  <thead><tr>{model.cols.map((c) => <th key={c.label} className={c.kind === 'text' ? '' : 'r'}>{c.label}</th>)}</tr></thead>
                  <tbody>
                    {model.lines.map((ln, i) => (
                      <tr key={i} className={`${ln.bold ? 'is-bold' : ''} lvl-${ln.level ?? 0}`}>
                        {ln.cells.map((v, k) => {
                          const c = model.cols[k];
                          const txt = typeof v === 'number' ? (c?.kind === 'money' ? formatBaht(Math.round(v * 100)) : c?.kind === 'pct' ? v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : v.toLocaleString('th-TH')) : v;
                          return <td key={k} className={c?.kind === 'text' ? '' : 'r'} style={k === 1 && ln.level === 2 ? { paddingLeft: '2em' } : undefined}>{txt}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="signatures">
                {['ผู้รายงาน', 'ผู้ตรวจสอบ'].map((r) => (
                  <div key={r} className="sig">
                    <p>ลงชื่อ ....................................................</p>
                    <p>( .................................................... )</p>
                    <p>ตำแหน่ง ................................................</p>
                    <p>{r}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        ) : model && (
          <article className="report">
            <header className="report-head">
              <ReportLogos />
              <p className="report-org">{l.organizations[0]?.name ?? 'สำนักงานเกษตรจังหวัดกำแพงเพชร'}</p>
              <h2>{title}</h2>
              <p>ปีงบประมาณ พ.ศ. {fy} — {scope}</p>
              <p className="small">{asOf}</p>
            </header>
            {model.lines.length <= 1 ? <p className="muted">ไม่มีข้อมูลตามเงื่อนไขนี้</p> : (
              <div className="report-scroll">
              <table className="report-table">
                <thead><tr>{model.cols.map((c) => <th key={c.label} className={c.kind === 'text' ? '' : 'r'}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {model.lines.map((ln, i) => (
                    <tr key={i} className={`${ln.bold ? 'is-bold' : ''} lvl-${ln.level ?? 0}`}>
                      {ln.cells.map((v, k) => {
                        const c = model.cols[k];
                        const txt = typeof v === 'number' ? (c?.kind === 'money' ? formatBaht(Math.round(v * 100)) : c?.kind === 'pct' ? v.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : v.toLocaleString('th-TH')) : v;
                        return <td key={k} className={c?.kind === 'text' ? '' : 'r'} style={k === 0 && ln.level ? { paddingLeft: `${0.5 + ln.level * 1.25}em` } : undefined}>{txt}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <footer className="report-foot">
              <p className="small">หมายเหตุ: ข้อมูลจากระบบติดตามโครงการและการเบิกจ่ายงบประมาณ ใช้ติดตามภายใน ยอดเบิกจ่ายทางการให้อ้างอิงระบบ New GFMIS Thai
                {kind !== 'group' && kind !== 'unit' ? '' : ' งบที่ยังไม่แบ่งให้อำเภอนับเป็นของสำนักงานเกษตรจังหวัด'}
                {kind === 'meeting' && ` ค่าใช้จ่ายฝึกอบรม ประชุม สัมมนา ต้องดำเนินการให้แล้วเสร็จภายใน ${formatThaiDate(`${fy - 543}-06-30`)} ตามมาตรการเร่งรัดการเบิกจ่ายงบประมาณ`}
              </p>
              <div className="signatures">
                {['ผู้รายงาน', 'ผู้ตรวจสอบ'].map((r) => (
                  <div key={r} className="sig">
                    <p>ลงชื่อ ....................................................</p>
                    <p>( .................................................... )</p>
                    <p>ตำแหน่ง ................................................</p>
                    <p className="small">{r}</p>
                  </div>
                ))}
              </div>
            </footer>
          </article>
        )}
      </Async>
    </>
  );
}
