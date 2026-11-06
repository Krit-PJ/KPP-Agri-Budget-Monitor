import { useMemo, useState } from 'react';
import { formatBaht, formatThaiDate, formatThaiDateTime, pct, toCsv, writeXlsx, type ReportRow, type SessionUser, type XlsxCell } from '@kpp/domain';
import { Async, useApi, useLookups, useNames } from '../../components/ui';
import { FiscalYearPicker } from '../public/Home';

/**
 * รายงาน (ภายใน): สร้างจากข้อมูลชุดเดียว (กิจกรรม × หน่วยดำเนินการ) แล้วแสดง/พิมพ์/ส่งออกด้วยตารางเดียวกัน
 * - PDF: ใช้คำสั่งพิมพ์ของเบราว์เซอร์ ("บันทึกเป็น PDF") เพื่อให้สระ/วรรณยุกต์ไทยถูกต้อง
 * - Excel: ตัวเลขเป็นตัวเลขจริง มีแถวรวม; CSV: สำหรับนำไปใช้ต่อ
 */

type Kind = 'group' | 'activity' | 'unit' | 'meeting';
const KINDS: Array<{ k: Kind; title: string }> = [
  { k: 'group', title: 'สรุปผลการเบิกจ่ายตามกลุ่มงาน' },
  { k: 'activity', title: 'ผลการเบิกจ่ายรายโครงการ กิจกรรม และหน่วยดำเนินการ' },
  { k: 'unit', title: 'ผลการเบิกจ่ายรายหน่วยดำเนินการ (จังหวัด/อำเภอ)' },
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

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) (m.get(key(x)) ?? m.set(key(x), []).get(key(x))!).push(x);
  return m;
}

export default function Reports({ user }: { user: SessionUser }) {
  const l = useLookups();
  const n = useNames();
  const [fy, setFy] = useState(l.currentFiscalYear);
  const [kind, setKind] = useState<Kind>('group');
  const [fund, setFund] = useState('');
  const [group, setGroup] = useState(user.workgroupIds?.length === 1 ? user.workgroupIds[0] : '');
  const s = useApi('reports.data', { fiscalYear: fy }, [fy]);
  const groups = l.workgroups.filter((g) => user.workgroupIds === null || user.workgroupIds.includes(g.id));
  const title = KINDS.find((x) => x.k === kind)!.title;

  const model = useMemo((): Model | null => {
    if (!s.data) return null;
    const unitName = (id: string) => l.units.find((u) => u.id === id)?.shortName ?? '–';
    const unitOrder = (id: string) => l.units.findIndex((u) => u.id === id);
    const rows = s.data.rows.filter((r) => (!fund || r.fundingSourceId === fund) && (!group || r.workgroupId === group));
    const total = (label: string, extra: Array<string | number> = []): Line => ({ cells: [label, ...extra, ...moneyCells(agg(rows))], bold: true });
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
        cols: [{ label: 'หน่วยดำเนินการ', kind: 'text', width: 30 }, { label: 'กิจกรรม', kind: 'int', width: 8 }, ...MONEY_COLS],
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
        cols: [{ label: 'กิจกรรม', kind: 'text', width: 50 }, { label: 'หน่วยดำเนินการ', kind: 'text', width: 16 }, { label: 'เป้าหมาย', kind: 'text', width: 12 }, ...MONEY_COLS],
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
          lines.push({ cells: [`${a.activityCode} ${a.activityName}`, `${ar.length} หน่วย`, target, ...moneyCells(agg(ar))], level: 1 });
          for (const r of ar.sort((x, y) => unitOrder(x.unitId) - unitOrder(y.unitId))) {
            lines.push({ cells: [unitName(r.unitId), '', r.targetQty ? `${r.targetQty.toLocaleString('th-TH')} ${r.unit}` : '', ...moneyCells(agg([r]))], level: 2 });
          }
        }
      }
    }
    lines.push({ cells: ['รวมทั้งสิ้น', '', '', ...moneyCells(agg(rows))], bold: true });
    return {
      cols: [{ label: 'โครงการ / กิจกรรม / หน่วยดำเนินการ', kind: 'text', width: 55 }, { label: 'ผู้รับผิดชอบ', kind: 'text', width: 22 }, { label: 'เป้าหมาย', kind: 'text', width: 12 }, ...MONEY_COLS],
      lines,
    };
  }, [s.data, kind, fund, group, l, n]);

  const scope = [fund ? n.fund(fund) : 'ทุกแหล่งงบ', group ? n.group(group) : 'ทุกกลุ่มงาน'].join(' / ');
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
  const toCsvFile = (md: Model) => download('﻿' + toCsv([md.cols.map((c) => c.label), ...md.lines.map((ln) => ln.cells.map(String))]), `${fileBase}.csv`, 'text/csv;charset=utf-8');

  return (
    <>
      <div className="no-print">
        <h1>รายงาน</h1>
        <div className="toolbar">
          <FiscalYearPicker value={fy} onChange={setFy} />
          <label className="field"><span>รายงาน</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KINDS.map((x, i) => <option key={x.k} value={x.k}>{i + 1}. {x.title}</option>)}
            </select>
          </label>
          <label className="field"><span>แหล่งงบ</span>
            <select value={fund} onChange={(e) => setFund(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {l.fundingSources.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className="field"><span>กลุ่มงาน</span>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {(user.workgroupIds === null || groups.length > 1) && <option value="">ทั้งหมด</option>}
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        </div>
        {model && (
          <div className="btn-row" style={{ marginBottom: 'var(--s4)' }}>
            <button className="btn" onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
            <button className="btn btn-ghost" onClick={() => toExcel(model)}>ดาวน์โหลด Excel</button>
            <button className="btn btn-ghost" onClick={() => toCsvFile(model)}>ดาวน์โหลด CSV</button>
            <span className="small muted">PDF: เลือกเครื่องพิมพ์ "บันทึกเป็น PDF" และกระดาษ A4 แนวนอน</span>
          </div>
        )}
      </div>
      <Async s={s} lines={8}>
        {() => model && (
          <article className="report">
            <header className="report-head">
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
