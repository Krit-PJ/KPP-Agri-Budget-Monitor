/** ป้องกัน spreadsheet formula injection และสร้าง CSV อย่างปลอดภัย */

const DANGEROUS_LEAD = /^[=+\-@\t\r]/;

/**
 * Escape ค่าข้อความก่อนเขียนลง Google Sheets / CSV
 * ค่าที่ขึ้นต้นด้วย = + - @ tab CR จะถูกเติม ' นำหน้า (Sheets เก็บเป็นข้อความ)
 * ไม่แตะตัวเลขชนิด number
 */
export function escapeCell(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  return DANGEROUS_LEAD.test(v) ? `'${v}` : v;
}

/** ถอด ' ที่ระบบเติมไว้ตอนอ่านกลับ */
export function unescapeCell(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  return v.length > 1 && v[0] === "'" && DANGEROUS_LEAD.test(v.slice(1)) ? v.slice(1) : v;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const line = (r: ReadonlyArray<unknown>) =>
    r
      .map((c) => {
        const s = String(escapeCell(c ?? '') ?? '');
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',');
  // BOM เพื่อให้ Excel เปิดภาษาไทยได้ถูกต้อง
  return '\ufeff' + rows.map(line).join('\r\n');
}

/** CSV/TSV parser (RFC 4180) — ตรวจ delimiter อัตโนมัติ */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^\ufeff/, '');
  const delim = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const candidates = [',', '\t', ';', '|'];
  let best = ',';
  let bestCount = 0;
  for (const c of candidates) {
    const n = sample.split(c).length;
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}
