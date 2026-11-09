/* KPP Agri-Budget Monitor — Apps Script backend v0.1.0 (สร้างอัตโนมัติจาก apps/gas — ห้ามแก้ไขไฟล์นี้โดยตรง) */
"use strict";
var KPP = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/gas/main.ts
  var main_exports = {};
  __export(main_exports, {
    AppError: () => AppError,
    autoImportInbox: () => autoImportInbox,
    dailyMaintenance: () => dailyMaintenance,
    doGet: () => doGet,
    doPost: () => doPost,
    installTriggers: () => installTriggers,
    setSuperAdmin: () => setSuperAdmin2,
    setup: () => setup,
    testMemoRender: () => testMemoRender
  });

  // ../../packages/domain/src/thai.ts
  var THAI_DIGITS = "\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59";
  function thaiDigitsToArabic(input) {
    let out = "";
    for (const ch of input) {
      const i = THAI_DIGITS.indexOf(ch);
      out += i >= 0 ? String(i) : ch;
    }
    return out;
  }
  function normalizeKey(input) {
    return thaiDigitsToArabic(String(input ?? "")).normalize("NFC").toLowerCase().replace(/[\u200b-\u200d\ufeff]/g, "").replace(/[\s\-_.,:;()[\]{}/\\'"“”‘’*#|+]+/g, "");
  }
  function cleanText(input, maxLength = 500) {
    return String(input ?? "").normalize("NFC").replace(/[\u200b-\u200d\ufeff]/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }
  var THAI_MONTHS = [
    { full: "\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21", short: ["\u0E21.\u0E04.", "\u0E21\u0E04", "\u0E21.\u0E04"] },
    { full: "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C", short: ["\u0E01.\u0E1E.", "\u0E01\u0E1E", "\u0E01.\u0E1E"] },
    { full: "\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21", short: ["\u0E21\u0E35.\u0E04.", "\u0E21\u0E35\u0E04", "\u0E21\u0E35.\u0E04"] },
    { full: "\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19", short: ["\u0E40\u0E21.\u0E22.", "\u0E40\u0E21\u0E22", "\u0E40\u0E21.\u0E22"] },
    { full: "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21", short: ["\u0E1E.\u0E04.", "\u0E1E\u0E04", "\u0E1E.\u0E04"] },
    { full: "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19", short: ["\u0E21\u0E34.\u0E22.", "\u0E21\u0E34\u0E22", "\u0E21\u0E34.\u0E22"] },
    { full: "\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21", short: ["\u0E01.\u0E04.", "\u0E01\u0E04", "\u0E01.\u0E04"] },
    { full: "\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21", short: ["\u0E2A.\u0E04.", "\u0E2A\u0E04", "\u0E2A.\u0E04"] },
    { full: "\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19", short: ["\u0E01.\u0E22.", "\u0E01\u0E22", "\u0E01.\u0E22"] },
    { full: "\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21", short: ["\u0E15.\u0E04.", "\u0E15\u0E04", "\u0E15.\u0E04"] },
    { full: "\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19", short: ["\u0E1E.\u0E22.", "\u0E1E\u0E22", "\u0E1E.\u0E22"] },
    { full: "\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21", short: ["\u0E18.\u0E04.", "\u0E18\u0E04", "\u0E18.\u0E04"] }
  ];

  // ../../packages/domain/src/money.ts
  function bahtToSatang(baht) {
    if (!Number.isFinite(baht)) throw new Error("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const sign = baht < 0 ? -1 : 1;
    const abs = Number(Math.abs(baht).toFixed(6));
    return sign * Math.round(abs * 100 + 1e-9);
  }
  function parseMoney(input) {
    if (typeof input === "number") {
      return Number.isFinite(input) ? { ok: true, satang: bahtToSatang(input), empty: false } : { ok: false, satang: 0, empty: false };
    }
    let s = thaiDigitsToArabic(String(input ?? "")).trim();
    if (s === "" || s === "-" || s === "\u2013") return { ok: true, satang: 0, empty: true };
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    s = s.replace(/บาท|baht|thb|฿|\s/gi, "");
    if (s.startsWith("-")) {
      negative = !negative;
      s = s.slice(1);
    }
    if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(s)) return { ok: false, satang: 0, empty: false };
    const n = Number(s.replace(/,/g, ""));
    if (!Number.isFinite(n)) return { ok: false, satang: 0, empty: false };
    const satang = bahtToSatang(n);
    return { ok: true, satang: negative ? -satang : satang, empty: false };
  }
  var DIGIT_WORDS = {
    \u0E28\u0E39\u0E19\u0E22\u0E4C: 0,
    \u0E2B\u0E19\u0E36\u0E48\u0E07: 1,
    \u0E40\u0E2D\u0E47\u0E14: 1,
    \u0E2A\u0E2D\u0E07: 2,
    \u0E22\u0E35\u0E48: 2,
    \u0E2A\u0E32\u0E21: 3,
    \u0E2A\u0E35\u0E48: 4,
    \u0E2B\u0E49\u0E32: 5,
    \u0E2B\u0E01: 6,
    \u0E40\u0E08\u0E47\u0E14: 7,
    \u0E41\u0E1B\u0E14: 8,
    \u0E40\u0E01\u0E49\u0E32: 9
  };
  var UNIT_WORDS = { \u0E2A\u0E34\u0E1A: 10, \u0E23\u0E49\u0E2D\u0E22: 100, \u0E1E\u0E31\u0E19: 1e3, \u0E2B\u0E21\u0E37\u0E48\u0E19: 1e4, \u0E41\u0E2A\u0E19: 1e5 };
  function thaiWordsToInt(words) {
    const w = words.replace(/\s+/g, "");
    if (!w) return null;
    const millionIdx = w.lastIndexOf("\u0E25\u0E49\u0E32\u0E19");
    if (millionIdx >= 0) {
      const left = w.slice(0, millionIdx);
      const right = w.slice(millionIdx + 4);
      const l = left === "" ? 1 : thaiWordsToInt(left);
      const r3 = right === "" ? 0 : thaiWordsToInt(right);
      if (l === null || r3 === null) return null;
      return l * 1e6 + r3;
    }
    let total = 0;
    let pending = null;
    let i = 0;
    const keys = [...Object.keys(DIGIT_WORDS), ...Object.keys(UNIT_WORDS)].sort((a, b) => b.length - a.length);
    while (i < w.length) {
      const key = keys.find((k) => w.startsWith(k, i));
      if (!key) return null;
      i += key.length;
      if (key in DIGIT_WORDS) {
        if (pending !== null) return null;
        pending = DIGIT_WORDS[key];
      } else {
        const unit = UNIT_WORDS[key];
        total += (pending ?? 1) * unit;
        pending = null;
      }
    }
    if (pending !== null) total += pending;
    return total;
  }
  function parseThaiBahtText(text) {
    const t2 = text.replace(/[()\s]/g, "");
    const m = t2.match(/^(.*?)บาท(?:ถ้วน|(.*?)สตางค์)?$/);
    if (!m) return null;
    const baht = thaiWordsToInt(m[1]);
    if (baht === null) return null;
    const st = m[2] ? thaiWordsToInt(m[2]) : 0;
    if (st === null || st > 99) return null;
    return baht * 100 + st;
  }

  // ../../packages/domain/src/dates.ts
  var BE_OFFSET = 543;
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function isValidYmd(y, m, d) {
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function toIsoDate(y, m, d) {
    return isValidYmd(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }
  function normalizeYear(y) {
    if (!Number.isInteger(y)) return null;
    if (y >= 2400 && y <= 2700) return y - BE_OFFSET;
    if (y >= 1900 && y <= 2200) return y;
    if (y >= 0 && y < 100) return 2500 + y - BE_OFFSET;
    return null;
  }
  function excelSerialToIso(serial) {
    if (!Number.isFinite(serial) || serial < 1 || serial > 12e4) return null;
    const ms = Math.round((serial - 25569) * 86400 * 1e3);
    const d = new Date(ms);
    return toIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function monthFromThai(token) {
    const t2 = token.replace(/\s/g, "");
    for (let i = 0; i < THAI_MONTHS.length; i++) {
      const m = THAI_MONTHS[i];
      if (t2 === m.full || m.short.some((s) => t2 === s || t2 === s.replace(/\./g, ""))) return i + 1;
    }
    for (let i = 0; i < THAI_MONTHS.length; i++) {
      if (THAI_MONTHS[i].full.startsWith(t2) && t2.length >= 3) return i + 1;
    }
    return null;
  }
  function parseThaiDate(input) {
    if (input instanceof Date && !Number.isNaN(input.getTime())) {
      return toIsoDate(input.getFullYear(), input.getMonth() + 1, input.getDate());
    }
    if (typeof input === "number") return excelSerialToIso(input);
    const s = thaiDigitsToArabic(String(input ?? "")).trim().replace(/\s+/g, " ");
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
    if (m) {
      const y = normalizeYear(Number(m[1]));
      return y ? toIsoDate(y, Number(m[2]), Number(m[3])) : null;
    }
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (m) {
      const y = normalizeYear(Number(m[3]));
      return y ? toIsoDate(y, Number(m[2]), Number(m[1])) : null;
    }
    m = s.match(/^(?:วันที่\s*)?(\d{1,2})\s*([ก-๙.]+?)\s*(?:พ\.?ศ\.?\s*)?(\d{2}|\d{4})$/);
    if (m) {
      const month = monthFromThai(m[2]);
      const y = normalizeYear(Number(m[3]));
      return month && y ? toIsoDate(y, month, Number(m[1])) : null;
    }
    if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));
    return null;
  }
  function fiscalYearOf(iso) {
    const y = Number(iso.slice(0, 4));
    const m = Number(iso.slice(5, 7));
    return (m >= 10 ? y + 1 : y) + BE_OFFSET;
  }
  function fiscalYearRange(fyBe) {
    const ce = fyBe - BE_OFFSET;
    return { start: `${ce - 1}-10-01`, end: `${ce}-09-30` };
  }
  function fiscalMonthIndex(iso) {
    const m = Number(iso.slice(5, 7));
    return m >= 10 ? m - 9 : m + 3;
  }
  function currentFiscalYear(now = /* @__PURE__ */ new Date()) {
    const bkk = new Date(now.getTime() + 7 * 3600 * 1e3);
    return fiscalYearOf(toIsoDate(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, bkk.getUTCDate()));
  }
  function todayBangkok(now = /* @__PURE__ */ new Date()) {
    const bkk = new Date(now.getTime() + 7 * 3600 * 1e3);
    return toIsoDate(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, bkk.getUTCDate());
  }

  // ../../packages/domain/src/phone.ts
  function normalizePhone(v) {
    let s = thaiDigitsToArabic(String(v ?? "")).replace(/\D/g, "");
    if (s.startsWith("66") && s.length === 11) s = "0" + s.slice(2);
    if (s.length === 9 && s[0] !== "0") s = "0" + s;
    return s;
  }
  function isValidPhone(p) {
    return /^0[689]\d{8}$/.test(p) || /^0[2-7]\d{7}$/.test(p);
  }
  function maskPhone(p) {
    const n = normalizePhone(p);
    if (n.length < 9) return "xxx";
    return `${n.slice(0, 3)}-xxx-${n.slice(-4)}`;
  }

  // ../../packages/domain/src/sanitize.ts
  var DANGEROUS_LEAD = /^[=+\-@\t\r]/;
  function escapeCell(v) {
    if (typeof v !== "string") return v;
    return DANGEROUS_LEAD.test(v) ? `'${v}` : v;
  }
  function unescapeCell(v) {
    if (typeof v !== "string") return v;
    return v.length > 1 && v[0] === "'" && DANGEROUS_LEAD.test(v.slice(1)) ? v.slice(1) : v;
  }
  function toCsv(rows) {
    const line = (r3) => r3.map((c) => {
      const s = String(escapeCell(c ?? "") ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",");
    return "\uFEFF" + rows.map(line).join("\r\n");
  }
  function parseDelimited(text, delimiter) {
    const src = text.replace(/^\ufeff/, "");
    const delim = delimiter ?? detectDelimiter(src);
    const rows = [];
    let row = [];
    let field = "";
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
      } else if (ch === '"' && field === "") inQuotes = true;
      else if (ch === delim) {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && src[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else field += ch;
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r3) => r3.some((c) => c.trim() !== ""));
  }
  function detectDelimiter(text) {
    const sample = text.split(/\r?\n/).slice(0, 10).join("\n");
    const candidates = [",", "	", ";", "|"];
    let best = ",";
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

  // ../../packages/domain/src/types.ts
  var PROJECT_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  var ALLOCATION_TYPES = ["ORIGINAL", "TRANSFER_IN", "TRANSFER_OUT"];
  function areaName(u) {
    if (!u) return "\u2013";
    return u.kind === "PROVINCE" ? "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14" : u.shortName.replace(/^อ\./, "");
  }
  var AppError = class extends Error {
    constructor(code, message, details) {
      super(message);
      __publicField(this, "code", code);
      __publicField(this, "details", details);
      this.name = "AppError";
    }
  };

  // ../../packages/domain/src/budget.ts
  var EMPTY_SUMMARY = {
    originalBudget: 0,
    transferIn: 0,
    transferOut: 0,
    currentBudget: 0,
    committed: 0,
    disbursed: 0,
    paid: 0,
    remaining: 0,
    spendingPct: 0
  };
  function pct(part, whole) {
    if (whole <= 0) return 0;
    return Math.round(part / whole * 1e4) / 100;
  }
  function computeBudget(allocations, disbursements) {
    let originalBudget = 0, transferIn = 0, transferOut = 0, committed = 0, disbursed = 0, paid = 0;
    for (const a of allocations) {
      if (a.isDeleted) continue;
      if (a.type === "ORIGINAL") originalBudget += a.amountSatang;
      else if (a.type === "TRANSFER_IN") transferIn += a.amountSatang;
      else if (a.type === "TRANSFER_OUT") transferOut += a.amountSatang;
    }
    for (const d of disbursements) {
      if (d.isDeleted || d.status === "VOID") continue;
      if (d.status === "COMMITTED") committed += d.amountSatang;
      if (d.status === "APPROVED" || d.status === "PAID") disbursed += d.amountSatang;
      if (d.status === "PAID") paid += d.amountSatang;
    }
    const currentBudget = originalBudget + transferIn - transferOut;
    const remaining = currentBudget - disbursed;
    return {
      originalBudget,
      transferIn,
      transferOut,
      currentBudget,
      committed,
      disbursed,
      paid,
      remaining,
      spendingPct: pct(disbursed, currentBudget)
    };
  }
  function addSummaries(list) {
    const s = { ...EMPTY_SUMMARY };
    for (const x of list) {
      s.originalBudget += x.originalBudget;
      s.transferIn += x.transferIn;
      s.transferOut += x.transferOut;
      s.currentBudget += x.currentBudget;
      s.committed += x.committed;
      s.disbursed += x.disbursed;
      s.paid += x.paid;
      s.remaining += x.remaining;
    }
    s.spendingPct = pct(s.disbursed, s.currentBudget);
    return s;
  }
  function monthlyCumulative(disbursements, fiscalYear) {
    const { start, end } = fiscalYearRange(fiscalYear);
    const months = new Array(12).fill(0);
    for (const d of disbursements) {
      if (d.isDeleted || d.status !== "APPROVED" && d.status !== "PAID") continue;
      if (!d.date || d.date < start || d.date > end) continue;
      months[fiscalMonthIndex(d.date) - 1] += d.amountSatang;
    }
    for (let i = 1; i < 12; i++) months[i] += months[i - 1];
    return months;
  }
  function monthlyTargetPct(quarterTargets) {
    const q = parseQuarterTargets(quarterTargets);
    const out = [];
    let prev = 0;
    for (let i = 0; i < 4; i++) {
      for (let k = 1; k <= 3; k++) out.push(Math.round((prev + (q[i] - prev) * k / 3) * 100) / 100);
      prev = q[i];
    }
    return out;
  }
  var DEFAULT_QUARTER_TARGETS = "30,55,80,100";
  function parseQuarterTargets(s) {
    const parts = String(s || DEFAULT_QUARTER_TARGETS).split(",").map((x) => Number(x.trim()));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
      return parseQuarterTargets(DEFAULT_QUARTER_TARGETS);
    }
    return parts;
  }
  var MEETING_RE = /อบรม|ประชุม|สัมมนา|ถ่ายทอดความรู้|เวที|ศึกษาดูงาน|Field Day|Workshop/i;
  var r2 = (v) => Math.round(v * 100) / 100;
  function parseSpendTarget(json2, fallbackQuarters = DEFAULT_QUARTER_TARGETS) {
    const fq = [...parseQuarterTargets(fallbackQuarters)];
    if (fq[3] !== 100) fq[3] = 100;
    const base = { mode: "quarter", quarters: fq, months: [] };
    if (!json2) return base;
    try {
      const t2 = JSON.parse(json2);
      let out;
      if (t2.mode === "deadline") {
        const m = Math.min(12, Math.max(1, Number(t2.month) || 12));
        const pct2 = Math.min(100, Math.max(1, Number(t2.pct) || 100));
        out = { mode: "monthly", quarters: [], months: Array.from({ length: 12 }, (_, i) => i + 1 <= m ? Math.round(pct2 * (i + 1) / m) : Math.round(pct2 + (100 - pct2) * (i + 1 - m) / (12 - m))) };
      } else if (t2.mode === "monthly") {
        out = { mode: "monthly", quarters: [], months: Array.isArray(t2.months) ? t2.months.map(Number) : [] };
      } else {
        out = { mode: "quarter", quarters: Array.isArray(t2.quarters) ? t2.quarters.map(Number) : fq, months: [] };
      }
      return validateSpendTarget(out) ? base : out;
    } catch {
      return base;
    }
  }
  function validateSpendTarget(t2) {
    const check = (v, n, name) => {
      if (!Array.isArray(v) || v.length !== n || v.some((x) => !Number.isFinite(x))) return `\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E1B\u0E49\u0E32\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A ${n} \u0E0A\u0E48\u0E2D\u0E07`;
      for (let i = 0; i < n; i++) {
        if (v[i] < 0 || v[i] > 100) return `\u0E40\u0E1B\u0E49\u0E32${name(i)} \u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 0\u2013100%`;
        if (i > 0 && v[i] < v[i - 1]) return `\u0E40\u0E1B\u0E49\u0E32${name(i)} \u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32${name(i - 1)} (\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30\u0E2A\u0E30\u0E2A\u0E21)`;
      }
      if (v[n - 1] !== 100) return `\u0E40\u0E1B\u0E49\u0E32\u0E17\u0E31\u0E49\u0E07\u0E1B\u0E35\u0E04\u0E37\u0E2D 100% \u2014 ${name(n - 1)}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 100%`;
      return null;
    };
    if (t2.mode === "monthly") return check(t2.months, 12, (i) => `\u0E40\u0E14\u0E37\u0E2D\u0E19${FISCAL_MONTH_NAMES[i]}`);
    return check(t2.quarters, 4, (i) => `\u0E44\u0E15\u0E23\u0E21\u0E32\u0E2A ${i + 1}`);
  }
  var FISCAL_MONTH_NAMES = ["\u0E15.\u0E04.", "\u0E1E.\u0E22.", "\u0E18.\u0E04.", "\u0E21.\u0E04.", "\u0E01.\u0E1E.", "\u0E21\u0E35.\u0E04.", "\u0E40\u0E21.\u0E22.", "\u0E1E.\u0E04.", "\u0E21\u0E34.\u0E22.", "\u0E01.\u0E04.", "\u0E2A.\u0E04.", "\u0E01.\u0E22."];
  function targetCurve(t2) {
    if (t2.mode === "monthly") return t2.months.map(r2);
    return monthlyTargetPct(t2.quarters.join(","));
  }
  function fullMonthOf(curve) {
    const i = curve.findIndex((v) => v >= 100);
    return i < 0 ? 12 : i + 1;
  }
  function dueCurve(dueMonth) {
    return Array.from({ length: 12 }, (_, i) => r2(Math.min(1, (i + 1) / dueMonth) * 100));
  }
  function planAt(budget, curve, dueMonth, m) {
    if (m <= 0 || budget <= 0) return 0;
    const c = dueMonth > 0 ? dueCurve(dueMonth) : curve;
    return Math.round(budget * (c[Math.min(12, m) - 1] ?? 0) / 100);
  }
  function splitEqual(total, n, step = 1) {
    if (n <= 0) return [];
    const unit = step > 1 && total % step === 0 ? step : 1;
    const units = Math.round(total / unit);
    const base = Math.floor(units / n);
    const rest = units - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i < rest ? 1 : 0)) * unit);
  }
  var splitMoney = (total, n) => splitEqual(total, n, 100);
  function riskFlags(project, summary, today2 = todayBangkok(), curve) {
    const flags = [];
    if (summary.remaining < 0) flags.push("OVER_BUDGET");
    const active = project.status !== "COMPLETED" && project.status !== "CANCELLED";
    if (active && project.endDate && project.endDate < today2) flags.push("OVERDUE");
    const { start, end } = fiscalYearRange(project.fiscalYear);
    if (active && today2 >= start && today2 <= end && summary.currentBudget > 0) {
      const target = (curve ?? monthlyTargetPct(project.quarterTargets))[fiscalMonthIndex(today2) - 1];
      if (summary.spendingPct + 10 < target) flags.push("BEHIND_SPENDING");
    }
    if (active && project.startDate && project.startDate <= today2) {
      const last = (project.lastProgressAt || project.startDate).slice(0, 10);
      const days = (Date.parse(today2) - Date.parse(last)) / 864e5;
      if (days > 45) flags.push("NO_RECENT_REPORT");
    }
    return flags;
  }

  // ../../packages/domain/src/importer.ts
  var IMPORT_FIELDS = [
    "projectCode",
    "projectName",
    "activityCode",
    "activityName",
    "workgroup",
    "fundingSource",
    "fiscalYear",
    "originalBudget",
    "transferIn",
    "transferOut",
    "currentBudget",
    "committed",
    "disbursedCumulative",
    "remaining",
    "startDate",
    "endDate",
    "ownerName",
    "status",
    "date",
    "docNo",
    "amount",
    "description"
  ];
  var FIELD_LABEL = {
    projectCode: "\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
    projectName: "\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
    activityCode: "\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21",
    activityName: "\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21",
    workgroup: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19",
    fundingSource: "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A",
    fiscalYear: "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13",
    originalBudget: "\u0E07\u0E1A\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A",
    transferIn: "\u0E42\u0E2D\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21",
    transferOut: "\u0E42\u0E2D\u0E19\u0E25\u0E14",
    currentBudget: "\u0E07\u0E1A\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E31\u0E1A",
    committed: "\u0E1C\u0E39\u0E01\u0E1E\u0E31\u0E19",
    disbursedCumulative: "\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E2A\u0E30\u0E2A\u0E21",
    remaining: "\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D",
    startDate: "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21",
    endDate: "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14",
    ownerName: "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A",
    status: "\u0E2A\u0E16\u0E32\u0E19\u0E30",
    date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48",
    docNo: "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23",
    amount: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19",
    description: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23/\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38"
  };
  var SYNONYMS = {
    projectCode: ["\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23", "\u0E23\u0E2B\u0E31\u0E2A\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", "projectcode", "\u0E23\u0E2B\u0E31\u0E2A", "code", "\u0E23\u0E2B\u0E31\u0E2A\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19"],
    projectName: ["\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23", "project", "projectname", "\u0E0A\u0E37\u0E48\u0E2D"],
    activityCode: ["\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", "activitycode"],
    activityName: ["\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", "activity", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22"],
    workgroup: ["\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19", "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E1D\u0E48\u0E32\u0E22", "\u0E1D\u0E48\u0E32\u0E22", "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19", "workgroup"],
    fundingSource: ["\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A", "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E40\u0E07\u0E34\u0E19", "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E07\u0E1A", "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", "fundingsource"],
    fiscalYear: ["\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13", "\u0E1B\u0E35\u0E07\u0E1A", "fiscalyear", "\u0E1B\u0E35"],
    originalBudget: [
      "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E08\u0E31\u0E14\u0E2A\u0E23\u0E23",
      "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A",
      "\u0E07\u0E1A\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A",
      "\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E08\u0E31\u0E14\u0E2A\u0E23\u0E23",
      "\u0E07\u0E1A\u0E08\u0E31\u0E14\u0E2A\u0E23\u0E23",
      "\u0E27\u0E07\u0E40\u0E07\u0E34\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13",
      "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13",
      "\u0E27\u0E07\u0E40\u0E07\u0E34\u0E19",
      "allocated",
      "budget"
    ],
    transferIn: ["\u0E42\u0E2D\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21", "\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21", "\u0E23\u0E31\u0E1A\u0E42\u0E2D\u0E19", "transferin"],
    transferOut: ["\u0E42\u0E2D\u0E19\u0E25\u0E14", "\u0E1B\u0E23\u0E31\u0E1A\u0E25\u0E14", "\u0E42\u0E2D\u0E19\u0E2D\u0E2D\u0E01", "\u0E42\u0E2D\u0E19\u0E04\u0E37\u0E19", "transferout"],
    currentBudget: ["\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E2B\u0E25\u0E31\u0E07\u0E42\u0E2D\u0E19", "\u0E07\u0E1A\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E31\u0E1A", "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E31\u0E1A", "\u0E07\u0E1A\u0E2A\u0E38\u0E17\u0E18\u0E34", "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E2A\u0E38\u0E17\u0E18\u0E34", "currentbudget"],
    committed: ["\u0E1C\u0E39\u0E01\u0E1E\u0E31\u0E19", "\u0E01\u0E31\u0E19\u0E40\u0E07\u0E34\u0E19", "\u0E43\u0E1A\u0E2A\u0E31\u0E48\u0E07\u0E0B\u0E37\u0E49\u0E2D", "po", "committed"],
    disbursedCumulative: [
      "\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E2A\u0E30\u0E2A\u0E21",
      "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22",
      "\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27",
      "\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22",
      "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22",
      "\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22",
      "disbursed"
    ],
    remaining: ["\u0E07\u0E1A\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D", "\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D", "remaining"],
    startDate: ["\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E23\u0E34\u0E48\u0E21", "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21", "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19", "startdate"],
    endDate: ["\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14", "\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14", "\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E40\u0E2A\u0E23\u0E47\u0E08", "enddate"],
    ownerName: ["\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23", "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A", "owner"],
    status: ["\u0E2A\u0E16\u0E32\u0E19\u0E30", "status"],
    date: ["\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E34\u0E01", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E08\u0E48\u0E32\u0E22", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48", "date"],
    docNo: ["\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D", "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23", "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01", "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E0E\u0E35\u0E01\u0E32", "\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48", "docno"],
    amount: ["\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E40\u0E1A\u0E34\u0E01", "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19", "\u0E22\u0E2D\u0E14\u0E40\u0E1A\u0E34\u0E01", "\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19", "amount"],
    description: ["\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38", "description"]
  };
  function scoreHeader(header, field) {
    const h = normalizeKey(header);
    if (!h) return 0;
    let best = 0;
    for (const syn of SYNONYMS[field]) {
      const s = normalizeKey(syn);
      if (!s) continue;
      if (h === s) best = Math.max(best, 100 + s.length);
      else if (s.length >= 3 && h.includes(s)) best = Math.max(best, 50 + s.length);
    }
    return best;
  }
  function autoMap(headers) {
    const cands = [];
    headers.forEach((h, col) => {
      for (const field of IMPORT_FIELDS) {
        const score2 = scoreHeader(h, field);
        if (score2 > 0) cands.push({ field, col, score: score2 });
      }
    });
    cands.sort((a, b) => b.score - a.score || a.col - b.col);
    const mapping = {};
    const usedCols = /* @__PURE__ */ new Set();
    let score = 0;
    for (const c of cands) {
      if (mapping[c.field] !== void 0 || usedCols.has(c.col)) continue;
      mapping[c.field] = c.col;
      usedCols.add(c.col);
      score += c.score;
    }
    return { mapping, score };
  }
  function detectHeader(rows) {
    let best = { headerRow: 0, headerSpan: 1, headers: [], mapping: {}, kind: null };
    let bestScore = 0;
    const limit = Math.min(rows.length, 15);
    for (let r3 = 0; r3 < limit; r3++) {
      const single = rows[r3].map((c) => cleanText(c, 120));
      const variants = [{ headers: single, span: 1 }];
      if (r3 + 1 < rows.length) {
        let carry = "";
        const combined = single.map((h, i) => {
          if (h) carry = h;
          const sub = cleanText(rows[r3 + 1][i], 120);
          if (!sub) return h;
          return autoMap([sub]).score >= 100 ? sub : `${h || carry} ${sub}`.trim();
        });
        variants.push({ headers: combined, span: 2 });
      }
      for (const v of variants) {
        const { mapping, score } = autoMap(v.headers);
        const fields = Object.keys(mapping).length;
        const total = fields * 1e3 + score - (v.span - 1) * 50;
        if (fields >= 2 && total > bestScore) {
          bestScore = total;
          best = { headerRow: r3, headerSpan: v.span, headers: v.headers, mapping, kind: detectKind(mapping) };
        }
      }
    }
    return best;
  }
  function detectKind(m) {
    const has = (f) => m[f] !== void 0;
    const hasProject = has("projectCode") || has("projectName");
    if (has("amount") && hasProject && (has("date") || has("docNo")) && !has("originalBudget") && !has("currentBudget")) {
      return "DISBURSEMENT_LIST";
    }
    if (hasProject && (has("originalBudget") || has("currentBudget") || has("disbursedCumulative"))) return "BUDGET_SUMMARY";
    if (has("amount") && hasProject) return "DISBURSEMENT_LIST";
    return null;
  }
  var MONEY_FIELDS = ["originalBudget", "transferIn", "transferOut", "currentBudget", "committed", "disbursedCumulative", "remaining", "amount"];
  function isTotalRow(text) {
    const k = normalizeKey(text);
    return /^(รวม|รวมทั้งสิ้น|รวมทั้งหมด|ยอดรวม|total|grandtotal|รวมทั้งสิน)/.test(k);
  }
  function parseRows(rows, det) {
    const out = [];
    const m = det.mapping;
    const get = (row, f) => m[f] === void 0 ? "" : row[m[f]];
    for (let i = det.headerRow + det.headerSpan; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => cleanText(c) === "")) continue;
      const projectName = cleanText(get(row, "projectName"), 300);
      const projectCode = cleanText(get(row, "projectCode"), 60);
      if (isTotalRow(projectName) || isTotalRow(projectCode)) continue;
      const issues = [];
      const money2 = {};
      for (const f of MONEY_FIELDS) {
        if (m[f] === void 0) continue;
        const p = parseMoney(get(row, f));
        if (!p.ok) issues.push(`${FIELD_LABEL[f]}: \u0E2D\u0E48\u0E32\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 "${cleanText(get(row, f), 40)}"`);
        else if (!p.empty) money2[f] = p.satang;
      }
      const dateOf = (f) => {
        const v = get(row, f);
        if (cleanText(v) === "") return null;
        const iso = parseThaiDate(v);
        if (!iso) issues.push(`${FIELD_LABEL[f]}: \u0E2D\u0E48\u0E32\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 "${cleanText(v, 40)}"`);
        return iso;
      };
      const fyRaw = cleanText(get(row, "fiscalYear"), 10).replace(/\D/g, "");
      let fiscalYear = null;
      if (fyRaw) {
        const n = Number(fyRaw);
        fiscalYear = n >= 2500 && n <= 2700 ? n : n >= 1950 && n <= 2200 ? n + 543 : n >= 60 && n <= 99 ? 2500 + n : null;
        if (fiscalYear === null) issues.push(`\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 "${fyRaw}"`);
      }
      out.push({
        rowNo: i + 1,
        projectCode,
        projectName,
        activityCode: cleanText(get(row, "activityCode"), 60),
        activityName: cleanText(get(row, "activityName"), 300),
        workgroup: cleanText(get(row, "workgroup"), 120),
        fundingSource: cleanText(get(row, "fundingSource"), 120),
        fiscalYear,
        money: money2,
        startDate: dateOf("startDate"),
        endDate: dateOf("endDate"),
        ownerName: cleanText(get(row, "ownerName"), 120),
        status: cleanText(get(row, "status"), 40),
        date: dateOf("date"),
        docNo: cleanText(get(row, "docNo"), 80),
        description: cleanText(get(row, "description"), 300),
        issues
      });
    }
    return out;
  }
  function matchFundingSource(text, sources) {
    const k = normalizeKey(text);
    if (!k) return null;
    for (const s of sources) {
      if ([s.code, s.name, s.shortName].some((x) => normalizeKey(x) === k)) return s;
    }
    const byCode = (code) => sources.find((s) => s.code === code) ?? null;
    if (k.includes("\u0E01\u0E25\u0E38\u0E48\u0E21\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14") || k.includes("\u0E20\u0E32\u0E04\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E15\u0E2D\u0E19\u0E25\u0E48\u0E32\u0E07")) return byCode("PROVGROUP");
    if (k.includes("\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14") || k === "\u0E08" || k.includes("\u0E07\u0E1A\u0E08")) return byCode("PROVINCE");
    if (k.includes("\u0E01\u0E23\u0E21") || k.includes("\u0E01\u0E2A\u0E01") || k.includes("doae")) return byCode("DOAE");
    return null;
  }
  function matchWorkgroup(text, groups) {
    const k = normalizeKey(text);
    if (!k) return null;
    const exact = groups.find((g) => normalizeKey(g.name) === k || normalizeKey(g.code) === k);
    if (exact) return exact;
    const stripped = k.replace(/^กลุ่มงาน|^กลุ่ม|^ฝ่าย/, "");
    const partial = groups.filter((g) => {
      const n = normalizeKey(g.name).replace(/^กลุ่มงาน|^กลุ่ม|^ฝ่าย/, "");
      return stripped.length >= 3 && (n.includes(stripped) || stripped.includes(n));
    });
    return partial.length === 1 ? partial[0] : null;
  }
  function autoProjectCode(fiscalYear, name) {
    let h = 2166136261;
    for (const ch of normalizeKey(name)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return `AUTO-${fiscalYear}-${h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
  }
  var STATUS_WORDS = [
    [/เสร็จ|แล้วเสร็จ|complete|done/, "COMPLETED"],
    [/ยกเลิก|cancel/, "CANCELLED"],
    [/ยังไม่|ไม่เริ่ม|plan/, "PLANNED"],
    [/ดำเนินการ|กำลัง|progress/, "IN_PROGRESS"]
  ];
  function parseProjectStatus(s) {
    const k = normalizeKey(s);
    if (!k) return null;
    for (const [re, st] of STATUS_WORDS) if (re.test(k)) return st;
    return null;
  }
  function parseDisbStatus(s) {
    const k = normalizeKey(s);
    if (!k) return null;
    if (/ผูกพัน|กันเงิน|po|commit/.test(k)) return "COMMITTED";
    if (/จ่ายแล้ว|paid|โอนแล้ว/.test(k)) return "PAID";
    if (/อนุมัติ|เบิก|approve/.test(k)) return "APPROVED";
    if (/ยกเลิก|void/.test(k)) return "VOID";
    return null;
  }
  function planImport(parsed, ctx) {
    const result = [];
    const liveProjects = ctx.projects.filter((p) => !p.isDeleted);
    const liveActivities = ctx.activities.filter((a) => !a.isDeleted);
    const summaries = /* @__PURE__ */ new Map();
    const summaryKey = (projectId, activityId) => `${projectId}|${activityId}`;
    const existingSummary = (projectId, activityId) => {
      const key = summaryKey(projectId, activityId);
      if (!summaries.has(key)) {
        if (!projectId.startsWith("new:")) {
          const allocs = ctx.allocations.filter((a) => a.projectId === projectId && (activityId === "*" || a.activityId === activityId));
          const disbs = ctx.disbursements.filter((d) => d.projectId === projectId && (activityId === "*" || d.activityId === activityId));
          summaries.set(key, computeBudget(allocs, disbs));
        } else summaries.set(key, { ...EMPTY_SUMMARY });
      }
      return summaries.get(key);
    };
    const bump = (projectId, activityId, budget, disbursed, committed) => {
      for (const aid of /* @__PURE__ */ new Set([activityId, "*"])) {
        const s = existingSummary(projectId, aid);
        s.currentBudget += budget;
        s.disbursed += disbursed;
        s.committed += committed;
        s.remaining = s.currentBudget - s.disbursed;
      }
    };
    const newProjects = /* @__PURE__ */ new Map();
    const newActivities = /* @__PURE__ */ new Map();
    const seenRowKeys = /* @__PURE__ */ new Set();
    const existingDisbKeys = new Set(
      ctx.disbursements.filter((d) => !d.isDeleted && d.status !== "VOID").map((d) => `${d.projectId}|${normalizeKey(d.docNo)}|${d.date}|${d.amountSatang}`)
    );
    for (const r3 of parsed) {
      const messages = [...r3.issues];
      let hardError = r3.issues.length > 0;
      let warn = false;
      const plan = { allocations: [], disbursements: [] };
      const effect = { budgetDelta: 0, disbursedDelta: 0, committedDelta: 0 };
      const label = [r3.projectCode, r3.projectName, r3.activityName].filter(Boolean).join(" \xB7 ") || `\u0E41\u0E16\u0E27 ${r3.rowNo}`;
      const fy = r3.fiscalYear ?? ctx.fiscalYear;
      let fundingSourceId = ctx.fundingSourceId;
      if (r3.fundingSource) {
        const fs = matchFundingSource(r3.fundingSource, ctx.fundingSources);
        if (fs) fundingSourceId = fs.id;
        else {
          messages.push(`\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A "${r3.fundingSource}"`);
          hardError = true;
        }
      }
      if (!fundingSourceId) {
        messages.push("\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A \u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E02\u0E2D\u0E07\u0E44\u0E1F\u0E25\u0E4C");
        hardError = true;
      }
      if (!r3.projectCode && !r3.projectName) {
        messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
        result.push({ rowNo: r3.rowNo, status: "ERROR", messages, label, plan, effect });
        continue;
      }
      const sameScope = liveProjects.filter((p) => p.fiscalYear === fy && p.fundingSourceId === fundingSourceId);
      let project = r3.projectCode ? sameScope.find((p) => normalizeKey(p.projectCode) === normalizeKey(r3.projectCode)) : void 0;
      if (!project && r3.projectName) {
        const byName = sameScope.filter((p) => normalizeKey(p.name) === normalizeKey(r3.projectName));
        if (byName.length === 1 && (!r3.projectCode || byName[0].projectCode.startsWith("AUTO-"))) project = byName[0];
      }
      const projectCode = r3.projectCode || (project?.projectCode ?? autoProjectCode(fy, r3.projectName));
      const newKey = `${fy}|${fundingSourceId}|${normalizeKey(projectCode)}`;
      let projectRef = project?.id ?? "";
      let workgroupId = project?.workgroupId ?? "";
      if (r3.workgroup) {
        const wg = matchWorkgroup(r3.workgroup, ctx.workgroups);
        if (wg) {
          if (project && project.workgroupId !== wg.id) {
            messages.push(`\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C (${wg.name}) \u0E15\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u2014 \u0E43\u0E0A\u0E49\u0E04\u0E48\u0E32\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A`);
            warn = true;
          } else workgroupId = wg.id;
        } else if (!project) {
          messages.push(`\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19 "${r3.workgroup}"`);
          hardError = true;
        }
      }
      if (!workgroupId && ctx.defaultWorkgroupId) workgroupId = ctx.defaultWorkgroupId;
      if (!project) {
        if (ctx.kind === "DISBURSEMENT_LIST") {
          messages.push(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 "${r3.projectCode || r3.projectName}" \u0E43\u0E19\u0E1B\u0E35\u0E07\u0E1A ${fy}`);
          hardError = true;
        } else if (!r3.projectName && !newProjects.has(newKey)) {
          messages.push("\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
          hardError = true;
        } else {
          if (!workgroupId) {
            messages.push("\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48");
            hardError = true;
          }
          if (!r3.projectCode) {
            messages.push(`\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u2014 \u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E31\u0E49\u0E07\u0E23\u0E2B\u0E31\u0E2A ${projectCode}`);
            warn = true;
          }
          projectRef = `new:${newKey}`;
          if (!newProjects.has(newKey)) {
            const p = {
              ref: projectRef,
              fiscalYear: fy,
              fundingSourceId,
              projectCode,
              name: r3.projectName,
              workgroupId,
              ownerName: r3.ownerName,
              startDate: r3.startDate ?? "",
              endDate: r3.endDate ?? "",
              status: parseProjectStatus(r3.status) ?? "IN_PROGRESS"
            };
            newProjects.set(newKey, p);
            plan.createProject = p;
            messages.push("\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48");
          }
        }
      } else if (ctx.kind === "BUDGET_SUMMARY") {
        const patch = {};
        if (r3.ownerName && r3.ownerName !== project.ownerName) patch.ownerName = r3.ownerName;
        if (r3.startDate && r3.startDate !== project.startDate) patch.startDate = r3.startDate;
        if (r3.endDate && r3.endDate !== project.endDate) patch.endDate = r3.endDate;
        const st = parseProjectStatus(r3.status);
        if (st && st !== project.status) patch.status = st;
        if (Object.keys(patch).length) plan.updateProject = { projectId: project.id, patch };
      }
      if (workgroupId && ctx.allowedWorkgroupIds && !ctx.allowedWorkgroupIds.has(workgroupId)) {
        messages.push("\u0E2D\u0E22\u0E39\u0E48\u0E19\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C");
        hardError = true;
      }
      let activityRef = "";
      if (r3.activityCode || r3.activityName) {
        const acts = project ? liveActivities.filter((a) => a.projectId === project.id) : [];
        const act = acts.find((a) => r3.activityCode && normalizeKey(a.activityCode) === normalizeKey(r3.activityCode) || !r3.activityCode && normalizeKey(a.name) === normalizeKey(r3.activityName));
        if (act) activityRef = act.id;
        else if (ctx.kind === "DISBURSEMENT_LIST") {
          messages.push(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 "${r3.activityCode || r3.activityName}" \u2014 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23`);
          warn = true;
        } else if (r3.activityName) {
          const code = r3.activityCode || String(acts.length + [...newActivities.values()].filter((a) => a.projectRef === projectRef).length + 1).padStart(2, "0");
          const aKey = `${projectRef}|${normalizeKey(code)}`;
          activityRef = `new:${aKey}`;
          if (!newActivities.has(aKey)) {
            const a = { ref: activityRef, projectRef, activityCode: code, name: r3.activityName };
            newActivities.set(aKey, a);
            plan.createActivity = a;
          }
        }
      }
      const rowKey = `${projectRef}|${activityRef}`;
      if (ctx.kind === "BUDGET_SUMMARY") {
        if (seenRowKeys.has(rowKey)) {
          messages.push("\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23/\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E41\u0E16\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C");
          hardError = true;
        }
        seenRowKeys.add(rowKey);
      }
      if (!hardError && projectRef) {
        const cur = existingSummary(projectRef, activityRef || "*");
        if (ctx.kind === "BUDGET_SUMMARY") {
          const mny = { ...r3.money };
          if (mny.transferOut !== void 0) mny.transferOut = Math.abs(mny.transferOut);
          if (mny.transferIn !== void 0 && mny.transferIn < 0) {
            messages.push("\u0E42\u0E2D\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E48\u0E32\u0E15\u0E34\u0E14\u0E25\u0E1A \u2014 \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E32\u0E23\u0E42\u0E2D\u0E19\u0E25\u0E14\u0E43\u0E2B\u0E49\u0E43\u0E2A\u0E48\u0E43\u0E19\u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C\u0E42\u0E2D\u0E19\u0E25\u0E14");
            hardError = true;
          }
          for (const f of ["originalBudget", "currentBudget", "committed", "disbursedCumulative"]) {
            if ((mny[f] ?? 0) < 0) {
              messages.push(`${FIELD_LABEL[f]}\u0E15\u0E34\u0E14\u0E25\u0E1A`);
              hardError = true;
            }
          }
          let target = null;
          if (hardError) target = null;
          else if (mny.currentBudget !== void 0) target = mny.currentBudget;
          else if (mny.originalBudget !== void 0) target = mny.originalBudget + (mny.transferIn ?? 0) - (mny.transferOut ?? 0);
          if (target !== null) {
            if (target < 0) {
              messages.push("\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E15\u0E34\u0E14\u0E25\u0E1A");
              hardError = true;
            } else if (cur.currentBudget === 0) {
              const orig = mny.originalBudget ?? target;
              if (orig > 0) plan.allocations.push({ projectRef, activityRef, type: "ORIGINAL", amountSatang: orig, note: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E08\u0E32\u0E01 ${ctx.fileLabel}` });
              if (mny.originalBudget !== void 0) {
                if (mny.transferIn) plan.allocations.push({ projectRef, activityRef, type: "TRANSFER_IN", amountSatang: mny.transferIn, note: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E08\u0E32\u0E01 ${ctx.fileLabel}` });
                if (mny.transferOut) plan.allocations.push({ projectRef, activityRef, type: "TRANSFER_OUT", amountSatang: mny.transferOut, note: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E08\u0E32\u0E01 ${ctx.fileLabel}` });
              }
              effect.budgetDelta = target;
            } else if (target !== cur.currentBudget) {
              const diff = target - cur.currentBudget;
              plan.allocations.push({
                projectRef,
                activityRef,
                type: diff > 0 ? "TRANSFER_IN" : "TRANSFER_OUT",
                amountSatang: Math.abs(diff),
                note: `\u0E1B\u0E23\u0E31\u0E1A\u0E15\u0E32\u0E21\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32 ${ctx.fileLabel}`
              });
              effect.budgetDelta = diff;
              messages.push(`\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E08\u0E32\u0E01\u0E40\u0E14\u0E34\u0E21 (${diff > 0 ? "+" : ""}${(diff / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17)`);
              warn = true;
            }
          }
          const pairs = [
            ["disbursedCumulative", "APPROVED", cur.disbursed],
            ["committed", "COMMITTED", cur.committed]
          ];
          for (const [field, status2, existing] of pairs) {
            const v = mny[field];
            if (v === void 0) continue;
            const diff = v - existing;
            if (diff > 0) {
              plan.disbursements.push({
                projectRef,
                activityRef,
                status: status2,
                amountSatang: diff,
                date: ctx.today,
                docNo: "",
                description: `\u0E1B\u0E23\u0E31\u0E1A\u0E22\u0E2D\u0E14${status2 === "COMMITTED" ? "\u0E1C\u0E39\u0E01\u0E1E\u0E31\u0E19" : "\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E2A\u0E30\u0E2A\u0E21"}\u0E15\u0E32\u0E21\u0E44\u0E1F\u0E25\u0E4C ${ctx.fileLabel}`,
                adjust: true
              });
              if (status2 === "COMMITTED") effect.committedDelta = diff;
              else effect.disbursedDelta = diff;
            } else if (diff < 0) {
              messages.push(`${FIELD_LABEL[field]}\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A ${(-diff / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17 \u2014 \u0E44\u0E21\u0E48\u0E1B\u0E23\u0E31\u0E1A\u0E25\u0E14\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34`);
              warn = true;
            }
          }
          const after = cur.currentBudget + effect.budgetDelta - (cur.disbursed + effect.disbursedDelta);
          if (mny.remaining !== void 0 && mny.remaining !== after) {
            messages.push(`\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E04\u0E33\u0E19\u0E27\u0E13\u0E44\u0E14\u0E49 (${(after / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17)`);
            warn = true;
          }
          if (after < 0) {
            messages.push("\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E40\u0E01\u0E34\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13");
            hardError = true;
          }
        } else {
          const amount = r3.money.amount;
          if (amount === void 0 || amount === 0) {
            messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19");
            hardError = true;
          } else if (amount < 0) {
            messages.push("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E15\u0E34\u0E14\u0E25\u0E1A \u2014 \u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E17\u0E19");
            hardError = true;
          }
          if (!r3.date) {
            messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48");
            hardError = true;
          }
          const status2 = parseDisbStatus(r3.status) ?? "APPROVED";
          if (status2 === "VOID") {
            messages.push("\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 \u2014 \u0E02\u0E49\u0E32\u0E21");
            warn = true;
          } else if (!hardError && amount) {
            const dupKey = `${projectRef}|${normalizeKey(r3.docNo)}|${r3.date}|${amount}`;
            if (existingDisbKeys.has(dupKey)) {
              messages.push("\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 \u2014 \u0E02\u0E49\u0E32\u0E21");
              warn = true;
            } else {
              existingDisbKeys.add(dupKey);
              const disbursedAdd = status2 === "COMMITTED" ? 0 : amount;
              if (cur.remaining - disbursedAdd < 0) {
                messages.push("\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E40\u0E01\u0E34\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D");
                hardError = true;
              } else {
                plan.disbursements.push({
                  projectRef,
                  activityRef,
                  status: status2,
                  amountSatang: amount,
                  date: r3.date,
                  docNo: r3.docNo,
                  description: r3.description,
                  adjust: false
                });
                effect.disbursedDelta = disbursedAdd;
                effect.committedDelta = status2 === "COMMITTED" ? amount : 0;
              }
            }
          }
        }
        if (!hardError) bump(projectRef, activityRef || "*", effect.budgetDelta, effect.disbursedDelta, effect.committedDelta);
      }
      if (hardError) {
        const i = messages.indexOf("\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48");
        if (i >= 0) messages.splice(i, 1);
        plan.allocations = [];
        plan.disbursements = [];
        delete plan.createProject;
        delete plan.createActivity;
        delete plan.updateProject;
        if (newProjects.get(newKey)?.ref === projectRef && !result.some((x) => x.plan.createProject?.ref === projectRef)) {
          newProjects.delete(newKey);
        }
        if (activityRef.startsWith("new:") && !result.some((x) => x.plan.createActivity?.ref === activityRef)) {
          newActivities.delete(activityRef.slice(4));
        }
      }
      const status = hardError ? "ERROR" : warn ? "WARNING" : "VALID";
      result.push({ rowNo: r3.rowNo, status, messages, label, plan, effect });
    }
    return result;
  }
  function summarizeStaged(rows) {
    let valid = 0, warning = 0, error = 0, budgetDelta = 0, disbursedDelta = 0, newProjects = 0;
    for (const r3 of rows) {
      if (r3.status === "VALID") valid++;
      else if (r3.status === "WARNING") warning++;
      else error++;
      if (r3.status !== "ERROR") {
        budgetDelta += r3.effect.budgetDelta;
        disbursedDelta += r3.effect.disbursedDelta;
        if (r3.plan.createProject) newProjects++;
      }
    }
    return { total: rows.length, valid, warning, error, budgetDelta, disbursedDelta, newProjects };
  }

  // ../../packages/domain/src/coverLetter.ts
  function fixOcrDigits(s) {
    return s.replace(/(?<=\d)[oO](?=\d)/g, "0").replace(/(?<=\d)[lI](?=\d)/g, "1");
  }
  function parseCoverLetter(rawText, knownProjectCodes = []) {
    const text = fixOcrDigits(thaiDigitsToArabic(rawText ?? "")).replace(/\r/g, "");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const flat = lines.join(" ");
    const warnings = [];
    let docNo = null;
    const docRe = /(?:^|\s)ที่\s*([ก-ฮ]{1,3}\.?\s?[ก-ฮ]{0,3}\.?\s*\d{3,5}(?:\.\d{1,3})*\s*\/\s*(?:ว\.?\s*)?\d{1,6}(?:\s*\/\s*\d{2,4})?)/;
    const dm = flat.match(docRe);
    if (dm) docNo = { value: dm[1].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim(), confidence: 0.9, source: dm[0].trim() };
    let date = null;
    const dateRe = /(\d{1,2})\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|[มกพสตธ]\.?\s?[คพยย]\.?|มี\.?\s?ค\.?|เม\.?\s?ย\.?|มิ\.?\s?ย\.?)\s*(?:พ\.?\s?ศ\.?\s*)?(\d{4}|\d{2})/g;
    const dates = [];
    for (const m of flat.matchAll(dateRe)) {
      const iso = parseThaiDate(`${m[1]} ${m[2].replace(/\s/g, "")} ${m[3]}`);
      if (!iso) continue;
      const before = flat.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
      dates.push({ iso, idx: m.index ?? 0, src: m[0], ref: /ลงวันที่|ตามหนังสือ/.test(before) });
    }
    const primary = dates.find((d) => !d.ref) ?? dates[0];
    if (primary) date = { value: primary.iso, confidence: primary.ref ? 0.5 : dates.length === 1 ? 0.9 : 0.75, source: primary.src };
    let numeric = null;
    const kw = /(?:จำนวนเงิน|เป็นเงิน|รวมเงิน|ยอดเงิน|รวมทั้งสิ้น|ทั้งสิ้น|จำนวน)\s*[:：]?\s*([\d,]+(?:\.\d{1,2})?)\s*บาท/;
    const km = flat.match(kw);
    if (km) {
      const p = parseMoney(km[1]);
      if (p.ok && !p.empty) numeric = { satang: p.satang, confidence: 0.85, src: km[0] };
    }
    if (!numeric) {
      let best = null;
      for (const m of flat.matchAll(/([\d]{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\s*บาท/g)) {
        const p = parseMoney(m[1]);
        if (p.ok && (!best || p.satang > best.satang)) best = { satang: p.satang, src: m[0] };
      }
      if (best) numeric = { ...best, confidence: 0.55 };
    }
    let words = null;
    for (const m of flat.matchAll(/\(?\s*([ก-๙\s]{4,120}?บาท(?:\s*ถ้วน|[ก-๙\s]{2,40}?สตางค์))\s*\)?/g)) {
      const v = parseThaiBahtText(m[1].replace(/^.*?(?=(?:หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ยี่|ร้อย|พัน|หมื่น|แสน|ล้าน))/, ""));
      if (v !== null && v > 0) {
        words = { satang: v, src: m[0].trim() };
        break;
      }
    }
    let amount = null;
    if (numeric && words) {
      if (numeric.satang === words.satang) amount = { value: numeric.satang, confidence: 0.97, source: `${numeric.src} ${words.src}` };
      else {
        amount = { value: numeric.satang, confidence: 0.3, source: numeric.src };
        warnings.push("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E01\u0E31\u0E1A\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19 \u2014 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E01\u0E31\u0E1A\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A");
      }
    } else if (numeric) amount = { value: numeric.satang, confidence: numeric.confidence, source: numeric.src };
    else if (words) amount = { value: words.satang, confidence: 0.7, source: words.src };
    let subject = null;
    const sm = text.match(/เรื่อง\s+([^\n]{3,200})/);
    if (sm) subject = { value: sm[1].trim(), confidence: 0.8, source: sm[0].trim() };
    let projectCode = null;
    const nflat = normalizeKey(flat);
    const hits = knownProjectCodes.filter((c) => c && normalizeKey(c).length >= 4 && nflat.includes(normalizeKey(c)));
    if (hits.length === 1) projectCode = { value: hits[0], confidence: 0.85, source: hits[0] };
    else if (hits.length > 1) warnings.push(`\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2B\u0E25\u0E32\u0E22\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23: ${hits.slice(0, 5).join(", ")}`);
    if (!amount) warnings.push("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E43\u0E19\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23");
    if (!docNo) warnings.push("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D");
    const found = [docNo, date, amount, subject, projectCode].filter((x) => x !== null);
    const overallConfidence = found.length ? Math.min(...found.map((f) => f.confidence)) : 0;
    return { docNo, date, amount, subject, projectCode, warnings, overallConfidence };
  }

  // ../../packages/domain/src/contracts.ts
  var API_VERSION = "1.0.0";
  var BATCH_MAX = 8;
  var PUBLIC_ACTIONS = /* @__PURE__ */ new Set([
    "public.lookups",
    "public.summary",
    "public.projects",
    "public.project",
    "public.report",
    "public.hit",
    "auth.requestAccess",
    "auth.login",
    "auth.loginSuper",
    "batch"
  ]);
  var READ_ACTIONS = /* @__PURE__ */ new Set([
    "public.lookups",
    "public.summary",
    "public.projects",
    "public.project",
    "public.report",
    "auth.me",
    "targets.get",
    "admin.overview",
    "projects.list",
    "projects.get",
    "disbursements.entryList",
    "imports.get",
    "imports.list",
    "plans.check",
    "plans.list",
    "plans.get",
    "reports.data",
    "admin.requests",
    "admin.users",
    "admin.loginReport",
    "admin.audit",
    "admin.health",
    "profile.get",
    "memos.context",
    "memos.get",
    "memos.groupSettings",
    "budgetCodes.list"
  ]);

  // ../../packages/domain/src/plan.ts
  var PLAN_KINDS = ["PLAN", "OUTPUT", "PROJECT", "ACTIVITY", "SUBACTIVITY", "BUDGET_TYPE", "METHOD", "ITEM"];
  var PLAN_FIELD_COL = { name: 0, unit: 1, qty: 2, amount: 3 };
  var UNIT_WORDS2 = [
    "\u0E23\u0E32\u0E22/\u0E41\u0E1B\u0E25\u0E07",
    "\u0E04\u0E23\u0E31\u0E27\u0E40\u0E23\u0E37\u0E2D\u0E19",
    "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07",
    "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
    "\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14",
    "\u0E2D\u0E33\u0E40\u0E20\u0E2D",
    "\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32",
    "\u0E41\u0E1B\u0E25\u0E07",
    "\u0E01\u0E25\u0E38\u0E48\u0E21",
    "\u0E28\u0E39\u0E19\u0E22\u0E4C",
    "\u0E04\u0E23\u0E31\u0E49\u0E07",
    "\u0E41\u0E2B\u0E48\u0E07",
    "\u0E23\u0E32\u0E22",
    "\u0E04\u0E19",
    "\u0E44\u0E23\u0E48",
    "\u0E0A\u0E38\u0E14",
    "\u0E25\u0E33",
    "\u0E08\u0E38\u0E14",
    "\u0E15\u0E31\u0E19",
    "\u0E01\u0E34\u0E42\u0E25\u0E01\u0E23\u0E31\u0E21",
    "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07",
    "\u0E2B\u0E25\u0E31\u0E07",
    "\u0E27\u0E31\u0E19",
    "\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07",
    "\u0E09\u0E1A\u0E31\u0E1A",
    "\u0E15\u0E49\u0E19",
    "\u0E15\u0E33\u0E1A\u0E25",
    "\u0E2B\u0E21\u0E39\u0E48\u0E1A\u0E49\u0E32\u0E19"
  ];
  function classifyPlanLine(raw) {
    const t2 = cleanText(thaiDigitsToArabic(raw), 1e3);
    let m;
    if (/^รวม(ทั้งสิ้น|ทั้งหมด)?\s*$/.test(t2) || /^รวมทั้งสิ้น/.test(t2)) return { kind: "TOTAL", number: "", name: "\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19", rank: 0, numbered: false };
    if (/^แผนงาน/.test(t2)) return { kind: "PLAN", number: "", name: t2, rank: 1, numbered: false };
    if (/^ผลผลิต/.test(t2)) return { kind: "OUTPUT", number: "", name: t2, rank: 2, numbered: false };
    if (m = t2.match(/^\+\s*(.+)$/)) return { kind: "BUDGET_TYPE", number: "+", name: m[1], rank: 9, numbered: false };
    if (m = t2.match(/^\((\d+(?:\.\d+)*)\)\s*(.+)$/)) {
      const segs = m[1].split(".").length;
      return { kind: "ITEM", number: `(${m[1]})`, name: m[2], rank: 30 + segs, numbered: true };
    }
    if (m = t2.match(/^(\d+(?:\.\d+)*)\)\s*(.+)$/)) {
      const segs = m[1].split(".").length;
      return { kind: "METHOD", number: `${m[1]})`, name: m[2], rank: 10 + segs, numbered: true };
    }
    if (m = t2.match(/^(\d+\.\d+\.\d+(?:\.\d+)*)\s+(.+)$/)) {
      return { kind: "SUBACTIVITY", number: m[1], name: m[2], rank: 5 + (m[1].split(".").length - 3), numbered: true };
    }
    if (m = t2.match(/^(\d+\.\d+)\s+(.+)$/)) return { kind: "ACTIVITY", number: m[1], name: m[2], rank: 4, numbered: true };
    if (m = t2.match(/^(\d+)\s+(.+)$/)) return { kind: "PROJECT", number: m[1], name: m[2], rank: 3, numbered: true };
    if (m = t2.match(/^[-–•]\s*(.+)$/)) return { kind: "ITEM", number: "-", name: m[1], rank: -1, numbered: false };
    return { kind: "ITEM", number: "", name: t2, rank: -2, numbered: false };
  }
  function parseQty(v) {
    const s = thaiDigitsToArabic(v).replace(/[,\s]/g, "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function buildPlan(rows) {
    const issues = [];
    const nodes = [];
    const stack = [];
    let declaredTotal = null;
    let totalRowNo = 0;
    let planIndex = 0;
    let prevRank = 10;
    for (const r3 of rows) {
      const text = cleanText(r3.text, 1e3);
      if (!text) continue;
      const c = classifyPlanLine(text);
      const money2 = parseMoney(r3.amount);
      if (!money2.ok) issues.push({ rowNo: r3.rowNo, level: "ERROR", message: `\u0E2D\u0E48\u0E32\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: "${cleanText(r3.amount, 30)}"` });
      const amount = money2.ok && !money2.empty ? money2.satang : null;
      if (c.kind === "TOTAL") {
        declaredTotal = amount;
        totalRowNo = r3.rowNo;
        continue;
      }
      let rank = c.rank;
      if (rank === -1) rank = prevRank + 0.5;
      if (rank === -2) {
        rank = Math.max(10, (stack.at(-1)?.rank ?? 9) + 0.5);
        issues.push({ rowNo: r3.rowNo, level: "INFO", message: "\u0E41\u0E16\u0E27\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22\u0E02\u0E2D\u0E07\u0E41\u0E16\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32" });
      }
      while (stack.length && stack[stack.length - 1].rank >= rank) stack.pop();
      if (c.kind === "PLAN") {
        planIndex++;
        stack.length = 0;
      }
      const parent = stack.at(-1)?.node;
      const qty = parseQty(r3.qty);
      if (r3.qty && qty === null) {
        const digits = thaiDigitsToArabic(r3.qty).replace(/[^\d.]/g, "");
        issues.push({ rowNo: r3.rowNo, level: "WARNING", message: `\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02: "${r3.qty}"`, field: "qty", ...digits ? { suggest: digits, fix: `\u0E43\u0E0A\u0E49 ${digits}` } : {} });
      }
      const node = {
        seq: nodes.length + 1,
        rowNo: r3.rowNo,
        parentSeq: parent?.seq ?? 0,
        depth: stack.length,
        kind: c.kind,
        number: c.number,
        name: c.name,
        unit: cleanText(r3.unit, 40),
        quantity: qty,
        amountSatang: amount,
        isLeaf: true,
        planIndex,
        projectSeq: 0,
        activitySeq: 0,
        code: ""
      };
      if (parent) parent.isLeaf = false;
      const chain = [...stack.map((s) => s.node), node];
      const proj = [...chain].reverse().find((n) => n.kind === "PROJECT");
      const act = [...chain].reverse().find((n) => n.kind === "ACTIVITY");
      node.projectSeq = (proj ?? act ?? node).seq;
      node.activitySeq = act?.seq ?? 0;
      const fromProject = proj ? chain.slice(chain.indexOf(proj) + 1) : act ? chain.slice(chain.indexOf(act)) : [node];
      node.code = fromProject.map((n) => n.number || "\u2022").join("/") || node.number;
      nodes.push(node);
      stack.push({ node, rank });
      prevRank = rank;
    }
    const children = /* @__PURE__ */ new Map();
    for (const n of nodes) (children.get(n.parentSeq) ?? children.set(n.parentSeq, []).get(n.parentSeq)).push(n);
    const effective = /* @__PURE__ */ new Map();
    const sumOf = (n) => {
      if (effective.has(n.seq)) return effective.get(n.seq);
      const kids = children.get(n.seq) ?? [];
      let v;
      if (!kids.length) v = n.amountSatang ?? 0;
      else {
        const s = kids.reduce((acc, k) => acc + sumOf(k), 0);
        if (n.amountSatang !== null && n.amountSatang !== s) {
          issues.push({
            rowNo: n.rowNo,
            level: "ERROR",
            field: "amount",
            suggest: satangPlain(s),
            fix: `\u0E43\u0E0A\u0E49\u0E1C\u0E25\u0E23\u0E27\u0E21 ${bahtText(s)} \u0E1A\u0E32\u0E17`,
            message: `\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${bahtText(n.amountSatang)} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22 ${bahtText(s)} \u0E1A\u0E32\u0E17 (\u0E16\u0E49\u0E32\u0E22\u0E2D\u0E14\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01 \u0E43\u0E2B\u0E49\u0E41\u0E01\u0E49\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22\u0E41\u0E17\u0E19)`
          });
        }
        v = n.amountSatang ?? s;
      }
      effective.set(n.seq, v);
      return v;
    };
    const roots = children.get(0) ?? [];
    const computedTotal = roots.reduce((a, n) => a + sumOf(n), 0);
    nodes.forEach(sumOf);
    if (declaredTotal !== null && declaredTotal !== computedTotal) {
      issues.push({
        rowNo: totalRowNo,
        level: "ERROR",
        field: "amount",
        suggest: satangPlain(computedTotal),
        fix: `\u0E43\u0E0A\u0E49\u0E1C\u0E25\u0E23\u0E27\u0E21 ${bahtText(computedTotal)} \u0E1A\u0E32\u0E17`,
        message: `\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19 ${bahtText(declaredTotal)} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19 ${bahtText(computedTotal)} \u0E1A\u0E32\u0E17`
      });
    }
    const leaves = nodes.filter((n) => n.isLeaf);
    for (const l of leaves) {
      if (l.amountSatang === null) issues.push({ rowNo: l.rowNo, level: "WARNING", field: "amount", message: "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E44\u0E21\u0E48\u0E21\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 \u2014 \u0E43\u0E2A\u0E48\u0E07\u0E1A \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D \u0E43\u0E2B\u0E49\u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22\u0E15\u0E01\u0E2B\u0E25\u0E48\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48" });
      else if (l.amountSatang < 0) issues.push({ rowNo: l.rowNo, level: "ERROR", field: "amount", message: "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E15\u0E34\u0E14\u0E25\u0E1A" });
      else if (!l.unit || l.quantity === null) {
        issues.push({ rowNo: l.rowNo, level: "INFO", field: l.unit ? "qty" : "unit", message: `\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22\u0E44\u0E21\u0E48\u0E21\u0E35${!l.unit && l.quantity === null ? "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19" : !l.unit ? "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A" : "\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19"} \u2014 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E44\u0E14\u0E49\u0E16\u0E49\u0E32\u0E17\u0E23\u0E32\u0E1A (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A)` });
      }
    }
    const bySeq = new Map(nodes.map((n) => [n.seq, n]));
    for (const n of nodes) {
      const core = n.number.match(/^\(?(\d+(?:\.\d+)+)\)?$/)?.[1];
      const parent = bySeq.get(n.parentSeq);
      if (!core || !parent) continue;
      const sameStyle = n.number.startsWith("(") === parent.number.startsWith("(") && /\)$/.test(n.number) === /\)$/.test(parent.number);
      const parentCore = parent.number.match(/^\(?(\d+(?:\.\d+)*)\)?$/)?.[1];
      if (sameStyle && parentCore && core.split(".").slice(0, -1).join(".") !== parentCore) {
        const fixed = n.number.replace(core, `${parentCore}.${core.split(".").at(-1)}`);
        issues.push({
          rowNo: n.rowNo,
          level: "INFO",
          field: "name",
          suggest: `${fixed} ${n.name}`,
          fix: `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19 ${fixed}`,
          message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A ${n.number} \u0E44\u0E21\u0E48\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E21\u0E48 ${parent.number} (\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E15\u0E32\u0E21\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E43\u0E19\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E01\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E01\u0E47\u0E44\u0E14\u0E49)`
        });
      }
    }
    for (const [, kids] of children) {
      const byStyle = /* @__PURE__ */ new Map();
      for (const k of kids) {
        if (!/\d/.test(k.number)) continue;
        const style2 = k.number.replace(/\d+/g, "#");
        (byStyle.get(style2) ?? byStyle.set(style2, []).get(style2)).push(k);
      }
      for (const list of byStyle.values()) {
        const lastNums = list.map((k) => Number(k.number.match(/(\d+)\D*$/)?.[1] ?? 0));
        for (let i = 1; i < lastNums.length; i++) {
          if (lastNums[i] === lastNums[i - 1]) issues.push({ rowNo: list[i].rowNo, level: "WARNING", message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A ${list[i].number} \u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32` });
          else if (lastNums[i] !== lastNums[i - 1] + 1) issues.push({ rowNo: list[i].rowNo, level: "INFO", field: "name", message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E49\u0E32\u0E21\u0E08\u0E32\u0E01 ${list[i - 1].number} \u0E44\u0E1B ${list[i].number} \u2014 \u0E15\u0E23\u0E27\u0E08\u0E01\u0E31\u0E1A\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E27\u0E48\u0E32\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E01\u0E2B\u0E25\u0E48\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48` });
        }
      }
      const seen = /* @__PURE__ */ new Map();
      for (const k of kids) {
        const key = normalizeKey(k.name);
        if (seen.has(key)) issues.push({ rowNo: k.rowNo, level: "WARNING", field: "name", message: `\u0E0A\u0E37\u0E48\u0E2D\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A "${seen.get(key).number} ${seen.get(key).name}" \u0E20\u0E32\u0E22\u0E43\u0E15\u0E49\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19 \u2014 \u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E0B\u0E49\u0E33\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48` });
        else seen.set(key, k);
      }
    }
    const codes = /* @__PURE__ */ new Map();
    for (const n of nodes) {
      const key = `${n.planIndex}|${n.projectSeq}|${n.code}`;
      if (codes.has(key)) n.code = `${n.code}#${n.seq}`;
      codes.set(key, n);
    }
    const summary = PLAN_KINDS.map((kind) => ({ kind, count: nodes.filter((n) => n.kind === kind).length })).filter((s) => s.count > 0);
    return {
      nodes,
      issues: issues.sort((a, b) => a.rowNo - b.rowNo),
      declaredTotal,
      computedTotal,
      leafCount: leaves.length,
      leafTotal: leaves.reduce((a, l) => a + (l.amountSatang ?? 0), 0),
      summary
    };
  }
  var NAME_HDR = /แผนงาน|รายการ|โครงการ.*กิจกรรม|กิจกรรม.*วิธี/;
  var UNIT_HDR = /หน่วย/;
  var QTY_HDR = /ปริมาณ|เป้าหมาย|จำนวน(?!เงิน)/;
  var AMOUNT_HDR = /งบประมาณ|จำนวนเงิน|วงเงิน|บาท/;
  var SUBHEADER = /ปริมาณ|งบประมาณ|ครั้งที่|งวดที่|บาท|จำนวน|หน่วย/;
  var PLAN_TABLE_HEADER = ["\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19 - \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 - \u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 - \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A", "\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19", "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 (\u0E1A\u0E32\u0E17)"];
  function locate(table) {
    for (let r3 = 0; r3 < Math.min(table.length, 25); r3++) {
      const cells = (table[r3] ?? []).map((c) => cleanText(c, 200));
      const name = cells.findIndex((c) => NAME_HDR.test(c));
      const unit = cells.findIndex((c) => UNIT_HDR.test(c));
      const amountIdx = cells.map((c, i) => AMOUNT_HDR.test(c) && i !== name ? i : -1).filter((i) => i >= 0).pop() ?? -1;
      if (name < 0 || unit < 0 && amountIdx < 0) continue;
      const qty = cells.findIndex((c, i) => QTY_HDR.test(c) && i !== name && i !== amountIdx);
      const cols = { name, unit: unit >= 0 ? unit : name + 1, qty: qty >= 0 ? qty : unit >= 0 ? unit + 1 : name + 2, amount: amountIdx >= 0 ? amountIdx : name + 3 };
      let headerRow = r3;
      for (let k = 1; k <= 3 && r3 + k < table.length; k++) {
        const sub = (table[r3 + k] ?? []).map((c) => cleanText(c, 200));
        if (sub[cols.name] || !sub.some((c) => SUBHEADER.test(c))) break;
        const q = sub.findIndex((c, i) => i !== cols.name && QTY_HDR.test(c));
        const a = sub.map((c, i) => i !== cols.name && AMOUNT_HDR.test(c) && !QTY_HDR.test(c) ? i : -1).filter((i) => i >= 0).pop() ?? -1;
        if (q >= 0) cols.qty = q;
        if (a >= 0) cols.amount = a;
        headerRow = r3 + k;
      }
      return { headerRow, cols };
    }
    return { headerRow: -1, cols: { name: 0, unit: 1, qty: 2, amount: 3 } };
  }
  function cellText(v) {
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
    return cleanText(v, 1e3);
  }
  function detectPlanMeta(table, headerRow = locate(table).headerRow) {
    const lines = table.slice(0, Math.max(0, headerRow) + 1).map((r3) => (r3 ?? []).map((c) => cleanText(thaiDigitsToArabic(String(c ?? "")), 300)).filter(Boolean).join(" ")).filter(Boolean);
    const all = lines.join("\n");
    const meta = {};
    const fy = all.match(/ปี(?:งบประมาณ)?\s*(?:พ\.\s*ศ\.)?\s*(25\d\d)/);
    if (fy) meta.fiscalYear = Number(fy[1]);
    const round = all.match(/(?:ครั้งที่|งวดที่)\s*(\d{1,2})/);
    if (round) meta.round = Number(round[1]);
    if (/กรมส่งเสริมการเกษตร/.test(all)) meta.fundCode = "DOAE";
    else if (/กลุ่มจังหวัด/.test(all)) meta.fundCode = "PROVGROUP";
    else if (/งบ(?:ประมาณ)?(?:พัฒนา)?จังหวัด|แผนพัฒนาจังหวัด/.test(all)) meta.fundCode = "PROVINCE";
    const bt = lines.find((l) => /^งบ(ดำเนินงาน|ลงทุน|รายจ่ายอื่น|อุดหนุน|บุคลากร)\s*$/.test(l));
    if (bt) meta.budgetType = bt;
    const title = lines.find((l) => /^(รายละเอียดงบประมาณ|แผนการใช้จ่าย|แผนปฏิบัติงาน)/.test(l));
    if (title) meta.title = title;
    const form = all.match(/แบบ\s*คง\.?\s*\d/);
    if (form) meta.form = form[0].replace(/\s+/g, " ");
    const org = lines.find((l) => /^สำนักงานเกษตร/.test(l));
    if (org) meta.org = org;
    return meta;
  }
  function normalizePlanTable(table) {
    const { headerRow, cols } = locate(table);
    const out = [[...PLAN_TABLE_HEADER]];
    for (let r3 = headerRow + 1; r3 < table.length; r3++) {
      const line = table[r3] ?? [];
      const text = cleanText(line[cols.name], 1e3);
      if (!text) continue;
      if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
      out.push([text, cellText(line[cols.unit]), cellText(line[cols.qty]), cellText(line[cols.amount])]);
    }
    return { table: out, meta: detectPlanMeta(table, headerRow), headerRow };
  }
  function parsePlanTable(table) {
    const { headerRow, cols } = locate(table);
    const rows = [];
    for (let r3 = headerRow + 1; r3 < table.length; r3++) {
      const line = table[r3] ?? [];
      const text = cleanText(line[cols.name], 1e3);
      if (!text) continue;
      if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
      rows.push({ rowNo: r3 + 1, text, unit: cleanText(line[cols.unit]), qty: cellText(line[cols.qty]), amount: line[cols.amount] ?? "" });
    }
    return { ...buildPlan(rows), headerRow };
  }
  function diffPlanTables(before, after) {
    const fields = ["name", "unit", "qty", "amount"];
    const out = [];
    const n = Math.max(before.length, after.length);
    for (let r3 = 1; r3 < n; r3++) {
      for (const f of fields) {
        const a = cleanText(before[r3]?.[PLAN_FIELD_COL[f]] ?? "", 1e3);
        const b = cleanText(after[r3]?.[PLAN_FIELD_COL[f]] ?? "", 1e3);
        if (a !== b) out.push({ rowNo: r3 + 1, field: f, before: a, after: b });
      }
    }
    return out;
  }
  function satangPlain(s) {
    return s % 100 === 0 ? String(s / 100) : (s / 100).toFixed(2);
  }
  function bahtText(s) {
    return (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  }
  function parsePlanText(text) {
    const units = [...UNIT_WORDS2].sort((a, b) => b.length - a.length).map((u) => u.replace("/", "\\/")).join("|");
    const tail = new RegExp(`^(.*?)\\s+(?:(${units})\\s+([\\d,]+(?:\\.\\d+)?)\\s+)?([\\d]{1,3}(?:,\\d{3})+(?:\\.\\d{2})?|\\d{1,6}(?:\\.\\d{2})?)\\s*$`);
    const rows = [];
    const lines = thaiDigitsToArabic(text).split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
    let lineNo = 0;
    for (const line of lines) {
      lineNo++;
      if (!line || /^(แบบ คง|รายละเอียดงบประมาณ|กรมส่งเสริม|สำนักงานเกษตร|งบดำเนินงาน|แผนงาน - โครงการ|ครั้งที่|ปริมาณ|งาน|\(บาท\)|หน่วยนับ|\d+\/\d+$)/.test(line)) continue;
      if (/^หมายเหตุ/.test(line)) break;
      const m = line.match(tail);
      let name = line;
      let unit = "";
      let qty = "";
      let amount = "";
      if (m) {
        name = m[1];
        unit = m[2] ?? "";
        qty = m[3] ?? "";
        amount = m[4];
        if (!unit && !amount.includes(",") && Number(amount) < 1e3) {
          name = line;
          amount = "";
        }
      }
      const starts = classifyPlanLine(name);
      const prev = rows.at(-1);
      if (prev && starts.rank === -2 && !prev.amount) {
        prev.text = `${prev.text} ${name}`.trim();
        if (amount) {
          prev.unit = unit;
          prev.qty = qty;
          prev.amount = amount;
        }
        continue;
      }
      if (prev && starts.rank === -2 && prev.amount && !amount) {
        prev.text = `${prev.text} ${name}`.trim();
        continue;
      }
      rows.push({ rowNo: lineNo, text: name, unit, qty, amount });
    }
    const parsed = buildPlan(rows);
    parsed.issues.unshift({ rowNo: 0, level: "WARNING", message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E2D\u0E48\u0E32\u0E19\u0E20\u0E32\u0E1E\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23 (OCR) \u2014 \u0E15\u0E23\u0E27\u0E08\u0E17\u0E38\u0E01\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E01\u0E31\u0E1A\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A \u0E2B\u0E23\u0E37\u0E2D\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E1F\u0E25\u0E4C Excel \u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E25\u0E49\u0E27\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E43\u0E2B\u0E21\u0E48" });
    return parsed;
  }
  function planToTable(p) {
    const out = [["\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19 - \u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 - \u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 - \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A", "\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19", "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 (\u0E1A\u0E32\u0E17)"]];
    out.push(["\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19", "", "", ((p.declaredTotal ?? p.computedTotal) / 100).toFixed(2)]);
    for (const n of p.nodes) {
      const prefix = n.kind === "PLAN" || n.kind === "OUTPUT" ? "" : n.number === "+" ? "+ " : n.number ? `${n.number} ` : "";
      out.push([`${prefix}${n.name}`, n.unit, n.quantity === null ? "" : String(n.quantity), n.amountSatang === null ? "" : (n.amountSatang / 100).toFixed(2)]);
    }
    return out;
  }

  // ../../packages/domain/src/memo.ts
  var TH_DIGIT = ["\u0E28\u0E39\u0E19\u0E22\u0E4C", "\u0E2B\u0E19\u0E36\u0E48\u0E07", "\u0E2A\u0E2D\u0E07", "\u0E2A\u0E32\u0E21", "\u0E2A\u0E35\u0E48", "\u0E2B\u0E49\u0E32", "\u0E2B\u0E01", "\u0E40\u0E08\u0E47\u0E14", "\u0E41\u0E1B\u0E14", "\u0E40\u0E01\u0E49\u0E32"];
  var TH_UNIT = ["", "\u0E2A\u0E34\u0E1A", "\u0E23\u0E49\u0E2D\u0E22", "\u0E1E\u0E31\u0E19", "\u0E2B\u0E21\u0E37\u0E48\u0E19", "\u0E41\u0E2A\u0E19"];
  function readGroup(n) {
    const s = String(n);
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = Number(s[i]);
      const pos = s.length - 1 - i;
      if (d === 0) continue;
      if (pos === 1) {
        out += (d === 1 ? "" : d === 2 ? "\u0E22\u0E35\u0E48" : TH_DIGIT[d]) + "\u0E2A\u0E34\u0E1A";
      } else if (pos === 0) {
        out += d === 1 && s.length > 1 && Number(s.slice(0, -1)) > 0 ? "\u0E40\u0E2D\u0E47\u0E14" : TH_DIGIT[d];
      } else {
        out += TH_DIGIT[d] + TH_UNIT[pos];
      }
    }
    return out;
  }
  function thaiNumberWords(n) {
    if (!Number.isFinite(n) || n < 0) return "";
    n = Math.floor(n);
    if (n === 0) return TH_DIGIT[0];
    const groups = [];
    while (n > 0) {
      groups.unshift(n % 1e6);
      n = Math.floor(n / 1e6);
    }
    return groups.map((g, i) => (g ? readGroup(g) : "") + (i < groups.length - 1 ? "\u0E25\u0E49\u0E32\u0E19" : "")).join("");
  }
  function bahtText2(satang) {
    const neg = satang < 0;
    const abs = Math.round(Math.abs(satang));
    const baht = Math.floor(abs / 100);
    const st = abs % 100;
    let out;
    if (st === 0) out = `${thaiNumberWords(baht)}\u0E1A\u0E32\u0E17\u0E16\u0E49\u0E27\u0E19`;
    else if (baht === 0) out = `${thaiNumberWords(st)}\u0E2A\u0E15\u0E32\u0E07\u0E04\u0E4C`;
    else out = `${thaiNumberWords(baht)}\u0E1A\u0E32\u0E17${thaiNumberWords(st)}\u0E2A\u0E15\u0E32\u0E07\u0E04\u0E4C`;
    return neg ? `\u0E25\u0E1A${out}` : out;
  }
  var THAI_NUM = "\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59";
  function thaiDigits(input) {
    return input.replace(/[0-9]/g, (c) => THAI_NUM[Number(c)]);
  }
  function formatMoneyPlain(satang) {
    const neg = satang < 0;
    const abs = Math.round(Math.abs(satang));
    const i = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const f = abs % 100;
    return `${neg ? "-" : ""}${i}${f ? `.${String(f).padStart(2, "0")}` : ""}`;
  }
  function formatThaiDateLong(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    if (!isValidYmd(y, m, d)) return "";
    return `${d} ${THAI_MONTHS[m - 1].full} ${y + BE_OFFSET}`;
  }
  var KEEP_RE = new RegExp(
    [
      "\\([^()\\n]{1,40}\\)",
      // (สี่หมื่นสี่พันบาทถ้วน), (ศดปช.), (นายกิตติ โพธิ์จวง)
      "[0-9\u0E50-\u0E59][0-9\u0E50-\u0E59,.]*\\s?\u0E1A\u0E32\u0E17",
      // 44,000 บาท
      "[0-9\u0E50-\u0E59][0-9\u0E50-\u0E59/.\\-]*",
      // รหัส เลขที่ วันที่
      "[\u0E01-\u0E2E]{1,4}\\.(?:[\u0E01-\u0E2E]{1,4}\\.)*",
      // อ. จ. ศดปช.
      "[A-Za-z][A-Za-z0-9 ]*[A-Za-z0-9]"
      // Service Provider
    ].join("|"),
    "g"
  );
  function protectGroups(text) {
    return text.replace(KEEP_RE, (g) => g.replace(/ /g, "\xA0"));
  }
  var SARABUN_SCALE = 400 / 586;
  var sizes = (scale) => {
    const sz = (thPt) => Math.round(thPt * scale * 2) / 2;
    return { body: sz(16), label: sz(20), title: sz(29) };
  };
  var MEMO_FONT_PT = sizes(SARABUN_SCALE);
  var MEMO_WEB_FONT_PT = sizes(0.4 / (1253 / 2048));
  var MEMO_SUBJECT = "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23";
  var MEMO_DEFAULT_TO = "\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23";
  function memoRemaining(d) {
    return d.budgetSatang - d.previousSatang - d.requestSatang;
  }
  var money = (s) => `${formatMoneyPlain(s)} \u0E1A\u0E32\u0E17 (${bahtText2(s)})`;
  function fromUnit(s) {
    const t2 = s.trim();
    if (!t2) return "";
    return /^(อำเภอ|สำนักงาน|กลุ่ม|ศูนย์|ฝ่าย)/.test(t2) ? t2 : `\u0E2D\u0E33\u0E40\u0E20\u0E2D${t2}`;
  }
  function memoParagraphParts(d, opts = {}) {
    const k = !!opts.keepEmpty;
    const P = (t2, f) => ({ t: t2, f });
    const sp = P(" ");
    const join = (groups) => groups.filter((g) => g.length).flatMap((g, i) => i ? [sp, ...g] : g);
    const moneyParts = (s, f) => [P(money(s), f)];
    const ref = join([
      d.refNo || k ? [P("\u0E15\u0E32\u0E21\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D\u0E17\u0E35\u0E48 "), P(d.refNo.trim(), "refNo")] : [],
      d.refDate || k ? [P("\u0E25\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 "), P(d.refDate ? formatThaiDateLong(d.refDate) : "", "refDate")] : [],
      d.refFrom || k ? [P("\u0E02\u0E2D\u0E07"), P(fromUnit(d.refFrom), "refFrom")] : []
    ]);
    const first = join([
      ref.length ? [...ref, P(" \u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E07\u0E34\u0E19"), P(d.expense.trim(), "expense")] : [P("\u0E02\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E07\u0E34\u0E19"), P(d.expense.trim(), "expense")],
      d.projectName ? [P(d.projectName.startsWith("\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23") ? d.projectName : `\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23${d.projectName}`, "projectName")] : [],
      d.mainActivityName ? [P(d.mainActivityName.startsWith("\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21") ? d.mainActivityName : `\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21${d.mainActivityName}`, "mainActivityName")] : [],
      d.fund ? [P("("), P(d.fund, "fund"), P(")")] : [],
      d.budgetCode ? [P("("), P(d.budgetCode, "budgetCode"), P(")")] : []
    ]);
    const lines = [first];
    if (d.mainActivityCode) lines.push([P("\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E25\u0E31\u0E01 "), P(d.mainActivityCode, "mainActivityCode")]);
    if (d.subActivityName) lines.push([P("\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22 "), P(d.subActivityName, "subActivityName")]);
    lines.push(
      [P("\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 "), ...moneyParts(d.budgetSatang, "budget"), P(" (\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E02\u0E2D\u0E07\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49)")],
      [P("\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E07\u0E34\u0E19/\u0E22\u0E37\u0E21\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23\u0E21\u0E32\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19 "), ...moneyParts(d.previousSatang, "previous"), P(" (\u0E23\u0E27\u0E21\u0E17\u0E38\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E38\u0E01\u0E2D\u0E33\u0E40\u0E20\u0E2D)")],
      [P("\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E07\u0E34\u0E19\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23\u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E35\u0E49 \u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19 "), ...moneyParts(d.requestSatang, "request"), P(" (\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E35\u0E49)")],
      [P("\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D "), ...moneyParts(memoRemaining(d), "remaining"), P(" (\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E02\u0E2D\u0E07\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49)")]
    );
    return lines;
  }
  function memoParagraphs(d) {
    return memoParagraphParts(d).map((ps) => ps.map((p) => p.t).join(""));
  }
  function memoBody(d) {
    const o = (d.bodyOverride ?? []).map((s) => s.trim()).filter(Boolean);
    return o.length ? o : memoParagraphs(d);
  }
  function memoOverrideStale(d) {
    if (!d.bodyOverride?.length) return false;
    const text = d.bodyOverride.join("\n");
    return [d.budgetSatang, d.previousSatang, d.requestSatang, memoRemaining(d)].some((s) => !text.includes(formatMoneyPlain(s)));
  }
  function validateMemo(d) {
    const e = [];
    if (!d.docNumber.trim()) e.push("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D");
    if (!d.date) e.push("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48");
    if (!d.expense.trim()) e.push("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E17\u0E35\u0E48\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01");
    if (!(d.requestSatang > 0)) e.push("\u0E22\u0E2D\u0E14\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E35\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0");
    if (memoRemaining(d) < 0) e.push("\u0E22\u0E2D\u0E14\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E40\u0E01\u0E34\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E02\u0E2D\u0E07\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    if (d.checks.ok && d.checks.returnFix) e.push("\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E43\u0E14\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2B\u0E19\u0E36\u0E48\u0E07: \u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D \u0E2B\u0E23\u0E37\u0E2D \u0E2A\u0E48\u0E07\u0E04\u0E37\u0E19\u0E41\u0E01\u0E49\u0E44\u0E02");
    if (d.checks.returnFix && !d.checks.returnReason.trim()) e.push("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E04\u0E37\u0E19\u0E41\u0E01\u0E49\u0E44\u0E02");
    if (!d.signer.name.trim()) e.push("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E25\u0E07\u0E19\u0E32\u0E21 \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A");
    return e;
  }
  function memoText(d, s) {
    return d.thaiNumerals ? thaiDigits(s) : s;
  }
  function memoDocNo(d) {
    const p = d.docPrefix.trim().replace(/\/$/, "");
    const n = d.docNumber.trim();
    return p ? `${p}/${n}` : n;
  }
  function withTitle(title, fullName) {
    const t2 = (title ?? "").trim();
    const n = fullName.trim();
    if (!t2 || n.startsWith(t2)) return n;
    return `${t2}${n}`;
  }

  // ../../packages/domain/src/garuda.ts
  var GARUDA_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAB5AHkDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3e4uYbS1lubiQRwQoXkduiqBkk/hXD+GtW1vWfFklxemW2thC5WxH3Y0IhMe/jPmHc+7qBgAdydH4iXFwnhO4sbOIyXWo5tY0BIyCrM/I6fu0k/HFZmi6tC3jjz0L/Z9XTzbZiowytBFJGfx8u6/74+lAHoNFQyTRxSRK8iq0j7EDHBY4JwPU4BP0Brn77xzoOn36WMl1LJM0hjIt7aScKw6glFPIPBHUHrigDpqKqWd7a6hbrPaTxTRMSA6NkZHUfUenardABRRXJ6ReTzeK7pXk3JP9oXYSSIxbvGi7RnAz5rE8dcelAHWUUUUAFFY2reI9N0V1jupJZLh0aVLa2geeVlHVtiAnHIGTx70zQfFOj+JIfM0u9E3y7trI0b7f721gDjPGcYyDQBuV55LrupaJ44uUu53l0ya6CSrKw2wIywLG6e3mSFWHTADcEHPoQYMMqQR7V5DrF42sxeJbrZ5guLa7trREGS25ora256fPNFMR+HtQB6/RVPSr+DU9KtL+2k8yC5iWRH9QRmrtAHGePrk2lrpTIJy/2xyVt22yGP7NP5hU/wB5ULMPVgB3rjUMsJ0uxS8jhP2mOOwmSMFJlaVGIT+75e4SR9QYnKkHDY7Px+q29hp+pPHdyR2l4FkS0z5xWZHt/wB3jncDMpH045rzjXI7i00C9ZpWkthB5gnjjyAq7mSRQvKpuO+Nl/1bsY2GzGADbj3+NdS0fTrrzINZs9MvGuDcDL202+IRyRsAMNvGQ69lZSM5xt+H/Dtk19faIzSTWunJFHeyZ2G9mZM7Xxj5EjK4Tp8/OSMnh9Ru9V8MeLTqFtf2809rBCu8Ln7RbyM6tLJGWVdzP9myysAeDkZIHR/C3xOdS17XrK9vPNv7p11AboljLDaI2AVWYAKEjABJPOfWgD02ysLTTrfyLK2it4clvLhQKuTyTgdzVhnVRliAMgc+9Orivifc29v4FvoJzL5lyQlskUDymSVf3oXC4IzsPORjrnNAG5revW+jae9yZIGcTLAqvMEXe2MBm52gA7icHCgnFecWPi2O2XSXit7bzLSe5lkma/VRKriV3ye28gOueHKgjC4auR0hW1G+uLm8uby9a7zcBbSeQzOGjCR+aqBWYBC4DDazBiSu0gnVsbfVsaZHf6Rqq21i6SAJZS+ZGwG4klMN80gRm3EhiA3yhdoAPcLW8t7y0hubeRXhljWVGHdWGQfxqzXzfdMNNmZodYlfS7iSGwugzvLOigkoGVM8IgbCqcNhiWb50r6ItbiK8tIbqEkxzIsiEjBwRkcfjQBQ1Hw1o2qXQurzTrd7tVCpdBds6AdNsgwy4yehrz8+C5L/AFaS2iuVTUNL1CN5bgs0Uk1q+1vNDJjE5VWiZhjeFO7naV9XryzXPGN1p3jnUZtJgiuYFgjsZ/NEm3zULNlWjVh8vmlWBxyOo20Ac/8A2zcaPoVroOi3z2morJq9xPBasCltHG02EwfuglflJ5B555B1Ln/iXw2+mWySB7eZPtKWTlxG6oBHboTz+7jxzgfvXhPVyBycEesXGnai3mQx3OrTFrhkcIAtyyeYg4PlgF2y7FmIgKqNqsRuS6lYaQRqs8oFnZoreaA+ZXLM6xxE8uGJJXd8zFmnbAWIsAeifDlnm8BaXcSJsa5V7jZ2TfIzhR/sjdgewFdZWJ4SsZdM8H6LY3C7Z7exgjkU/wALBACPzzW1QBi+KILiTw9cvaq0lxbNHdJGoyZDDIsuwe7bMfjXmQ1GDUNSuZ7KUpbzXbyW8YcQ/M24K0b42oZMEgsDHL904cMT7PXjt9bmy1I6Xf6fLbw6ZC0MV8rps+yu7+WNxyEGwbSsgMbFcNt+UkA5eC8tbLzND1C91SE2SzQz2VysSvHbnh2jUkYGAJVWNpMGMYUAAntPC3hG21HTInGvalHrOmsAzJcK8aTbCUlUbQWR1cMAT8yttbOCBzOo3reH7y3urnZ9n8tYAimSFzDuB/dxyB7dipyflk2bc8JjIm03Wbzw9rH2m1s5oIVk8hfPtkghZTJj7MSkrgfMGMb8KrFl4RvlAPWNG1yS7uH0zVIkttYgGZYVb5Zl7SxE8sh/NTwfU1/HOnxan4O1FJPmMEf2tOWX54iJF5X5hkrjKkHBOKw/FeoaN4k8Ey3cUcX20P8AZ7drk+VLY3ROGLHIMbIAWbB+6h6jGec0C98b6TBqWrwpBeabZx/v7a+vpA8jhd7MruCEKghSpJ53AsxGaAMD7XLZ6rJc2ttPbpfl2gjVI55vNBAeSQIrFA+0JvRxuMBY4Jyt6/1yaPT7eOFdUa9tvNN7L5sk/m7XGwlMkPhQSeMIwCttJxWNp63WpF7NdLvLSGSJp7WGDynPlyNKDblV+8FzN/CXXdMGRgSRfuNAv7S3+3XWjXVtE2ZJZvJX92EPDE4B4A4L+TjqG/iAA2wsrfXNTjtbi0YSas8cccmI08u2ZpC0bhAhDhoLrKgEFmXcW2jP0CMAADgelfPmiaxLbeOrG/bRZZZ5oZLPR4LhodykPjzZXBymWeYNgYySqg7K1L6/8T3HiFdL8Q67cWUCX2L6Oym8pTExGwIQgYIVYnO4nEcmfu5AB6Xqmq3V9eyaLoku24TAvL3AZbNSM4APDSkdF6KPmbjAbyrxh4SPheaK3sNUN1hPPaGW2Bl2DaqqTHjcZH+UfLuJZ2z8pr0u91PSfBOmJpGk2sKzJC8yWqvtWGMZLTzNyVTIOXOSTwMmvM9SZZVu9V1Ky1G9tgVLefpzRSTSk7PNPnbYhkYREAl2qTwCzZAK9rY2U2rQJeX8dx9jef7Sgt0kN1cEDBWDlTN8znc5fYMFwmQou3YXV1isvLeNtSj+z6fH5bTY+0YVppGIzvaLzX8xsFvKYLhVJmk0hFNtc3UNrFGJAZLu7uDEtpaFMKEOwbW2gKB5hJBG4Q8kV0nw+WbVtZvL2RHe106WRFmuEKyT3UiRl5NpAIATABbkiQ/dGEUA9NUYUAdBS0UtACVyPjywmfw9danaSyx3djbyMVWMSLNDwZEZDjOQuRggggYPUHrqO1AHhV/ZGxngkuYH8u4jWRJdIneaO9TjDgJKkm49csJj33Vmx2Fzocd19os9Yu9NllX7kWoARJjBWRHWBCnOc7hjkHOcj0nxF4bbSkl1DSYppbHZIbzSxO7RnJz5kcRDJkfNlNuGzx8wGcE281nY28kui2hhlUPHd2lpYtE+ehVzNHu4wQdg47UAcbdRwtP5EjiWa0/0eLakZuU5ZTbtbCd3kiCMybj+8Td1Izj0Xwpqmk694VXwzqlzImp3Yl+1RLJsacuWkd43ThkOW+YHHY+lef30Fro1tJqGjy+TbEFp01PVc7tuAPLFk528DbtbgAADGKzdN1mS01RNR8OLPizK3lxZwWa21rbqqlHd1aRtxKFlG0gk4OSQBQB0fiLTdV8OTyG7tfO0+fUZ1tnutQLXEpKl08shHILeXt2tuDsUO0EbqyptSvbOw0+51GDV3jaLz2Ooai/kDYmxizB5dpMxAB2RnJGGXOB6PY/EOyvGW81mymtrZUV4mWETJG3zfvAR+9AZSMbo14B65qTSfE3hQXuqtHpT29xeSMJRFaNcNcADkMsQbaeSShwfmJPJbABl+HPCWralqU2o66Z7GFoLORWsbiMwXBjkaVQEK5jVB5YAAB4PzMSSavjXVdN1rUjdabextp72Jiu7xYhMshDZRIQSBI22ScNg4QSZYjGKh174lPPbN4etLe6tzfCZftrwBWtbfB+7CjMxYLwN2znBIFYegavoltax21paG6llmNq97Kht5oWAAyMMDGPlwEEq9eAM0ATmWC8sJ7/UFvJLC0cyTyL5V4IpVBBlkkaR1nfbgAFQq4wi85plpIZNUj1S11TSYLcLiOG8vrdrhYyMl/KiRlEpGBgIcK2PWrS2d8ZHgu9fa8jySIr4XO+2YnCmLO5lPON3mP1I7mq8c17pesLG8GrXzXUogtoZTJLHcjacoonCrjgfOAyrnJ6gUAS3d1darqtokHn6pdfaFsEN/wDuAjk/MwgU7toUFmwsAKr827OB7HoekxaLpcVqnzPkyTylQrSyMcs5A4yT2HA4A4ArL8MeHJdNijvdTaOXVDGUAiVVhtEJz5USgAAdMtjLEZPAAHUUAFFFLQAlFFFAAa8U16/8KJ4wtpPDtjZ3F95r28zzXH2e0YMCz+VJnKuCuCyDb+9IbJYV6J49kkTwhdQxytD9qkitXlVwhRJJFRiGPAO1iAT3IrxNtUFj5UMOpXUJuo7m3Ror+2uIYEkuh5gCqNoJTaR90ErkYoA6FdRi1AG6/sOO1Md0LYS/2zKyEbN6ziYRbvK2KxyrrwDxyKxfEOhajpmon/hJfCulXEhV5LQ21x+4cjG5pMjz5WGQfnkAPQDJAN621CLTtcutRupIhp969xDeSG3+yPH5DRIkiqfkd0Ks21cnG/g/dG1eC11LTpLa+LXUz262tncpqJjtJolfOfMDYJUFiCc52ANlgMgC+FYbHU/C8VrdeK7uKO0tsXFpOIZY2UYCsnmISF5wVU5BIXIwMy6FoWky3E7/ANsXdhLHumV7qxhQyRj/AJeAZYdvPc4J46jLE8h4o8OPZ3lwn2YXqRS28c9rYuwBSRo9iljhSW3bAwAYkFypI3DNvYbTXbuxi0rTZPtAleET2tqkG1REzbAF5zhWZcByNpAabdgAGz4m1bRn1+1a5e+8QJa2riS7e4AJbKsXjiI8nyyMgqwwwI/2C927N1HZYvvBrWunecRZRl47dzw0jkRsrsgBDZKFAdwAHNP0DQrDSTa63eSRmwa5uPs93Y3OT+7LgMEPzO+5eAoZcORsXnJrOtDTdPikmuA0sNuYtNiu3hBITLK4wApClVYlRh3iiRNwQs4BBqXitrfSdVspNK1CP7JEibzrMvlmMyGEukfmKZAGVh8vBIHIBGfSvA9joLWf9oadqU+q3ioLaW5vJN00W3rGV48voMrgZwCc9a8gitLOyN1YxTaZNIftttILONr2Z7byVl4MpUMY/kUAAHhiB96tjwPe3GmeLLa6WG9E95Pb2t5E2ki1VvNtw3VPlGworAEA7XfrmgD3qigUUAFLSUtADaWiigDP1fSrXWtJutMvY/MtrmMxyLnBwfQ9iOoPrXjmv+HfEmiWwivre71S0W6lH221igYJbztuk/dmItG5bDFgGA5wR0r1PVvFFrpWow6bHbXN9qUyGVbW12btgzzl2UZwrYGcna2BwcNHjPRY4ydQmm0ojqNSha2HrwzgK34E0AfPAeygu7Se01XNoInhazieZkLMxWVFCOCxKsrkqY0bBwOw2NOm8X2aXMtrYxXNhHbRalfWM0ysFGzaZSxCtG7BGlXaQ3OTnvpfEu80bUNWg1LR9NlYwxyz3txFEqeeuz5SQ6tnG7OSvRs9CDWfBcT6l4Za3g1hpYIp1Or2KlzdaiWHzlnhWQ7T8qqSTn5skcKACOCOy8c+J9J8PaZFPp9rDIGurddRS4hQLzvQLlWO1WG4g/NIM+97xP4GvLbw3Pq7QtaT6XcRwjeUi3YBQzxsoBWMOyMgyMBXz14rNeq+t2mo6JpZ0mziLRx2Ko8b26Btssj+TlwcoQxx0CANwwDtW8Y3fifSpLSNXuUaFWlVrqS4VQ8LN8yxjaMMFU7uUYggjkgArxeJV8RXX2Dw9ps+qapJbiZpNSvI3LBVBZQhzvOc4R2cAjdt7jPkvtbkdzvmh1DUI2Ju5nhlluIpdkg2HyhkiMQqq71O4gKB90XrX+x9Q1WxFpc2OneI9NlW4uNYlfEM0Q+YFlQFDKMgPkgEgkM2ciP7dPqdwIBdMbOOSN7oWyBBMqsxm+zSIcBCVYAZVc5bA3OVALzQA6nY3WpXty8uqTwRX101u80r3ERMkqrDhTtVo4UK+U6jGMgqa9B+H/gyazvG1rUdNttPlV5TbW0MXllgzNiWRASFYIdiqPugt/ewN/wzY+EdKspb/RVtYlct51xI5MoI5ZZGc7wQckq2CDnIzVuHxn4emaNbfVYbiNpBF50GZYlckAK0qgopJIABIzkYoA6GiiigAooooAKKKKAPF/HumjSfiVaaw0K3cF/F5k0MgMhxGhRwqEhckNEAQc/M/atzQxAmqG4023fU4lY4/sfTTa2h45+aaby3zxzH6c9a9J2qWDYG4AgHv/ngVU1Y3y6PenTFRr8QP9lEn3TLtO3PtnFAHBeKtRE1h5MulpYaijieFRd2zNv3dZIznevJfADZIBGGAIy7zxAlzdWPiPQ7SSLUm8pr26lneKC5UJg24BzkHPDbQAQCCx4OJKdSjuFjlgm06Nke6Z7jSY576VQ6oOH3EytJIo3ZC/eIVVALA1SWedUEEj3dsJGe41nUTPJZgSGMmQYSKIllI5cggfdbIUgGzpSeFvGmqG31XTH0XWRMLtEe6DPcpIdxWNyAV+cfMqbWU7hkFnFXNQ8B+G/DmkvqPiK/32VtLvaKViyzxIMpGVdjlyVDErjccjGDiuP8Q2NvqmjzXG/zY4CJWv8AaVychUZGOCFBIVThQzfcUIjA3NY0YPq0Md7dXusOiXS26X11uMXlztAoGflXeuF8wjKyeWxOCRQBes/GdzFaQ6XBpF9pNlJJJPcySXPnXbJlt6jzFwGBwCWJIAK53Yq/Zaj4bhutGtbIPc6Hp9u3klIAZJpmA2xSgqOMEEZ6vGCxBUZ5u7vJdO8PnWfs8+qaXEwEk0BKSq33SW3B9joAoIcZHy7ZNoCindXGo2Wj3s2jpb3KJJifTNT08F3Xci/JNGzecFaZQfnyN3IHQgHqN1e+Hp3mkvPDlxYXEoCPdT6RlQeg3SqjqB/tE7R61wXjS9v7i1sNHsp5Ltb2RWVbHVUuIp0THysrxqq5bChRkE8bTwp7b4bx/YpdTsbG4a40dFhliyH2W9w27zoELgHauFO08qWIPOa6mTwxokuorqJ0mzF8JRMblYlWRmHQswGW/GgCzo1pJZaLY2ks0s0sECRvLLje5CgEtjvWhRRQAUUUUAFFFLQAlFLSUAZWp6Fp2ry28t3DJ59uxMM8MrwyR54IDoQwB7jODXG+Jvh0JdJv4NCSySKWIv8AZJrUSEziNkV0cnhiGIJYNyS3B5r0ik70AeSW+iXGvyz6NEtxLpEmnTBpLy3ljmiu2RVE1wXH7yQlpMBeFAz/AHTVe5X7Zpd/4ltbYieDyLMB4nKQy75GvGlUgloc3DqwA/gOMYDD2Lt+FQWv+qP/AF0f/wBDNAHi2keErvxJ4i1u807UrG40xwLb7Q7NcbDNCBcGKRSA7gbV3EENxu5Bz6Lb+BbO2nhRL+8bTY5Vn/s5ihhaVcYYnbu+8A+3O3cM4rrO9FACUtFFABRS0UAJRS0UAf/Z";

  // ../../packages/domain/src/budgetCodes.ts
  var BUDGET_CODE_SECTION_NAME = {
    REGULAR: "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35",
    OTHER: "\u0E07\u0E1A\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E2D\u0E37\u0E48\u0E19",
    SUBSIDY: "\u0E07\u0E1A\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19",
    INVESTMENT: "\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E25\u0E07\u0E17\u0E38\u0E19"
  };
  var P1 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10";
  var P2 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32";
  var P3 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E43\u0E19\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19";
  var P4 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1E\u0E25\u0E31\u0E07\u0E17\u0E32\u0E07\u0E2A\u0E31\u0E07\u0E04\u0E21";
  var P5 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E41\u0E25\u0E30\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E10\u0E32\u0E19\u0E23\u0E32\u0E01";
  var P6 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19\u0E41\u0E25\u0E30\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23\u0E14\u0E34\u0E19";
  var P7 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E21\u0E25\u0E1E\u0E34\u0E29\u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E41\u0E27\u0E14\u0E25\u0E49\u0E2D\u0E21";
  var P8 = "\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E1A\u0E39\u0E23\u0E13\u0E32\u0E01\u0E32\u0E23\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25";
  var REGULAR_2570 = [
    [P1, [
      ["1.1", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E23\u0E21\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E21\u0E41\u0E02\u0E47\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E30\u0E1A\u0E1A", "", "1.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19", "07011708661000000", "\u0E07\u0E1A\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23", "07011140002001000000"],
      ["1.1", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10 \u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E23\u0E21\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E21\u0E41\u0E02\u0E47\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E30\u0E1A\u0E1A", "", "1.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19", "07011708661000000", "\u0E07\u0E1A\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19", "07011142002002000000"]
    ]],
    [P2, [
      ["2.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E0A\u0E19\u0E4C\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19\u0E41\u0E25\u0E30\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23\u0E15\u0E32\u0E21\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E40\u0E01\u0E29\u0E15\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E34\u0E07\u0E23\u0E38\u0E01", "07011152005002000000", "2.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E1B\u0E23\u0E30\u0E42\u0E22\u0E0A\u0E19\u0E4C\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19\u0E41\u0E25\u0E30\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23\u0E15\u0E32\u0E21\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48\u0E40\u0E01\u0E29\u0E15\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E34\u0E07\u0E23\u0E38\u0E01", "07011706795600000"],
      ["2.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E37\u0E0A", "07011152010002000000", "2.2.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1B\u0E23\u0E30\u0E22\u0E38\u0E01\u0E15\u0E4C\u0E43\u0E0A\u0E49\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E20\u0E39\u0E21\u0E34\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1E\u0E22\u0E32\u0E01\u0E23\u0E13\u0E4C\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "07011700003900000"],
      ["2.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E37\u0E0A", "07011152010002000000", "2.2.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E02\u0E36\u0E49\u0E19\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E37\u0E0A", "07011708390400000"],
      ["2.3", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15", "07011152013002000000", "2.3.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E43\u0E19\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48", "07011700010200000"],
      ["2.3", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15", "07011152013002000000", "2.3.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E2A\u0E39\u0E48\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E34\u0E19\u0E17\u0E23\u0E35\u0E22\u0E4C", "07011700010300000"],
      ["2.3", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15", "07011152013002000000", "2.3.3", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E23\u0E21\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19", "07011700010400000"],
      ["2.3", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15", "07011152013002000000", "2.3.4", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E1A\u0E1A\u0E41\u0E1B\u0E25\u0E07\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15", "07011708390800000"],
      ["2.4", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E02\u0E22\u0E32\u0E22\u0E1C\u0E25\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35 \u0E41\u0E25\u0E30\u0E19\u0E27\u0E31\u0E15\u0E01\u0E23\u0E23\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E2A\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48", "07011152017002000000", "2.4.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E02\u0E22\u0E32\u0E22\u0E1C\u0E25\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E41\u0E25\u0E30\u0E19\u0E27\u0E31\u0E15\u0E01\u0E23\u0E23\u0E21\u0E40\u0E01\u0E29\u0E15\u0E23\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E2A\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48", "07011700009600000"],
      ["2.5", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E34\u0E48\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C", "07011152020002000000", "2.5.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E20\u0E39\u0E21\u0E34\u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E17\u0E49\u0E2D\u0E07\u0E16\u0E34\u0E48\u0E19\u0E41\u0E25\u0E30\u0E19\u0E27\u0E31\u0E15\u0E01\u0E23\u0E23\u0E21\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E34\u0E48\u0E19", "07011700006200000"],
      ["2.5", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E34\u0E48\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C", "07011152020002000000", "2.5.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E25\u0E37\u0E2D\u0E17\u0E30\u0E40\u0E25\u0E15\u0E32\u0E21\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C", "07011700008600000"],
      ["2.5", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E34\u0E48\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C", "07011152020002000000", "2.5.3", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E31\u0E15\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E34\u0E48\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C", "07011700010000000"],
      ["2.6", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E0A\u0E35\u0E27\u0E20\u0E32\u0E1E\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E0A\u0E35\u0E27\u0E20\u0E32\u0E1E", "07011152021002000000", "2.6.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E2A\u0E21\u0E38\u0E19\u0E44\u0E1E\u0E23\u0E0A\u0E35\u0E27\u0E20\u0E32\u0E1E", "07011700004900000"],
      ["2.6", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E0A\u0E35\u0E27\u0E20\u0E32\u0E1E\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08\u0E0A\u0E35\u0E27\u0E20\u0E32\u0E1E", "07011152021002000000", "2.6.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E21\u0E25\u0E07\u0E40\u0E28\u0E23\u0E29\u0E10\u0E01\u0E34\u0E08", "07011700006400000"],
      ["2.7", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E15\u0E25\u0E32\u0E14\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011152023002000000", "2.7.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E15\u0E25\u0E32\u0E14\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011708390200000"],
      ["2.8", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1C\u0E39\u0E49\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E27\u0E34\u0E2A\u0E32\u0E2B\u0E01\u0E34\u0E08\u0E0A\u0E38\u0E21\u0E0A\u0E19", "07011152024002000000", "2.8.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1C\u0E39\u0E49\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E27\u0E34\u0E2A\u0E32\u0E2B\u0E01\u0E34\u0E08\u0E0A\u0E38\u0E21\u0E0A\u0E19", "07011708391900000"],
      ["2.9", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E2A\u0E39\u0E07", "07011152037002000000", "2.9.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E42\u0E0B\u0E48\u0E2D\u0E38\u0E1B\u0E17\u0E32\u0E19\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E2A\u0E39\u0E07", "07011700009700000"],
      ["2.10", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E2A\u0E39\u0E07", "07011152054002000000", "2.10.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E2A\u0E39\u0E07", "07011700010700000"]
    ]],
    [P3, [
      ["3.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "07011302001002000000", "3.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011708389900000"],
      ["3.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "07011302001002000000", "3.1.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C", "07011708390100000"]
    ]],
    [P4, [
      ["4.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E1E\u0E34\u0E40\u0E28\u0E29\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19", "07011382009002000000", "4.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E1E\u0E34\u0E40\u0E28\u0E29\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19", "07011708390600000"],
      ["4.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "07011382018002000000", "4.2.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E02\u0E22\u0E32\u0E22\u0E1C\u0E25\u0E41\u0E1B\u0E25\u0E07\u0E15\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E39\u0E49\u0E04\u0E38\u0E13\u0E04\u0E48\u0E32\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "07011700005200000"],
      ["4.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "07011382018002000000", "4.2.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "07011709708100000"]
    ]],
    [P5, [
      ["5.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2D\u0E32\u0E0A\u0E35\u0E1E\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E43\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E32\u0E22\u0E41\u0E14\u0E19\u0E20\u0E32\u0E04\u0E43\u0E15\u0E49", "07011422003002000000", "5.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E2D\u0E32\u0E0A\u0E35\u0E1E\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E43\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E0A\u0E32\u0E22\u0E41\u0E14\u0E19\u0E20\u0E32\u0E04\u0E43\u0E15\u0E49", "07011708390300000"],
      ["5.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23", "07011422007002000000", "5.2.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23", "07011708390500000"],
      ["5.3", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E41\u0E25\u0E30\u0E41\u0E19\u0E27\u0E04\u0E34\u0E14\u0E1C\u0E39\u0E49\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E40\u0E01\u0E29\u0E15\u0E23 (\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E1B\u0E23\u0E32\u0E14\u0E40\u0E1B\u0E23\u0E37\u0E48\u0E2D\u0E07 (Smart Farmer))", "07011422008002000000", "5.3.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E1B\u0E23\u0E32\u0E14\u0E40\u0E1B\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E23\u0E38\u0E48\u0E19\u0E43\u0E2B\u0E21\u0E48 (Smart Farmer & Young Smart Farmer)", "07011707696500000"],
      ["5.4", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E01\u0E32\u0E23\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "07011422015002000000", "5.4.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E01\u0E32\u0E23\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "07011708391400000"],
      ["5.5", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011422029002000000", "5.5.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E21\u0E41\u0E02\u0E47\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23", "07011700006100000"],
      ["5.5", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011422029002000000", "5.5.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E19\u0E17\u0E38\u0E01\u0E0A\u0E48\u0E27\u0E07\u0E27\u0E31\u0E22\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E04\u0E19\u0E41\u0E1A\u0E1A\u0E0A\u0E35\u0E49\u0E40\u0E1B\u0E49\u0E32 (TPMAP)", "07011700009300000"]
    ]],
    [P6, [
      ["6.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2D\u0E32\u0E0A\u0E35\u0E1E\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19\u0E17\u0E33\u0E01\u0E34\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011432011002000000", "6.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E2D\u0E32\u0E0A\u0E35\u0E1E\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E17\u0E35\u0E48\u0E14\u0E34\u0E19\u0E17\u0E33\u0E01\u0E34\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011708392000000"]
    ]],
    [P7, [
      ["7.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E2A\u0E34\u0E48\u0E07\u0E41\u0E27\u0E14\u0E25\u0E49\u0E2D\u0E21", "07011522012002000000", "7.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E2A\u0E34\u0E48\u0E07\u0E41\u0E27\u0E14\u0E25\u0E49\u0E2D\u0E21", "07011707686400000"]
    ]],
    [P8, [
      ["8.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25", "07011592052002000000", "8.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E17\u0E31\u0E01\u0E29\u0E30\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E20\u0E32\u0E04\u0E23\u0E31\u0E10\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25", "07011700009400000"]
    ]]
  ];
  var OTHER_2570 = [
    [P2, [
      ["1.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E02\u0E22\u0E32\u0E22\u0E1E\u0E37\u0E0A\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E14\u0E35\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07\u0E14\u0E49\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23", "", "1.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E02\u0E22\u0E32\u0E22\u0E1E\u0E37\u0E0A\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E14\u0E35\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07\u0E14\u0E49\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23", "07011700005100000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E02\u0E22\u0E32\u0E22\u0E1E\u0E37\u0E0A\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E14\u0E35", "07011150022005000001"],
      ["1.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E02\u0E22\u0E32\u0E22\u0E1E\u0E37\u0E0A\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E14\u0E35\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E41\u0E25\u0E30\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07\u0E14\u0E49\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23", "", "1.1.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E21\u0E31\u0E19\u0E2A\u0E33\u0E1B\u0E30\u0E2B\u0E25\u0E31\u0E07", "07011700011200000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E21\u0E31\u0E19\u0E2A\u0E33\u0E1B\u0E30\u0E2B\u0E25\u0E31\u0E07", "07011150022005000002"],
      ["1.2", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E1E\u0E37\u0E0A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "", "1.2.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E1E\u0E37\u0E0A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "07011700009900000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E1E\u0E37\u0E0A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23", "07011150034005000001"]
    ]],
    [P3, [
      ["2.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "", "2.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23", "07011708389900000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E2D\u0E38\u0E17\u0E22\u0E32\u0E19\u0E1C\u0E31\u0E01\u0E1E\u0E37\u0E49\u0E19\u0E1A\u0E49\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E22\u0E31\u0E07\u0E0A\u0E35\u0E1E\u0E40\u0E09\u0E25\u0E34\u0E21\u0E1E\u0E23\u0E30\u0E40\u0E01\u0E35\u0E22\u0E23\u0E15\u0E34\u0E1A\u0E36\u0E07\u0E09\u0E27\u0E32\u0E01", "07011300001005000001"],
      ["2.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "", "2.1.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C", "07011708390100000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23\u0E15\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27", "07011300001005000002"],
      ["2.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "", "2.1.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C", "07011708390100000", "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E2B\u0E32\u0E23\u0E37\u0E2D\u0E41\u0E25\u0E30\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E04\u0E27\u0E32\u0E21\u0E23\u0E48\u0E27\u0E21\u0E21\u0E37\u0E2D\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28", "07011300001005000003"],
      ["2.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "", "2.1.2", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C", "07011708390100000", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E23\u0E48\u0E27\u0E21\u0E07\u0E32\u0E19\u0E21\u0E2B\u0E01\u0E23\u0E23\u0E21\u0E1E\u0E37\u0E0A\u0E2A\u0E27\u0E19\u0E42\u0E25\u0E01 \u0E1E.\u0E28. 2570 \u0E13 \u0E40\u0E21\u0E37\u0E2D\u0E07\u0E42\u0E22\u0E42\u0E01\u0E2E\u0E32\u0E21\u0E32 \u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E0D\u0E35\u0E48\u0E1B\u0E38\u0E48\u0E19 (International Horticultural Expo 2027, Yokohama, Japan)", "07011300001005000004"]
    ]]
  ];
  var SUBSIDY_2570 = [
    [P4, [
      ["1.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "", "1.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E19\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34", "07011709708100000", "\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E38\u0E14\u0E2B\u0E19\u0E38\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E21\u0E39\u0E25\u0E19\u0E34\u0E18\u0E34\u0E1B\u0E34\u0E14\u0E17\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E1E\u0E23\u0E30\u0E2A\u0E37\u0E1A\u0E2A\u0E32\u0E19\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34\u0E41\u0E25\u0E30\u0E2A\u0E16\u0E32\u0E1A\u0E31\u0E19\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E1B\u0E34\u0E14\u0E17\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E1E\u0E23\u0E30\u0E2A\u0E37\u0E1A\u0E2A\u0E32\u0E19\u0E41\u0E19\u0E27\u0E1E\u0E23\u0E30\u0E23\u0E32\u0E0A\u0E14\u0E33\u0E23\u0E34 (\u0E23\u0E2B\u0E31\u0E2A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E22\u0E48\u0E2D\u0E22 0260301)", "07011380018004100001"]
    ]]
  ];
  var INVESTMENT_2570 = [
    [P3, [
      ["1.1", "\u0E1C\u0E25\u0E1C\u0E25\u0E34\u0E15\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E28\u0E31\u0E01\u0E22\u0E20\u0E32\u0E1E", "", "1.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E41\u0E25\u0E30\u0E2A\u0E2B\u0E01\u0E23\u0E13\u0E4C", "07011708390100000", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E07\u0E1A\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19 (\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E25\u0E07\u0E17\u0E38\u0E19)", "07011301001002000000"]
    ]],
    [P2, [
      ["2.1", "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E37\u0E0A", "", "2.1.1", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E02\u0E36\u0E49\u0E19\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E14\u0E49\u0E32\u0E19\u0E1E\u0E37\u0E0A", "07011708390400000", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E07\u0E1A\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19 (\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E25\u0E07\u0E17\u0E38\u0E19)", "07011151010002000000"]
    ]]
  ];
  function expand(fy, section, groups) {
    return groups.flatMap(([planName, rows]) => rows.map(([projectNo, projectName, projectCode, activityNo, activityName, activityCode, itemName = "", itemCode = ""]) => ({
      fiscalYear: fy,
      section,
      planName,
      projectNo,
      projectName,
      activityNo,
      activityName,
      mainActivityCode: activityCode,
      itemName,
      budgetCode: itemCode || projectCode
    })));
  }
  var BUDGET_CODES_2570 = [
    ...expand(2570, "REGULAR", REGULAR_2570),
    ...expand(2570, "OTHER", OTHER_2570),
    ...expand(2570, "SUBSIDY", SUBSIDY_2570),
    ...expand(2570, "INVESTMENT", INVESTMENT_2570)
  ];
  function codeKey(name) {
    return normalizeKey(String(name).replace(/^\s*(\d+(\.\d+)*\s*)?(โครงการ|กิจกรรม(ย่อย)?|ผลผลิต)\s*/, ""));
  }
  function sectionOfChain(chain) {
    const bt = chain.filter((n) => n.kind === "BUDGET_TYPE").map((n) => n.name).join(" ");
    if (/อุดหนุน/.test(bt)) return "SUBSIDY";
    if (/ลงทุน/.test(bt)) return "INVESTMENT";
    if (/รายจ่ายอื่น/.test(bt)) return "OTHER";
    return "REGULAR";
  }
  function matchBudgetCodes(entries, fiscalYear, chain) {
    const fyRows = entries.filter((e2) => Number(e2.fiscalYear) === Number(fiscalYear));
    if (!fyRows.length) return null;
    const section = sectionOfChain(chain);
    const btText = codeKey(chain.filter((n) => n.kind === "BUDGET_TYPE").map((n) => n.name).join(" "));
    const projKeys = new Set(chain.map((n) => codeKey(n.name)));
    const pick = (rows) => {
      for (const n of [...chain].reverse()) {
        const k = codeKey(n.name);
        if (!k) continue;
        let hit = rows.filter((e2) => codeKey(e2.activityName) === k);
        if (!hit.length) continue;
        if (new Set(hit.map((e2) => e2.projectName)).size > 1) {
          const byProj = hit.filter((e2) => projKeys.has(codeKey(e2.projectName)));
          if (byProj.length) hit = byProj;
        }
        if (hit.length === 1) return hit[0];
        const byItem = hit.filter((e2) => e2.itemName && btText.includes(codeKey(e2.itemName)));
        if (byItem.length === 1) return byItem[0];
        return new Set(hit.map((e2) => e2.budgetCode)).size === 1 ? hit[0] : null;
      }
      return null;
    };
    const e = pick(fyRows.filter((x) => x.section === section));
    if (!e) return null;
    return {
      budgetCode: e.budgetCode,
      mainActivityCode: e.mainActivityCode,
      section: e.section,
      activityName: e.activityName,
      itemName: e.itemName,
      ref: `${BUDGET_CODE_SECTION_NAME[e.section]} ${e.activityNo}`
    };
  }

  // src/core/context.ts
  var SYSTEM_USER = { sub: "SYSTEM", name: "\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34", role: "superadmin", workgroupIds: null, workgroupName: "\u0E17\u0E38\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19" };
  function nowIso(ctx) {
    return ctx.env.now().toISOString();
  }
  function actor(ctx) {
    if (!ctx.user) throw new AppError("AUTH_REQUIRED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    return ctx.user;
  }
  function newMeta(ctx) {
    const at = nowIso(ctx);
    const by = ctx.user?.sub ?? "PUBLIC";
    return { id: ctx.env.uuid(), createdAt: at, createdBy: by, updatedAt: at, updatedBy: by, version: 1, isDeleted: false };
  }
  function live(rows) {
    return rows.filter((r3) => !r3.isDeleted);
  }
  function findById(ctx, table, id, label = "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25") {
    const row = ctx.env.db.list(table).find((r3) => r3.id === id && !r3.isDeleted);
    if (!row) throw new AppError("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A${label}`);
    return row;
  }
  function updateVersioned(ctx, table, current, expectedVersion, patch) {
    if (Number(current.version) !== Number(expectedVersion)) {
      throw new AppError("VERSION_CONFLICT", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E16\u0E39\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E14\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E42\u0E1B\u0E23\u0E14\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E41\u0E01\u0E49\u0E44\u0E02", { current });
    }
    const next = { ...current, ...patch, version: Number(current.version) + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub };
    ctx.env.db.update(table, current.id, next);
    return next;
  }
  function findByIdempotency(ctx, table, key) {
    if (!key) throw new AppError("VALIDATION_FAILED", "\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 idempotencyKey");
    return ctx.env.db.list(table).find((r3) => r3.idempotencyKey === key) ?? null;
  }
  var PII_KEYS = /* @__PURE__ */ new Set(["phone", "phoneHash", "knownDevices", "ocrText", "password", "token"]);
  function redact(obj) {
    if (obj === null || obj === void 0) return "";
    return JSON.stringify(obj, (k, v) => PII_KEYS.has(k) ? k === "phone" && v ? "[masked]" : void 0 : v).slice(0, 8e3);
  }
  function audit(ctx, action, entityType, entityId, opts = {}) {
    const u = ctx.user;
    ctx.env.db.insert("AuditLogs", [{
      id: ctx.env.uuid(),
      at: nowIso(ctx),
      requestId: ctx.requestId,
      actorId: u?.sub ?? "PUBLIC",
      actorName: u?.name ?? "\u0E2A\u0E32\u0E18\u0E32\u0E23\u0E13\u0E30",
      actorRole: u?.role ?? "public",
      action,
      entityType,
      entityId,
      projectId: opts.projectId ?? "",
      before: redact(opts.before),
      after: redact(opts.after),
      reason: opts.reason ?? ""
    }]);
  }
  function dataVersion(ctx) {
    let v = ctx.env.cache.get("dataVersion");
    if (!v) {
      v = String(ctx.env.now().getTime());
      ctx.env.cache.put("dataVersion", v, 21600);
    }
    return v;
  }
  function bumpDataVersion(ctx) {
    ctx.env.cache.put("dataVersion", `${ctx.env.now().getTime()}-${ctx.env.uuid().slice(0, 4)}`, 21600);
  }
  var DEFAULT_SETTINGS = {
    autoCommitClean: "false",
    defaultQuarterTargets: "30,55,80,100",
    /** เป้าเบิกจ่ายทั้งปี (%) — มาตรการเร่งรัดฯ ปี 2570: รายจ่ายประจำไม่น้อยกว่า 98% */
    annualTargetPct: "98",
    maxUploadMB: "15",
    backupRetentionDays: "30",
    publicNotice: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E20\u0E32\u0E22\u0E43\u0E19 \u0E21\u0E34\u0E43\u0E0A\u0E48\u0E22\u0E2D\u0E14\u0E17\u0E32\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23 (\u0E22\u0E2D\u0E14\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E23\u0E30\u0E1A\u0E1A New GFMIS Thai)",
    lastImportAt: "",
    lastBackupAt: ""
  };
  function getSettings(ctx) {
    const out = { ...DEFAULT_SETTINGS };
    for (const r3 of ctx.env.db.list("Settings")) out[r3.key] = String(r3.value ?? "");
    return out;
  }
  function spendTargetFor(ctx, fy) {
    const s = getSettings(ctx);
    return parseSpendTarget(s[`spendTarget:${fy}`], s.defaultQuarterTargets);
  }
  function curveFor(ctx, fy) {
    return targetCurve(spendTargetFor(ctx, fy));
  }
  function setSetting(ctx, key, value) {
    const rows = ctx.env.db.list("Settings");
    const existing = rows.find((r3) => r3.key === key);
    const by = ctx.user?.sub ?? "SYSTEM";
    if (existing) ctx.env.db.update("Settings", key, { key, value, updatedAt: nowIso(ctx), updatedBy: by });
    else ctx.env.db.insert("Settings", [{ key, value, updatedAt: nowIso(ctx), updatedBy: by }]);
  }

  // src/core/auth.ts
  var TOKEN_HOURS = 8;
  var PBKDF2_ITERATIONS = 2e4;
  var PHONE_FAIL_LIMIT = 5;
  var PHONE_FAIL_WINDOW_S = 15 * 60;
  var GLOBAL_FAIL_LIMIT = 30;
  var GLOBAL_FAIL_WINDOW_S = 10 * 60;
  var SUPER_FAIL_LIMIT = 5;
  var SUPER_LOCK_S = 15 * 60;
  function safeEqual(a, b) {
    let diff = a.length ^ b.length;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return diff === 0;
  }
  function tokenSecret(ctx) {
    let s = ctx.env.props.get("TOKEN_SECRET");
    if (!s) {
      s = ctx.env.crypto.randomHex(32);
      ctx.env.props.set("TOKEN_SECRET", s);
    }
    return s;
  }
  function signToken(ctx, p) {
    const payload = { ...p, exp: ctx.env.now().getTime() + TOKEN_HOURS * 36e5, jti: ctx.env.uuid() };
    const body = ctx.env.crypto.b64urlEncodeUtf8(JSON.stringify(payload));
    return `${body}.${ctx.env.crypto.hmacSha256B64Url(tokenSecret(ctx), body)}`;
  }
  function verifyToken(ctx, token) {
    const parts = String(token ?? "").split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AppError("AUTH_REQUIRED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    const expected = ctx.env.crypto.hmacSha256B64Url(tokenSecret(ctx), parts[0]);
    if (!safeEqual(expected, parts[1])) throw new AppError("AUTH_REQUIRED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    let p;
    try {
      p = JSON.parse(ctx.env.crypto.b64urlDecodeUtf8(parts[0]));
    } catch {
      throw new AppError("AUTH_REQUIRED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    }
    if (!p.exp || ctx.env.now().getTime() > p.exp) throw new AppError("TOKEN_EXPIRED", "\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    if (p.role === "superadmin") {
      const tv = Number(ctx.env.props.get("SUPER_TV") || "1");
      if (p.tv !== tv) throw new AppError("TOKEN_REVOKED", "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E16\u0E39\u0E01\u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
      return superUser(ctx);
    }
    const user = ctx.env.db.list("Users").find((u) => u.id === p.sub && !u.isDeleted);
    if (!user) throw new AppError("TOKEN_REVOKED", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E16\u0E39\u0E01\u0E25\u0E1A");
    if (user.status !== "active") throw new AppError("ACCOUNT_SUSPENDED", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A");
    if (Number(user.tokenVersion) !== p.tv) throw new AppError("TOKEN_REVOKED", "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E16\u0E39\u0E01\u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    return toSessionUser(ctx, user);
  }
  function superUser(ctx) {
    const name = ctx.env.props.get("SUPER_USER") || "superadmin";
    return { sub: `SUPER:${name}`, name: `Super Admin (${name})`, role: "superadmin", workgroupIds: null, workgroupName: "\u0E17\u0E38\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19" };
  }
  function toSessionUser(ctx, u) {
    const groups = ctx.env.db.list("Workgroups");
    if (u.role === "minisuper") {
      return { sub: u.id, name: u.fullName, role: "minisuper", workgroupIds: null, workgroupName: "\u0E17\u0E38\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19" };
    }
    let scope = [];
    try {
      scope = JSON.parse(u.scopeWorkgroups || "[]");
    } catch {
      scope = [];
    }
    const ids = [...new Set([u.workgroupId, ...scope].filter(Boolean))];
    return {
      sub: u.id,
      name: u.fullName,
      role: "admin",
      workgroupIds: ids,
      workgroupName: groups.find((g) => g.id === u.workgroupId)?.name ?? ""
    };
  }
  function bumpCounter(ctx, key, ttl) {
    const n = Number(ctx.env.cache.get(key) || "0") + 1;
    ctx.env.cache.put(key, String(n), ttl);
    return n;
  }
  function counter(ctx, key) {
    return Number(ctx.env.cache.get(key) || "0");
  }
  function deviceHash(ctx, device) {
    return ctx.env.crypto.sha256Hex(`dev:${cleanText(device, 200)}`).slice(0, 16);
  }
  function logAttempt(ctx, role, identifierMasked, result, userId = "", newDevice = false) {
    ctx.env.db.insert("LoginAttempts", [{
      id: ctx.env.uuid(),
      at: nowIso(ctx),
      role,
      identifierMasked,
      result,
      userId,
      device: cleanText(ctx.device, 120),
      newDevice
    }]);
  }
  function phoneHash(ctx, phone) {
    return ctx.env.crypto.sha256Hex(`phone:${normalizePhone(phone)}`);
  }
  function loginAdmin(ctx, body) {
    const phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) {
      logAttempt(ctx, "admin", String(body.phone ?? "").slice(0, 3) + "\u2026", "invalid");
      throw new AppError("VALIDATION_FAILED", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 0812345678)");
    }
    const h = phoneHash(ctx, phone);
    const phoneKey = `thr:p:${h.slice(0, 24)}`;
    if (counter(ctx, phoneKey) >= PHONE_FAIL_LIMIT || counter(ctx, "thr:global") >= GLOBAL_FAIL_LIMIT) {
      logAttempt(ctx, "admin", maskPhone(phone), "throttled");
      throw new AppError("LOGIN_THROTTLED", "\u0E21\u0E35\u0E01\u0E32\u0E23\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E48\u0E2D\u0E22\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D 15 \u0E19\u0E32\u0E17\u0E35\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48");
    }
    const user = ctx.env.db.list("Users").find((u) => !u.isDeleted && (u.phoneHash === h || normalizePhone(u.phone) === phone));
    if (!user) {
      bumpCounter(ctx, phoneKey, PHONE_FAIL_WINDOW_S);
      bumpCounter(ctx, "thr:global", GLOBAL_FAIL_WINDOW_S);
      logAttempt(ctx, "admin", maskPhone(phone), "not_found_or_pending");
      throw new AppError("ACCOUNT_PENDING", "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E33\u0E02\u0E2D\u0E22\u0E31\u0E07\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34");
    }
    if (user.status !== "active") {
      logAttempt(ctx, user.role, maskPhone(phone), "suspended", user.id);
      throw new AppError("ACCOUNT_SUSPENDED", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A");
    }
    const dh = deviceHash(ctx, ctx.device);
    let known = [];
    try {
      known = JSON.parse(user.knownDevices || "[]");
    } catch {
      known = [];
    }
    const isNew = !known.includes(dh);
    if (isNew) known = [dh, ...known].slice(0, 10);
    ctx.env.db.update("Users", user.id, { ...user, lastLoginAt: nowIso(ctx), knownDevices: JSON.stringify(known) });
    logAttempt(ctx, user.role, maskPhone(phone), "success", user.id, isNew);
    const session = toSessionUser(ctx, user);
    return { token: signToken(ctx, { sub: user.id, role: session.role, tv: Number(user.tokenVersion) || 1 }), user: session };
  }
  function hashPassword(ctx, password, iterations = PBKDF2_ITERATIONS) {
    const salt = ctx.env.crypto.randomHex(16);
    return `pbkdf2_sha256$${iterations}$${salt}$${ctx.env.crypto.pbkdf2Hex(password, salt, iterations)}`;
  }
  function verifyPassword(ctx, password, stored) {
    const [alg, iter, salt, hash] = String(stored || "").split("$");
    if (alg !== "pbkdf2_sha256" || !iter || !salt || !hash) return false;
    return safeEqual(ctx.env.crypto.pbkdf2Hex(password, salt, Number(iter)), hash);
  }
  function setSuperAdmin(ctx, username, password) {
    const u = cleanText(username, 60);
    if (!u || String(password).length < 8) throw new AppError("VALIDATION_FAILED", "username \u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E27\u0E48\u0E32\u0E07 \u0E41\u0E25\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 8 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    ctx.env.props.set("SUPER_USER", u);
    ctx.env.props.set("SUPER_HASH", hashPassword(ctx, String(password)));
    ctx.env.props.set("SUPER_TV", String(Number(ctx.env.props.get("SUPER_TV") || "1") + 1));
  }
  function loginSuper(ctx, body) {
    const username = cleanText(body.username, 60);
    const lockKey = "thr:super";
    if (counter(ctx, lockKey) >= SUPER_FAIL_LIMIT) {
      logAttempt(ctx, "superadmin", username.slice(0, 2) + "\u2026", "throttled");
      throw new AppError("LOGIN_THROTTLED", "\u0E43\u0E2A\u0E48\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E34\u0E14\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A Super Admin \u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 15 \u0E19\u0E32\u0E17\u0E35");
    }
    const storedUser = ctx.env.props.get("SUPER_USER") || "";
    const storedHash = ctx.env.props.get("SUPER_HASH") || "";
    const passOk = verifyPassword(ctx, String(body.password ?? ""), storedHash || "pbkdf2_sha256$1000$00$00");
    const ok = !!storedHash && safeEqual(username.toLowerCase(), storedUser.toLowerCase()) && passOk;
    if (!ok) {
      bumpCounter(ctx, lockKey, SUPER_LOCK_S);
      logAttempt(ctx, "superadmin", username.slice(0, 2) + "\u2026", "wrong_credentials");
      throw new AppError("AUTH_REQUIRED", "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    ctx.env.cache.remove(lockKey);
    if (Number(storedHash.split("$")[1]) < PBKDF2_ITERATIONS) {
      ctx.env.props.set("SUPER_HASH", hashPassword(ctx, String(body.password)));
    }
    logAttempt(ctx, "superadmin", storedUser.slice(0, 2) + "\u2026", "success", "SUPER");
    const user = superUser(ctx);
    return { token: signToken(ctx, { sub: user.sub, role: "superadmin", tv: Number(ctx.env.props.get("SUPER_TV") || "1") }), user };
  }
  function logoutAll(ctx) {
    const u = ctx.user;
    if (!u) return;
    if (u.role === "superadmin") {
      ctx.env.props.set("SUPER_TV", String(Number(ctx.env.props.get("SUPER_TV") || "1") + 1));
      return;
    }
    const row = findById(ctx, "Users", u.sub, "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49");
    ctx.env.db.update("Users", row.id, { ...row, tokenVersion: Number(row.tokenVersion) + 1 });
  }
  function requestAccess(ctx, b) {
    const phone = normalizePhone(b.phone);
    if (!isValidPhone(phone)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 0812345678)");
    const fullName = cleanText(b.fullName, 120);
    const position = cleanText(b.position, 120);
    const title = cleanText(b.title, 40);
    const affiliation = cleanText(b.affiliation, 160);
    const workgroupId = cleanText(b.workgroupId, 60);
    if (fullName.length < 4) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25");
    if (!position) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07");
    if (!live(ctx.env.db.list("Workgroups")).some((g) => g.id === workgroupId)) {
      throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    }
    if (bumpCounter(ctx, "thr:register", 3600) > 20) throw new AppError("LOGIN_THROTTLED", "\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E08\u0E33\u0E19\u0E27\u0E19\u0E21\u0E32\u0E01 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07");
    const h = phoneHash(ctx, phone);
    if (ctx.env.db.list("Users").some((u) => !u.isDeleted && u.phoneHash === h)) {
      throw new AppError("VALIDATION_FAILED", "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E19\u0E35\u0E49\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35");
    }
    const reqs = ctx.env.db.list("AccessRequests");
    if (reqs.some((r3) => r3.status === "pending" && normalizePhone(r3.phone) === phone)) {
      throw new AppError("VALIDATION_FAILED", "\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E02\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E19\u0E35\u0E49\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27");
    }
    const meta = newMeta(ctx);
    const row = {
      ...meta,
      createdBy: "PUBLIC",
      updatedBy: "PUBLIC",
      phone,
      fullName,
      position,
      workgroupId,
      affiliation,
      note: cleanText(b.note, 300),
      status: "pending",
      decidedAt: "",
      decidedBy: "",
      reason: "",
      title
    };
    ctx.env.db.insert("AccessRequests", [row]);
    audit(ctx, "request_access", "AccessRequest", row.id, { after: { fullName, workgroupId } });
    return { requestId: row.id };
  }
  function requireRole(ctx, ...roles) {
    const u = ctx.user;
    if (!u) throw new AppError("AUTH_REQUIRED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    if (!roles.includes(u.role)) throw new AppError("FORBIDDEN_SCOPE", "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E17\u0E33\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49");
    return u;
  }
  function canAccessWorkgroup(user, workgroupId) {
    return user.workgroupIds === null || user.workgroupIds.includes(workgroupId);
  }
  function requireWorkgroup(ctx, workgroupId) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    if (!canAccessWorkgroup(u, workgroupId)) throw new AppError("FORBIDDEN_SCOPE", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E19\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C");
    return u;
  }

  // src/core/schema.ts
  var SCHEMA_VERSION = "2026.11.09-1";
  var META = [
    ["id", "string"],
    ["createdAt", "string"],
    ["createdBy", "string"],
    ["updatedAt", "string"],
    ["updatedBy", "string"],
    ["version", "number"],
    ["isDeleted", "boolean"]
  ];
  var t = (file, cols, withMeta = true) => ({
    file,
    columns: withMeta ? [...META, ...cols] : cols
  });
  var TABLES = {
    Users: t("IDENTITY", [
      ["phone", "string"],
      ["phoneHash", "string"],
      ["fullName", "string"],
      ["position", "string"],
      ["workgroupId", "string"],
      ["affiliation", "string"],
      ["role", "string"],
      ["status", "string"],
      ["scopeWorkgroups", "string"],
      ["tokenVersion", "number"],
      ["approvedAt", "string"],
      ["approvedBy", "string"],
      ["lastLoginAt", "string"],
      ["knownDevices", "string"],
      ["title", "string"]
    ]),
    AccessRequests: t("IDENTITY", [
      ["phone", "string"],
      ["fullName", "string"],
      ["position", "string"],
      ["workgroupId", "string"],
      ["affiliation", "string"],
      ["note", "string"],
      ["status", "string"],
      ["decidedAt", "string"],
      ["decidedBy", "string"],
      ["reason", "string"],
      ["title", "string"]
    ]),
    LoginAttempts: t("IDENTITY", [
      ["id", "string"],
      ["at", "string"],
      ["role", "string"],
      ["identifierMasked", "string"],
      ["result", "string"],
      ["userId", "string"],
      ["device", "string"],
      ["newDevice", "boolean"]
    ], false),
    Organizations: t("CORE", [["code", "string"], ["name", "string"]]),
    Workgroups: t("CORE", [
      ["orgId", "string"],
      ["code", "string"],
      ["name", "string"],
      ["noActivities", "boolean"],
      // ปิดการแสดงบนหน้าสาธารณะชั่วคราว (ค่าว่าง = แสดง)
      ["hidePublic", "boolean"],
      // ค่าหัวบันทึกข้อความของกลุ่ม
      ["memoOrg", "string"],
      ["memoFax", "string"],
      ["memoPrefix", "string"],
      ["headName", "string"],
      ["headPosition", "string"],
      ["headLine2", "string"]
    ]),
    FundingSources: t("CORE", [["code", "string"], ["name", "string"], ["shortName", "string"]]),
    Units: t("CORE", [["code", "string"], ["name", "string"], ["shortName", "string"], ["kind", "string"], ["sortOrder", "number"]]),
    ActivityUnits: t("CORE", [["projectId", "string"], ["activityId", "string"], ["unitId", "string"], ["budgetSatang", "number"], ["targetQty", "number"]]),
    Projects: t("CORE", [
      ["fiscalYear", "number"],
      ["fundingSourceId", "string"],
      ["projectCode", "string"],
      ["name", "string"],
      ["workgroupId", "string"],
      ["ownerName", "string"],
      ["startDate", "string"],
      ["endDate", "string"],
      ["status", "string"],
      ["physicalProgress", "number"],
      ["quarterTargets", "string"],
      ["description", "string"],
      ["published", "boolean"],
      ["lastProgressAt", "string"],
      ["idempotencyKey", "string"],
      ["planDocId", "string"],
      ["planNodeSeq", "number"]
    ]),
    Activities: t("CORE", [
      ["projectId", "string"],
      ["activityCode", "string"],
      ["name", "string"],
      ["startDate", "string"],
      ["endDate", "string"],
      ["status", "string"],
      ["progressPct", "number"],
      ["idempotencyKey", "string"],
      ["planItemId", "string"],
      ["unit", "string"],
      ["targetQty", "number"],
      ["planQuarters", "string"],
      ["dueMonth", "number"],
      ["dueDate", "string"],
      ["budgetCode", "string"],
      ["mainActivityCode", "string"]
    ]),
    Allocations: t("CORE", [
      ["projectId", "string"],
      ["activityId", "string"],
      ["type", "string"],
      ["amountSatang", "number"],
      ["date", "string"],
      ["docNo", "string"],
      ["note", "string"],
      ["source", "string"],
      ["idempotencyKey", "string"]
    ]),
    Disbursements: t("CORE", [
      ["projectId", "string"],
      ["activityId", "string"],
      ["status", "string"],
      ["amountSatang", "number"],
      ["date", "string"],
      ["docNo", "string"],
      ["description", "string"],
      ["source", "string"],
      ["idempotencyKey", "string"],
      ["voidReason", "string"],
      ["replacesId", "string"],
      ["attachmentId", "string"],
      ["unitId", "string"]
    ]),
    /** บันทึกข้อความตรวจสอบเอกสารเพื่อขอเบิกเงิน — 1 แถวต่อ 1 การเบิก; แก้ไขแล้วเพิ่ม revision */
    Memos: t("CORE", [
      ["projectId", "string"],
      ["activityId", "string"],
      ["disbursementId", "string"],
      ["unitId", "string"],
      ["docNo", "string"],
      ["date", "string"],
      ["amountSatang", "number"],
      ["data", "string"],
      ["revision", "number"],
      ["docFileId", "string"],
      ["pdfFileId", "string"],
      ["renderStatus", "string"],
      ["renderError", "string"]
    ]),
    /** รหัสงบประมาณ (20 หลัก) / รหัสกิจกรรมหลัก (17 หลัก) ตามเอกสาร NEW GFMIS THAI ของกรมฯ แยกปีงบประมาณ */
    BudgetCodes: t("CORE", [
      ["fiscalYear", "number"],
      ["section", "string"],
      ["planName", "string"],
      ["projectNo", "string"],
      ["projectName", "string"],
      ["activityNo", "string"],
      ["activityName", "string"],
      ["mainActivityCode", "string"],
      ["itemName", "string"],
      ["budgetCode", "string"],
      ["source", "string"]
    ]),
    ProgressReports: t("CORE", [
      ["projectId", "string"],
      ["activityId", "string"],
      ["reportDate", "string"],
      ["progressPct", "number"],
      ["detail", "string"],
      ["issues", "string"],
      ["idempotencyKey", "string"]
    ]),
    Attachments: t("CORE", [
      ["entityType", "string"],
      ["entityId", "string"],
      ["projectId", "string"],
      ["kind", "string"],
      ["fileName", "string"],
      ["mimeType", "string"],
      ["sizeBytes", "number"],
      ["sha256", "string"],
      ["driveFileId", "string"],
      ["ocrStatus", "string"],
      ["ocrText", "string"]
    ]),
    AuditLogs: t("CORE", [
      ["id", "string"],
      ["at", "string"],
      ["requestId", "string"],
      ["actorId", "string"],
      ["actorName", "string"],
      ["actorRole", "string"],
      ["action", "string"],
      ["entityType", "string"],
      ["entityId", "string"],
      ["projectId", "string"],
      ["before", "string"],
      ["after", "string"],
      ["reason", "string"]
    ], false),
    Settings: t("CORE", [["key", "string"], ["value", "string"], ["updatedAt", "string"], ["updatedBy", "string"]], false),
    PlanDocs: t("CORE", [
      ["fiscalYear", "number"],
      ["fundingSourceId", "string"],
      ["round", "number"],
      ["title", "string"],
      ["docNo", "string"],
      ["docDate", "string"],
      ["budgetType", "string"],
      ["totalSatang", "number"],
      ["leafCount", "number"],
      ["sourceFileId", "string"],
      ["sourceFileName", "string"],
      ["status", "string"],
      ["note", "string"],
      ["sourceSha256", "string"],
      ["editCount", "number"]
    ]),
    PlanItems: t("CORE", [
      ["planDocId", "string"],
      ["fiscalYear", "number"],
      ["seq", "number"],
      ["parentSeq", "number"],
      ["depth", "number"],
      ["kind", "string"],
      ["number", "string"],
      ["name", "string"],
      ["unit", "string"],
      ["quantity", "number"],
      ["amountSatang", "number"],
      ["isLeaf", "boolean"],
      ["planIndex", "number"],
      ["projectSeq", "number"],
      ["activitySeq", "number"],
      ["code", "string"],
      ["workgroupId", "string"],
      ["projectId", "string"],
      ["activityId", "string"],
      ["assignedAt", "string"],
      ["assignedBy", "string"]
    ]),
    ImportJobs: t("STAGING", [
      ["fileName", "string"],
      ["sha256", "string"],
      ["driveFileId", "string"],
      ["channel", "string"],
      ["kind", "string"],
      ["fiscalYear", "number"],
      ["fundingSourceId", "string"],
      ["headerRow", "number"],
      ["mapping", "string"],
      ["status", "string"],
      ["totalRows", "number"],
      ["validRows", "number"],
      ["warningRows", "number"],
      ["errorRows", "number"],
      ["committedRows", "number"],
      ["committedAt", "string"],
      ["committedBy", "string"],
      ["message", "string"]
    ]),
    ImportRows: t("STAGING", [
      ["id", "string"],
      ["jobId", "string"],
      ["rowNo", "number"],
      ["rowKey", "string"],
      ["status", "string"],
      ["messages", "string"],
      ["raw", "string"],
      ["normalized", "string"],
      ["committed", "boolean"]
    ], false),
    Snapshots: t("REPORTING", [
      ["id", "string"],
      ["kind", "string"],
      ["fiscalYear", "number"],
      ["generatedAt", "string"],
      ["sourceVersion", "string"],
      ["json", "string"]
    ], false)
  };
  var FILE_NAMES = {
    IDENTITY: "KPP_ABM_IDENTITY",
    CORE: "KPP_ABM_CORE",
    STAGING: "KPP_ABM_STAGING",
    REPORTING: "KPP_ABM_REPORTING"
  };
  var CELL_LIMIT = 1e7;
  var FOLDERS = {
    system: "00_System",
    imports: "01_Imports",
    inbox: "01_Imports/Inbox",
    evidence: "02_Project_Evidence",
    archive: "99_Archive",
    backup: "99_Archive/backup"
  };
  function primaryKeyOf(table) {
    return table === "Settings" ? "key" : "id";
  }

  // src/core/services/units.ts
  function listUnits(ctx) {
    return live(ctx.env.db.list("Units")).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder) || a.code.localeCompare(b.code));
  }
  function provinceUnitId(units) {
    return units.find((u) => u.kind === "PROVINCE")?.id ?? "";
  }
  function activityUnitsOf(ctx, activityId) {
    const all = live(ctx.env.db.list("ActivityUnits"));
    return activityId ? all.filter((x) => x.activityId === activityId) : all;
  }
  function activityState(ctx, a, allocs, disbs, shares) {
    const al = (allocs ?? live(ctx.env.db.list("Allocations"))).filter((x) => x.activityId === a.id);
    const di = (disbs ?? live(ctx.env.db.list("Disbursements"))).filter((x) => x.activityId === a.id);
    const b = computeBudget(al, di);
    return {
      activityId: a.id,
      projectId: a.projectId,
      budget: b.currentBudget,
      disbursed: b.disbursed,
      committed: b.committed,
      planQuarters: a.planQuarters ?? "",
      units: (shares ?? activityUnitsOf(ctx)).filter((x) => x.activityId === a.id),
      hasDisbursement: di.some((d) => d.status !== "VOID" && !d.isDeleted),
      dueMonth: Number(a.dueMonth) || 0,
      dueDate: a.dueDate || ""
    };
  }
  function activityPlan(budget, _a, curve, m) {
    return planAt(budget, curve, 0, m);
  }
  function setActivityDue(ctx, b) {
    const a = findById(ctx, "Activities", String(b.activityId), "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const p = findById(ctx, "Projects", a.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    const actor2 = requireWorkgroup(ctx, p.workgroupId).sub;
    let dueDate = String(b.dueDate ?? "").trim();
    let d;
    if (dueDate) {
      const { start, end } = fiscalYearRange(Number(p.fiscalYear));
      const t2 = /* @__PURE__ */ new Date(`${dueDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(t2.getTime()) || t2.toISOString().slice(0, 10) !== dueDate) throw new AppError("VALIDATION_FAILED", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E23\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      if (dueDate < start || dueDate > end) throw new AppError("VALIDATION_FAILED", `\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E23\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${p.fiscalYear} (1 \u0E15.\u0E04. \u2013 30 \u0E01.\u0E22.)`);
      d = fiscalMonthIndex(dueDate);
    } else {
      d = Number(b.dueMonth ?? 0);
      if (!Number.isInteger(d) || d < -1 || d > 12) throw new AppError("VALIDATION_FAILED", "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E23\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      dueDate = "";
    }
    const before = { dueMonth: Number(a.dueMonth) || 0, dueDate: a.dueDate || "" };
    if (before.dueMonth !== d || before.dueDate !== dueDate) {
      ctx.env.db.update("Activities", a.id, { ...a, dueMonth: d, dueDate, version: a.version + 1, updatedAt: nowIso(ctx), updatedBy: actor2 });
      audit(ctx, "activity.due", "Activity", a.id, { before, after: { dueMonth: d, dueDate }, projectId: p.id });
      bumpDataVersion(ctx);
    }
    return activityState(ctx, { ...a, dueMonth: d, dueDate });
  }
  function setActivityUnits(ctx, b) {
    const a = findById(ctx, "Activities", String(b.activityId), "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const p = findById(ctx, "Projects", a.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const units = listUnits(ctx);
    const st = activityState(ctx, a);
    const input = Array.isArray(b.units) ? b.units.slice(0, 50) : [];
    const seen = /* @__PURE__ */ new Set();
    const clean = input.map((x) => {
      const unit = units.find((u) => u.id === x.unitId);
      if (!unit) throw new AppError("VALIDATION_FAILED", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      if (seen.has(unit.id)) throw new AppError("VALIDATION_FAILED", `\u0E40\u0E25\u0E37\u0E2D\u0E01${unit.shortName}\u0E0B\u0E49\u0E33`);
      seen.add(unit.id);
      const budget = Number(x.budgetSatang);
      if (!Number.isInteger(budget) || budget < 0) throw new AppError("VALIDATION_FAILED", `\u0E07\u0E1A\u0E02\u0E2D\u0E07${unit.shortName}\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
      const qty = Math.max(0, Number(x.targetQty) || 0);
      return { unitId: unit.id, budgetSatang: budget, targetQty: qty };
    });
    if (clean.length) {
      const sum = clean.reduce((s, x) => s + x.budgetSatang, 0);
      if (sum !== st.budget) {
        throw new AppError("VALIDATION_FAILED", `\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E07\u0E1A\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E48\u0E07 ${(sum / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E07\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 ${(st.budget / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17`);
      }
      const target = Math.round(Number(a.targetQty) || 0);
      const qtySum = clean.reduce((s, x) => s + x.targetQty, 0);
      if (target > 0 && qtySum !== target) {
        throw new AppError("VALIDATION_FAILED", `\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 ${qtySum.toLocaleString("th-TH")} \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19 ${target.toLocaleString("th-TH")} ${a.unit}`);
      }
    }
    const paoId = provinceUnitId(units);
    const spent = /* @__PURE__ */ new Map();
    for (const d of live(ctx.env.db.list("Disbursements")).filter((x) => x.activityId === a.id && (x.status === "APPROVED" || x.status === "PAID"))) {
      spent.set(d.unitId || paoId, (spent.get(d.unitId || paoId) ?? 0) + Number(d.amountSatang));
    }
    for (const x of clean) {
      const used2 = spent.get(x.unitId) ?? 0;
      if (x.budgetSatang < used2) {
        throw new AppError("VALIDATION_FAILED", `\u0E07\u0E1A\u0E02\u0E2D\u0E07${areaName(units.find((u) => u.id === x.unitId))} \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E22\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27 ${(used2 / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17`);
      }
    }
    const pao = provinceUnitId(units);
    const used = new Set(live(ctx.env.db.list("Disbursements")).filter((d) => d.activityId === a.id && d.status !== "VOID").map((d) => d.unitId || pao));
    const keep = new Set(clean.map((x) => x.unitId));
    const keepPao = clean.length === 0;
    for (const uid of used) {
      if (!keep.has(uid) && !(keepPao && uid === pao)) {
        throw new AppError("VALIDATION_FAILED", `${areaName(units.find((u) => u.id === uid))} \u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E40\u0E2D\u0E32\u0E2D\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49`);
      }
    }
    let planQuarters = a.planQuarters ?? "";
    if (b.planQuarters !== void 0) {
      if (b.planQuarters === null || Array.isArray(b.planQuarters) && b.planQuarters.every((v) => !Number(v))) planQuarters = "";
      else {
        const q = (b.planQuarters ?? []).map(Number);
        if (q.length !== 4 || q.some((v) => !Number.isInteger(v) || v < 0)) throw new AppError("VALIDATION_FAILED", "\u0E41\u0E1C\u0E19\u0E23\u0E32\u0E22\u0E44\u0E15\u0E23\u0E21\u0E32\u0E2A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
        if (q.reduce((s, v) => s + v, 0) !== st.budget) throw new AppError("VALIDATION_FAILED", "\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E41\u0E1C\u0E19\u0E23\u0E32\u0E22\u0E44\u0E15\u0E23\u0E21\u0E32\u0E2A\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E17\u0E48\u0E32\u0E07\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
        planQuarters = q.join(",");
      }
    }
    const before = { units: st.units.map((x) => ({ unitId: x.unitId, budgetSatang: x.budgetSatang, targetQty: x.targetQty })), planQuarters: a.planQuarters };
    const now = nowIso(ctx);
    const actor2 = ctx.user?.sub ?? "system";
    for (const old of st.units) {
      const next = clean.find((x) => x.unitId === old.unitId);
      if (!next) ctx.env.db.update("ActivityUnits", old.id, { ...old, isDeleted: true, version: old.version + 1, updatedAt: now, updatedBy: actor2 });
      else if (next.budgetSatang !== Number(old.budgetSatang) || next.targetQty !== Number(old.targetQty)) {
        ctx.env.db.update("ActivityUnits", old.id, { ...old, ...next, version: old.version + 1, updatedAt: now, updatedBy: actor2 });
      }
    }
    const add = clean.filter((x) => !st.units.some((o) => o.unitId === x.unitId)).map((x) => ({ ...newMeta(ctx), projectId: p.id, activityId: a.id, ...x }));
    if (add.length) ctx.env.db.insert("ActivityUnits", add);
    if (planQuarters !== (a.planQuarters ?? "")) {
      ctx.env.db.update("Activities", a.id, { ...a, planQuarters, version: a.version + 1, updatedAt: now, updatedBy: actor2 });
    }
    audit(ctx, "activity.units", "Activity", a.id, { before, after: { units: clean, planQuarters }, projectId: p.id });
    bumpDataVersion(ctx);
    return activityState(ctx, { ...a, planQuarters });
  }
  function setActivityUnitsBulk(ctx, b) {
    const ids = [...new Set((b.activityIds ?? []).map(String))].slice(0, 300);
    const unitIds = [...new Set((b.unitIds ?? []).map(String))];
    if (!ids.length) throw new AppError("VALIDATION_FAILED", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    if (!unitIds.length) throw new AppError("VALIDATION_FAILED", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23");
    const units = listUnits(ctx);
    const ordered = units.filter((u) => unitIds.includes(u.id)).map((u) => u.id);
    let updated = 0;
    const skipped = [];
    for (const id of ids) {
      try {
        const a = findById(ctx, "Activities", id, "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
        const st = activityState(ctx, a);
        const shares = splitMoney(st.budget, ordered.length);
        const qty = splitEqual(Math.round(Number(a.targetQty) || 0), ordered.length);
        setActivityUnits(ctx, { activityId: id, units: ordered.map((unitId, i) => ({ unitId, budgetSatang: shares[i], targetQty: qty[i] })) });
        updated++;
      } catch (e) {
        skipped.push({ id, reason: e instanceof AppError ? e.message : "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
      }
    }
    return { updated, skipped };
  }
  function buildUnitRows(ctx, ds, projects, m) {
    const units = listUnits(ctx);
    const pao = provinceUnitId(units);
    const shares = activityUnitsOf(ctx);
    const ids = new Set(projects.map((p) => p.id));
    const byProject = new Map(projects.map((p) => [p.id, p]));
    const acts = ds.activities.filter((a) => ids.has(a.projectId));
    const allocBy = /* @__PURE__ */ new Map();
    const disbBy = /* @__PURE__ */ new Map();
    const key = (projectId, activityId) => `${projectId}|${activityId}`;
    for (const x of ds.allocations) if (ids.has(x.projectId)) (allocBy.get(key(x.projectId, x.activityId)) ?? allocBy.set(key(x.projectId, x.activityId), []).get(key(x.projectId, x.activityId))).push(x);
    for (const x of ds.disbursements) if (ids.has(x.projectId)) (disbBy.get(key(x.projectId, x.activityId)) ?? disbBy.set(key(x.projectId, x.activityId), []).get(key(x.projectId, x.activityId))).push(x);
    const curves = /* @__PURE__ */ new Map();
    const curveOf = (fy) => curves.get(fy) ?? curves.set(fy, curveFor(ctx, fy)).get(fy);
    const rows = [];
    const emit = (p, a, allocs, disbs) => {
      const total = computeBudget(allocs, []).currentBudget;
      const curve = curveOf(Number(p.fiscalYear));
      const planTotal = activityPlan(total, a, curve, m);
      const qTotals = [3, 6, 9, 12].map((mm) => activityPlan(total, a, curve, mm));
      const mine = a ? shares.filter((s) => s.activityId === a.id) : [];
      const budgetOf = new Map(mine.map((s) => [s.unitId, Number(s.budgetSatang)]));
      const qtyOf = new Map(mine.map((s) => [s.unitId, Number(s.targetQty)]));
      const assigned = mine.reduce((s, x) => s + Number(x.budgetSatang), 0);
      if (total - assigned !== 0 || !mine.length) budgetOf.set(pao, (budgetOf.get(pao) ?? 0) + (total - assigned));
      if (!mine.length) qtyOf.set(pao, Number(a?.targetQty) || 0);
      const unitIds = /* @__PURE__ */ new Set([...budgetOf.keys(), ...disbs.filter((d) => d.status !== "VOID").map((d) => d.unitId || pao)]);
      for (const uid of units.map((u) => u.id).filter((id) => unitIds.has(id))) {
        const s = computeBudget([], disbs.filter((d) => (d.unitId || pao) === uid));
        const budget = budgetOf.get(uid) ?? 0;
        rows.push({
          workgroupId: p.workgroupId,
          fundingSourceId: p.fundingSourceId,
          projectId: p.id,
          projectCode: p.projectCode,
          projectName: p.name,
          activityId: a?.id ?? "",
          activityCode: a?.activityCode ?? "",
          activityName: a?.name ?? "\u0E07\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
          unit: a?.unit ?? "",
          targetQty: qtyOf.get(uid) ?? 0,
          unitId: uid,
          isMeeting: !!a && MEETING_RE.test(a.name),
          budget,
          plan: total ? Math.round(planTotal * budget / total) : 0,
          committed: s.committed,
          disbursed: s.disbursed,
          remaining: budget - s.disbursed,
          planQ: qTotals.map((q) => total ? Math.round(q * budget / total) : 0)
        });
      }
    };
    for (const a of acts) {
      const p = byProject.get(a.projectId);
      emit(p, a, allocBy.get(key(p.id, a.id)) ?? [], disbBy.get(key(p.id, a.id)) ?? []);
    }
    for (const p of projects) {
      const al = allocBy.get(key(p.id, "")) ?? [];
      const di = disbBy.get(key(p.id, "")) ?? [];
      if (al.length || di.length) emit(p, null, al, di);
    }
    return rows;
  }
  function summarizeRows(rows) {
    let budget = 0, committed = 0, disbursed = 0, plan = 0;
    const planQ = [0, 0, 0, 0];
    for (const r3 of rows) {
      r3.planQ?.forEach((v, i) => {
        planQ[i] += v;
      });
      budget += r3.budget;
      committed += r3.committed;
      disbursed += r3.disbursed;
      plan += r3.plan;
    }
    return {
      originalBudget: budget,
      transferIn: 0,
      transferOut: 0,
      currentBudget: budget,
      committed,
      disbursed,
      paid: 0,
      remaining: budget - disbursed,
      spendingPct: pct(disbursed, budget),
      plan,
      planQ
    };
  }
  function planSeries(ctx, ds, projects) {
    const out = new Array(12).fill(0);
    const ids = new Set(projects.map((p) => p.id));
    const byProject = new Map(projects.map((p) => [p.id, p]));
    const budgetOf = /* @__PURE__ */ new Map();
    for (const x of ds.allocations) if (ids.has(x.projectId)) (budgetOf.get(x.activityId || `P:${x.projectId}`) ?? budgetOf.set(x.activityId || `P:${x.projectId}`, []).get(x.activityId || `P:${x.projectId}`)).push(x);
    const curves = /* @__PURE__ */ new Map();
    const curveOf = (fy) => curves.get(fy) ?? curves.set(fy, curveFor(ctx, fy)).get(fy);
    const add = (budget, a, curve) => {
      for (let m = 1; m <= 12; m++) out[m - 1] += activityPlan(budget, a, curve, m);
    };
    for (const a of ds.activities) {
      const p = byProject.get(a.projectId);
      if (p) add(computeBudget(budgetOf.get(a.id) ?? [], []).currentBudget, a, curveOf(Number(p.fiscalYear)));
    }
    for (const p of projects) add(computeBudget(budgetOf.get(`P:${p.id}`) ?? [], []).currentBudget, null, curveOf(Number(p.fiscalYear)));
    return out;
  }
  function entryActivities(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = Number(b.fiscalYear);
    const projects = live(ctx.env.db.list("Projects")).filter((p) => Number(p.fiscalYear) === fy && p.status !== "CANCELLED");
    const pids = new Set(projects.map((p) => p.id));
    const acts = live(ctx.env.db.list("Activities")).filter((a) => pids.has(a.projectId) && a.status !== "CANCELLED");
    const allocs = live(ctx.env.db.list("Allocations")).filter((x) => pids.has(x.projectId));
    const disbs = live(ctx.env.db.list("Disbursements")).filter((x) => pids.has(x.projectId));
    const shares = activityUnitsOf(ctx);
    const pao = provinceUnitId(listUnits(ctx));
    const memoOf = new Map(live(ctx.env.db.list("Memos")).map((m) => [m.disbursementId, m.id]));
    const out = [];
    const emit = (p, a) => {
      const aid = a?.id ?? "";
      const al = allocs.filter((x) => x.projectId === p.id && (x.activityId || "") === aid);
      const di = disbs.filter((x) => x.projectId === p.id && (x.activityId || "") === aid);
      const bud = computeBudget(al, di);
      const live_ = di.filter((x) => x.status !== "VOID").sort((x, y) => x.date === y.date ? x.createdAt.localeCompare(y.createdAt) : x.date.localeCompare(y.date));
      const unitShares = a ? shares.filter((s) => s.activityId === a.id) : [];
      const usedOf = (unitId) => live_.filter((x) => (x.unitId || pao) === unitId).reduce((s, x) => s + x.amountSatang, 0);
      const canEdit = canAccessWorkgroup(u, p.workgroupId);
      const units = unitShares.length ? unitShares.map((s) => ({ unitId: s.unitId, budget: s.budgetSatang, used: usedOf(s.unitId) })) : [{ unitId: pao, budget: bud.currentBudget, used: usedOf(pao) }];
      out.push({
        activityId: aid,
        projectId: p.id,
        projectCode: p.projectCode,
        projectName: p.name,
        activityName: a?.name ?? "\u0E07\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
        workgroupId: p.workgroupId,
        budget: bud.currentBudget,
        disbursed: bud.disbursed,
        committed: bud.committed,
        hasAreas: unitShares.length > 0,
        units,
        history: live_.map((x, i) => ({ id: x.id, no: i + 1, date: x.date, amountSatang: x.amountSatang, docNo: x.docNo, unitId: x.unitId || pao, status: x.status, hasFile: !!x.attachmentId, memoId: canEdit ? memoOf.get(x.id) : void 0 })),
        canEdit
      });
    };
    for (const p of projects) {
      const pa = acts.filter((a) => a.projectId === p.id);
      for (const a of pa) emit(p, a);
      if (!pa.length || allocs.some((x) => x.projectId === p.id && !x.activityId)) emit(p, null);
    }
    return out;
  }

  // src/core/services/projects.ts
  function loadDataset(ctx) {
    return {
      projects: live(ctx.env.db.list("Projects")),
      activities: live(ctx.env.db.list("Activities")),
      allocations: live(ctx.env.db.list("Allocations")),
      disbursements: live(ctx.env.db.list("Disbursements"))
    };
  }
  function budgetsByProject(ds) {
    const a = /* @__PURE__ */ new Map();
    const d = /* @__PURE__ */ new Map();
    for (const x of ds.allocations) (a.get(x.projectId) ?? a.set(x.projectId, []).get(x.projectId)).push(x);
    for (const x of ds.disbursements) (d.get(x.projectId) ?? d.set(x.projectId, []).get(x.projectId)).push(x);
    const out = /* @__PURE__ */ new Map();
    for (const p of ds.projects) out.set(p.id, computeBudget(a.get(p.id) ?? [], d.get(p.id) ?? []));
    return out;
  }
  function projectBudget(ctx, projectId, activityId) {
    const allocs = live(ctx.env.db.list("Allocations")).filter((x) => x.projectId === projectId && (!activityId || x.activityId === activityId));
    const disbs = live(ctx.env.db.list("Disbursements")).filter((x) => x.projectId === projectId && (!activityId || x.activityId === activityId));
    return computeBudget(allocs, disbs);
  }
  function today(ctx) {
    return todayBangkok(ctx.env.now());
  }
  function listProjects(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const ds = loadDataset(ctx);
    const fy = Number(b.fiscalYear) || 0;
    const budgets = budgetsByProject(ds);
    const t2 = today(ctx);
    return ds.projects.filter((p) => !fy || Number(p.fiscalYear) === fy).map((p) => {
      const budget = budgets.get(p.id);
      return { ...p, budget, risks: riskFlags(p, budget, t2, curveFor(ctx, Number(p.fiscalYear))), canEdit: canAccessWorkgroup(u, p.workgroupId) };
    }).sort((x, y) => y.fiscalYear - x.fiscalYear || x.projectCode.localeCompare(y.projectCode, "th"));
  }
  function getProject(ctx, b) {
    const p = findById(ctx, "Projects", String(b.id), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const activities = live(ctx.env.db.list("Activities")).filter((a) => a.projectId === p.id);
    const allocations = ctx.env.db.list("Allocations").filter((a) => a.projectId === p.id);
    const disbursements = ctx.env.db.list("Disbursements").filter((d) => d.projectId === p.id);
    const budget = computeBudget(live(allocations), live(disbursements));
    const shares = activityUnitsOf(ctx);
    const curve = curveFor(ctx, Number(p.fiscalYear));
    return {
      canEdit: canAccessWorkgroup(u, p.workgroupId),
      project: p,
      budget,
      risks: riskFlags(p, budget, today(ctx), curve),
      activities: activities.map((a) => ({
        ...a,
        budget: computeBudget(live(allocations).filter((x) => x.activityId === a.id), live(disbursements).filter((x) => x.activityId === a.id)),
        units: shares.filter((s) => s.activityId === a.id)
      })).sort((x, y) => x.activityCode.localeCompare(y.activityCode, "th")),
      allocations: allocations.sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
      disbursements: disbursements.sort((x, y) => (y.date || "").localeCompare(x.date || "") || y.createdAt.localeCompare(x.createdAt)),
      progress: live(ctx.env.db.list("ProgressReports")).filter((r3) => r3.projectId === p.id).sort((x, y) => y.reportDate.localeCompare(x.reportDate)),
      attachments: live(ctx.env.db.list("Attachments")).filter((f) => f.projectId === p.id).map(({ ocrText: _omit, ...rest }) => rest),
      audit: ctx.env.db.list("AuditLogs").filter((l) => l.projectId === p.id || l.entityId === p.id).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 100),
      monthly: { disbursedCumulative: monthlyCumulative(live(disbursements), p.fiscalYear), targetPct: curve }
    };
  }
  function validDate(v, label, required = false) {
    const s = cleanText(v, 40);
    if (!s) {
      if (required) throw new AppError("VALIDATION_FAILED", `\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38${label}`);
      return "";
    }
    const iso = parseThaiDate(s);
    if (!iso) throw new AppError("VALIDATION_FAILED", `${label}\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
    return iso;
  }
  function validMoney(v, label) {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n <= 0) throw new AppError("VALIDATION_FAILED", `${label}\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0`);
    if (n > 1e13) throw new AppError("VALIDATION_FAILED", `${label}\u0E2A\u0E39\u0E07\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B`);
    return n;
  }
  function cleanProjectInput(ctx, input, base) {
    const out = {};
    if (input.name !== void 0) {
      out.name = cleanText(input.name, 300);
      if (out.name.length < 3) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    }
    if (input.projectCode !== void 0) {
      out.projectCode = cleanText(input.projectCode, 60);
      if (!out.projectCode) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    }
    if (input.fiscalYear !== void 0) {
      out.fiscalYear = Number(input.fiscalYear);
      if (!Number.isInteger(out.fiscalYear) || out.fiscalYear < 2560 || out.fiscalYear > 2650) throw new AppError("VALIDATION_FAILED", "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    if (input.fundingSourceId !== void 0) {
      if (!live(ctx.env.db.list("FundingSources")).some((f) => f.id === input.fundingSourceId)) throw new AppError("VALIDATION_FAILED", "\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      out.fundingSourceId = String(input.fundingSourceId);
    }
    if (input.workgroupId !== void 0) {
      if (!live(ctx.env.db.list("Workgroups")).some((g) => g.id === input.workgroupId)) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      requireWorkgroup(ctx, String(input.workgroupId));
      out.workgroupId = String(input.workgroupId);
    }
    if (input.ownerName !== void 0) out.ownerName = cleanText(input.ownerName, 120);
    if (input.description !== void 0) out.description = cleanText(input.description, 2e3);
    if (input.startDate !== void 0) out.startDate = validDate(input.startDate, "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19");
    if (input.endDate !== void 0) out.endDate = validDate(input.endDate, "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14");
    const start = out.startDate ?? base?.startDate;
    const end = out.endDate ?? base?.endDate;
    if (start && end && end < start) throw new AppError("VALIDATION_FAILED", "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19");
    if (input.status !== void 0) {
      if (!PROJECT_STATUSES.includes(input.status)) throw new AppError("VALIDATION_FAILED", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      out.status = input.status;
    }
    if (input.physicalProgress !== void 0) {
      const n = Number(input.physicalProgress);
      if (!Number.isFinite(n) || n < 0 || n > 100) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 0\u2013100");
      out.physicalProgress = Math.round(n * 100) / 100;
    }
    if (input.quarterTargets !== void 0) {
      const q = String(input.quarterTargets).split(",").map((x) => Number(x.trim()));
      if (q.length !== 4 || q.some((n, i) => !Number.isFinite(n) || n < 0 || n > 100 || i > 0 && n < q[i - 1])) {
        throw new AppError("VALIDATION_FAILED", "\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E23\u0E32\u0E22\u0E44\u0E15\u0E23\u0E21\u0E32\u0E2A\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 4 \u0E04\u0E48\u0E32\u0E40\u0E23\u0E35\u0E22\u0E07\u0E08\u0E32\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E44\u0E1B\u0E21\u0E32\u0E01 \u0E40\u0E0A\u0E48\u0E19 30,55,80,100");
      }
      out.quarterTargets = q.join(",");
    }
    if (input.published !== void 0) out.published = Boolean(input.published);
    return out;
  }
  function assertUniqueCode(ctx, p) {
    const dup = live(ctx.env.db.list("Projects")).find((x) => x.id !== p.id && Number(x.fiscalYear) === Number(p.fiscalYear) && x.fundingSourceId === p.fundingSourceId && x.projectCode.toLowerCase() === p.projectCode.toLowerCase());
    if (dup) throw new AppError("VALIDATION_FAILED", `\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 ${p.projectCode} \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19\u0E1B\u0E35\u0E07\u0E1A\u0E41\u0E25\u0E30\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E19\u0E35\u0E49`);
  }
  function createProject(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const existing = findByIdempotency(ctx, "Projects", String(b.idempotencyKey));
    if (existing) return existing;
    const u = actor(ctx);
    const input = cleanProjectInput(ctx, {
      fiscalYear: b.fiscalYear ?? currentFiscalYear(ctx.env.now()),
      fundingSourceId: b.fundingSourceId,
      workgroupId: b.workgroupId ?? (u.workgroupIds?.length === 1 ? u.workgroupIds[0] : void 0),
      projectCode: b.projectCode,
      name: b.name,
      ownerName: b.ownerName ?? "",
      description: b.description ?? "",
      startDate: b.startDate ?? "",
      endDate: b.endDate ?? "",
      status: b.status ?? "PLANNED",
      physicalProgress: 0,
      quarterTargets: b.quarterTargets || getSettings(ctx).defaultQuarterTargets,
      published: b.published ?? true
    });
    if (!input.workgroupId) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    if (!input.fundingSourceId) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A");
    const { planDocId, planNodeSeq } = planLinkOf(b);
    const fromPlan = { planDocId, planNodeSeq };
    const project = { ...newMeta(ctx), lastProgressAt: "", idempotencyKey: String(b.idempotencyKey), ...fromPlan, ...input };
    assertUniqueCode(ctx, project);
    ctx.env.db.insert("Projects", [project]);
    audit(ctx, "project.create", "Project", project.id, { after: project, projectId: project.id });
    if (b.originalBudgetSatang) {
      createAllocation(ctx, {
        projectId: project.id,
        type: "ORIGINAL",
        amountSatang: Number(b.originalBudgetSatang),
        note: "\u0E07\u0E1A\u0E17\u0E35\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E08\u0E31\u0E14\u0E2A\u0E23\u0E23\u0E15\u0E2D\u0E19\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23",
        idempotencyKey: `${b.idempotencyKey}:orig`
      });
    }
    bumpDataVersion(ctx);
    return project;
  }
  function updateProject(ctx, b) {
    const cur = findById(ctx, "Projects", String(b.id), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, cur.workgroupId);
    const patch = cleanProjectInput(ctx, b.patch ?? {}, cur);
    const next = updateVersioned(ctx, "Projects", cur, Number(b.version), patch);
    if (patch.projectCode || patch.fiscalYear || patch.fundingSourceId) assertUniqueCode(ctx, next);
    audit(ctx, "project.update", "Project", cur.id, { before: cur, after: next, projectId: cur.id });
    bumpDataVersion(ctx);
    return next;
  }
  function deleteProject(ctx, b) {
    const cur = findById(ctx, "Projects", String(b.id), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, cur.workgroupId);
    const reason = cleanText(b.reason, 300);
    if (!reason) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E25\u0E1A");
    const budget = projectBudget(ctx, cur.id);
    if (budget.disbursed > 0 || budget.committed > 0) {
      throw new AppError("VALIDATION_FAILED", '\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22/\u0E1C\u0E39\u0E01\u0E1E\u0E31\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E43\u0E2B\u0E49\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E40\u0E1B\u0E47\u0E19 "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"');
    }
    updateVersioned(ctx, "Projects", cur, Number(b.version), { isDeleted: true });
    audit(ctx, "project.delete", "Project", cur.id, { before: cur, projectId: cur.id, reason });
    bumpDataVersion(ctx);
    return { ok: true };
  }
  function createActivity(ctx, b) {
    const p = findById(ctx, "Projects", String(b.projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const existing = findByIdempotency(ctx, "Activities", String(b.idempotencyKey));
    if (existing) return existing;
    const acts = live(ctx.env.db.list("Activities")).filter((a2) => a2.projectId === p.id);
    const code = cleanText(b.activityCode, 40) || String(acts.length + 1).padStart(2, "0");
    if (acts.some((a2) => a2.activityCode.toLowerCase() === code.toLowerCase())) throw new AppError("VALIDATION_FAILED", `\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 ${code} \u0E0B\u0E49\u0E33\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49`);
    const name = cleanText(b.name, 300);
    if (name.length < 2) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const a = {
      ...newMeta(ctx),
      projectId: p.id,
      activityCode: code,
      name,
      startDate: validDate(b.startDate, "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19"),
      endDate: validDate(b.endDate, "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14"),
      status: "PLANNED",
      progressPct: 0,
      idempotencyKey: String(b.idempotencyKey),
      planItemId: planLinkOf(b).planItemId ?? "",
      unit: cleanText(b.unit, 40),
      targetQty: Math.max(0, Number(b.targetQty) || 0),
      planQuarters: ""
    };
    ctx.env.db.insert("Activities", [a]);
    audit(ctx, "activity.create", "Activity", a.id, { after: a, projectId: p.id });
    bumpDataVersion(ctx);
    return a;
  }
  function updateActivity(ctx, b) {
    const cur = findById(ctx, "Activities", String(b.id), "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const p = findById(ctx, "Projects", cur.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const patch = {};
    const src = b.patch ?? {};
    if (src.name !== void 0) patch.name = cleanText(src.name, 300);
    if (src.startDate !== void 0) patch.startDate = validDate(src.startDate, "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19");
    if (src.endDate !== void 0) patch.endDate = validDate(src.endDate, "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14");
    if (src.status !== void 0) {
      if (!PROJECT_STATUSES.includes(src.status)) throw new AppError("VALIDATION_FAILED", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      patch.status = src.status;
    }
    const next = updateVersioned(ctx, "Activities", cur, Number(b.version), patch);
    audit(ctx, "activity.update", "Activity", cur.id, { before: cur, after: next, projectId: p.id });
    bumpDataVersion(ctx);
    return next;
  }
  function checkUnit(ctx, activityId, unitId) {
    const shares = activityId ? activityUnitsOf(ctx, activityId) : [];
    const id = cleanText(unitId, 60);
    if (!id) return shares.length === 1 ? shares[0].unitId : "";
    const units = listUnits(ctx);
    if (!units.some((u) => u.id === id)) throw new AppError("VALIDATION_FAILED", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const pao = provinceUnitId(units);
    if (shares.length && !shares.some((s) => s.unitId === id)) throw new AppError("VALIDATION_FAILED", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E07\u0E1A\u0E02\u0E2D\u0E07\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49");
    if (!shares.length && id !== pao) throw new AppError("VALIDATION_FAILED", '\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E41\u0E1A\u0E48\u0E07\u0E07\u0E1A\u0E43\u0E2B\u0E49\u0E2D\u0E33\u0E40\u0E20\u0E2D \u2014 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32 "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A"');
    return id === pao && !shares.length ? "" : id;
  }
  function checkActivity(ctx, projectId, activityId) {
    if (!activityId) return "";
    const a = findById(ctx, "Activities", activityId, "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    if (a.projectId !== projectId) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49");
    return a.id;
  }
  function createAllocation(ctx, b) {
    const p = findById(ctx, "Projects", String(b.projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const existing = findByIdempotency(ctx, "Allocations", String(b.idempotencyKey));
    if (existing) return existing;
    if (!ALLOCATION_TYPES.includes(b.type)) throw new AppError("VALIDATION_FAILED", "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E07\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const amount = validMoney(b.amountSatang, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19");
    const activityId = checkActivity(ctx, p.id, b.activityId);
    if (b.type === "TRANSFER_OUT") {
      const s = projectBudget(ctx, p.id);
      if (s.remaining - amount < 0 && actor(ctx).role !== "superadmin") {
        throw new AppError("BUDGET_EXCEEDED", "\u0E42\u0E2D\u0E19\u0E2D\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27\u0E07\u0E1A\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E25\u0E1A \u2014 \u0E15\u0E49\u0E2D\u0E07\u0E43\u0E2B\u0E49 Super Admin \u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23");
      }
    }
    const row = {
      ...newMeta(ctx),
      projectId: p.id,
      activityId,
      type: b.type,
      amountSatang: amount,
      date: validDate(b.date || today(ctx), "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48"),
      docNo: cleanText(b.docNo, 80),
      note: cleanText(b.note, 300),
      source: b.source ?? "MANUAL",
      idempotencyKey: String(b.idempotencyKey)
    };
    ctx.env.db.insert("Allocations", [row]);
    audit(ctx, "allocation.create", "Allocation", row.id, { after: row, projectId: p.id });
    bumpDataVersion(ctx);
    return row;
  }
  function voidAllocation(ctx, b) {
    requireRole(ctx, "superadmin");
    const cur = findById(ctx, "Allocations", String(b.id), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E07\u0E1A");
    const reason = cleanText(b.reason, 300);
    if (!reason) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25");
    updateVersioned(ctx, "Allocations", cur, cur.version, { isDeleted: true, note: `${cur.note} [\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01: ${reason}]` });
    audit(ctx, "allocation.void", "Allocation", cur.id, { before: cur, projectId: cur.projectId, reason });
    bumpDataVersion(ctx);
    return { ok: true };
  }
  function createDisbursement(ctx, b) {
    const p = findById(ctx, "Projects", String(b.projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    const u = requireWorkgroup(ctx, p.workgroupId);
    const existing = findByIdempotency(ctx, "Disbursements", String(b.idempotencyKey));
    if (existing) return existing;
    if (!["COMMITTED", "APPROVED", "PAID"].includes(b.status)) throw new AppError("VALIDATION_FAILED", "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const amount = validMoney(b.amountSatang, "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19");
    const activityId = checkActivity(ctx, p.id, b.activityId);
    const unitId = checkUnit(ctx, activityId, b.unitId);
    const date = validDate(b.date, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48", true);
    if (date > today(ctx)) throw new AppError("VALIDATION_FAILED", "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E27\u0E31\u0E19\u0E43\u0E19\u0E2D\u0E19\u0E32\u0E04\u0E15");
    if (b.attachmentId) {
      const f = findById(ctx, "Attachments", b.attachmentId, "\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A");
      if (f.projectId !== p.id) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49");
    }
    if (b.status !== "COMMITTED") {
      const s = projectBudget(ctx, p.id);
      if (s.remaining - amount < 0) {
        const reason = cleanText(b.overrideReason, 300);
        if (u.role !== "superadmin" || !reason) {
          throw new AppError("BUDGET_EXCEEDED", `\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E40\u0E01\u0E34\u0E19\u0E07\u0E1A\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D (\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ${(s.remaining / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17)`, { remaining: s.remaining });
        }
        audit(ctx, "budget.override", "Project", p.id, { projectId: p.id, reason, after: { amount } });
      }
    }
    const row = {
      ...newMeta(ctx),
      projectId: p.id,
      activityId,
      status: b.status,
      amountSatang: amount,
      date,
      docNo: cleanText(b.docNo, 80),
      description: cleanText(b.description, 500),
      source: b.source ?? "MANUAL",
      idempotencyKey: String(b.idempotencyKey),
      voidReason: "",
      replacesId: b.replacesId ?? "",
      attachmentId: b.attachmentId ?? "",
      unitId
    };
    ctx.env.db.insert("Disbursements", [row]);
    if (b.attachmentId) {
      const f = findById(ctx, "Attachments", b.attachmentId, "\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A");
      ctx.env.db.update("Attachments", f.id, { ...f, entityType: "disbursement", entityId: row.id });
    }
    audit(ctx, "disbursement.create", "Disbursement", row.id, { after: row, projectId: p.id });
    bumpDataVersion(ctx);
    return row;
  }
  function setDisbursementStatus(ctx, b) {
    const cur = findById(ctx, "Disbursements", String(b.id), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22");
    const p = findById(ctx, "Projects", cur.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const order = { COMMITTED: 0, APPROVED: 1, PAID: 2, VOID: -1 };
    if (!(b.status in order) || order[b.status] <= order[cur.status]) throw new AppError("VALIDATION_FAILED", "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u2014 \u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E17\u0E19");
    if (cur.status === "COMMITTED") {
      const s = projectBudget(ctx, p.id);
      if (s.remaining - cur.amountSatang < 0) throw new AppError("BUDGET_EXCEEDED", "\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27\u0E07\u0E1A\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E25\u0E1A");
    }
    const next = updateVersioned(ctx, "Disbursements", cur, Number(b.version), { status: b.status });
    audit(ctx, "disbursement.status", "Disbursement", cur.id, { before: { status: cur.status }, after: { status: b.status }, projectId: p.id });
    bumpDataVersion(ctx);
    return next;
  }
  function voidDisbursement(ctx, b) {
    const cur = findById(ctx, "Disbursements", String(b.id), "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22");
    const p = findById(ctx, "Projects", cur.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    const u = requireWorkgroup(ctx, p.workgroupId);
    if (cur.status === "VOID") throw new AppError("VALIDATION_FAILED", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27");
    if (cur.status !== "COMMITTED" && u.role !== "superadmin") {
      throw new AppError("FORBIDDEN_SCOPE", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34/\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
    }
    const reason = cleanText(b.reason, 300);
    if (reason.length < 3) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01");
    const voided = updateVersioned(ctx, "Disbursements", cur, cur.version, { status: "VOID", voidReason: reason });
    audit(ctx, "disbursement.void", "Disbursement", cur.id, { before: cur, after: { status: "VOID" }, projectId: p.id, reason });
    let replacement = null;
    if (b.replacement) {
      replacement = createDisbursement(ctx, {
        projectId: p.id,
        activityId: cur.activityId,
        unitId: cur.unitId || void 0,
        ...b.replacement,
        attachmentId: cur.attachmentId || void 0,
        idempotencyKey: `replace:${cur.id}`,
        replacesId: cur.id,
        source: cur.source
      });
    }
    bumpDataVersion(ctx);
    return { voided, replacement };
  }
  function createProgress(ctx, b) {
    const p = findById(ctx, "Projects", String(b.projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const existing = findByIdempotency(ctx, "ProgressReports", String(b.idempotencyKey));
    if (existing) return existing;
    const pctVal = Number(b.progressPct);
    if (!Number.isFinite(pctVal) || pctVal < 0 || pctVal > 100) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E49\u0E2D\u0E22\u0E25\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 0\u2013100");
    const activityId = checkActivity(ctx, p.id, b.activityId);
    const row = {
      ...newMeta(ctx),
      projectId: p.id,
      activityId,
      reportDate: validDate(b.reportDate || today(ctx), "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19"),
      progressPct: Math.round(pctVal * 100) / 100,
      detail: cleanText(b.detail, 2e3),
      issues: cleanText(b.issues, 1e3),
      idempotencyKey: String(b.idempotencyKey)
    };
    ctx.env.db.insert("ProgressReports", [row]);
    const status = row.progressPct >= 100 ? "COMPLETED" : "IN_PROGRESS";
    if (activityId) {
      const a = findById(ctx, "Activities", activityId, "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
      ctx.env.db.update("Activities", a.id, { ...a, progressPct: row.progressPct, status, version: a.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
      const acts = live(ctx.env.db.list("Activities")).filter((x) => x.projectId === p.id);
      const avg = acts.length ? acts.reduce((s, x) => s + Number(x.id === a.id ? row.progressPct : x.progressPct), 0) / acts.length : row.progressPct;
      ctx.env.db.update("Projects", p.id, { ...p, physicalProgress: Math.round(avg * 100) / 100, lastProgressAt: nowIso(ctx), status: avg >= 100 ? "COMPLETED" : p.status === "PLANNED" ? "IN_PROGRESS" : p.status, version: p.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
    } else {
      ctx.env.db.update("Projects", p.id, { ...p, physicalProgress: row.progressPct, lastProgressAt: nowIso(ctx), status: row.progressPct >= 100 ? "COMPLETED" : p.status === "PLANNED" ? "IN_PROGRESS" : p.status, version: p.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
    }
    audit(ctx, "progress.create", "ProgressReport", row.id, { after: row, projectId: p.id });
    bumpDataVersion(ctx);
    return row;
  }
  var PLAN_LINK = /* @__PURE__ */ Symbol("planLink");
  function withPlanLink(b, link) {
    return Object.assign(b, { [PLAN_LINK]: link });
  }
  function planLinkOf(b) {
    return b[PLAN_LINK] ?? { planDocId: "", planNodeSeq: 0 };
  }

  // src/core/services/public.ts
  function cached(ctx, key, build) {
    const full = `pub:${SCHEMA_VERSION}:${dataVersion(ctx)}:${key}`;
    const hit = ctx.env.cache.get(full);
    if (hit) {
      try {
        return JSON.parse(hit);
      } catch {
      }
    }
    const value = build();
    const json2 = JSON.stringify(value);
    if (json2.length < 95e3) ctx.env.cache.put(full, json2, 600);
    return value;
  }
  function publicFilter(ctx) {
    const hidden = new Set(live(ctx.env.db.list("Workgroups")).filter((g) => g.hidePublic).map((g) => g.id));
    return (p) => !!p.published && !hidden.has(p.workgroupId);
  }
  function lookups(ctx) {
    return cached(ctx, "lookups", () => {
      const fyNow = currentFiscalYear(ctx.env.now());
      const years = /* @__PURE__ */ new Set([fyNow, fyNow - 1]);
      for (const p of live(ctx.env.db.list("Projects"))) years.add(Number(p.fiscalYear));
      return {
        organizations: live(ctx.env.db.list("Organizations")).map(({ id, code, name }) => ({ id, code, name })),
        workgroups: live(ctx.env.db.list("Workgroups")).map(({ id, orgId, code, name, noActivities, hidePublic }) => ({ id, orgId, code, name, noActivities: !!noActivities, hidePublic: !!hidePublic })),
        fundingSources: live(ctx.env.db.list("FundingSources")).map(({ id, code, name, shortName }) => ({ id, code, name, shortName })),
        units: listUnits(ctx).map(({ id, code, name, shortName, kind }) => ({ id, code, name, shortName, kind })),
        fiscalYears: [...years].sort((a, b) => b - a),
        currentFiscalYear: fyNow
      };
    });
  }
  function toPublic(p, budget, t2, curve) {
    return {
      id: p.id,
      fiscalYear: Number(p.fiscalYear),
      fundingSourceId: p.fundingSourceId,
      projectCode: p.projectCode,
      name: p.name,
      workgroupId: p.workgroupId,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      physicalProgress: Number(p.physicalProgress) || 0,
      description: p.description,
      budget,
      risks: riskFlags(p, budget, t2, curve)
    };
  }
  function fyOf(ctx, v) {
    const n = Number(v);
    return Number.isInteger(n) && n > 2500 && n < 2700 ? n : currentFiscalYear(ctx.env.now());
  }
  function publicProjects(ctx, b) {
    const fy = fyOf(ctx, b.fiscalYear);
    return cached(ctx, `projects:${fy}`, () => {
      const ds = loadDataset(ctx);
      const budgets = budgetsByProject(ds);
      const t2 = today(ctx);
      const show = publicFilter(ctx);
      return ds.projects.filter((p) => show(p) && Number(p.fiscalYear) === fy).map((p) => toPublic(p, budgets.get(p.id), t2, curveFor(ctx, fy))).sort((a, b2) => a.projectCode.localeCompare(b2.projectCode, "th"));
    });
  }
  function publicProject(ctx, b) {
    const ds = loadDataset(ctx);
    const show = publicFilter(ctx);
    const p = ds.projects.find((x) => x.id === String(b.id) && show(x));
    if (!p) throw new AppError("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48");
    const allocs = ds.allocations.filter((a) => a.projectId === p.id);
    const disbs = ds.disbursements.filter((d) => d.projectId === p.id);
    const curve = curveFor(ctx, Number(p.fiscalYear));
    const out = toPublic(p, computeBudget(allocs, disbs), today(ctx), curve);
    out.activities = ds.activities.filter((a) => a.projectId === p.id).sort((x, y) => x.activityCode.localeCompare(y.activityCode, "th")).map((a) => ({
      id: a.id,
      activityCode: a.activityCode,
      name: a.name,
      status: a.status,
      progressPct: Number(a.progressPct) || 0,
      startDate: a.startDate,
      endDate: a.endDate,
      budget: computeBudget(allocs.filter((x) => x.activityId === a.id), disbs.filter((x) => x.activityId === a.id))
    }));
    out.monthly = { disbursedCumulative: monthlyCumulative(disbs, p.fiscalYear), targetPct: curve };
    return out;
  }
  function buildSummary(ctx, fy, onlyPublished) {
    const ds = loadDataset(ctx);
    const show = publicFilter(ctx);
    const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy && (!onlyPublished || show(p)));
    const ids = new Set(projects.map((p) => p.id));
    const budgets = budgetsByProject({ ...ds, projects });
    const t2 = today(ctx);
    const sources = live(ctx.env.db.list("FundingSources"));
    const groups = live(ctx.env.db.list("Workgroups"));
    const group = (keyOf, labelOf) => {
      const m2 = /* @__PURE__ */ new Map();
      for (const p of projects) (m2.get(keyOf(p)) ?? m2.set(keyOf(p), []).get(keyOf(p))).push(p);
      return [...m2.entries()].map(([key, ps]) => ({ key, label: labelOf(key), projects: ps.length, budget: addSummaries(ps.map((p) => budgets.get(p.id))) })).sort((a, b) => b.budget.currentBudget - a.budget.currentBudget);
    };
    const curve = curveFor(ctx, fy);
    const risks = projects.map((p) => ({ projectId: p.id, name: p.name, flags: riskFlags(p, budgets.get(p.id), t2, curve) })).filter((r3) => r3.flags.length > 0);
    const totals = addSummaries(projects.map((p) => budgets.get(p.id)));
    const targetSatang = planSeries(ctx, ds, projects);
    const fyNow = currentFiscalYear(ctx.env.now());
    const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(t2);
    const unitRows = buildUnitRows(ctx, ds, projects, m);
    const units = listUnits(ctx);
    const unitName = (id) => areaName(units.find((u) => u.id === id));
    const total = (key, label, rs) => {
      const { plan, planQ, ...budget } = summarizeRows(rs);
      return { key, label, budget, plan, planQ, projects: new Set(rs.map((r3) => r3.projectId)).size, activities: new Set(rs.filter((r3) => r3.activityId).map((r3) => r3.activityId)).size };
    };
    const byUnitOf = (rows) => {
      const mm = /* @__PURE__ */ new Map();
      for (const r3 of rows) (mm.get(r3.unitId) ?? mm.set(r3.unitId, []).get(r3.unitId)).push(r3);
      return units.filter((u) => mm.has(u.id)).map((u) => total(u.id, unitName(u.id), mm.get(u.id)));
    };
    const byGroupOf = (rows) => groups.filter((g) => rows.some((r3) => r3.workgroupId === g.id)).map((g) => total(g.id, g.name, rows.filter((r3) => r3.workgroupId === g.id)));
    const settings = getSettings(ctx);
    const inScopeDisb = ds.disbursements.filter((d) => ids.has(d.projectId));
    const planItems = projects.some((p) => p.planDocId) ? live(ctx.env.db.list("PlanItems")) : [];
    const planKey = (p) => {
      if (!p.planDocId) return "\u0E19\u0E2D\u0E01\u0E41\u0E1C\u0E19";
      const node = planItems.find((i) => i.planDocId === p.planDocId && Number(i.seq) === Number(p.planNodeSeq));
      const plan = node && planItems.find((i) => i.planDocId === p.planDocId && i.kind === "PLAN" && Number(i.planIndex) === Number(node.planIndex));
      return plan?.name ?? "\u0E19\u0E2D\u0E01\u0E41\u0E1C\u0E19";
    };
    const meetingActs = ds.activities.filter((a) => ids.has(a.projectId) && MEETING_RE.test(a.name));
    let mBudget = 0;
    let mRemaining = 0;
    for (const a of meetingActs) {
      const b = computeBudget(ds.allocations.filter((x) => x.activityId === a.id), ds.disbursements.filter((x) => x.activityId === a.id));
      mBudget += b.currentBudget;
      mRemaining += Math.max(0, b.currentBudget - b.disbursed);
    }
    const delayed = risks.filter((r3) => r3.flags.includes("OVERDUE") || r3.flags.includes("BEHIND_SPENDING")).length;
    return {
      fiscalYear: fy,
      generatedAt: nowIso(ctx),
      sourceVersion: dataVersion(ctx),
      totals,
      counts: {
        total: projects.length,
        planned: projects.filter((p) => p.status === "PLANNED").length,
        inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
        completed: projects.filter((p) => p.status === "COMPLETED").length,
        cancelled: projects.filter((p) => p.status === "CANCELLED").length,
        delayed
      },
      avgPhysicalProgress: projects.length ? Math.round(projects.reduce((s, p) => s + (Number(p.physicalProgress) || 0), 0) / projects.length * 100) / 100 : 0,
      byFundingSource: group((p) => p.fundingSourceId, (k) => sources.find((s) => s.id === k)?.name ?? "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38"),
      byWorkgroup: group((p) => p.workgroupId, (k) => groups.find((g) => g.id === k)?.name ?? "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38").map((g) => {
        const rs = unitRows.filter((r3) => r3.workgroupId === g.key);
        const sum = summarizeRows(rs);
        return { ...g, plan: sum.plan, planQ: sum.planQ, activities: new Set(rs.filter((r3) => r3.activityId).map((r3) => r3.activityId)).size, units: byUnitOf(rs) };
      }),
      byUnit: byUnitOf(unitRows).map((u) => ({ ...u, groups: byGroupOf(unitRows.filter((r3) => r3.unitId === u.key)) })),
      activitiesWithoutUnits: (() => {
        const withShares = new Set(ctx.env.db.list("ActivityUnits").filter((x) => !x.isDeleted).map((x) => x.activityId));
        return ds.activities.filter((a) => ids.has(a.projectId) && !withShares.has(a.id)).length;
      })(),
      byPlan: group(planKey, (k) => k),
      targets: {
        // เป้าทั้งปี = 100% ภายในเดือนแรกที่เป้าหมายรายเดือนถึง 100
        annualPct: 100,
        fullMonth: fullMonthOf(curve),
        meetingDeadline: `${fy - 543}-06-30`,
        spend: spendTargetFor(ctx, fy)
      },
      meetings: { activities: meetingActs.filter((a) => a.status !== "CANCELLED").length, remaining: mRemaining, budget: mBudget },
      monthly: {
        disbursedCumulative: monthlyCumulative(inScopeDisb, fy),
        targetPct: targetSatang.map((v) => pct(v, totals.currentBudget))
      },
      risks: risks.slice(0, 50),
      dataQuality: {
        projectsWithoutBudget: projects.filter((p) => budgets.get(p.id).currentBudget === 0).length,
        projectsWithoutReport45d: risks.filter((r3) => r3.flags.includes("NO_RECENT_REPORT")).length,
        lastImportAt: settings.lastImportAt || (live(ctx.env.db.list("ImportJobs")).filter((j) => j.committedAt).map((j) => j.committedAt).sort().pop() ?? "")
      }
    };
  }
  function publicSummary(ctx, b) {
    const fy = fyOf(ctx, b.fiscalYear);
    return cached(ctx, `summary:${fy}`, () => buildSummary(ctx, fy, true));
  }
  function publicReport(ctx, b) {
    const fy = fyOf(ctx, b.fiscalYear);
    return cached(ctx, `report:${fy}`, () => {
      const ds = loadDataset(ctx);
      const show = publicFilter(ctx);
      const projects = ds.projects.filter((p) => show(p) && Number(p.fiscalYear) === fy);
      const fyNow = currentFiscalYear(ctx.env.now());
      const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(today(ctx));
      return { fiscalYear: fy, generatedAt: nowIso(ctx), monthIndex: m, rows: buildUnitRows(ctx, ds, projects, m) };
    });
  }
  function visitHit(ctx, b) {
    const props = ctx.env.props;
    const day = today(ctx);
    const read = () => {
      const [d, n] = (props.get("visits:day") || "").split("|");
      return { today: d === day ? Number(n) || 0 : 0, total: Number(props.get("visits:total")) || 0, since: props.get("visits:since") || day };
    };
    if (!b.count) return read();
    try {
      return ctx.env.lock.withLock(() => {
        const v = read();
        v.today += 1;
        v.total += 1;
        props.set("visits:day", `${day}|${v.today}`);
        props.set("visits:total", String(v.total));
        if (!props.get("visits:since")) props.set("visits:since", day);
        return v;
      }, 3e3);
    } catch {
      return read();
    }
  }
  function writeSnapshot(ctx) {
    const fy = currentFiscalYear(ctx.env.now());
    const s = buildSummary(ctx, fy, true);
    ctx.env.db.insert("Snapshots", [{ id: ctx.env.uuid(), kind: "PUBLIC_SUMMARY", fiscalYear: fy, generatedAt: s.generatedAt, sourceVersion: s.sourceVersion, json: JSON.stringify(s).slice(0, 49e3) }]);
    return { generatedAt: s.generatedAt };
  }

  // src/core/services/admin.ts
  function overview(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
    const wgSel = String(b.workgroupId ?? "");
    const projects = listProjects(ctx, { fiscalYear: fy }).filter((p) => !wgSel || p.workgroupId === wgSel);
    const since = new Date(ctx.env.now().getTime() - 864e5).toISOString();
    const attempts = u.role === "admin" ? [] : ctx.env.db.list("LoginAttempts").filter((a) => a.at >= since);
    const summary = buildSummary(ctx, fy, false);
    const totals = !wgSel ? summary.totals : (() => {
      const s = { ...summary.totals };
      const keys = Object.keys(s);
      keys.forEach((k) => s[k] = 0);
      for (const p of projects) for (const k of keys) if (k !== "spendingPct") s[k] += p.budget[k];
      s.spendingPct = s.currentBudget > 0 ? Math.round(s.disbursed / s.currentBudget * 1e4) / 100 : 0;
      return s;
    })();
    return {
      pendingRequests: u.role === "admin" ? 0 : ctx.env.db.list("AccessRequests").filter((r3) => r3.status === "pending").length,
      stagedImports: live(ctx.env.db.list("ImportJobs")).filter((j) => j.status === "STAGED" && (u.role !== "admin" || j.createdBy === u.sub || j.channel === "INBOX")).map(({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt }) => ({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt })),
      risks: projects.filter((p) => p.risks.length).map((p) => ({ projectId: p.id, name: p.name, flags: p.risks })).slice(0, 30),
      newDeviceLogins: attempts.filter((a) => a.newDevice && a.result === "success").length,
      failedLogins24h: attempts.filter((a) => a.result !== "success").length,
      recentAudit: ctx.env.db.list("AuditLogs").filter((l) => u.workgroupIds === null || l.actorId === u.sub).sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 10),
      totals,
      unassignedPlan: (() => {
        const docs = live(ctx.env.db.list("PlanDocs")).filter((d) => d.status === "ACTIVE" && Number(d.fiscalYear) === fy);
        const ids = new Set(docs.map((d) => d.id));
        const open = live(ctx.env.db.list("PlanItems")).filter((i) => ids.has(i.planDocId) && i.isLeaf && !i.workgroupId);
        return { items: open.length, satang: open.reduce((a, i) => a + Number(i.amountSatang), 0), planDocId: docs[0]?.id ?? "" };
      })()
    };
  }
  function listRequests(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    const st = cleanText(b.status, 20);
    return ctx.env.db.list("AccessRequests").filter((r3) => !st || st === "all" || r3.status === st).sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
  }
  function decideRequest(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const req = ctx.env.db.list("AccessRequests").find((r3) => r3.id === b.requestId);
    if (!req) throw new AppError("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E04\u0E33\u0E02\u0E2D");
    if (req.status !== "pending") throw new AppError("VALIDATION_FAILED", "\u0E04\u0E33\u0E02\u0E2D\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u0E41\u0E25\u0E49\u0E27");
    const role = b.role === "minisuper" ? "minisuper" : "admin";
    if (role === "minisuper" && u.role !== "superadmin") throw new AppError("FORBIDDEN_SCOPE", "\u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07 Mini Super Admin \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
    const at = nowIso(ctx);
    ctx.env.db.update("AccessRequests", req.id, {
      ...req,
      status: b.approve ? "approved" : "rejected",
      decidedAt: at,
      decidedBy: u.name,
      reason: cleanText(b.reason, 300),
      version: req.version + 1,
      updatedAt: at,
      updatedBy: u.sub
    });
    if (b.approve) {
      const h = phoneHash(ctx, req.phone);
      if (!ctx.env.db.list("Users").some((x) => !x.isDeleted && x.phoneHash === h)) {
        const user = {
          ...newMeta(ctx),
          phone: normalizePhone(req.phone),
          phoneHash: h,
          fullName: req.fullName,
          position: req.position,
          title: req.title ?? "",
          workgroupId: req.workgroupId,
          affiliation: req.affiliation,
          role,
          status: "active",
          scopeWorkgroups: "[]",
          tokenVersion: 1,
          approvedAt: at,
          approvedBy: u.name,
          lastLoginAt: "",
          knownDevices: "[]"
        };
        ctx.env.db.insert("Users", [user]);
        audit(ctx, "user.create", "User", user.id, { after: user, reason: `\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E04\u0E33\u0E02\u0E2D ${req.id}` });
      }
    }
    audit(ctx, b.approve ? "request.approve" : "request.reject", "AccessRequest", req.id, { reason: b.reason });
    return { ok: true };
  }
  function listUsers(ctx) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    return live(ctx.env.db.list("Users")).map(({ phoneHash: _h, knownDevices: _d, ...rest }) => ({ ...rest, phone: u.role === "superadmin" ? rest.phone : maskPhone(rest.phone) })).sort((a, b) => a.fullName.localeCompare(b.fullName, "th"));
  }
  function saveUser(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const phone = normalizePhone(b.phone);
    if (!isValidPhone(phone)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const role = b.role === "minisuper" ? "minisuper" : "admin";
    const groups = live(ctx.env.db.list("Workgroups"));
    if (!groups.some((g) => g.id === b.workgroupId)) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    const scope = (b.scopeWorkgroups ?? []).filter((id) => groups.some((g) => g.id === id));
    const h = phoneHash(ctx, phone);
    const users = live(ctx.env.db.list("Users"));
    if (users.some((x) => x.phoneHash === h && x.id !== b.id)) throw new AppError("VALIDATION_FAILED", "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E19\u0E35\u0E49\u0E21\u0E35\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27");
    const fields = {
      phone,
      phoneHash: h,
      title: cleanText(b.title, 40),
      fullName: cleanText(b.fullName, 120),
      position: cleanText(b.position, 120),
      workgroupId: b.workgroupId,
      affiliation: cleanText(b.affiliation, 160),
      role,
      scopeWorkgroups: JSON.stringify(scope)
    };
    if (fields.fullName.length < 4) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25");
    if (b.id) {
      const cur = findById(ctx, "Users", b.id, "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49");
      if ((cur.role === "minisuper" || role === "minisuper") && u.role !== "superadmin") throw new AppError("FORBIDDEN_SCOPE", "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Mini Super Admin \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
      if (cur.id === u.sub && cur.role !== role) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1A\u0E17\u0E1A\u0E32\u0E17\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
      const authChanged = cur.phoneHash !== fields.phoneHash || cur.role !== role || cur.workgroupId !== fields.workgroupId || (cur.scopeWorkgroups || "[]") !== fields.scopeWorkgroups;
      const next = { ...cur, ...fields, tokenVersion: Number(cur.tokenVersion) + (authChanged ? 1 : 0), version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
      ctx.env.db.update("Users", cur.id, next);
      audit(ctx, "user.update", "User", cur.id, { before: cur, after: next });
      return { id: cur.id };
    }
    if (role === "minisuper" && u.role !== "superadmin") throw new AppError("FORBIDDEN_SCOPE", "\u0E41\u0E15\u0E48\u0E07\u0E15\u0E31\u0E49\u0E07 Mini Super Admin \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
    const user = { ...newMeta(ctx), ...fields, status: "active", tokenVersion: 1, approvedAt: nowIso(ctx), approvedBy: u.name, lastLoginAt: "", knownDevices: "[]" };
    ctx.env.db.insert("Users", [user]);
    audit(ctx, "user.create", "User", user.id, { after: user });
    return { id: user.id };
  }
  function setUserStatus(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const cur = findById(ctx, "Users", b.id, "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49");
    if (cur.role === "minisuper" && u.role !== "superadmin") throw new AppError("FORBIDDEN_SCOPE", "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Mini Super Admin \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
    if (cur.id === u.sub) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
    const status = b.status === "suspended" ? "suspended" : "active";
    ctx.env.db.update("Users", cur.id, { ...cur, status, tokenVersion: Number(cur.tokenVersion) + 1, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
    audit(ctx, status === "suspended" ? "user.suspend" : "user.activate", "User", cur.id, { before: { status: cur.status }, after: { status } });
    return { ok: true };
  }
  function loginReport(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const days = Math.min(Math.max(Number(b.days) || 7, 1), 90);
    const since = new Date(ctx.env.now().getTime() - days * 864e5).toISOString();
    return ctx.env.db.list("LoginAttempts").filter((a) => a.at >= since && (u.role === "superadmin" || a.role !== "superadmin")).sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 1e3);
  }
  function auditList(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const limit = Math.min(Math.max(Number(b.limit) || 200, 1), 1e3);
    return ctx.env.db.list("AuditLogs").filter((l) => (!b.entityId || l.entityId === b.entityId || l.projectId === b.entityId) && (u.role !== "admin" || l.actorId === u.sub)).sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, limit);
  }
  function health(ctx, triggers = []) {
    requireRole(ctx, "superadmin");
    const s = getSettings(ctx);
    return {
      setupVersion: ctx.env.props.get("SETUP_VERSION") || SCHEMA_VERSION,
      apiVersion: "1.0.0",
      cellUsage: ctx.env.db.cellUsage().map((c) => ({ ...c, pctOfLimit: Math.round(c.cells / CELL_LIMIT * 1e4) / 100 })),
      triggers,
      lastBackupAt: s.lastBackupAt,
      lockTimeouts24h: Number(ctx.env.cache.get("metric:lockTimeout") || "0"),
      errors24h: Number(ctx.env.cache.get("metric:errors") || "0"),
      settings: { autoCommitClean: s.autoCommitClean, defaultQuarterTargets: s.defaultQuarterTargets, annualTargetPct: s.annualTargetPct, maxUploadMB: s.maxUploadMB, backupRetentionDays: s.backupRetentionDays, publicNotice: s.publicNotice }
    };
  }
  var EDITABLE_SETTINGS = /* @__PURE__ */ new Set(["autoCommitClean", "defaultQuarterTargets", "annualTargetPct", "maxUploadMB", "backupRetentionDays", "publicNotice"]);
  function saveSettings(ctx, b) {
    requireRole(ctx, "superadmin");
    for (const [k, v] of Object.entries(b.settings ?? {})) {
      if (!EDITABLE_SETTINGS.has(k)) throw new AppError("VALIDATION_FAILED", `\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ${k} \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49`);
      const val = cleanText(v, 500);
      if (k === "autoCommitClean" && !["true", "false"].includes(val)) throw new AppError("VALIDATION_FAILED", "autoCommitClean \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 true/false");
      if ((k === "maxUploadMB" || k === "backupRetentionDays") && !(Number(val) > 0 && Number(val) <= 365)) throw new AppError("VALIDATION_FAILED", `${k} \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
      if (k === "annualTargetPct" && !(Number(val) > 0 && Number(val) <= 100)) throw new AppError("VALIDATION_FAILED", "\u0E40\u0E1B\u0E49\u0E32\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E17\u0E31\u0E49\u0E07\u0E1B\u0E35\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 1\u2013100");
      setSetting(ctx, k, val);
    }
    audit(ctx, "settings.update", "Settings", "settings", { after: b.settings });
    bumpDataVersion(ctx);
    return { ok: true };
  }
  function saveMaster(ctx, b) {
    const u = requireRole(ctx, "superadmin");
    const table = { workgroups: "Workgroups", organizations: "Organizations", fundingSources: "FundingSources" }[b.table];
    if (!table) throw new AppError("VALIDATION_FAILED", "\u0E15\u0E32\u0E23\u0E32\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const code = cleanText(b.item.code, 40);
    const name = cleanText(b.item.name, 200);
    if (!code || !name) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E41\u0E25\u0E30\u0E0A\u0E37\u0E48\u0E2D");
    const rows = live(ctx.env.db.list(table));
    if (rows.some((r3) => r3.code.toLowerCase() === code.toLowerCase() && r3.id !== b.item.id)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2B\u0E31\u0E2A\u0E0B\u0E49\u0E33");
    const extra = {};
    if (table === "Workgroups") {
      const orgs = live(ctx.env.db.list("Organizations"));
      if (!orgs.some((o) => o.id === b.item.orgId)) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E07\u0E32\u0E19");
      extra.orgId = String(b.item.orgId);
    }
    if (table === "FundingSources") extra.shortName = cleanText(b.item.shortName, 60) || name;
    if (b.item.id) {
      const cur = findById(ctx, table, b.item.id);
      const next = { ...cur, code, name, ...extra, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
      ctx.env.db.update(table, cur.id, next);
      audit(ctx, "master.update", table, cur.id, { before: cur, after: next });
      bumpDataVersion(ctx);
      return { id: cur.id };
    }
    const row = { ...newMeta(ctx), code, name, ...extra };
    ctx.env.db.insert(table, [row]);
    audit(ctx, "master.create", table, row.id, { after: row });
    bumpDataVersion(ctx);
    return { id: row.id };
  }
  function allowedGroups(ctx) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    if (u.workgroupIds === null) return null;
    return new Set(live(ctx.env.db.list("Workgroups")).filter((g) => canAccessWorkgroup(u, g.id)).map((g) => g.id));
  }
  function setWorkgroupPublic(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const cur = findById(ctx, "Workgroups", String(b.id), "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    if (cur.noActivities) throw new AppError("VALIDATION_FAILED", `${cur.name}\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48`);
    const hidePublic = !b.visible;
    if (!!cur.hidePublic !== hidePublic) {
      ctx.env.db.update("Workgroups", cur.id, { ...cur, hidePublic, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
      audit(ctx, hidePublic ? "workgroup.hidePublic" : "workgroup.showPublic", "Workgroup", cur.id, { before: { hidePublic: !!cur.hidePublic }, after: { hidePublic } });
      bumpDataVersion(ctx);
    }
    return { id: cur.id, hidePublic };
  }

  // src/core/services/files.ts
  function sniff(bytes) {
    const b = (i) => bytes[i] ?? -1;
    if (b(0) === 255 && b(1) === 216 && b(2) === 255) return "jpeg";
    if (b(0) === 137 && b(1) === 80 && b(2) === 78 && b(3) === 71) return "png";
    if (b(0) === 82 && b(1) === 73 && b(2) === 70 && b(3) === 70 && b(8) === 87 && b(9) === 69) return "webp";
    if (b(0) === 37 && b(1) === 80 && b(2) === 68 && b(3) === 70) return "pdf";
    if (b(0) === 80 && b(1) === 75 && b(2) === 3 && b(3) === 4) return "xlsx";
    if (b(0) === 208 && b(1) === 207 && b(2) === 17 && b(3) === 224) return "xls";
    const n = Math.min(bytes.length, 4096);
    for (let i = 0; i < n; i++) if (bytes[i] === 0) return "unknown";
    let head = "";
    for (let i = 0; i < Math.min(n, 512); i++) head += String.fromCharCode(bytes[i]);
    if (/<\s*(html|svg|script|!doctype|\?xml)/i.test(head)) return "unknown";
    return n > 0 ? "text" : "unknown";
  }
  var MIME_OF = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    text: "text/csv"
  };
  function safeFileName(name, fallbackExt) {
    const base = cleanText(name, 120).replace(/^.*[\\/]/, "").replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/^\.+/, "");
    return base || `file.${fallbackExt}`;
  }
  function decodeUpload(ctx, base64) {
    const maxMB = Number(getSettings(ctx).maxUploadMB) || 15;
    const approx = Math.floor(String(base64 || "").length * 3 / 4);
    if (!base64) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E1F\u0E25\u0E4C");
    if (approx > maxMB * 1024 * 1024) throw new AppError("VALIDATION_FAILED", `\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E0D\u0E48\u0E40\u0E01\u0E34\u0E19 ${maxMB} MB`);
    try {
      return ctx.env.crypto.base64Decode(base64.replace(/^data:[^,]*,/, ""));
    } catch {
      throw new AppError("VALIDATION_FAILED", "\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22");
    }
  }
  var EVIDENCE_TYPES = ["jpeg", "png", "webp", "pdf"];
  function uploadFile(ctx, b) {
    const p = findById(ctx, "Projects", String(b.projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    if (!["COVER_LETTER", "EVIDENCE"].includes(b.kind)) throw new AppError("VALIDATION_FAILED", "\u0E0A\u0E19\u0E34\u0E14\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const bytes = decodeUpload(ctx, b.base64);
    const type = sniff(bytes);
    if (!EVIDENCE_TYPES.includes(type)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E23\u0E39\u0E1B JPG/PNG/WEBP \u0E2B\u0E23\u0E37\u0E2D PDF");
    const mime = MIME_OF[type];
    const fileName = safeFileName(b.fileName, type === "jpeg" ? "jpg" : type);
    const folder = `02_Project_Evidence/FY${p.fiscalYear}/${safeFileName(p.projectCode, "x")}`;
    const stored = ctx.env.files.save(folder, fileName, mime, bytes);
    const dup = live(ctx.env.db.list("Attachments")).find((f) => f.sha256 === stored.sha256 && f.projectId === p.id);
    const row = {
      ...newMeta(ctx),
      entityType: b.entityType || "project",
      entityId: cleanText(b.entityId, 60) || p.id,
      projectId: p.id,
      kind: b.kind,
      fileName,
      mimeType: mime,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      driveFileId: stored.id,
      ocrStatus: "",
      ocrText: ""
    };
    ctx.env.db.insert("Attachments", [row]);
    audit(ctx, "file.upload", "Attachment", row.id, { after: { fileName, kind: b.kind, sha256: stored.sha256, duplicateOf: dup?.id ?? "" }, projectId: p.id });
    const { ocrText: _omit, ...rest } = row;
    return rest;
  }
  function ocrCoverLetter(ctx, b) {
    const f = findById(ctx, "Attachments", String(b.attachmentId), "\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A");
    const p = findById(ctx, "Projects", f.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    let text = f.ocrStatus === "DONE" ? f.ocrText : "";
    if (!text) {
      try {
        text = ctx.env.files.ocr(f.driveFileId);
        ctx.env.db.update("Attachments", f.id, { ...f, ocrStatus: "DONE", ocrText: text.slice(0, 4e4) });
      } catch (e) {
        ctx.env.db.update("Attachments", f.id, { ...f, ocrStatus: "FAILED" });
        ctx.env.log("warn", "ocr_failed", { attachmentId: f.id, message: String(e.message) });
        throw new AppError("IMPORT_REVIEW_REQUIRED", "\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E32\u0E01\u0E23\u0E39\u0E1B\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E2D\u0E07 (\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A\u0E22\u0E31\u0E07\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49)");
      }
    }
    const codes = live(ctx.env.db.list("Projects")).filter((x) => x.fiscalYear === p.fiscalYear).map((x) => x.projectCode);
    const result = parseCoverLetter(text, codes);
    audit(ctx, "file.ocr", "Attachment", f.id, { projectId: p.id, after: { confidence: result.overallConfidence } });
    return result;
  }

  // src/core/services/imports.ts
  function jobMeta(job) {
    try {
      return JSON.parse(job.mapping);
    } catch {
      return { rev: 1, sheetName: "", headers: [], headerRow: 0, headerSpan: 1, mapping: {} };
    }
  }
  function pickTable(tables) {
    let best = null;
    let bestScore = -1;
    for (const t2 of tables) {
      if (!t2.rows.length) continue;
      const det = detectHeader(t2.rows);
      const score = Object.keys(det.mapping).length * 10 + (det.kind ? 5 : 0);
      if (score > bestScore) {
        best = { ...t2, det };
        bestScore = score;
      }
    }
    return best;
  }
  function planFor(ctx, job, rawRows, meta) {
    const parsed = parseRows(rawRows, { headerRow: meta.headerRow, headerSpan: meta.headerSpan, mapping: meta.mapping });
    const u = actor(ctx);
    const groups = live(ctx.env.db.list("Workgroups"));
    return planImport(parsed, {
      kind: job.kind,
      fiscalYear: Number(job.fiscalYear),
      fundingSourceId: job.fundingSourceId,
      fileLabel: job.fileName,
      workgroups: groups,
      fundingSources: live(ctx.env.db.list("FundingSources")),
      projects: live(ctx.env.db.list("Projects")),
      activities: live(ctx.env.db.list("Activities")),
      allocations: live(ctx.env.db.list("Allocations")),
      disbursements: live(ctx.env.db.list("Disbursements")),
      allowedWorkgroupIds: allowedGroups(ctx),
      defaultWorkgroupId: u.workgroupIds?.length === 1 ? u.workgroupIds[0] : "",
      today: todayBangkok(ctx.env.now())
    });
  }
  function rawMatrix(ctx, job, meta) {
    const rows = ctx.env.db.list("ImportRows").filter((r3) => r3.jobId === job.id && r3.rowKey.startsWith("raw:"));
    const max = rows.reduce((m, r3) => Math.max(m, Number(r3.rowNo)), meta.headerRow + meta.headerSpan);
    const matrix = Array.from({ length: max }, () => []);
    matrix[meta.headerRow] = meta.headers;
    for (const r3 of rows) {
      try {
        matrix[Number(r3.rowNo) - 1] = JSON.parse(r3.raw);
      } catch {
      }
    }
    return matrix;
  }
  function storePlan(ctx, job, meta, staged) {
    ctx.env.db.insert("ImportRows", staged.map((s) => ({
      id: ctx.env.uuid(),
      jobId: job.id,
      rowNo: s.rowNo,
      rowKey: `plan:r${meta.rev}`,
      status: s.status,
      messages: s.messages.join(" | ").slice(0, 2e3),
      raw: "",
      normalized: JSON.stringify({ label: s.label, effect: s.effect }).slice(0, 4e3),
      committed: false
    })));
    const sum = summarizeStaged(staged);
    const next = {
      ...job,
      mapping: JSON.stringify(meta),
      totalRows: sum.total,
      validRows: sum.valid,
      warningRows: sum.warning,
      errorRows: sum.error,
      version: job.version + 1,
      updatedAt: nowIso(ctx),
      updatedBy: actor(ctx).sub
    };
    ctx.env.db.update("ImportJobs", job.id, next);
    return next;
  }
  function preview(job, meta, staged) {
    return { job, headers: meta.headers, mapping: meta.mapping, rows: staged, summary: summarizeStaged(staged) };
  }
  function readUpload(ctx, b, folder) {
    if (b.sheetUrl) {
      const url = cleanText(b.sheetUrl, 500);
      if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError("VALIDATION_FAILED", "\u0E25\u0E34\u0E07\u0E01\u0E4C Google Sheets \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      const tables2 = ctx.env.files.readSheetUrl(url);
      return { tables: tables2, sha256: ctx.env.crypto.sha256Hex(JSON.stringify(tables2)), driveFileId: "", fileName: cleanText(b.fileName, 120) || "Google Sheets" };
    }
    const bytes = decodeUpload(ctx, String(b.base64 ?? ""));
    const type = sniff(bytes);
    if (!["xlsx", "xls", "text"].includes(type)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E44\u0E1F\u0E25\u0E4C CSV, TSV, XLSX, XLS \u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E34\u0E07\u0E01\u0E4C Google Sheets");
    const mime = MIME_OF[type];
    const fileName = safeFileName(b.fileName, type === "text" ? "csv" : type);
    const stored = ctx.env.files.save(folder, fileName, mime, bytes);
    const tables = ctx.env.files.readTables(stored.id, mime);
    return { tables, sha256: stored.sha256, driveFileId: stored.id, fileName };
  }
  function stageFile(ctx, b, channel = "UPLOAD", preloaded) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
    const up = preloaded ?? readUpload(ctx, b, `01_Imports/Original/FY${fy}`);
    const dup = live(ctx.env.db.list("ImportJobs")).find((j) => j.sha256 === up.sha256 && ["STAGED", "COMMITTED", "PARTIAL"].includes(j.status));
    if (dup && !b.allowDuplicate) {
      throw new AppError("DUPLICATE_IMPORT", `\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E40\u0E21\u0E37\u0E48\u0E2D ${dup.createdAt.slice(0, 10)} (${dup.fileName})`, { jobId: dup.id });
    }
    const table = pickTable(up.tables);
    if (!table) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C");
    const det = table.det;
    const kind = b.kind ?? det.kind ?? "BUDGET_SUMMARY";
    const sources = live(ctx.env.db.list("FundingSources"));
    const fundingSourceId = sources.some((s) => s.id === b.fundingSourceId) ? String(b.fundingSourceId) : "";
    const meta = { rev: 1, sheetName: table.name, headers: det.headers, headerRow: det.headerRow, headerSpan: det.headerSpan, mapping: det.mapping };
    const job = {
      ...newMeta(ctx),
      fileName: up.fileName,
      sha256: up.sha256,
      driveFileId: up.driveFileId,
      channel,
      kind,
      fiscalYear: fy,
      fundingSourceId,
      headerRow: det.headerRow,
      mapping: JSON.stringify(meta),
      status: "STAGED",
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      errorRows: 0,
      committedRows: 0,
      committedAt: "",
      committedBy: "",
      message: det.kind ? "" : "\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E41\u0E19\u0E48\u0E43\u0E08\u0E0A\u0E19\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 \u2014 \u0E42\u0E1B\u0E23\u0E14\u0E15\u0E23\u0E27\u0E08\u0E01\u0E32\u0E23\u0E08\u0E31\u0E1A\u0E04\u0E39\u0E48\u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C"
    };
    ctx.env.db.insert("ImportJobs", [job]);
    const firstData = det.headerRow + det.headerSpan;
    ctx.env.db.insert("ImportRows", table.rows.slice(firstData).map((r3, i) => ({
      id: ctx.env.uuid(),
      jobId: job.id,
      rowNo: firstData + i + 1,
      rowKey: "raw:",
      status: "",
      messages: "",
      raw: JSON.stringify(r3.slice(0, 60).map((c) => c instanceof Date ? c.toISOString().slice(0, 10) : c)).slice(0, 8e3),
      normalized: "",
      committed: false
    })).filter((x) => x.raw !== "[]" && !/^\[(""|,|null)*\]$/.test(x.raw)));
    const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
    const saved = storePlan(ctx, job, meta, staged);
    audit(ctx, "import.stage", "ImportJob", job.id, { after: { fileName: job.fileName, kind, rows: staged.length, channel } });
    return preview(saved, meta, staged);
  }
  function loadJob(ctx, jobId) {
    const job = findById(ctx, "ImportJobs", String(jobId), "\u0E07\u0E32\u0E19\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32");
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    if (u.role === "admin" && job.createdBy !== u.sub && job.channel !== "INBOX") throw new AppError("FORBIDDEN_SCOPE", "\u0E07\u0E32\u0E19\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2D\u0E37\u0E48\u0E19");
    return job;
  }
  function getImport(ctx, b) {
    const job = loadJob(ctx, b.jobId);
    const meta = jobMeta(job);
    return preview(job, meta, planFor(ctx, job, rawMatrix(ctx, job, meta), meta));
  }
  function listImports(ctx) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    return live(ctx.env.db.list("ImportJobs")).filter((j) => u.role !== "admin" || j.createdBy === u.sub || j.channel === "INBOX").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  }
  function remapImport(ctx, b) {
    let job = loadJob(ctx, b.jobId);
    if (job.status !== "STAGED") throw new AppError("VALIDATION_FAILED", "\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E23\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19");
    const meta = jobMeta(job);
    if (b.mapping) {
      const clean = {};
      for (const [k, v] of Object.entries(b.mapping)) {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 0 && n < meta.headers.length) clean[k] = n;
      }
      meta.mapping = clean;
    }
    meta.rev += 1;
    const sources = live(ctx.env.db.list("FundingSources"));
    job = {
      ...job,
      kind: b.kind ?? detectKind(meta.mapping) ?? job.kind,
      fiscalYear: Number(b.fiscalYear) || job.fiscalYear,
      fundingSourceId: b.fundingSourceId !== void 0 ? sources.some((s) => s.id === b.fundingSourceId) ? b.fundingSourceId : "" : job.fundingSourceId
    };
    const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
    const saved = storePlan(ctx, job, meta, staged);
    return preview(saved, meta, staged);
  }
  function commitImport(ctx, b) {
    const job = loadJob(ctx, b.jobId);
    if (!["STAGED", "PARTIAL"].includes(job.status)) throw new AppError("VALIDATION_FAILED", "\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01");
    const meta = jobMeta(job);
    const staged = planFor(ctx, job, rawMatrix(ctx, job, meta), meta);
    const sum = summarizeStaged(staged);
    if (sum.warning > 0 && !b.acceptWarnings) {
      throw new AppError("IMPORT_REVIEW_REQUIRED", `\u0E21\u0E35 ${sum.warning} \u0E41\u0E16\u0E27\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u2014 \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E27\u0E48\u0E32\u0E15\u0E23\u0E27\u0E08\u0E41\u0E25\u0E49\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32`, sum);
    }
    if (sum.valid + sum.warning === 0) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E41\u0E16\u0E27\u0E17\u0E35\u0E48\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E44\u0E14\u0E49");
    const started = Date.now();
    const refs = /* @__PURE__ */ new Map();
    let committed = 0;
    let skipped = 0;
    let timedOut = false;
    const failures = [];
    for (const row of staged) {
      if (row.status === "ERROR") {
        skipped++;
        continue;
      }
      if (Date.now() - started > 27e4) {
        timedOut = true;
        break;
      }
      const key = `imp:${job.id}:${row.rowNo}`;
      try {
        const p = row.plan;
        if (p.createProject) {
          const created = createProject(ctx, {
            idempotencyKey: `${key}:p`,
            fiscalYear: p.createProject.fiscalYear,
            fundingSourceId: p.createProject.fundingSourceId,
            projectCode: p.createProject.projectCode,
            name: p.createProject.name,
            workgroupId: p.createProject.workgroupId,
            ownerName: p.createProject.ownerName,
            startDate: p.createProject.startDate,
            endDate: p.createProject.endDate,
            status: p.createProject.status,
            published: true
          });
          refs.set(p.createProject.ref, created.id);
        }
        if (p.updateProject) {
          const cur = findById(ctx, "Projects", p.updateProject.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
          ctx.env.db.update("Projects", cur.id, { ...cur, ...p.updateProject.patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
          audit(ctx, "project.update", "Project", cur.id, { before: cur, after: p.updateProject.patch, projectId: cur.id, reason: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32 ${job.fileName}` });
        }
        const resolve = (ref) => ref.startsWith("new:") ? refs.get(ref) ?? "" : ref;
        if (p.createActivity) {
          const a = createActivity(ctx, { idempotencyKey: `${key}:a`, projectId: resolve(p.createActivity.projectRef), activityCode: p.createActivity.activityCode, name: p.createActivity.name });
          refs.set(p.createActivity.ref, a.id);
        }
        p.allocations.forEach((a, i) => createAllocation(ctx, {
          idempotencyKey: `${key}:al${i}`,
          projectId: resolve(a.projectRef),
          activityId: resolve(a.activityRef) || void 0,
          type: a.type,
          amountSatang: a.amountSatang,
          note: a.note,
          source: `IMPORT:${job.id}`
        }));
        p.disbursements.forEach((d, i) => createDisbursement(ctx, {
          idempotencyKey: `${key}:d${i}`,
          projectId: resolve(d.projectRef),
          activityId: resolve(d.activityRef) || void 0,
          status: d.status,
          amountSatang: d.amountSatang,
          date: d.date,
          docNo: d.docNo,
          description: d.description,
          source: `${d.adjust ? "ADJUST" : "IMPORT"}:${job.id}`
        }));
        committed++;
      } catch (e) {
        skipped++;
        failures.push(`\u0E41\u0E16\u0E27 ${row.rowNo}: ${e.message}`);
      }
    }
    const status = timedOut || failures.length ? "PARTIAL" : "COMMITTED";
    const at = nowIso(ctx);
    const next = {
      ...job,
      status,
      committedRows: committed,
      committedAt: at,
      committedBy: actor(ctx).sub,
      message: timedOut ? '\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E19\u0E32\u0E19 \u2014 \u0E01\u0E14 "\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E15\u0E48\u0E2D" \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E17\u0E33\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D (\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E49\u0E33)' : failures.slice(0, 20).join(" | "),
      version: job.version + 1,
      updatedAt: at,
      updatedBy: actor(ctx).sub
    };
    ctx.env.db.update("ImportJobs", job.id, next);
    setSetting(ctx, "lastImportAt", at);
    audit(ctx, "import.commit", "ImportJob", job.id, { after: { committed, skipped, status, failures: failures.slice(0, 20) } });
    bumpDataVersion(ctx);
    return { committed, skipped, job: next };
  }
  function cancelImport(ctx, b) {
    const job = loadJob(ctx, b.jobId);
    if (job.status !== "STAGED") throw new AppError("VALIDATION_FAILED", "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19");
    ctx.env.db.update("ImportJobs", job.id, { ...job, status: "CANCELLED", version: job.version + 1, updatedAt: nowIso(ctx), updatedBy: actor(ctx).sub });
    audit(ctx, "import.cancel", "ImportJob", job.id);
    return { ok: true };
  }
  function errorsCsv(ctx, b) {
    const job = loadJob(ctx, b.jobId);
    const meta = jobMeta(job);
    const matrix = rawMatrix(ctx, job, meta);
    const staged = planFor(ctx, job, matrix, meta);
    const rows = [["\u0E41\u0E16\u0E27\u0E17\u0E35\u0E48", "\u0E2A\u0E16\u0E32\u0E19\u0E30", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21", ...meta.headers]];
    for (const s of staged) {
      if (s.status === "VALID") continue;
      rows.push([s.rowNo, s.status === "ERROR" ? "\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14" : "\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A", s.label, s.messages.join(" | "), ...matrix[s.rowNo - 1] ?? []]);
    }
    return { fileName: `errors-${job.fileName.replace(/\.[^.]+$/, "")}.csv`, csv: toCsv(rows) };
  }
  function processInbox(ctx) {
    const out = [];
    const settings = getSettings(ctx);
    const fy = currentFiscalYear(ctx.env.now());
    for (const f of ctx.env.files.listInbox()) {
      try {
        const bytes = f.bytes();
        const type = sniff(bytes);
        if (!["xlsx", "xls", "text"].includes(type)) {
          ctx.env.files.moveToFolder(f.id, "01_Imports/Rejected");
          out.push({ file: f.name, result: "\u0E0A\u0E19\u0E34\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A \u2014 \u0E22\u0E49\u0E32\u0E22\u0E44\u0E1B Rejected" });
          continue;
        }
        const mime = MIME_OF[type];
        ctx.env.files.moveToFolder(f.id, `01_Imports/Original/FY${fy}`);
        const tables = ctx.env.files.readTables(f.id, mime);
        const pv = stageFile(ctx, { fileName: f.name, fiscalYear: fy }, "INBOX", { tables, sha256: ctx.env.crypto.sha256Hex(bytes), driveFileId: f.id, fileName: f.name });
        if (settings.autoCommitClean === "true" && pv.summary.error === 0 && pv.summary.warning === 0 && pv.summary.valid > 0) {
          const r3 = commitImport(ctx, { jobId: pv.job.id, acceptWarnings: false });
          out.push({ file: f.name, result: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 ${r3.committed} \u0E41\u0E16\u0E27` });
        } else out.push({ file: f.name, result: `\u0E23\u0E2D\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19 (${pv.summary.valid} \u0E1C\u0E48\u0E32\u0E19, ${pv.summary.warning} \u0E15\u0E23\u0E27\u0E08, ${pv.summary.error} \u0E1C\u0E34\u0E14)` });
      } catch (e) {
        out.push({ file: f.name, result: `\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ${e.message}` });
        if (!(e instanceof AppError && e.code === "DUPLICATE_IMPORT")) ctx.env.log("error", "inbox_failed", { file: f.name, message: String(e.message) });
      }
    }
    if (out.length) bumpDataVersion(ctx);
    return out;
  }

  // src/core/services/plans.ts
  var MAX_ROWS = 3e3;
  function previewPlan(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    if (b.sheetUrl) {
      const url = cleanText(b.sheetUrl, 500);
      if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError("VALIDATION_FAILED", "\u0E25\u0E34\u0E07\u0E01\u0E4C Google Sheets \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      const best2 = bestTable(ctx.env.files.readSheetUrl(url).map((t2) => t2.rows));
      return { ...best2, sourceFileId: "", sourceFileName: "Google Sheets", sha256: "", fromOcr: false };
    }
    const bytes = decodeUpload(ctx, String(b.base64 ?? ""));
    const type = sniff(bytes);
    if (!["xlsx", "xls", "text", "pdf", "jpeg", "png"].includes(type)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A Excel, CSV, Google Sheets \u0E2B\u0E23\u0E37\u0E2D PDF/\u0E23\u0E39\u0E1B\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E41\u0E1C\u0E19");
    const mime = MIME_OF[type];
    const name = safeFileName(b.fileName, type === "text" ? "csv" : type);
    const stored = ctx.env.files.save("00_System/plans", name, mime, bytes);
    if (type === "pdf" || type === "jpeg" || type === "png") {
      let text = "";
      try {
        text = ctx.env.files.ocr(stored.id);
      } catch {
        throw new AppError("IMPORT_REVIEW_REQUIRED", "\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E32\u0E01\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E44\u0E1F\u0E25\u0E4C Excel/CSV \u0E15\u0E32\u0E21\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 (\u0E44\u0E1F\u0E25\u0E4C\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E16\u0E39\u0E01\u0E40\u0E01\u0E47\u0E1A\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27)");
      }
      const parsed = parsePlanText(text);
      return { table: planToTable(parsed), meta: {}, parsed, sourceFileId: stored.id, sourceFileName: name, sha256: stored.sha256, fromOcr: true };
    }
    const best = bestTable(ctx.env.files.readTables(stored.id, mime).map((t2) => t2.rows));
    return { ...best, sourceFileId: stored.id, sourceFileName: name, sha256: stored.sha256, fromOcr: false };
  }
  function bestTable(tables) {
    let best = null;
    for (const rows of tables) {
      if (!rows.length) continue;
      const n = normalizePlanTable(rows);
      const parsed = parsePlanTable(n.table);
      if (!best || parsed.leafCount > best.parsed.leafCount) best = { table: n.table, meta: n.meta, parsed };
    }
    if (!best || !best.parsed.nodes.length) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19/\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C \u2014 \u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E21\u0E35\u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23, \u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A, \u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19, \u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13");
    return best;
  }
  function activePlans(ctx) {
    return live(ctx.env.db.list("PlanDocs")).filter((d) => d.status === "ACTIVE");
  }
  function checkPlan(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    const docs = activePlans(ctx);
    const sha = cleanText(b.sha256, 80).toLowerCase();
    const dup = sha ? docs.find((d) => d.sourceSha256 === sha) : void 0;
    const fy = Number(b.fiscalYear);
    const round = Math.max(1, Number(b.round) || 1);
    const same = docs.filter((d) => Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId);
    const ex = same.find((d) => Number(d.round) === round);
    const assignedCount = ex ? live(ctx.env.db.list("PlanItems")).filter((i) => i.planDocId === ex.id && i.workgroupId).length : 0;
    return {
      duplicateOf: dup ? { id: dup.id, title: dup.title, createdAt: dup.createdAt } : null,
      existing: ex ? { id: ex.id, title: ex.title, assignedCount } : null,
      nextRound: same.reduce((m, d) => Math.max(m, Number(d.round)), 0) + 1
    };
  }
  var cleanTable = (t2) => (Array.isArray(t2) ? t2 : []).slice(0, MAX_ROWS + 1).map((r3) => Array.isArray(r3) ? r3.slice(0, 4).map((c) => cleanText(c, 1e3)) : []);
  function commitPlan(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const fy = Number(b.fiscalYear);
    if (!Number.isInteger(fy) || fy < 2560 || fy > 2650) throw new AppError("VALIDATION_FAILED", "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const fs = live(ctx.env.db.list("FundingSources")).find((f) => f.id === b.fundingSourceId);
    if (!fs) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A");
    if (!Array.isArray(b.table) || b.table.length > MAX_ROWS + 1) throw new AppError("VALIDATION_FAILED", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const table = cleanTable(b.table);
    const parsed = parsePlanTable(table);
    const errors = parsed.issues.filter((i) => i.level === "ERROR");
    if (errors.length) throw new AppError("VALIDATION_FAILED", `\u0E41\u0E1C\u0E19\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14 ${errors.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32`, errors.slice(0, 20));
    if (!parsed.leafCount) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22\u0E43\u0E19\u0E41\u0E1C\u0E19");
    const warnings = parsed.issues.filter((i) => i.level === "WARNING").length;
    if (warnings && !b.acceptWarnings) throw new AppError("IMPORT_REVIEW_REQUIRED", `\u0E21\u0E35 ${warnings} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08 \u2014 \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E27\u0E48\u0E32\u0E15\u0E23\u0E27\u0E08\u0E41\u0E25\u0E49\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32`);
    const round = Math.max(1, Math.min(20, Number(b.round) || 1));
    let sourceFileId = cleanText(b.sourceFileId, 100);
    let sourceFileName = cleanText(b.sourceFileName, 200);
    let sha = /^[0-9a-f]{64}$/.test(String(b.sourceSha256 ?? "")) && sourceFileId ? String(b.sourceSha256) : "";
    if (sha) {
      const dup = activePlans(ctx).find((d) => d.sourceSha256 === sha);
      if (dup) throw new AppError("DUPLICATE_IMPORT", `\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E40\u0E1B\u0E47\u0E19 "${dup.title}"`, { planDocId: dup.id });
    }
    if (b.base64) {
      const bytes = decodeUpload(ctx, String(b.base64));
      const type = sniff(bytes);
      if (!["xlsx", "xls", "text", "pdf", "jpeg", "png"].includes(type)) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E1F\u0E25\u0E4C\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48 Excel/CSV/PDF/\u0E23\u0E39\u0E1B");
      sha = ctx.env.crypto.sha256Hex(bytes);
      const dup = activePlans(ctx).find((d) => d.sourceSha256 === sha);
      if (dup) throw new AppError("DUPLICATE_IMPORT", `\u0E44\u0E1F\u0E25\u0E4C\u0E19\u0E35\u0E49\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E40\u0E1B\u0E47\u0E19 "${dup.title}"`, { planDocId: dup.id });
      sourceFileName = safeFileName(b.fileName ?? sourceFileName, type === "text" ? "csv" : type);
      sourceFileId = ctx.env.files.save("00_System/plans", sourceFileName, MIME_OF[type], bytes).id;
    }
    const prev = activePlans(ctx).find((d) => Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId && Number(d.round) === round);
    if (prev) {
      const taken = live(ctx.env.db.list("PlanItems")).filter((i) => i.planDocId === prev.id && i.workgroupId).length;
      if (taken) throw new AppError("VALIDATION_FAILED", `\u0E41\u0E1C\u0E19\u0E1B\u0E35 ${fy} \u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 ${round} \u0E21\u0E35\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27 ${taken} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u2014 \u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E16\u0E31\u0E14\u0E44\u0E1B \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E48\u0E2D\u0E19`);
      if (!b.replaceExisting) throw new AppError("IMPORT_REVIEW_REQUIRED", `\u0E21\u0E35\u0E41\u0E1C\u0E19\u0E1B\u0E35 ${fy} \u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 ${round} \u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27 ("${prev.title}") \u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E17\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1C\u0E19\u0E40\u0E14\u0E34\u0E21 \u0E2B\u0E23\u0E37\u0E2D\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E16\u0E31\u0E14\u0E44\u0E1B`, { existingId: prev.id });
      ctx.env.db.update("PlanDocs", prev.id, { ...prev, status: "REPLACED", version: prev.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
    }
    const edits = b.originalTable ? diffPlanTables(cleanTable(b.originalTable), table) : [];
    const doc = {
      ...newMeta(ctx),
      fiscalYear: fy,
      fundingSourceId: fs.id,
      round,
      title: cleanText(b.title, 200) || `\u0E41\u0E1C\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${fs.name} \u0E1B\u0E35 ${fy} \u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 ${round}`,
      docNo: cleanText(b.docNo, 80),
      docDate: cleanText(b.docDate, 20),
      budgetType: cleanText(b.budgetType, 60) || "\u0E07\u0E1A\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19",
      totalSatang: parsed.computedTotal,
      leafCount: parsed.leafCount,
      sourceFileId,
      sourceFileName,
      status: "ACTIVE",
      note: edits.length ? `\u0E41\u0E01\u0E49\u0E08\u0E32\u0E01\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A ${edits.length} \u0E0A\u0E48\u0E2D\u0E07` : "",
      sourceSha256: sha,
      editCount: edits.length
    };
    ctx.env.db.insert("PlanDocs", [doc]);
    ctx.env.db.insert("PlanItems", parsed.nodes.map((n) => ({
      ...newMeta(ctx),
      planDocId: doc.id,
      fiscalYear: fy,
      seq: n.seq,
      parentSeq: n.parentSeq,
      depth: n.depth,
      kind: n.kind,
      number: n.number,
      name: n.name,
      unit: n.unit,
      quantity: n.quantity ?? 0,
      amountSatang: n.amountSatang ?? 0,
      isLeaf: n.isLeaf,
      planIndex: n.planIndex,
      projectSeq: n.projectSeq,
      activitySeq: n.activitySeq,
      code: n.code,
      workgroupId: "",
      projectId: "",
      activityId: "",
      assignedAt: "",
      assignedBy: ""
    })));
    audit(ctx, "plan.import", "PlanDoc", doc.id, {
      before: edits.length ? { edits: edits.slice(0, 150) } : void 0,
      after: { title: doc.title, fiscalYear: fy, round, total: doc.totalSatang, leaves: doc.leafCount, replaced: prev?.id ?? "", file: sourceFileName, editCount: edits.length }
    });
    bumpDataVersion(ctx);
    return doc;
  }
  function listPlans(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = Number(b.fiscalYear) || 0;
    const items = live(ctx.env.db.list("PlanItems")).filter((i) => i.isLeaf && i.workgroupId);
    return live(ctx.env.db.list("PlanDocs")).filter((d) => d.status === "ACTIVE" && (!fy || Number(d.fiscalYear) === fy)).map((d) => {
      const mine = items.filter((i) => i.planDocId === d.id);
      const groups = /* @__PURE__ */ new Map();
      for (const i of mine) {
        const g = groups.get(i.workgroupId) ?? { workgroupId: i.workgroupId, count: 0, satang: 0 };
        g.count++;
        g.satang += Number(i.amountSatang);
        groups.set(i.workgroupId, g);
      }
      return { ...d, assignedCount: mine.length, assignedSatang: mine.reduce((a, i) => a + Number(i.amountSatang), 0), groups: [...groups.values()] };
    }).sort((a, b2) => b2.fiscalYear - a.fiscalYear || a.round - b2.round);
  }
  function getPlan(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const doc = findById(ctx, "PlanDocs", String(b.id), "\u0E41\u0E1C\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13");
    const items = live(ctx.env.db.list("PlanItems")).filter((i) => i.planDocId === doc.id).sort((x, y) => x.seq - y.seq);
    const actIds = new Set(items.filter((i) => i.activityId).map((i) => i.activityId));
    const acts = live(ctx.env.db.list("Activities")).filter((a) => actIds.has(a.id));
    const allocs = live(ctx.env.db.list("Allocations")).filter((x) => actIds.has(x.activityId));
    const disbs = live(ctx.env.db.list("Disbursements")).filter((x) => actIds.has(x.activityId));
    const shares = activityUnitsOf(ctx).filter((x) => actIds.has(x.activityId));
    const activities = {};
    for (const a of acts) activities[a.id] = activityState(ctx, a, allocs, disbs, shares);
    return { doc, items, activities };
  }
  function projectCodeFor(doc, projectNode, wg) {
    return `P${projectNode.planIndex}-${projectNode.number || projectNode.seq}-${wg.code}`;
  }
  function assignPlanItems(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const wg = live(ctx.env.db.list("Workgroups")).find((g) => g.id === b.workgroupId);
    if (!wg) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    if (wg.noActivities) throw new AppError("VALIDATION_FAILED", `${wg.name}\u0E44\u0E21\u0E48\u0E23\u0E31\u0E1A\u0E1C\u0E34\u0E14\u0E0A\u0E2D\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E43\u0E19\u0E41\u0E1C\u0E19`);
    if (!canAccessWorkgroup(u, wg.id)) throw new AppError("FORBIDDEN_SCOPE", "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E49\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49");
    const ids = [...new Set((b.itemIds ?? []).map(String))].slice(0, 300);
    if (!ids.length) throw new AppError("VALIDATION_FAILED", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
    const all = live(ctx.env.db.list("PlanItems"));
    const skipped = [];
    let assigned = 0;
    for (const id of ids) {
      const item = all.find((i) => i.id === id);
      if (!item) {
        skipped.push({ id, reason: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23" });
        continue;
      }
      if (!item.isLeaf) {
        skipped.push({ id, reason: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22" });
        continue;
      }
      if (item.workgroupId === wg.id) continue;
      let carry = null;
      if (item.workgroupId) {
        if (!b.reassign) {
          skipped.push({ id, reason: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27" });
          continue;
        }
        if (!canAccessWorkgroup(u, item.workgroupId)) {
          skipped.push({ id, reason: "\u0E22\u0E49\u0E32\u0E22\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A" });
          continue;
        }
        const oldAct = live(ctx.env.db.list("Activities")).find((a) => a.id === item.activityId);
        carry = { shares: activityUnitsOf(ctx, item.activityId), planQuarters: oldAct?.planQuarters ?? "" };
        const r3 = unassignPlanItems(ctx, { itemIds: [id] });
        if (r3.skipped.length) {
          skipped.push({ id, reason: r3.skipped[0].reason });
          continue;
        }
        Object.assign(item, findById(ctx, "PlanItems", id, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"));
      }
      const doc = findById(ctx, "PlanDocs", item.planDocId, "\u0E41\u0E1C\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13");
      if (doc.status !== "ACTIVE") {
        skipped.push({ id, reason: "\u0E41\u0E1C\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E41\u0E17\u0E19\u0E17\u0E35\u0E48\u0E41\u0E25\u0E49\u0E27" });
        continue;
      }
      const projectNode = all.find((i) => i.planDocId === doc.id && i.seq === item.projectSeq) ?? item;
      const planNode = all.find((i) => i.planDocId === doc.id && i.planIndex === item.planIndex && i.kind === "PLAN");
      let project = live(ctx.env.db.list("Projects")).find((p) => p.planDocId === doc.id && Number(p.planNodeSeq) === projectNode.seq && p.workgroupId === wg.id);
      if (!project) {
        const attempt = ctx.env.db.list("Projects").filter((p) => p.planDocId === doc.id && Number(p.planNodeSeq) === projectNode.seq && p.workgroupId === wg.id).length;
        project = createProject(ctx, withPlanLink({
          idempotencyKey: `plan:${doc.id}:${projectNode.seq}:${wg.id}:${attempt}`,
          fiscalYear: doc.fiscalYear,
          fundingSourceId: doc.fundingSourceId,
          workgroupId: wg.id,
          projectCode: projectCodeFor(doc, projectNode, wg) + (attempt ? `-${attempt + 1}` : ""),
          name: projectNode.name,
          description: planNode ? planNode.name : "",
          status: "PLANNED",
          published: true
        }, { planDocId: doc.id, planNodeSeq: projectNode.seq }));
      }
      const activity = createActivity(ctx, withPlanLink({
        idempotencyKey: `plan:${item.id}:${item.version}`,
        projectId: project.id,
        activityCode: item.code,
        name: item.name,
        unit: item.unit,
        targetQty: Number(item.quantity) || 0
      }, { planDocId: doc.id, planNodeSeq: projectNode.seq, planItemId: item.id }));
      if (Number(item.amountSatang) > 0) {
        createAllocation(ctx, {
          idempotencyKey: `plan:${item.id}:${item.version}:alloc`,
          projectId: project.id,
          activityId: activity.id,
          type: "ORIGINAL",
          amountSatang: Number(item.amountSatang),
          note: `${doc.title}${doc.docNo ? ` (${doc.docNo})` : ""}`,
          source: `PLAN:${item.id}`
        });
      }
      if (carry && (carry.shares.length || carry.planQuarters)) {
        if (carry.shares.length) {
          ctx.env.db.insert("ActivityUnits", carry.shares.map((s) => ({
            ...newMeta(ctx),
            projectId: project.id,
            activityId: activity.id,
            unitId: s.unitId,
            budgetSatang: Number(s.budgetSatang),
            targetQty: Number(s.targetQty)
          })));
        }
        if (carry.planQuarters) {
          const fresh = findById(ctx, "Activities", activity.id, "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
          ctx.env.db.update("Activities", fresh.id, { ...fresh, planQuarters: carry.planQuarters, version: fresh.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
        }
      }
      const next = { ...item, workgroupId: wg.id, projectId: project.id, activityId: activity.id, assignedAt: nowIso(ctx), assignedBy: u.sub, version: item.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
      ctx.env.db.update("PlanItems", item.id, next);
      Object.assign(item, next);
      audit(ctx, "plan.assign", "PlanItem", item.id, { projectId: project.id, after: { workgroupId: wg.id, code: item.code, amount: item.amountSatang } });
      assigned++;
    }
    if (assigned) bumpDataVersion(ctx);
    return { assigned, skipped };
  }
  function unassignPlanItems(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const ids = [...new Set((b.itemIds ?? []).map(String))].slice(0, 300);
    const all = live(ctx.env.db.list("PlanItems"));
    const skipped = [];
    let unassigned = 0;
    for (const id of ids) {
      const item = all.find((i) => i.id === id);
      if (!item || !item.workgroupId) {
        skipped.push({ id, reason: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01" });
        continue;
      }
      if (!canAccessWorkgroup(u, item.workgroupId)) {
        skipped.push({ id, reason: "\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19" });
        continue;
      }
      const used = live(ctx.env.db.list("Disbursements")).some((d) => d.activityId === item.activityId && d.status !== "VOID");
      if (used) {
        skipped.push({ id, reason: "\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E41\u0E25\u0E49\u0E27 \u2014 \u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E01\u0E48\u0E2D\u0E19" });
        continue;
      }
      const at = nowIso(ctx);
      for (const a of live(ctx.env.db.list("Allocations")).filter((x) => x.source === `PLAN:${item.id}`)) {
        ctx.env.db.update("Allocations", a.id, { ...a, isDeleted: true, version: a.version + 1, updatedAt: at, updatedBy: u.sub });
      }
      const act = live(ctx.env.db.list("Activities")).find((a) => a.id === item.activityId);
      if (act) ctx.env.db.update("Activities", act.id, { ...act, isDeleted: true, version: act.version + 1, updatedAt: at, updatedBy: u.sub });
      for (const s of activityUnitsOf(ctx, item.activityId)) ctx.env.db.update("ActivityUnits", s.id, { ...s, isDeleted: true, version: s.version + 1, updatedAt: at, updatedBy: u.sub });
      const project = live(ctx.env.db.list("Projects")).find((p) => p.id === item.projectId);
      if (project) {
        const stillUsed = live(ctx.env.db.list("Activities")).some((a) => a.projectId === project.id) || live(ctx.env.db.list("Allocations")).some((a) => a.projectId === project.id) || live(ctx.env.db.list("Disbursements")).some((d) => d.projectId === project.id && d.status !== "VOID");
        if (!stillUsed) ctx.env.db.update("Projects", project.id, { ...project, isDeleted: true, version: project.version + 1, updatedAt: at, updatedBy: u.sub });
      }
      const prevGroup = item.workgroupId;
      const next = { ...item, workgroupId: "", projectId: "", activityId: "", assignedAt: "", assignedBy: "", version: item.version + 1, updatedAt: at, updatedBy: u.sub };
      ctx.env.db.update("PlanItems", item.id, next);
      Object.assign(item, next);
      audit(ctx, "plan.unassign", "PlanItem", item.id, { projectId: project?.id ?? "", before: { workgroupId: prevGroup, code: item.code } });
      unassigned++;
    }
    if (unassigned) bumpDataVersion(ctx);
    return { unassigned, skipped };
  }

  // src/core/services/reports.ts
  function reportData(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = Number(b.fiscalYear) || currentFiscalYear(ctx.env.now());
    const ds = loadDataset(ctx);
    const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy);
    const fyNow = currentFiscalYear(ctx.env.now());
    const m = fy < fyNow ? 12 : fy > fyNow ? 0 : fiscalMonthIndex(today(ctx));
    return { fiscalYear: fy, generatedAt: nowIso(ctx), monthIndex: m, rows: buildUnitRows(ctx, ds, projects, m) };
  }

  // src/core/services/targets.ts
  var fyOf2 = (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 2500 || n > 2700) throw new AppError("VALIDATION_FAILED", "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    return n;
  };
  function getTargets(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const fy = fyOf2(b.fiscalYear);
    const target = spendTargetFor(ctx, fy);
    return { fiscalYear: fy, target, curve: targetCurve(target) };
  }
  function saveTargets(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    const fy = fyOf2(b.fiscalYear);
    const t2 = b.target ?? {};
    const nums = (v, n) => Array.isArray(v) ? v.slice(0, n).map((x) => Math.round(Number(x) * 100) / 100) : [];
    const clean = t2.mode === "monthly" ? { mode: "monthly", quarters: [], months: nums(t2.months, 12) } : { mode: "quarter", quarters: nums(t2.quarters, 4), months: [] };
    const err = validateSpendTarget(clean);
    if (err) throw new AppError("VALIDATION_FAILED", err);
    const before = spendTargetFor(ctx, fy);
    setSetting(ctx, `spendTarget:${fy}`, JSON.stringify(clean));
    audit(ctx, "targets.save", "Settings", `spendTarget:${fy}`, { before, after: clean });
    bumpDataVersion(ctx);
    return { fiscalYear: fy, target: clean, curve: targetCurve(clean) };
  }

  // src/core/services/memos.ts
  var DEFAULT_EXPENSES = [
    "\u0E04\u0E48\u0E32\u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19",
    "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E2D\u0E1A\u0E23\u0E21",
    "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21",
    "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E07\u0E32\u0E19\u0E27\u0E31\u0E19\u0E16\u0E48\u0E32\u0E22\u0E17\u0E2D\u0E14\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35",
    "\u0E04\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E08\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23",
    "\u0E04\u0E48\u0E32\u0E08\u0E49\u0E32\u0E07\u0E40\u0E2B\u0E21\u0E32\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23",
    "\u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23",
    "\u0E04\u0E48\u0E32\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19"
  ];
  function superProfile(ctx) {
    try {
      return { title: "", fullName: "", position: "", ...JSON.parse(ctx.env.props.get("SUPER_PROFILE") || "{}") };
    } catch {
      return { title: "", fullName: "", position: "" };
    }
  }
  function getProfile(ctx) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const groups = live(ctx.env.db.list("Workgroups"));
    if (u.role === "superadmin") {
      const p = superProfile(ctx);
      return { ...p, workgroupId: "", workgroupName: "\u0E17\u0E38\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19", complete: !!(p.fullName && p.position) };
    }
    const row = findById(ctx, "Users", u.sub, "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49");
    return {
      title: row.title ?? "",
      fullName: row.fullName,
      position: row.position,
      workgroupId: row.workgroupId,
      workgroupName: groups.find((g) => g.id === row.workgroupId)?.name ?? "",
      complete: !!((row.title || /^(นาย|นาง|นางสาว|ว่าที่|ดร\.)/.test(row.fullName)) && row.fullName && row.position)
    };
  }
  function saveProfile(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const next = { title: cleanText(b.title, 40), fullName: cleanText(b.fullName, 120), position: cleanText(b.position, 120) };
    if (next.fullName.length < 4) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25");
    if (!next.position) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07");
    if (u.role === "superadmin") {
      ctx.env.props.set("SUPER_PROFILE", JSON.stringify(next));
      audit(ctx, "profile.update", "User", u.sub, { after: next });
      return getProfile(ctx);
    }
    const cur = findById(ctx, "Users", u.sub, "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49");
    ctx.env.db.update("Users", cur.id, { ...cur, ...next, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
    audit(ctx, "profile.update", "User", cur.id, { before: { title: cur.title, fullName: cur.fullName, position: cur.position }, after: next });
    return getProfile(ctx);
  }
  function toSettings(g) {
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      memoOrg: g.memoOrg ?? "",
      memoFax: g.memoFax ?? "",
      memoPrefix: g.memoPrefix ?? "",
      headName: g.headName ?? "",
      headPosition: g.headPosition ?? "",
      headLine2: g.headLine2 ?? ""
    };
  }
  function listGroupSettings(ctx) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    return live(ctx.env.db.list("Workgroups")).filter((g) => !g.noActivities && canAccessWorkgroup(u, g.id)).map(toSettings);
  }
  function saveGroupSettings(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const cur = findById(ctx, "Workgroups", String(b.id), "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
    const patch = {
      memoOrg: cleanText(b.memoOrg, 200),
      memoFax: cleanText(b.memoFax, 40),
      memoPrefix: cleanText(b.memoPrefix, 40),
      headName: cleanText(b.headName, 120),
      headPosition: cleanText(b.headPosition, 120),
      headLine2: cleanText(b.headLine2, 160)
    };
    const next = { ...cur, ...patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
    ctx.env.db.update("Workgroups", cur.id, next);
    audit(ctx, "workgroup.memoSettings", "Workgroup", cur.id, { before: toSettings(cur), after: patch });
    return toSettings(next);
  }
  function facts(ctx, projectId, activityId, before) {
    const project = findById(ctx, "Projects", String(projectId), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, project.workgroupId);
    if (!activityId) throw new AppError("VALIDATION_FAILED", "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const activity = findById(ctx, "Activities", String(activityId), "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    if (activity.projectId !== project.id) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49");
    const allocs = live(ctx.env.db.list("Allocations")).filter((x) => x.projectId === project.id && x.activityId === activity.id);
    const disbs = live(ctx.env.db.list("Disbursements")).filter((x) => x.projectId === project.id && x.activityId === activity.id);
    const budget = computeBudget(allocs, disbs).currentBudget;
    const prior = before ? disbs.filter((x) => x.id !== before.id && x.status !== "VOID" && x.createdAt < before.at) : disbs.filter((x) => x.status !== "VOID");
    const previous = prior.reduce((s, x) => s + Number(x.amountSatang), 0);
    let mainActivityName = "";
    let match = null;
    if (activity.planItemId) {
      const items = live(ctx.env.db.list("PlanItems"));
      const leaf = items.find((i) => i.id === activity.planItemId);
      const node = leaf && items.find((i) => i.planDocId === leaf.planDocId && i.seq === leaf.activitySeq && i.id !== leaf.id);
      mainActivityName = node?.name ?? "";
      if (leaf) {
        const bySeq = new Map(items.filter((i) => i.planDocId === leaf.planDocId).map((i) => [Number(i.seq), i]));
        const chain = [];
        for (let n = leaf; n && chain.length < 20; n = Number(n.parentSeq) ? bySeq.get(Number(n.parentSeq)) : void 0) chain.unshift({ kind: n.kind, name: n.name });
        match = matchBudgetCodes(live(ctx.env.db.list("BudgetCodes")), Number(project.fiscalYear), chain);
      }
    }
    const codes = match ? { budgetCode: match.budgetCode, mainActivityCode: match.mainActivityCode, source: "CODEBOOK", ref: match.ref } : activity.budgetCode || activity.mainActivityCode ? { budgetCode: activity.budgetCode ?? "", mainActivityCode: activity.mainActivityCode ?? "", source: "ACTIVITY", ref: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E27\u0E49\u0E01\u0E31\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21" } : { budgetCode: "", mainActivityCode: "", source: "", ref: "" };
    return {
      project,
      activity,
      mainActivityName,
      budget,
      previous,
      codes,
      group: live(ctx.env.db.list("Workgroups")).find((g) => g.id === project.workgroupId),
      fund: live(ctx.env.db.list("FundingSources")).find((f) => f.id === project.fundingSourceId)
    };
  }
  function fundLabel(f) {
    const n = (f?.name || f?.shortName || "").trim();
    if (!n) return "";
    return n.startsWith("\u0E07\u0E1A") ? n : `\u0E07\u0E1A${n}`;
  }
  function signerOf(ctx) {
    const p = getProfile(ctx);
    return { name: withTitle(p.title, p.fullName), position: p.position };
  }
  function autoFields(ctx, f) {
    return {
      subject: MEMO_SUBJECT,
      projectName: f.project.name,
      mainActivityName: f.mainActivityName,
      subActivityName: f.activity.name,
      fund: fundLabel(f.fund),
      budgetSatang: f.budget,
      previousSatang: f.previous,
      signer: signerOf(ctx)
    };
  }
  function unitRefName(ctx, unitId) {
    const u = listUnits(ctx).find((x) => x.id === unitId);
    if (!u || u.kind === "PROVINCE") return "";
    return `\u0E2D\u0E33\u0E40\u0E20\u0E2D${areaName(u)}`;
  }
  function memoContext(ctx, b) {
    const f = facts(ctx, b.projectId, b.activityId);
    const g = f.group;
    const units = listUnits(ctx);
    const unitId = b.unitId || provinceUnitId(units);
    const draft = {
      orgLine: g?.memoOrg || `${g?.name ?? ""} \u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23`.trim(),
      fax: g?.memoFax ?? "",
      docPrefix: g?.memoPrefix ?? "",
      docNumber: "",
      date: today(ctx),
      to: MEMO_DEFAULT_TO,
      subject: MEMO_SUBJECT,
      refNo: "",
      refDate: "",
      refFrom: unitRefName(ctx, unitId),
      expense: "",
      projectName: "",
      mainActivityName: "",
      fund: "",
      budgetCode: f.codes.budgetCode,
      mainActivityCode: f.codes.mainActivityCode,
      subActivityName: "",
      budgetSatang: 0,
      previousSatang: 0,
      requestSatang: 0,
      checks: { ok: false, returnFix: false, returnReason: "", forward: false },
      signer: { name: "", position: "" },
      head: { name: g?.headName ?? "", position: g?.headPosition ?? "", line2: g?.headLine2 ?? "" },
      align: "left",
      thaiNumerals: true,
      ...autoFields(ctx, f)
    };
    const mine = live(ctx.env.db.list("Memos")).slice(-200);
    const used = mine.map((m) => {
      try {
        return JSON.parse(m.data).expense;
      } catch {
        return "";
      }
    }).filter(Boolean);
    const profile = getProfile(ctx);
    return {
      draft,
      codesSaved: !!(f.codes.budgetCode && f.codes.mainActivityCode),
      codesRef: f.codes.ref,
      expenseSuggestions: [.../* @__PURE__ */ new Set([...used.reverse(), ...DEFAULT_EXPENSES])].slice(0, 30),
      units: units.map((u) => ({ id: u.id, name: u.kind === "PROVINCE" ? "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14 (\u0E2A\u0E19\u0E07.\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14)" : `\u0E2D\u0E33\u0E40\u0E20\u0E2D${areaName(u)}` })),
      profileComplete: profile.complete,
      groupConfigured: !!(g?.memoPrefix && g?.headName)
    };
  }
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  function sanitize(ctx, input, f, keepSigner) {
    const i = input ?? {};
    const s = (v, n) => cleanText(v, n);
    const code = (v) => s(v, 40).replace(/\s+/g, "");
    const body = Array.isArray(i.bodyOverride) ? i.bodyOverride.map((x) => s(x, 2e3)).filter(Boolean).slice(0, 20) : [];
    const d = {
      orgLine: s(i.orgLine, 200),
      fax: s(i.fax, 40),
      docPrefix: s(i.docPrefix, 40),
      docNumber: s(i.docNumber, 40),
      date: ISO.test(String(i.date)) ? String(i.date) : "",
      to: s(i.to, 120) || MEMO_DEFAULT_TO,
      subject: MEMO_SUBJECT,
      refNo: s(i.refNo, 80),
      refDate: ISO.test(String(i.refDate)) ? String(i.refDate) : "",
      refFrom: s(i.refFrom, 120),
      expense: s(i.expense, 200),
      projectName: "",
      mainActivityName: "",
      fund: "",
      budgetCode: f.codes.budgetCode || code(i.budgetCode),
      mainActivityCode: f.codes.mainActivityCode || code(i.mainActivityCode),
      subActivityName: "",
      budgetSatang: 0,
      previousSatang: 0,
      requestSatang: Math.round(Number(i.requestSatang) || 0),
      checks: {
        ok: !!i.checks?.ok,
        returnFix: !!i.checks?.returnFix,
        returnReason: s(i.checks?.returnReason, 300),
        forward: !!i.checks?.forward
      },
      signer: { name: "", position: "" },
      head: { name: s(i.head?.name, 120), position: s(i.head?.position, 120), line2: s(i.head?.line2, 160) },
      align: i.align === "justify" ? "justify" : "left",
      thaiNumerals: !!i.thaiNumerals,
      bodyOverride: body.length ? body : void 0,
      ...autoFields(ctx, f)
    };
    if (keepSigner) d.signer = keepSigner;
    if (d.budgetCode && !/^\d{20}$/.test(d.budgetCode)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2B\u0E31\u0E2A\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 20 \u0E2B\u0E25\u0E31\u0E01");
    if (d.mainActivityCode && !/^\d{17}$/.test(d.mainActivityCode)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E25\u0E31\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 17 \u0E2B\u0E25\u0E31\u0E01");
    const errors = validateMemo(d);
    if (errors.length) throw new AppError("VALIDATION_FAILED", errors.join(" \xB7 "));
    if (memoOverrideStale(d)) {
      throw new AppError("VALIDATION_FAILED", '\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E35\u0E48\u0E41\u0E01\u0E49\u0E44\u0E02\u0E21\u0E35\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E22\u0E2D\u0E14\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14 \u2014 \u0E01\u0E14 "\u0E43\u0E0A\u0E49\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34" \u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E01\u0E49\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E43\u0E2B\u0E49\u0E15\u0E23\u0E07');
    }
    return d;
  }
  function rememberCodes(ctx, a, d) {
    if ((a.budgetCode || !d.budgetCode) && (a.mainActivityCode || !d.mainActivityCode)) return;
    const cur = findById(ctx, "Activities", a.id, "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
    const patch = { budgetCode: cur.budgetCode || d.budgetCode, mainActivityCode: cur.mainActivityCode || d.mainActivityCode };
    ctx.env.db.update("Activities", cur.id, { ...cur, ...patch, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: ctx.user?.sub ?? "" });
    audit(ctx, "activity.codes", "Activity", cur.id, { projectId: cur.projectId, after: patch });
  }
  var docUrl = (id) => id && !id.startsWith("mem-") ? `https://docs.google.com/document/d/${id}/edit` : "";
  var pdfUrl = (id) => id && !id.startsWith("mem-") ? `https://drive.google.com/file/d/${id}/view` : "";
  function toRecord(ctx, m) {
    const disb = ctx.env.db.list("Disbursements").find((x) => x.id === m.disbursementId);
    let data;
    try {
      data = JSON.parse(m.data);
    } catch {
      data = {};
    }
    return {
      id: m.id,
      version: Number(m.version),
      projectId: m.projectId,
      activityId: m.activityId,
      disbursementId: m.disbursementId,
      unitId: m.unitId,
      docNo: m.docNo,
      date: m.date,
      amountSatang: Number(m.amountSatang),
      revision: Number(m.revision) || 1,
      status: disb?.status ?? "VOID",
      docUrl: docUrl(m.docFileId),
      pdfUrl: pdfUrl(m.pdfFileId),
      renderStatus: m.renderStatus,
      renderError: m.renderError,
      data,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    };
  }
  function render(ctx, m, d, p) {
    const rev = Number(m.revision) || 1;
    const base = safeFileName(`\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23_${memoDocNo(d).replace(/\//g, "-")}_${d.date}${rev > 1 ? `_\u0E09\u0E1A\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E44\u0E02${rev}` : ""}`, "doc");
    const folder = `02_Project_Evidence/FY${p.fiscalYear}/${safeFileName(p.projectCode, "x")}/\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
    let patch;
    try {
      const r3 = ctx.env.files.renderMemo(folder, base, d);
      patch = { docFileId: r3.docId, pdfFileId: r3.pdfId, renderStatus: "OK", renderError: "" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.env.log("error", "memo.render", { memoId: m.id, msg });
      patch = { renderStatus: "ERROR", renderError: cleanText(msg, 300) };
    }
    const next = { ...m, ...patch };
    ctx.env.db.update("Memos", m.id, next);
    return next;
  }
  function createMemo(ctx, b) {
    const key = `memo:${String(b.idempotencyKey)}`;
    const prev = findByIdempotency(ctx, "Disbursements", key);
    if (prev) {
      const m = live(ctx.env.db.list("Memos")).find((x) => x.disbursementId === prev.id);
      if (m) return toRecord(ctx, m);
    }
    const f = facts(ctx, b.projectId, b.activityId);
    const d = sanitize(ctx, b.data, f);
    const docNo = memoDocNo(d);
    const dup = live(ctx.env.db.list("Memos")).find((m) => m.docNo === docNo && ctx.env.db.list("Disbursements").some((x) => x.id === m.disbursementId && x.status !== "VOID"));
    if (dup) throw new AppError("VALIDATION_FAILED", `\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D ${docNo} \u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E49\u0E27`);
    const disb = createDisbursement(ctx, {
      projectId: f.project.id,
      activityId: f.activity.id,
      unitId: b.unitId || void 0,
      status: "APPROVED",
      amountSatang: d.requestSatang,
      date: d.date,
      docNo,
      description: `\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21: ${d.expense}`.slice(0, 500),
      idempotencyKey: key,
      source: "MEMO"
    });
    rememberCodes(ctx, f.activity, d);
    const memo = {
      ...newMeta(ctx),
      projectId: f.project.id,
      activityId: f.activity.id,
      disbursementId: disb.id,
      unitId: disb.unitId,
      docNo,
      date: d.date,
      amountSatang: d.requestSatang,
      data: JSON.stringify(d),
      revision: 1,
      docFileId: "",
      pdfFileId: "",
      renderStatus: "PENDING",
      renderError: ""
    };
    ctx.env.db.insert("Memos", [memo]);
    audit(ctx, "memo.create", "Memo", memo.id, { projectId: f.project.id, after: { docNo, amount: d.requestSatang, disbursementId: disb.id } });
    return toRecord(ctx, render(ctx, memo, d, f.project));
  }
  function getMemo(ctx, b) {
    const m = findById(ctx, "Memos", String(b.id), "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21");
    const p = findById(ctx, "Projects", m.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    return toRecord(ctx, m);
  }
  function updateMemo(ctx, b) {
    const cur = findById(ctx, "Memos", String(b.id), "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21");
    if (Number(b.version) !== Number(cur.version)) throw new AppError("VERSION_CONFLICT", "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E14\u0E22\u0E1C\u0E39\u0E49\u0E2D\u0E37\u0E48\u0E19 \u2014 \u0E42\u0E2B\u0E25\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E41\u0E01\u0E49\u0E44\u0E02");
    let disb = findById(ctx, "Disbursements", cur.disbursementId, "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22");
    if (disb.status === "VOID") throw new AppError("VALIDATION_FAILED", "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49");
    const f = facts(ctx, cur.projectId, cur.activityId, { id: disb.id, at: cur.createdAt });
    let oldSigner;
    try {
      oldSigner = JSON.parse(cur.data).signer;
    } catch {
      oldSigner = void 0;
    }
    const d = sanitize(ctx, b.data, f, ctx.user?.sub === cur.createdBy ? void 0 : oldSigner);
    const docNo = memoDocNo(d);
    const moneyChanged = d.requestSatang !== Number(cur.amountSatang) || d.date !== cur.date || docNo !== cur.docNo;
    if (moneyChanged) {
      const u = requireRole(ctx, "admin", "minisuper", "superadmin");
      if (u.role !== "superadmin") {
        throw new AppError("FORBIDDEN_SCOPE", "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin (\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E17\u0E19)");
      }
      const reason = cleanText(b.reason, 300) || `\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21 ${cur.docNo}`;
      const r3 = voidDisbursement(ctx, {
        id: disb.id,
        reason,
        replacement: { amountSatang: d.requestSatang, date: d.date, docNo, description: disb.description, status: "APPROVED" }
      });
      disb = r3.replacement;
    }
    rememberCodes(ctx, f.activity, d);
    const next = {
      ...cur,
      disbursementId: disb.id,
      docNo,
      date: d.date,
      amountSatang: d.requestSatang,
      data: JSON.stringify(d),
      revision: (Number(cur.revision) || 1) + 1,
      renderStatus: "PENDING",
      version: Number(cur.version) + 1,
      updatedAt: nowIso(ctx),
      updatedBy: ctx.user?.sub ?? ""
    };
    ctx.env.db.update("Memos", cur.id, next);
    audit(ctx, "memo.update", "Memo", cur.id, { projectId: cur.projectId, before: { docNo: cur.docNo, amount: cur.amountSatang, revision: cur.revision }, after: { docNo, amount: d.requestSatang, revision: next.revision } });
    return toRecord(ctx, render(ctx, next, d, f.project));
  }
  function rerenderMemo(ctx, b) {
    const m = findById(ctx, "Memos", String(b.id), "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21");
    const p = findById(ctx, "Projects", m.projectId, "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    return toRecord(ctx, render(ctx, m, JSON.parse(m.data), p));
  }
  function listBudgetCodes(ctx, b) {
    requireRole(ctx, "admin", "minisuper", "superadmin");
    const order = { REGULAR: 0, OTHER: 1, SUBSIDY: 2, INVESTMENT: 3 };
    const num = (s) => s.split(".").map((x) => x.padStart(3, "0")).join(".");
    return live(ctx.env.db.list("BudgetCodes")).filter((r3) => Number(r3.fiscalYear) === Number(b.fiscalYear)).map(({ isDeleted: _d, ...r3 }) => ({ ...r3, fiscalYear: Number(r3.fiscalYear) })).sort((a, c) => (order[a.section] ?? 9) - (order[c.section] ?? 9) || num(a.activityNo).localeCompare(num(c.activityNo)));
  }

  // src/core/router.ts
  var r = (fn, write, limit) => ({ fn, write, limit });
  var ROUTES = {
    "public.lookups": r((c) => lookups(c), false, "public"),
    "public.summary": r(publicSummary, false, "public"),
    "public.projects": r(publicProjects, false, "public"),
    "public.project": r(publicProject, false, "public"),
    "public.report": r(publicReport, false, "public"),
    // นับผู้เข้าชม: ใช้ lock สั้น ๆ ภายใน service เอง (ไม่ใช้ lock 25 วินาทีของ action เขียนข้อมูล)
    "public.hit": r(visitHit, false, "public"),
    "auth.requestAccess": r(requestAccess, true, "auth"),
    "auth.login": r(loginAdmin, true, "auth"),
    "auth.loginSuper": r(loginSuper, true, "auth"),
    "auth.me": r((c) => c.user, false, "admin"),
    "auth.logout": r((c) => {
      logoutAll(c);
      return { ok: true };
    }, true, "admin"),
    "profile.get": r((c) => getProfile(c), false, "admin"),
    "profile.save": r(saveProfile, true, "admin"),
    "memos.context": r(memoContext, false, "admin"),
    "memos.get": r(getMemo, false, "admin"),
    "memos.create": r(createMemo, true, "admin"),
    "memos.update": r(updateMemo, true, "admin"),
    "memos.render": r(rerenderMemo, true, "admin"),
    "memos.groupSettings": r((c) => listGroupSettings(c), false, "admin"),
    "memos.saveGroupSettings": r(saveGroupSettings, true, "admin"),
    "budgetCodes.list": r(listBudgetCodes, false, "admin"),
    "admin.setWorkgroupPublic": r(setWorkgroupPublic, true, "admin"),
    "admin.overview": r(overview, false, "admin"),
    "projects.list": r(listProjects, false, "admin"),
    "projects.get": r(getProject, false, "admin"),
    "projects.create": r(createProject, true, "admin"),
    "projects.update": r(updateProject, true, "admin"),
    "projects.delete": r(deleteProject, true, "admin"),
    "activities.create": r(createActivity, true, "admin"),
    "activities.update": r(updateActivity, true, "admin"),
    "allocations.create": r(createAllocation, true, "admin"),
    "allocations.void": r(voidAllocation, true, "admin"),
    "disbursements.entryList": r(entryActivities, false, "admin"),
    "disbursements.create": r(createDisbursement, true, "admin"),
    "disbursements.setStatus": r(setDisbursementStatus, true, "admin"),
    "disbursements.void": r(voidDisbursement, true, "admin"),
    "progress.create": r(createProgress, true, "admin"),
    "files.upload": r(uploadFile, true, "import"),
    "files.ocrCoverLetter": r(ocrCoverLetter, true, "import"),
    "imports.upload": r(stageFile, true, "import"),
    "imports.remap": r(remapImport, true, "import"),
    "imports.get": r(getImport, false, "admin"),
    "imports.list": r((c) => listImports(c), false, "admin"),
    "imports.commit": r(commitImport, true, "import"),
    "imports.cancel": r(cancelImport, true, "admin"),
    "imports.errorsCsv": r(errorsCsv, false, "admin"),
    "plans.preview": r(previewPlan, true, "import"),
    "plans.check": r(checkPlan, false, "import"),
    "plans.commit": r(commitPlan, true, "import"),
    "plans.list": r(listPlans, false, "admin"),
    "plans.get": r(getPlan, false, "admin"),
    "plans.assign": r(assignPlanItems, true, "admin"),
    "plans.unassign": r(unassignPlanItems, true, "admin"),
    "activities.setUnits": r(setActivityUnits, true, "admin"),
    "activities.setUnitsBulk": r(setActivityUnitsBulk, true, "admin"),
    "reports.data": r(reportData, false, "admin"),
    "targets.get": r(getTargets, false, "admin"),
    "targets.save": r(saveTargets, true, "admin"),
    "activities.setDue": r(setActivityDue, true, "admin"),
    "admin.requests": r(listRequests, false, "admin"),
    "admin.decideRequest": r(decideRequest, true, "admin"),
    "admin.users": r((c) => listUsers(c), false, "admin"),
    "admin.saveUser": r(saveUser, true, "admin"),
    "admin.setUserStatus": r(setUserStatus, true, "admin"),
    "admin.loginReport": r(loginReport, false, "admin"),
    "admin.audit": r(auditList, false, "admin"),
    "admin.health": r((c) => health(c, c.env.props.get("TRIGGERS")?.split(",") ?? []), false, "admin"),
    "admin.saveSettings": r(saveSettings, true, "admin"),
    "admin.saveMaster": r(saveMaster, true, "admin"),
    "admin.rebuildSnapshot": r((c) => {
      if (c.user?.role !== "superadmin") throw new AppError("FORBIDDEN_SCOPE", "\u0E40\u0E09\u0E1E\u0E32\u0E30 Super Admin");
      c.env.db.invalidate?.();
      return writeSnapshot(c);
    }, true, "admin")
  };
  var LIMITS = { public: 1200, auth: 60, admin: 180, import: 30 };
  function rateLimit(env, route, who) {
    const bucket = `rl:${route.limit}:${route.limit === "public" || route.limit === "auth" ? "all" : who}:${Math.floor(env.now().getTime() / 6e4)}`;
    const n = Number(env.cache.get(bucket) || "0") + 1;
    env.cache.put(bucket, String(n), 120);
    if (n > LIMITS[route.limit]) throw new AppError("QUOTA_RETRY", "\u0E21\u0E35\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2B\u0E19\u0E32\u0E41\u0E19\u0E48\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48");
  }
  function handle(env, req) {
    if (req.action === "batch") return handleBatch(env, req);
    const requestId = env.uuid();
    const meta = () => ({ requestId, version: API_VERSION, serverTime: env.now().toISOString() });
    const action = String(req.action ?? "");
    try {
      const route = ROUTES[action];
      if (!route) throw new AppError("UNKNOWN_ACTION", "\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E19\u0E35\u0E49");
      const { action: _a, token, device, ...body } = req;
      const ctx = { env, requestId, user: null, device: String(device ?? "").slice(0, 200) };
      if (!PUBLIC_ACTIONS.has(action)) ctx.user = verifyToken(ctx, token);
      rateLimit(env, route, ctx.user?.sub ?? "public");
      const run2 = () => route.fn(ctx, body);
      const data = route.write ? env.lock.withLock(() => {
        const out = run2();
        env.db.flush?.();
        return out;
      }) : run2();
      return { ok: true, data: data ?? null, meta: meta(), error: null };
    } catch (e) {
      if (e instanceof AppError) {
        if (e.code === "BUSY_RETRY") env.cache.put("metric:lockTimeout", String(Number(env.cache.get("metric:lockTimeout") || "0") + 1), 86400);
        return { ok: false, data: null, meta: meta(), error: { code: e.code, message: e.message, details: e.code === "VERSION_CONFLICT" || e.code === "IMPORT_REVIEW_REQUIRED" || e.code === "BUDGET_EXCEEDED" || e.code === "DUPLICATE_IMPORT" ? e.details : void 0 } };
      }
      env.cache.put("metric:errors", String(Number(env.cache.get("metric:errors") || "0") + 1), 86400);
      env.log("error", "unhandled", { requestId, action, message: String(e?.message ?? e).slice(0, 500) });
      return { ok: false, data: null, meta: meta(), error: { code: "INTERNAL_ERROR", message: `\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E20\u0E32\u0E22\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A (\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07 ${requestId.slice(0, 8)})` } };
    }
  }
  function handleBatch(env, req) {
    const calls = Array.isArray(req.calls) ? req.calls : [];
    const meta = { requestId: env.uuid(), version: API_VERSION, serverTime: env.now().toISOString() };
    if (!calls.length || calls.length > BATCH_MAX) {
      return { ok: false, data: null, meta, error: { code: "VALIDATION_FAILED", message: `batch \u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 1\u2013${BATCH_MAX} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23` } };
    }
    const data = calls.map((c) => {
      const a = String(c?.action ?? "");
      if (!READ_ACTIONS.has(a)) return { ok: false, data: null, meta, error: { code: "VALIDATION_FAILED", message: "\u0E43\u0E0A\u0E49 batch \u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E33\u0E02\u0E2D\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25" } };
      return handle(env, { ...c, action: a, token: req.token, device: req.device });
    });
    return { ok: true, data, meta, error: null };
  }

  // src/core/setup.ts
  var SEED_FUNDING_SOURCES = [
    { code: "DOAE", name: "\u0E07\u0E1A\u0E01\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23", shortName: "\u0E01\u0E23\u0E21\u0E2F" },
    { code: "PROVINCE", name: "\u0E07\u0E1A\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23", shortName: "\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14" },
    { code: "PROVGROUP", name: "\u0E07\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E20\u0E32\u0E04\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E15\u0E2D\u0E19\u0E25\u0E48\u0E32\u0E07 2", shortName: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14" }
  ];
  var SEED_ORGS = [
    { code: "KPP-PAO", name: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23", groups: [
      { code: "ADMIN", name: "\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B" },
      { code: "STRAT", name: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E22\u0E38\u0E17\u0E18\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E41\u0E25\u0E30\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28" },
      { code: "PROD", name: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15" },
      { code: "FARMER", name: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E25\u0E30\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23\u0E01\u0E23" },
      { code: "PROTECT", name: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E32\u0E23\u0E31\u0E01\u0E02\u0E32\u0E1E\u0E37\u0E0A" }
    ] }
  ];
  var SEED_UNITS = [
    { code: "6200", name: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23", shortName: "\u0E2A\u0E19\u0E07.\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14", kind: "PROVINCE" },
    ...["\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23", "\u0E44\u0E17\u0E23\u0E07\u0E32\u0E21", "\u0E04\u0E25\u0E2D\u0E07\u0E25\u0E32\u0E19", "\u0E02\u0E32\u0E13\u0E38\u0E27\u0E23\u0E25\u0E31\u0E01\u0E29\u0E1A\u0E38\u0E23\u0E35", "\u0E04\u0E25\u0E2D\u0E07\u0E02\u0E25\u0E38\u0E07", "\u0E1E\u0E23\u0E32\u0E19\u0E01\u0E23\u0E30\u0E15\u0E48\u0E32\u0E22", "\u0E25\u0E32\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E37\u0E2D", "\u0E17\u0E23\u0E32\u0E22\u0E17\u0E2D\u0E07\u0E27\u0E31\u0E12\u0E19\u0E32", "\u0E1B\u0E32\u0E07\u0E28\u0E34\u0E25\u0E32\u0E17\u0E2D\u0E07", "\u0E1A\u0E36\u0E07\u0E2A\u0E32\u0E21\u0E31\u0E04\u0E04\u0E35", "\u0E42\u0E01\u0E2A\u0E31\u0E21\u0E1E\u0E35\u0E19\u0E04\u0E23"].map((n, i) => ({ code: `62${String(i + 1).padStart(2, "0")}`, name: `\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E33\u0E40\u0E20\u0E2D${n}`, shortName: `\u0E2D.${n}`, kind: "DISTRICT" }))
  ];
  var BUDGET_CODE_SOURCE_2570 = "\u0E23\u0E2B\u0E31\u0E2A\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 \u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E2B\u0E25\u0E31\u0E01 \u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E23\u0E32\u0E22\u0E08\u0E48\u0E32\u0E22\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E1B\u0E35 \u0E1E.\u0E28. 2570 \u0E01\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23 (NEW GFMIS THAI)";
  function seedBudgetCodes(ctx) {
    const rows = live(ctx.env.db.list("BudgetCodes"));
    if (rows.some((r3) => Number(r3.fiscalYear) === 2570)) return 0;
    ctx.env.db.insert("BudgetCodes", BUDGET_CODES_2570.map((e) => ({ ...newMeta(ctx), ...e, source: BUDGET_CODE_SOURCE_2570 })));
    return BUDGET_CODES_2570.length;
  }
  function seedMasterData(ctx) {
    const fs = live(ctx.env.db.list("FundingSources"));
    const newFs = SEED_FUNDING_SOURCES.filter((s) => !fs.some((x) => x.code === s.code)).map((s) => ({ ...newMeta(ctx), ...s }));
    if (newFs.length) ctx.env.db.insert("FundingSources", newFs);
    const orgs = live(ctx.env.db.list("Organizations"));
    const groups = live(ctx.env.db.list("Workgroups"));
    for (const o of SEED_ORGS) {
      let org = orgs.find((x) => x.code === o.code);
      if (!org) {
        org = { ...newMeta(ctx), code: o.code, name: o.name };
        ctx.env.db.insert("Organizations", [org]);
      }
      const add = o.groups.filter((g) => !groups.some((x) => x.code === g.code)).map((g) => ({ ...newMeta(ctx), orgId: org.id, ...g }));
      if (add.length) ctx.env.db.insert("Workgroups", add);
    }
    const units = live(ctx.env.db.list("Units"));
    const newUnits = SEED_UNITS.map((u, i) => ({ ...u, sortOrder: i })).filter((u) => !units.some((x) => x.code === u.code)).map((u) => ({ ...newMeta(ctx), ...u }));
    if (newUnits.length) ctx.env.db.insert("Units", newUnits);
    retireDistrictWorkgroup(ctx);
    for (const g of live(ctx.env.db.list("Workgroups")).filter((x) => x.code === "ADMIN" && !x.noActivities)) {
      ctx.env.db.update("Workgroups", g.id, { ...g, noActivities: true, version: g.version + 1, updatedAt: nowIso(ctx), updatedBy: "system" });
    }
    seedBudgetCodes(ctx);
  }
  function retireDistrictWorkgroup(ctx) {
    const dist = live(ctx.env.db.list("Workgroups")).find((g) => g.code === "DIST");
    if (!dist) return;
    const used = live(ctx.env.db.list("Projects")).some((p) => p.workgroupId === dist.id) || live(ctx.env.db.list("Users")).some((u) => u.workgroupId === dist.id || String(u.scopeWorkgroups ?? "").includes(dist.id)) || live(ctx.env.db.list("PlanItems")).some((i) => i.workgroupId === dist.id) || live(ctx.env.db.list("AccessRequests")).some((r3) => r3.status === "pending" && r3.workgroupId === dist.id);
    if (used) return;
    ctx.env.db.update("Workgroups", dist.id, { ...dist, isDeleted: true, version: dist.version + 1, updatedAt: nowIso(ctx), updatedBy: "system" });
    const org = live(ctx.env.db.list("Organizations")).find((o) => o.id === dist.orgId && o.code === "KPP-DISTRICT");
    if (org && !live(ctx.env.db.list("Workgroups")).some((g) => g.orgId === org.id && g.id !== dist.id)) {
      ctx.env.db.update("Organizations", org.id, { ...org, isDeleted: true, version: org.version + 1, updatedAt: nowIso(ctx), updatedBy: "system" });
    }
  }
  function initPublicVisibility(ctx, openCodes = ["PROTECT"]) {
    if (ctx.env.props.get("init:hidePublic")) return 0;
    let n = 0;
    for (const g of live(ctx.env.db.list("Workgroups")).filter((x) => !x.noActivities)) {
      const hide = !openCodes.includes(g.code);
      if (!!g.hidePublic === hide) continue;
      ctx.env.db.update("Workgroups", g.id, { ...g, hidePublic: hide, version: g.version + 1, updatedAt: nowIso(ctx), updatedBy: "system" });
      n++;
    }
    ctx.env.props.set("init:hidePublic", nowIso(ctx));
    return n;
  }

  // src/gas/memoDoc.ts
  var CM = 28.3465;
  var FONT = "Sarabun";
  var BODY = MEMO_FONT_PT.body;
  var LABEL = MEMO_FONT_PT.label;
  var INDENT = 2.5 * CM;
  var LINE = 1.15;
  var SECTION_GAP = 6;
  var DOTS = "................................................";
  function style(p, align, before = 0) {
    p.setAlignment(align).setSpacingBefore(before).setSpacingAfter(0).setLineSpacing(LINE).setIndentStart(0).setIndentEnd(0).setIndentFirstLine(0);
    return p;
  }
  function run(p, text, size, bold = false) {
    if (!text) return;
    const t2 = p.appendText(text);
    t2.setFontFamily(FONT).setFontSize(size).setBold(bold);
  }
  function layoutTable(body, cols, widths) {
    const table = body.appendTable([Array.from({ length: cols }, () => "")]);
    table.setBorderWidth(0);
    widths.forEach((w, i) => table.setColumnWidth(i, w));
    const row = table.getRow(0);
    for (let i = 0; i < cols; i++) {
      const c = row.getCell(i);
      c.setPaddingTop(0).setPaddingBottom(0).setPaddingLeft(0).setPaddingRight(0);
    }
    return table;
  }
  function cellPara(c, first, align) {
    const p = first ? c.getChild(0).asParagraph() : c.appendParagraph("");
    return style(p, align);
  }
  function buildMemoDoc(name, d) {
    const H = DocumentApp.HorizontalAlignment;
    const tx = (s) => protectGroups(memoText(d, s));
    const bodyAlign = d.align === "justify" ? H.JUSTIFY : H.LEFT;
    const doc = DocumentApp.create(name);
    const body = doc.getBody();
    body.setPageWidth(595.28).setPageHeight(841.89).setMarginLeft(3 * CM).setMarginRight(2 * CM).setMarginTop(1.5 * CM).setMarginBottom(1.5 * CM);
    const contentW = 595.28 - 5 * CM;
    const title = style(body.getChild(0).asParagraph(), H.CENTER);
    title.setSpacingBefore(12).setSpacingAfter(14);
    const img = title.addPositionedImage(Utilities.newBlob(Utilities.base64Decode(GARUDA_JPEG_BASE64), "image/jpeg", "garuda.jpg"));
    img.setWidth(Math.round(1.5 * CM)).setHeight(Math.round(1.5 * CM)).setLeftOffset(0).setTopOffset(0).setLayout(DocumentApp.PositionedLayout.ABOVE_TEXT);
    run(title, "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21", MEMO_FONT_PT.title, true);
    const org = style(body.appendParagraph(""), H.LEFT);
    run(org, "\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E32\u0E0A\u0E01\u0E32\u0E23", LABEL, true);
    run(org, `  ${tx(d.orgLine)}${d.fax ? `  \u0E42\u0E17\u0E23\u0E2A\u0E32\u0E23 ${tx(d.fax)}` : ""}`, BODY);
    const nd = layoutTable(body, 2, [contentW * 0.5, contentW * 0.5]);
    const no = cellPara(nd.getRow(0).getCell(0), true, H.LEFT);
    run(no, "\u0E17\u0E35\u0E48", LABEL, true);
    run(no, `  ${tx(memoDocNo(d))}`, BODY);
    const dt = cellPara(nd.getRow(0).getCell(1), true, H.LEFT);
    run(dt, "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48", LABEL, true);
    run(dt, `  ${tx(formatThaiDateLong(d.date))}`, BODY);
    const subj = style(body.appendParagraph(""), H.LEFT);
    run(subj, "\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07", LABEL, true);
    run(subj, `  ${tx(d.subject)}`, BODY);
    const to = style(body.appendParagraph(""), H.LEFT, SECTION_GAP);
    run(to, "\u0E40\u0E23\u0E35\u0E22\u0E19", BODY);
    run(to, `  ${tx(d.to)}`, BODY);
    memoBody(d).forEach((line, i) => {
      const p = style(body.appendParagraph(""), bodyAlign, i === 0 ? SECTION_GAP : 0);
      if (i === 0) p.setIndentFirstLine(INDENT);
      run(p, tx(line), BODY);
    });
    const box = (on) => on ? "\u2611" : "\u2610";
    const chk = style(body.appendParagraph(""), H.LEFT, SECTION_GAP);
    chk.setIndentStart(INDENT).setIndentFirstLine(INDENT);
    run(chk, "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27", BODY);
    const lines = [
      `${box(d.checks.ok)}  \u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23`,
      `${box(d.checks.returnFix)}  \u0E2A\u0E48\u0E07\u0E04\u0E37\u0E19\u0E41\u0E01\u0E49\u0E44\u0E02 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01 ${d.checks.returnFix && d.checks.returnReason.trim() ? tx(d.checks.returnReason.trim()) : DOTS}`,
      `${box(d.checks.forward)}  \u0E2A\u0E48\u0E07\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E44\u0E1B`
    ];
    for (const l of lines) {
      const p = style(body.appendParagraph(""), H.LEFT);
      p.setIndentStart(INDENT + 0.5 * CM).setIndentFirstLine(INDENT + 0.5 * CM);
      run(p, l, BODY);
    }
    body.appendParagraph("").setSpacingBefore(0).setSpacingAfter(0);
    const sig = layoutTable(body, 2, [contentW / 2, contentW / 2]);
    const people = [d.signer, d.head];
    people.forEach((person, i) => {
      const c = sig.getRow(0).getCell(i);
      const rows = [
        "(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D)........................................................",
        `(${person.name ? tx(person.name) : DOTS})`,
        `\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 ${person.position ? tx(person.position) : DOTS}`,
        person.line2 ? tx(person.line2) : ""
      ].filter(Boolean);
      rows.forEach((r3, j) => run(cellPara(c, j === 0, H.CENTER), r3, BODY));
    });
    const ap = style(body.appendParagraph(""), H.CENTER, 18);
    run(ap, "\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", BODY);
    for (const r3 of ["(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D)........................................................", `(${DOTS})`, `\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07 ${DOTS}`]) {
      run(style(body.appendParagraph(""), H.CENTER, r3.startsWith("(\u0E25\u0E07\u0E0A\u0E37\u0E48\u0E2D)") ? 14 : 0), r3, BODY);
    }
    return doc;
  }

  // src/core/pbkdf2.ts
  function utf8(s) {
    const out = [];
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63);
      else if (c < 65536) out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
      else {
        out.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
      }
    }
    return out;
  }
  function pbkdf2Sha256Hex(hmacFn, password, salt, iterations) {
    if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const key = utf8(password);
    let u = hmacFn(key, [...utf8(salt), 0, 0, 0, 1]).map((b) => b & 255);
    const t2 = u.slice();
    for (let i = 1; i < iterations; i++) {
      u = hmacFn(key, u).map((b) => b & 255);
      for (let j = 0; j < t2.length; j++) t2[j] ^= u[j];
    }
    return t2.map((b) => (b & 255).toString(16).padStart(2, "0")).join("");
  }

  // src/gas/adapter.ts
  var toSigned = (bytes) => Array.from(bytes, (b) => b > 127 ? b - 256 : b);
  var toUnsigned = (bytes) => Uint8Array.from(bytes, (b) => b & 255);
  var hex = (bytes) => bytes.map((b) => (b & 255).toString(16).padStart(2, "0")).join("");
  var gasCrypto = {
    sha256Hex: (d) => hex(typeof d === "string" ? Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d, Utilities.Charset.UTF_8) : Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, toSigned(d))),
    hmacSha256B64Url: (key, msg) => Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(msg, key, Utilities.Charset.UTF_8)).replace(/=+$/, ""),
    pbkdf2Hex: (password, salt, iterations) => pbkdf2Sha256Hex((k, m) => Utilities.computeHmacSha256Signature(m, k), password, salt, iterations),
    randomHex: (n) => {
      let s = "";
      while (s.length < n * 2) s += hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()));
      return s.slice(0, n * 2);
    },
    base64Decode: (b64) => toUnsigned(Utilities.base64Decode(b64)),
    b64urlEncodeUtf8: (s) => Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, ""),
    b64urlDecodeUtf8: (s) => Utilities.newBlob(Utilities.base64DecodeWebSafe(s + "===".slice((s.length + 3) % 4))).getDataAsString("UTF-8")
  };
  var gasLock = {
    withLock(fn, timeoutMs = 25e3) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(timeoutMs)) throw new AppError("BUSY_RETRY", "\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2D\u0E37\u0E48\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07");
      try {
        return fn();
      } finally {
        lock.releaseLock();
      }
    }
  };
  var gasCache = {
    get: (k) => CacheService.getScriptCache().get(k),
    put: (k, v, ttl) => CacheService.getScriptCache().put(k, v, Math.min(Math.max(ttl, 1), 21600)),
    remove: (k) => CacheService.getScriptCache().remove(k)
  };
  var gasProps = {
    get: (k) => PropertiesService.getScriptProperties().getProperty(k),
    set: (k, v) => {
      PropertiesService.getScriptProperties().setProperty(k, v);
    }
  };
  function fileIds() {
    const raw = gasProps.get("FILE_IDS");
    if (!raw) throw new AppError("INTERNAL_ERROR", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E23\u0E30\u0E1A\u0E1A \u2014 \u0E23\u0E31\u0E19\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19 setup \u0E43\u0E19 Apps Script editor");
    return JSON.parse(raw);
  }
  var TABLE_TTL = 300;
  var CHUNK = 3e4;
  var NO_CACHE = /* @__PURE__ */ new Set(["AuditLogs", "LoginAttempts", "ImportRows", "Snapshots"]);
  function tableGen(table, renew = false) {
    const c = CacheService.getScriptCache();
    const k = `tg:${table}`;
    let g = renew ? null : c.get(k);
    if (!g) {
      g = Utilities.getUuid().slice(0, 8);
      c.put(k, g, 21600);
    }
    return g;
  }
  function readCachedValues(table) {
    try {
      const c = CacheService.getScriptCache();
      const base = `tv:${table}:${tableGen(table)}`;
      const n = Number(c.get(`${base}:n`) || 0);
      if (!n) return null;
      const keys = Array.from({ length: n }, (_, i) => `${base}:${i}`);
      const parts = c.getAll(keys);
      if (keys.some((k) => parts[k] === void 0 || parts[k] === null)) return null;
      return JSON.parse(keys.map((k) => parts[k]).join(""));
    } catch {
      return null;
    }
  }
  function writeCachedValues(table, values) {
    try {
      const json2 = JSON.stringify(values);
      if (json2.length > 2e6) return;
      const base = `tv:${table}:${tableGen(table)}`;
      const entries = {};
      let n = 0;
      for (let i = 0; i < json2.length; i += CHUNK) entries[`${base}:${n++}`] = json2.slice(i, i + CHUNK);
      entries[`${base}:n`] = String(n);
      CacheService.getScriptCache().putAll(entries, TABLE_TTL);
    } catch {
    }
  }
  function invalidateTableCache() {
    for (const t2 of Object.keys(TABLES)) tableGen(t2, true);
  }
  var bangkokIso = (d) => Utilities.formatDate(d, "Asia/Bangkok", "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
  function toCell(type, v) {
    if (type === "number") return v === "" || v === null || v === void 0 || Number.isNaN(Number(v)) ? 0 : Number(v);
    if (type === "boolean") return v === true || v === "TRUE" || v === "true";
    if (v === null || v === void 0) return "";
    return escapeCell(String(v));
  }
  function fromCell(type, v) {
    if (type === "number") return v === "" ? 0 : Number(v);
    if (type === "boolean") return v === true || v === "TRUE" || v === "true";
    if (v instanceof Date) return bangkokIso(v);
    return unescapeCell(v === null || v === void 0 ? "" : String(v));
  }
  var SheetsDb = class {
    constructor() {
      __publicField(this, "books", /* @__PURE__ */ new Map());
      __publicField(this, "sheets", /* @__PURE__ */ new Map());
      __publicField(this, "memo", /* @__PURE__ */ new Map());
      /** ตารางที่เขียนแล้วใน execution นี้ — เปลี่ยนรุ่น cache หลัง SpreadsheetApp.flush() ใน flush() */
      __publicField(this, "dirty", /* @__PURE__ */ new Set());
    }
    book(file) {
      if (!this.books.has(file)) this.books.set(file, SpreadsheetApp.openById(fileIds()[file]));
      return this.books.get(file);
    }
    /** เปิดชีตเมื่อจำเป็นเท่านั้น (อ่านจาก cache ได้ก็ไม่ต้องเปิดไฟล์) */
    sheet(table) {
      let sh = this.sheets.get(table);
      if (!sh) {
        sh = this.book(TABLES[table].file).getSheetByName(table) ?? void 0;
        if (!sh) throw new AppError("INTERNAL_ERROR", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E0A\u0E35\u0E15 ${table} \u2014 \u0E23\u0E31\u0E19 setup \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07`);
        this.sheets.set(table, sh);
      }
      return sh;
    }
    load(table) {
      const cached2 = this.memo.get(table);
      if (cached2) return cached2;
      const def = TABLES[table];
      let values = NO_CACHE.has(table) ? null : readCachedValues(table);
      if (!values) {
        values = this.sheet(table).getDataRange().getValues().map((line) => line.map((c) => c instanceof Date ? bangkokIso(c) : c));
        if (!NO_CACHE.has(table)) writeCachedValues(table, values);
      }
      const header = (values[0] ?? []).map(String);
      const idx = new Map(header.map((h, i) => [h, i]));
      const pk = primaryKeyOf(table);
      const rows = [];
      const rowNum = /* @__PURE__ */ new Map();
      for (let r3 = 1; r3 < values.length; r3++) {
        const line = values[r3];
        if (line.every((c) => c === "" || c === null)) continue;
        const obj = {};
        for (const [col, type] of def.columns) obj[col] = fromCell(type, idx.has(col) ? line[idx.get(col)] : "");
        rows.push(obj);
        rowNum.set(String(obj[pk]), r3 + 1);
      }
      const m = { header, rows, rowNum, pending: [] };
      this.memo.set(table, m);
      return m;
    }
    toLine(table, m, row) {
      const types = new Map(TABLES[table].columns.map(([c, t2]) => [c, t2]));
      return m.header.map((h) => types.has(h) ? toCell(types.get(h), row[h]) : "");
    }
    list(table) {
      return this.load(table).rows.map((r3) => ({ ...r3 }));
    }
    insert(table, rows) {
      if (!rows.length) return;
      const m = this.load(table);
      for (const r3 of rows) {
        const norm = {};
        for (const [col, type] of TABLES[table].columns) norm[col] = fromCell(type, toCell(type, r3[col]));
        m.rows.push(norm);
        m.pending.push(norm);
      }
    }
    update(table, id, patch) {
      const m = this.load(table);
      const pk = primaryKeyOf(table);
      const i = m.rows.findIndex((r3) => r3[pk] === id);
      if (i < 0) throw new AppError("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 ${table}`);
      const next = { ...m.rows[i], ...patch };
      m.rows[i] = next;
      const p = m.pending.findIndex((r3) => r3[pk] === id);
      if (p >= 0) {
        m.pending[p] = next;
        return;
      }
      const n = m.rowNum.get(id);
      if (!n) throw new AppError("INTERNAL_ERROR", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E41\u0E16\u0E27 ${table}`);
      this.sheet(table).getRange(n, 1, 1, m.header.length).setValues([this.toLine(table, m, next)]);
      this.dirty.add(table);
    }
    flush() {
      for (const [table, m] of this.memo) {
        if (!m.pending.length) continue;
        const sh = this.sheet(table);
        const start = sh.getLastRow() + 1;
        const lines = m.pending.map((r3) => this.toLine(table, m, r3));
        sh.getRange(start, 1, lines.length, m.header.length).setValues(lines);
        this.dirty.add(table);
        const pk = primaryKeyOf(table);
        m.pending.forEach((r3, i) => m.rowNum.set(String(r3[pk]), start + i));
        m.pending = [];
      }
      if (this.dirty.size) {
        SpreadsheetApp.flush();
        for (const t2 of this.dirty) if (!NO_CACHE.has(t2)) tableGen(t2, true);
        this.dirty.clear();
      }
    }
    invalidate() {
      invalidateTableCache();
      this.memo.clear();
    }
    cellUsage() {
      return Object.keys(FILE_NAMES).map((f) => ({
        file: FILE_NAMES[f],
        cells: this.book(f).getSheets().reduce((s, sh) => s + sh.getMaxRows() * sh.getMaxColumns(), 0)
      }));
    }
  };
  var SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
  var DOC_MIME = "application/vnd.google-apps.document";
  var GasFiles = class {
    constructor() {
      __publicField(this, "folders", /* @__PURE__ */ new Map());
    }
    root() {
      const id = gasProps.get("ROOT_FOLDER_ID");
      if (!id) throw new AppError("INTERNAL_ERROR", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ROOT_FOLDER_ID \u2014 \u0E23\u0E31\u0E19 setup");
      return DriveApp.getFolderById(id);
    }
    folder(path) {
      if (this.folders.has(path)) return this.folders.get(path);
      let f = this.root();
      for (const seg of path.split("/").filter(Boolean)) {
        const it = f.getFoldersByName(seg);
        f = it.hasNext() ? it.next() : f.createFolder(seg);
      }
      this.folders.set(path, f);
      return f;
    }
    save(folderPath, fileName, mimeType, bytes) {
      const signed = toSigned(bytes);
      const blob = Utilities.newBlob(signed, mimeType, fileName);
      const file = this.folder(folderPath).createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      return { id: file.getId(), sha256: hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, signed)), sizeBytes: bytes.length, mimeType };
    }
    sheetTables(ss) {
      return ss.getSheets().map((sh) => ({
        name: sh.getName(),
        rows: sh.getDataRange().getValues().map((line) => line.map((c) => c instanceof Date ? Utilities.formatDate(c, "Asia/Bangkok", "yyyy-MM-dd") : c))
      }));
    }
    /** แปลงไฟล์เป็น Google format ชั่วคราวด้วย Drive API v3 แล้วลบทิ้ง */
    convert(fileId, targetMime, read, ocr = false) {
      const src = DriveApp.getFileById(fileId);
      const tmpFolder = this.folder(`${FOLDERS.system}/tmp`);
      if (typeof Drive === "undefined" || !Drive.Files) throw new AppError("INTERNAL_ERROR", "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E34\u0E14 Advanced Drive Service (v3) \u0E43\u0E19 Apps Script");
      const created = Drive.Files.create(
        { name: `tmp-${Date.now()}`, mimeType: targetMime, parents: [tmpFolder.getId()] },
        src.getBlob(),
        ocr ? { ocrLanguage: "th" } : {}
      );
      try {
        return read(created.id);
      } finally {
        DriveApp.getFileById(created.id).setTrashed(true);
      }
    }
    readTables(fileId, mimeType) {
      if (mimeType.startsWith("text/")) {
        const blob = DriveApp.getFileById(fileId).getBlob();
        let text = blob.getDataAsString("UTF-8");
        if (text.includes("\uFFFD")) text = blob.getDataAsString("TIS-620");
        return [{ name: DriveApp.getFileById(fileId).getName(), rows: parseDelimited(text) }];
      }
      return this.convert(fileId, SPREADSHEET_MIME, (id) => this.sheetTables(SpreadsheetApp.openById(id)));
    }
    readSheetUrl(url) {
      try {
        return this.sheetTables(SpreadsheetApp.openByUrl(url));
      } catch {
        throw new AppError("VALIDATION_FAILED", "\u0E40\u0E1B\u0E34\u0E14\u0E25\u0E34\u0E07\u0E01\u0E4C Google Sheets \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u2014 \u0E41\u0E0A\u0E23\u0E4C\u0E44\u0E1F\u0E25\u0E4C\u0E43\u0E2B\u0E49\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2D\u0E48\u0E32\u0E19) \u0E01\u0E48\u0E2D\u0E19");
      }
    }
    ocr(fileId) {
      return this.convert(fileId, DOC_MIME, (id) => DocumentApp.openById(id).getBody().getText(), true);
    }
    listInbox() {
      const it = this.folder(FOLDERS.inbox).getFiles();
      const out = [];
      while (it.hasNext() && out.length < 20) {
        const f = it.next();
        out.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), bytes: () => toUnsigned(f.getBlob().getBytes()) });
      }
      return out;
    }
    moveToFolder(fileId, folderPath) {
      DriveApp.getFileById(fileId).moveTo(this.folder(folderPath));
    }
    renderMemo(folderPath, baseName, memo) {
      const folder = this.folder(folderPath);
      const doc = buildMemoDoc(baseName, memo);
      const docId = doc.getId();
      doc.saveAndClose();
      const docFile = DriveApp.getFileById(docId);
      docFile.moveTo(folder);
      docFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      const pdf = folder.createFile(docFile.getAs("application/pdf").setName(`${baseName}.pdf`));
      pdf.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      return { docId, pdfId: pdf.getId() };
    }
  };
  function provision(files, dryRun = false) {
    const log = [];
    for (const p of Object.values(FOLDERS)) {
      if (!dryRun) files.folder(p);
      log.push(`folder: ${p}`);
    }
    const ids = JSON.parse(gasProps.get("FILE_IDS") || "{}");
    const systemFolder = files.folder(FOLDERS.system);
    for (const key of Object.keys(FILE_NAMES)) {
      if (!ids[key]) {
        const found = systemFolder.getFilesByName(FILE_NAMES[key]);
        if (found.hasNext()) ids[key] = found.next().getId();
        else if (!dryRun) {
          const ss = SpreadsheetApp.create(FILE_NAMES[key]);
          DriveApp.getFileById(ss.getId()).moveTo(systemFolder);
          ids[key] = ss.getId();
          log.push(`create spreadsheet: ${FILE_NAMES[key]}`);
        }
      }
    }
    if (dryRun) return log;
    gasProps.set("FILE_IDS", JSON.stringify(ids));
    for (const [table, def] of Object.entries(TABLES)) {
      const ss = SpreadsheetApp.openById(ids[def.file]);
      let sh = ss.getSheetByName(table);
      if (!sh) {
        sh = ss.insertSheet(table);
        log.push(`create sheet: ${table}`);
      }
      const lastCol = Math.max(sh.getLastColumn(), 1);
      const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String).filter(Boolean);
      const missing = def.columns.map(([c]) => c).filter((c) => !header.includes(c));
      if (missing.length) {
        sh.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
        log.push(`add columns ${table}: ${missing.join(",")}`);
      }
      const full = [...header, ...missing];
      full.forEach((c, i) => {
        const type = def.columns.find(([n]) => n === c)?.[1];
        if (type === "string" || type === "json") sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat("@");
      });
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, full.length).setFontWeight("bold").setBackground("#e8f1ea");
    }
    for (const key of Object.keys(FILE_NAMES)) {
      const ss = SpreadsheetApp.openById(ids[key]);
      for (const sh of ss.getSheets()) {
        if (/^(Sheet1|ชีต1|แผ่นงาน1)$/.test(sh.getName()) && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
      }
    }
    gasProps.set("SETUP_VERSION", SCHEMA_VERSION);
    return log;
  }
  function createGasEnv() {
    return {
      db: new SheetsDb(),
      lock: gasLock,
      cache: gasCache,
      props: gasProps,
      crypto: gasCrypto,
      files: new GasFiles(),
      now: () => /* @__PURE__ */ new Date(),
      uuid: () => Utilities.getUuid(),
      log: (level, event, data) => {
        const line = JSON.stringify({ level, event, ...data });
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else console.log(line);
      }
    };
  }

  // src/gas/main.ts
  function json(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }
  function systemCtx() {
    return { env: createGasEnv(), requestId: Utilities.getUuid(), user: SYSTEM_USER, device: "system" };
  }
  function doGet(e) {
    const p = e && e.parameter || {};
    if (!p.action) return json({ ok: true, name: "KPP Agri-Budget Monitor API", docs: "POST {action, ...}" });
    if (!String(p.action).startsWith("public.")) return json({ ok: false, error: { code: "UNKNOWN_ACTION", message: "GET \u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30 public.*" } });
    const req = { action: p.action };
    if (p.fiscalYear) req.fiscalYear = Number(p.fiscalYear);
    if (p.id) req.id = String(p.id);
    return json(handle(createGasEnv(), req));
  }
  function doPost(e) {
    let body;
    try {
      const raw = e && e.postData && e.postData.contents || "{}";
      if (raw.length > 25 * 1024 * 1024) throw new Error("too large");
      body = JSON.parse(raw);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not object");
    } catch {
      return json({ ok: false, data: null, meta: null, error: { code: "VALIDATION_FAILED", message: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" } });
    }
    const env = createGasEnv();
    const out = handle(env, body);
    env.db.flush?.();
    return json(out);
  }
  function setup(rootFolderId, superUser2, superPassword) {
    const g = globalThis;
    const folderId = rootFolderId || g.ROOT_FOLDER_ID || gasProps.get("ROOT_FOLDER_ID");
    if (!folderId) throw new Error("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48 ROOT_FOLDER_ID \u0E43\u0E19 Secrets.gs");
    DriveApp.getFolderById(folderId);
    gasProps.set("ROOT_FOLDER_ID", folderId);
    const files = new GasFiles();
    const log = provision(files);
    const ctx = systemCtx();
    seedMasterData(ctx);
    const hidden = initPublicVisibility(ctx);
    if (hidden) log.push(`public visibility: \u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E32\u0E23\u0E31\u0E01\u0E02\u0E32\u0E1E\u0E37\u0E0A (\u0E1B\u0E23\u0E31\u0E1A ${hidden} \u0E01\u0E25\u0E38\u0E48\u0E21)`);
    ctx.env.db.flush?.();
    const u = superUser2 || g.INIT_SUPER_USER;
    const pw = superPassword || g.INIT_SUPER_PASSWORD;
    if (!gasProps.get("SUPER_HASH")) {
      if (!u || !pw) throw new Error("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35 Super Admin \u2014 \u0E43\u0E2A\u0E48 INIT_SUPER_USER / INIT_SUPER_PASSWORD \u0E43\u0E19 Secrets.gs \u0E41\u0E25\u0E49\u0E27\u0E23\u0E31\u0E19 setup \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07");
      setSuperAdmin(ctx, u, pw);
      log.push("super admin: created (\u0E42\u0E1B\u0E23\u0E14\u0E25\u0E1A\u0E44\u0E1F\u0E25\u0E4C Secrets.gs \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C)");
    }
    installTriggers();
    log.push(`triggers: ${gasProps.get("TRIGGERS")}`);
    console.log(log.join("\n"));
    return log.join("\n");
  }
  function setSuperAdmin2(username, password) {
    setSuperAdmin(systemCtx(), username, password);
    return "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A Super Admin \u0E41\u0E25\u0E49\u0E27";
  }
  function installTriggers() {
    const want = {
      autoImportInbox: () => ScriptApp.newTrigger("autoImportInbox").timeBased().everyMinutes(15),
      dailyMaintenance: () => ScriptApp.newTrigger("dailyMaintenance").timeBased().atHour(2).everyDays(1).inTimezone("Asia/Bangkok")
    };
    const existing = ScriptApp.getProjectTriggers().map((t2) => t2.getHandlerFunction());
    for (const [name, build] of Object.entries(want)) if (!existing.includes(name)) build().create();
    gasProps.set("TRIGGERS", Object.keys(want).join(","));
  }
  function autoImportInbox() {
    const ctx = systemCtx();
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5e3)) return "busy";
    try {
      const out = processInbox(ctx);
      ctx.env.db.flush?.();
      if (out.length) ctx.env.log("info", "inbox", { files: out.length });
      return out;
    } finally {
      lock.releaseLock();
    }
  }
  function dailyMaintenance() {
    const ctx = systemCtx();
    const files = new GasFiles();
    const ids = JSON.parse(gasProps.get("FILE_IDS") || "{}");
    const day = todayBangkok();
    const folder = files.folder(`${FOLDERS.backup}/${day}`);
    for (const key of Object.keys(FILE_NAMES)) {
      if (ids[key]) DriveApp.getFileById(ids[key]).makeCopy(`${FILE_NAMES[key]}_${day}`, folder);
    }
    const retention = Number(getSettings(ctx).backupRetentionDays) || 30;
    const cutoff = new Date(Date.now() - retention * 864e5).toISOString().slice(0, 10);
    const it = files.folder(FOLDERS.backup).getFolders();
    while (it.hasNext()) {
      const f = it.next();
      if (/^\d{4}-\d{2}-\d{2}$/.test(f.getName()) && f.getName() < cutoff) f.setTrashed(true);
    }
    const lock = LockService.getScriptLock();
    if (lock.tryLock(2e4)) {
      try {
        setSetting(ctx, "lastBackupAt", (/* @__PURE__ */ new Date()).toISOString());
        writeSnapshot(ctx);
        ctx.env.db.flush?.();
      } finally {
        lock.releaseLock();
      }
    }
    return `backup ${day} ok`;
  }
  function testMemoRender() {
    const files = new GasFiles();
    const sample = {
      orgLine: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E32\u0E23\u0E31\u0E01\u0E02\u0E32\u0E1E\u0E37\u0E0A \u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23",
      fax: "0-5571-6858",
      docPrefix: "\u0E01\u0E1E 0009.3",
      docNumber: "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07",
      date: todayBangkok(),
      to: MEMO_DEFAULT_TO,
      subject: MEMO_SUBJECT,
      refNo: "\u0E01\u0E1E 0109/2269",
      refDate: todayBangkok(),
      refFrom: "\u0E2D\u0E33\u0E40\u0E20\u0E2D\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23",
      expense: "\u0E04\u0E48\u0E32\u0E08\u0E31\u0E14\u0E0B\u0E37\u0E49\u0E2D\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19",
      projectName: "\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E1E\u0E37\u0E0A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1C\u0E25\u0E34\u0E15\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E40\u0E01\u0E29\u0E15\u0E23",
      mainActivityName: "\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E01\u0E32\u0E23\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E34\u0E19\u0E1B\u0E38\u0E4B\u0E22\u0E0A\u0E38\u0E21\u0E0A\u0E19 (\u0E28\u0E14\u0E1B\u0E0A.) \u0E2A\u0E39\u0E48 Service Provider \u0E14\u0E34\u0E19\u0E1B\u0E38\u0E4B\u0E22\u0E0A\u0E38\u0E21\u0E0A\u0E19",
      fund: "\u0E07\u0E1A\u0E01\u0E23\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23",
      budgetCode: "07011152034002000000",
      mainActivityCode: "07011690009900000",
      subActivityName: "\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E17\u0E33\u0E41\u0E1B\u0E25\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E14\u0E34\u0E19\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E1B\u0E38\u0E4B\u0E22\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E14\u0E49\u0E32\u0E19",
      budgetSatang: 44e5,
      previousSatang: 36e5,
      requestSatang: 4e5,
      checks: { ok: true, returnFix: false, returnReason: "", forward: true },
      signer: { name: "\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25 \u0E1C\u0E39\u0E49\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A", position: "\u0E19\u0E31\u0E01\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E0A\u0E33\u0E19\u0E32\u0E0D\u0E01\u0E32\u0E23" },
      head: { name: "\u0E0A\u0E37\u0E48\u0E2D-\u0E2A\u0E01\u0E38\u0E25 \u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21", position: "\u0E19\u0E31\u0E01\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E32\u0E23\u0E40\u0E01\u0E29\u0E15\u0E23\u0E0A\u0E33\u0E19\u0E32\u0E0D\u0E01\u0E32\u0E23", line2: "\u0E23\u0E31\u0E01\u0E29\u0E32\u0E01\u0E32\u0E23\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E32\u0E23\u0E31\u0E01\u0E02\u0E32\u0E1E\u0E37\u0E0A" },
      align: "left",
      thaiNumerals: true
    };
    const left = files.renderMemo(`${FOLDERS.system}/tmp`, "\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21_\u0E0A\u0E34\u0E14\u0E0B\u0E49\u0E32\u0E22", sample);
    const just = files.renderMemo(`${FOLDERS.system}/tmp`, "\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21_\u0E0A\u0E34\u0E14\u0E02\u0E2D\u0E1A", { ...sample, align: "justify" });
    const msg = `left: https://docs.google.com/document/d/${left.docId}/edit
justify: https://docs.google.com/document/d/${just.docId}/edit
pdf: https://drive.google.com/file/d/${left.pdfId}/view`;
    Logger.log(msg);
    return msg;
  }
  return __toCommonJS(main_exports);
})();
function doGet() { return KPP.doGet.apply(null, arguments); }
function doPost() { return KPP.doPost.apply(null, arguments); }
function setup() { return KPP.setup.apply(null, arguments); }
function setSuperAdmin() { return KPP.setSuperAdmin.apply(null, arguments); }
function installTriggers() { return KPP.installTriggers.apply(null, arguments); }
function autoImportInbox() { return KPP.autoImportInbox.apply(null, arguments); }
function dailyMaintenance() { return KPP.dailyMaintenance.apply(null, arguments); }
function testMemoRender() { return KPP.testMemoRender.apply(null, arguments); }
