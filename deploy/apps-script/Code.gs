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
    setup: () => setup
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
      const r2 = right === "" ? 0 : thaiWordsToInt(right);
      if (l === null || r2 === null) return null;
      return l * 1e6 + r2;
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
    const line = (r2) => r2.map((c) => {
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
    return rows.filter((r2) => r2.some((c) => c.trim() !== ""));
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
  function riskFlags(project, summary, today2 = todayBangkok()) {
    const flags = [];
    if (summary.remaining < 0) flags.push("OVER_BUDGET");
    const active = project.status !== "COMPLETED" && project.status !== "CANCELLED";
    if (active && project.endDate && project.endDate < today2) flags.push("OVERDUE");
    const { start, end } = fiscalYearRange(project.fiscalYear);
    if (active && today2 >= start && today2 <= end && summary.currentBudget > 0) {
      const target = monthlyTargetPct(project.quarterTargets)[fiscalMonthIndex(today2) - 1];
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
    for (let r2 = 0; r2 < limit; r2++) {
      const single = rows[r2].map((c) => cleanText(c, 120));
      const variants = [{ headers: single, span: 1 }];
      if (r2 + 1 < rows.length) {
        let carry = "";
        const combined = single.map((h, i) => {
          if (h) carry = h;
          const sub = cleanText(rows[r2 + 1][i], 120);
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
          best = { headerRow: r2, headerSpan: v.span, headers: v.headers, mapping, kind: detectKind(mapping) };
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
      const money = {};
      for (const f of MONEY_FIELDS) {
        if (m[f] === void 0) continue;
        const p = parseMoney(get(row, f));
        if (!p.ok) issues.push(`${FIELD_LABEL[f]}: \u0E2D\u0E48\u0E32\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 "${cleanText(get(row, f), 40)}"`);
        else if (!p.empty) money[f] = p.satang;
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
        money,
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
    for (const r2 of parsed) {
      const messages = [...r2.issues];
      let hardError = r2.issues.length > 0;
      let warn = false;
      const plan = { allocations: [], disbursements: [] };
      const effect = { budgetDelta: 0, disbursedDelta: 0, committedDelta: 0 };
      const label = [r2.projectCode, r2.projectName, r2.activityName].filter(Boolean).join(" \xB7 ") || `\u0E41\u0E16\u0E27 ${r2.rowNo}`;
      const fy = r2.fiscalYear ?? ctx.fiscalYear;
      let fundingSourceId = ctx.fundingSourceId;
      if (r2.fundingSource) {
        const fs = matchFundingSource(r2.fundingSource, ctx.fundingSources);
        if (fs) fundingSourceId = fs.id;
        else {
          messages.push(`\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A "${r2.fundingSource}"`);
          hardError = true;
        }
      }
      if (!fundingSourceId) {
        messages.push("\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A \u2014 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A\u0E02\u0E2D\u0E07\u0E44\u0E1F\u0E25\u0E4C");
        hardError = true;
      }
      if (!r2.projectCode && !r2.projectName) {
        messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
        result.push({ rowNo: r2.rowNo, status: "ERROR", messages, label, plan, effect });
        continue;
      }
      const sameScope = liveProjects.filter((p) => p.fiscalYear === fy && p.fundingSourceId === fundingSourceId);
      let project = r2.projectCode ? sameScope.find((p) => normalizeKey(p.projectCode) === normalizeKey(r2.projectCode)) : void 0;
      if (!project && r2.projectName) {
        const byName = sameScope.filter((p) => normalizeKey(p.name) === normalizeKey(r2.projectName));
        if (byName.length === 1 && (!r2.projectCode || byName[0].projectCode.startsWith("AUTO-"))) project = byName[0];
      }
      const projectCode = r2.projectCode || (project?.projectCode ?? autoProjectCode(fy, r2.projectName));
      const newKey = `${fy}|${fundingSourceId}|${normalizeKey(projectCode)}`;
      let projectRef = project?.id ?? "";
      let workgroupId = project?.workgroupId ?? "";
      if (r2.workgroup) {
        const wg = matchWorkgroup(r2.workgroup, ctx.workgroups);
        if (wg) {
          if (project && project.workgroupId !== wg.id) {
            messages.push(`\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C (${wg.name}) \u0E15\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u2014 \u0E43\u0E0A\u0E49\u0E04\u0E48\u0E32\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A`);
            warn = true;
          } else workgroupId = wg.id;
        } else if (!project) {
          messages.push(`\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19 "${r2.workgroup}"`);
          hardError = true;
        }
      }
      if (!workgroupId && ctx.defaultWorkgroupId) workgroupId = ctx.defaultWorkgroupId;
      if (!project) {
        if (ctx.kind === "DISBURSEMENT_LIST") {
          messages.push(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 "${r2.projectCode || r2.projectName}" \u0E43\u0E19\u0E1B\u0E35\u0E07\u0E1A ${fy}`);
          hardError = true;
        } else if (!r2.projectName && !newProjects.has(newKey)) {
          messages.push("\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
          hardError = true;
        } else {
          if (!workgroupId) {
            messages.push("\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48");
            hardError = true;
          }
          if (!r2.projectCode) {
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
              name: r2.projectName,
              workgroupId,
              ownerName: r2.ownerName,
              startDate: r2.startDate ?? "",
              endDate: r2.endDate ?? "",
              status: parseProjectStatus(r2.status) ?? "IN_PROGRESS"
            };
            newProjects.set(newKey, p);
            plan.createProject = p;
            messages.push("\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48");
          }
        }
      } else if (ctx.kind === "BUDGET_SUMMARY") {
        const patch = {};
        if (r2.ownerName && r2.ownerName !== project.ownerName) patch.ownerName = r2.ownerName;
        if (r2.startDate && r2.startDate !== project.startDate) patch.startDate = r2.startDate;
        if (r2.endDate && r2.endDate !== project.endDate) patch.endDate = r2.endDate;
        const st = parseProjectStatus(r2.status);
        if (st && st !== project.status) patch.status = st;
        if (Object.keys(patch).length) plan.updateProject = { projectId: project.id, patch };
      }
      if (workgroupId && ctx.allowedWorkgroupIds && !ctx.allowedWorkgroupIds.has(workgroupId)) {
        messages.push("\u0E2D\u0E22\u0E39\u0E48\u0E19\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C");
        hardError = true;
      }
      let activityRef = "";
      if (r2.activityCode || r2.activityName) {
        const acts = project ? liveActivities.filter((a) => a.projectId === project.id) : [];
        const act = acts.find((a) => r2.activityCode && normalizeKey(a.activityCode) === normalizeKey(r2.activityCode) || !r2.activityCode && normalizeKey(a.name) === normalizeKey(r2.activityName));
        if (act) activityRef = act.id;
        else if (ctx.kind === "DISBURSEMENT_LIST") {
          messages.push(`\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21 "${r2.activityCode || r2.activityName}" \u2014 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23`);
          warn = true;
        } else if (r2.activityName) {
          const code = r2.activityCode || String(acts.length + [...newActivities.values()].filter((a) => a.projectRef === projectRef).length + 1).padStart(2, "0");
          const aKey = `${projectRef}|${normalizeKey(code)}`;
          activityRef = `new:${aKey}`;
          if (!newActivities.has(aKey)) {
            const a = { ref: activityRef, projectRef, activityCode: code, name: r2.activityName };
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
          const mny = { ...r2.money };
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
          const amount = r2.money.amount;
          if (amount === void 0 || amount === 0) {
            messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19");
            hardError = true;
          } else if (amount < 0) {
            messages.push("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E15\u0E34\u0E14\u0E25\u0E1A \u2014 \u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E17\u0E19");
            hardError = true;
          }
          if (!r2.date) {
            messages.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48");
            hardError = true;
          }
          const status2 = parseDisbStatus(r2.status) ?? "APPROVED";
          if (status2 === "VOID") {
            messages.push("\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 \u2014 \u0E02\u0E49\u0E32\u0E21");
            warn = true;
          } else if (!hardError && amount) {
            const dupKey = `${projectRef}|${normalizeKey(r2.docNo)}|${r2.date}|${amount}`;
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
                  date: r2.date,
                  docNo: r2.docNo,
                  description: r2.description,
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
      result.push({ rowNo: r2.rowNo, status, messages, label, plan, effect });
    }
    return result;
  }
  function summarizeStaged(rows) {
    let valid = 0, warning = 0, error = 0, budgetDelta = 0, disbursedDelta = 0, newProjects = 0;
    for (const r2 of rows) {
      if (r2.status === "VALID") valid++;
      else if (r2.status === "WARNING") warning++;
      else error++;
      if (r2.status !== "ERROR") {
        budgetDelta += r2.effect.budgetDelta;
        disbursedDelta += r2.effect.disbursedDelta;
        if (r2.plan.createProject) newProjects++;
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
  var PUBLIC_ACTIONS = /* @__PURE__ */ new Set([
    "public.lookups",
    "public.summary",
    "public.projects",
    "public.project",
    "auth.requestAccess",
    "auth.login",
    "auth.loginSuper"
  ]);

  // ../../packages/domain/src/plan.ts
  var PLAN_KINDS = ["PLAN", "OUTPUT", "PROJECT", "ACTIVITY", "SUBACTIVITY", "BUDGET_TYPE", "METHOD", "ITEM"];
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
    let planIndex = 0;
    let prevRank = 10;
    for (const r2 of rows) {
      const text = cleanText(r2.text, 1e3);
      if (!text) continue;
      const c = classifyPlanLine(text);
      const money = parseMoney(r2.amount);
      if (!money.ok) issues.push({ rowNo: r2.rowNo, level: "ERROR", message: `\u0E2D\u0E48\u0E32\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: "${cleanText(r2.amount, 30)}"` });
      const amount = money.ok && !money.empty ? money.satang : null;
      if (c.kind === "TOTAL") {
        declaredTotal = amount;
        continue;
      }
      let rank = c.rank;
      if (rank === -1) rank = prevRank + 0.5;
      if (rank === -2) {
        rank = Math.max(10, (stack.at(-1)?.rank ?? 9) + 0.5);
        issues.push({ rowNo: r2.rowNo, level: "INFO", message: "\u0E41\u0E16\u0E27\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22\u0E02\u0E2D\u0E07\u0E41\u0E16\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32" });
      }
      while (stack.length && stack[stack.length - 1].rank >= rank) stack.pop();
      if (c.kind === "PLAN") {
        planIndex++;
        stack.length = 0;
      }
      const parent = stack.at(-1)?.node;
      const qty = parseQty(r2.qty);
      if (r2.qty && qty === null) issues.push({ rowNo: r2.rowNo, level: "WARNING", message: `\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02: "${r2.qty}"` });
      const node = {
        seq: nodes.length + 1,
        rowNo: r2.rowNo,
        parentSeq: parent?.seq ?? 0,
        depth: stack.length,
        kind: c.kind,
        number: c.number,
        name: c.name,
        unit: cleanText(r2.unit, 40),
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
          issues.push({ rowNo: n.rowNo, level: "ERROR", message: `\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${(n.amountSatang / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22 ${(s / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17` });
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
      issues.push({ rowNo: 0, level: "ERROR", message: `\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E34\u0E49\u0E19 ${(declaredTotal / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17 \u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E1C\u0E25\u0E23\u0E27\u0E21\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19 ${(computedTotal / 100).toLocaleString("th-TH")} \u0E1A\u0E32\u0E17` });
    }
    const leaves = nodes.filter((n) => n.isLeaf);
    for (const l of leaves) {
      if (l.amountSatang === null) issues.push({ rowNo: l.rowNo, level: "WARNING", message: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E22\u0E48\u0E2D\u0E22\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E44\u0E21\u0E48\u0E21\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13" });
      else if (l.amountSatang < 0) issues.push({ rowNo: l.rowNo, level: "ERROR", message: "\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E15\u0E34\u0E14\u0E25\u0E1A" });
    }
    const bySeq = new Map(nodes.map((n) => [n.seq, n]));
    for (const n of nodes) {
      const core = n.number.match(/^\(?(\d+(?:\.\d+)+)\)?$/)?.[1];
      const parent = bySeq.get(n.parentSeq);
      if (!core || !parent) continue;
      const sameStyle = n.number.startsWith("(") === parent.number.startsWith("(") && /\)$/.test(n.number) === /\)$/.test(parent.number);
      const parentCore = parent.number.match(/^\(?(\d+(?:\.\d+)*)\)?$/)?.[1];
      if (sameStyle && parentCore && core.split(".").slice(0, -1).join(".") !== parentCore) {
        issues.push({ rowNo: n.rowNo, level: "INFO", message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A ${n.number} \u0E44\u0E21\u0E48\u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E21\u0E48 ${parent.number} (\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E36\u0E14\u0E15\u0E32\u0E21\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E43\u0E19\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23)` });
      }
    }
    for (const [, kids] of children) {
      const byStyle = /* @__PURE__ */ new Map();
      for (const k of kids) {
        if (!/\d/.test(k.number)) continue;
        const style = k.number.replace(/\d+/g, "#");
        (byStyle.get(style) ?? byStyle.set(style, []).get(style)).push(k);
      }
      for (const list of byStyle.values()) {
        const lastNums = list.map((k) => Number(k.number.match(/(\d+)\D*$/)?.[1] ?? 0));
        for (let i = 1; i < lastNums.length; i++) {
          if (lastNums[i] === lastNums[i - 1]) issues.push({ rowNo: list[i].rowNo, level: "WARNING", message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A ${list[i].number} \u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32` });
          else if (lastNums[i] !== lastNums[i - 1] + 1) issues.push({ rowNo: list[i].rowNo, level: "INFO", message: `\u0E40\u0E25\u0E02\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E02\u0E49\u0E32\u0E21\u0E08\u0E32\u0E01 ${list[i - 1].number} \u0E44\u0E1B ${list[i].number} (\u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E15\u0E01\u0E2B\u0E25\u0E48\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48)` });
        }
      }
      const seen = /* @__PURE__ */ new Map();
      for (const k of kids) {
        const key = normalizeKey(k.name);
        if (seen.has(key)) issues.push({ rowNo: k.rowNo, level: "WARNING", message: `\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E41\u0E16\u0E27 ${seen.get(key).rowNo}` });
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
  function parsePlanTable(table) {
    let headerRow = -1;
    let cols = { name: 0, unit: 1, qty: 2, amount: 3 };
    for (let r2 = 0; r2 < Math.min(table.length, 20); r2++) {
      const cells = table[r2].map((c) => cleanText(c, 200));
      const name = cells.findIndex((c) => NAME_HDR.test(c));
      const unit = cells.findIndex((c) => UNIT_HDR.test(c));
      const amountIdx = cells.map((c, i) => AMOUNT_HDR.test(c) && i !== name ? i : -1).filter((i) => i >= 0).pop() ?? -1;
      if (name >= 0 && (unit >= 0 || amountIdx >= 0)) {
        headerRow = r2;
        const qty = cells.findIndex((c, i) => QTY_HDR.test(c) && i !== name && i !== amountIdx);
        cols = { name, unit: unit >= 0 ? unit : name + 1, qty: qty >= 0 ? qty : unit >= 0 ? unit + 1 : name + 2, amount: amountIdx >= 0 ? amountIdx : name + 3 };
        while (headerRow + 1 < table.length && !cleanText(table[headerRow + 1][cols.name]) && table[headerRow + 1].some((c) => /ปริมาณ|งบประมาณ|ครั้งที่/.test(cleanText(c)))) headerRow++;
        break;
      }
    }
    const rows = [];
    for (let r2 = headerRow + 1; r2 < table.length; r2++) {
      const line = table[r2];
      const text = cleanText(line[cols.name], 1e3);
      if (!text) continue;
      if (/^(หมายเหตุ|ที่มา)/.test(text)) break;
      rows.push({ rowNo: r2 + 1, text, unit: cleanText(line[cols.unit]), qty: cleanText(line[cols.qty]), amount: line[cols.amount] ?? "" });
    }
    return { ...buildPlan(rows), headerRow };
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
    return rows.filter((r2) => !r2.isDeleted);
  }
  function findById(ctx, table, id, label = "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25") {
    const row = ctx.env.db.list(table).find((r2) => r2.id === id && !r2.isDeleted);
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
    return ctx.env.db.list(table).find((r2) => r2.idempotencyKey === key) ?? null;
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
    maxUploadMB: "15",
    backupRetentionDays: "30",
    publicNotice: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E20\u0E32\u0E22\u0E43\u0E19 \u0E21\u0E34\u0E43\u0E0A\u0E48\u0E22\u0E2D\u0E14\u0E17\u0E32\u0E07\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23 (\u0E22\u0E2D\u0E14\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E23\u0E30\u0E1A\u0E1A New GFMIS Thai)",
    lastImportAt: "",
    lastBackupAt: ""
  };
  function getSettings(ctx) {
    const out = { ...DEFAULT_SETTINGS };
    for (const r2 of ctx.env.db.list("Settings")) out[r2.key] = String(r2.value ?? "");
    return out;
  }
  function setSetting(ctx, key, value) {
    const rows = ctx.env.db.list("Settings");
    const existing = rows.find((r2) => r2.key === key);
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
    if (reqs.some((r2) => r2.status === "pending" && normalizePhone(r2.phone) === phone)) {
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
      reason: ""
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
  var SCHEMA_VERSION = "2026.11.06-1";
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
      ["knownDevices", "string"]
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
      ["reason", "string"]
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
    Workgroups: t("CORE", [["orgId", "string"], ["code", "string"], ["name", "string"]]),
    FundingSources: t("CORE", [["code", "string"], ["name", "string"], ["shortName", "string"]]),
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
      ["targetQty", "number"]
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
      ["attachmentId", "string"]
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
      ["note", "string"]
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
    return ds.projects.filter((p) => (!fy || Number(p.fiscalYear) === fy) && canAccessWorkgroup(u, p.workgroupId)).map((p) => {
      const budget = budgets.get(p.id);
      return { ...p, budget, risks: riskFlags(p, budget, t2) };
    }).sort((x, y) => y.fiscalYear - x.fiscalYear || x.projectCode.localeCompare(y.projectCode, "th"));
  }
  function getProject(ctx, b) {
    const p = findById(ctx, "Projects", String(b.id), "\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23");
    requireWorkgroup(ctx, p.workgroupId);
    const activities = live(ctx.env.db.list("Activities")).filter((a) => a.projectId === p.id);
    const allocations = ctx.env.db.list("Allocations").filter((a) => a.projectId === p.id);
    const disbursements = ctx.env.db.list("Disbursements").filter((d) => d.projectId === p.id);
    const budget = computeBudget(live(allocations), live(disbursements));
    return {
      project: p,
      budget,
      risks: riskFlags(p, budget, today(ctx)),
      activities: activities.map((a) => ({ ...a, budget: computeBudget(live(allocations).filter((x) => x.activityId === a.id), live(disbursements).filter((x) => x.activityId === a.id)) })).sort((x, y) => x.activityCode.localeCompare(y.activityCode, "th")),
      allocations: allocations.sort((x, y) => y.createdAt.localeCompare(x.createdAt)),
      disbursements: disbursements.sort((x, y) => (y.date || "").localeCompare(x.date || "") || y.createdAt.localeCompare(x.createdAt)),
      progress: live(ctx.env.db.list("ProgressReports")).filter((r2) => r2.projectId === p.id).sort((x, y) => y.reportDate.localeCompare(x.reportDate)),
      attachments: live(ctx.env.db.list("Attachments")).filter((f) => f.projectId === p.id).map(({ ocrText: _omit, ...rest }) => rest),
      audit: ctx.env.db.list("AuditLogs").filter((l) => l.projectId === p.id || l.entityId === p.id).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 100),
      monthly: { disbursedCumulative: monthlyCumulative(live(disbursements), p.fiscalYear), targetPct: monthlyTargetPct(p.quarterTargets) }
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
      targetQty: Math.max(0, Number(b.targetQty) || 0)
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
      attachmentId: b.attachmentId ?? ""
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
    const full = `pub:${dataVersion(ctx)}:${key}`;
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
  function lookups(ctx) {
    return cached(ctx, "lookups", () => {
      const fyNow = currentFiscalYear(ctx.env.now());
      const years = /* @__PURE__ */ new Set([fyNow, fyNow - 1]);
      for (const p of live(ctx.env.db.list("Projects"))) years.add(Number(p.fiscalYear));
      return {
        organizations: live(ctx.env.db.list("Organizations")).map(({ id, code, name }) => ({ id, code, name })),
        workgroups: live(ctx.env.db.list("Workgroups")).map(({ id, orgId, code, name }) => ({ id, orgId, code, name })),
        fundingSources: live(ctx.env.db.list("FundingSources")).map(({ id, code, name, shortName }) => ({ id, code, name, shortName })),
        fiscalYears: [...years].sort((a, b) => b - a),
        currentFiscalYear: fyNow
      };
    });
  }
  function toPublic(p, budget, t2) {
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
      risks: riskFlags(p, budget, t2)
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
      return ds.projects.filter((p) => p.published && Number(p.fiscalYear) === fy).map((p) => toPublic(p, budgets.get(p.id), t2)).sort((a, b2) => a.projectCode.localeCompare(b2.projectCode, "th"));
    });
  }
  function publicProject(ctx, b) {
    const ds = loadDataset(ctx);
    const p = ds.projects.find((x) => x.id === String(b.id) && x.published);
    if (!p) throw new AppError("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23 \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48");
    const allocs = ds.allocations.filter((a) => a.projectId === p.id);
    const disbs = ds.disbursements.filter((d) => d.projectId === p.id);
    const out = toPublic(p, computeBudget(allocs, disbs), today(ctx));
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
    out.monthly = { disbursedCumulative: monthlyCumulative(disbs, p.fiscalYear), targetPct: monthlyTargetPct(p.quarterTargets) };
    return out;
  }
  function buildSummary(ctx, fy, onlyPublished) {
    const ds = loadDataset(ctx);
    const projects = ds.projects.filter((p) => Number(p.fiscalYear) === fy && (!onlyPublished || p.published));
    const ids = new Set(projects.map((p) => p.id));
    const budgets = budgetsByProject({ ...ds, projects });
    const t2 = today(ctx);
    const sources = live(ctx.env.db.list("FundingSources"));
    const groups = live(ctx.env.db.list("Workgroups"));
    const group = (keyOf, labelOf) => {
      const m = /* @__PURE__ */ new Map();
      for (const p of projects) (m.get(keyOf(p)) ?? m.set(keyOf(p), []).get(keyOf(p))).push(p);
      return [...m.entries()].map(([key, ps]) => ({ key, label: labelOf(key), projects: ps.length, budget: addSummaries(ps.map((p) => budgets.get(p.id))) })).sort((a, b) => b.budget.currentBudget - a.budget.currentBudget);
    };
    const risks = projects.map((p) => ({ projectId: p.id, name: p.name, flags: riskFlags(p, budgets.get(p.id), t2) })).filter((r2) => r2.flags.length > 0);
    const totals = addSummaries(projects.map((p) => budgets.get(p.id)));
    const targetSatang = new Array(12).fill(0);
    for (const p of projects) {
      const tp = monthlyTargetPct(p.quarterTargets || DEFAULT_QUARTER_TARGETS);
      const cb = budgets.get(p.id).currentBudget;
      tp.forEach((v, i) => targetSatang[i] += cb * v / 100);
    }
    const settings = getSettings(ctx);
    const inScopeDisb = ds.disbursements.filter((d) => ids.has(d.projectId));
    const delayed = risks.filter((r2) => r2.flags.includes("OVERDUE") || r2.flags.includes("BEHIND_SPENDING")).length;
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
      byWorkgroup: group((p) => p.workgroupId, (k) => groups.find((g) => g.id === k)?.name ?? "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38"),
      monthly: {
        disbursedCumulative: monthlyCumulative(inScopeDisb, fy),
        targetPct: targetSatang.map((v) => pct(v, totals.currentBudget))
      },
      risks: risks.slice(0, 50),
      dataQuality: {
        projectsWithoutBudget: projects.filter((p) => budgets.get(p.id).currentBudget === 0).length,
        projectsWithoutReport45d: risks.filter((r2) => r2.flags.includes("NO_RECENT_REPORT")).length,
        lastImportAt: settings.lastImportAt || (live(ctx.env.db.list("ImportJobs")).filter((j) => j.committedAt).map((j) => j.committedAt).sort().pop() ?? "")
      }
    };
  }
  function publicSummary(ctx, b) {
    const fy = fyOf(ctx, b.fiscalYear);
    return cached(ctx, `summary:${fy}`, () => buildSummary(ctx, fy, true));
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
    const projects = listProjects(ctx, { fiscalYear: fy });
    const since = new Date(ctx.env.now().getTime() - 864e5).toISOString();
    const attempts = u.role === "admin" ? [] : ctx.env.db.list("LoginAttempts").filter((a) => a.at >= since);
    const summary = buildSummary(ctx, fy, false);
    const totals = u.workgroupIds === null ? summary.totals : (() => {
      const s = { ...summary.totals };
      const keys = Object.keys(s);
      keys.forEach((k) => s[k] = 0);
      for (const p of projects) for (const k of keys) if (k !== "spendingPct") s[k] += p.budget[k];
      s.spendingPct = s.currentBudget > 0 ? Math.round(s.disbursed / s.currentBudget * 1e4) / 100 : 0;
      return s;
    })();
    return {
      pendingRequests: u.role === "admin" ? 0 : ctx.env.db.list("AccessRequests").filter((r2) => r2.status === "pending").length,
      stagedImports: live(ctx.env.db.list("ImportJobs")).filter((j) => j.status === "STAGED" && (u.role !== "admin" || j.createdBy === u.sub || j.channel === "INBOX")).map(({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt }) => ({ id, fileName, channel, totalRows, errorRows, warningRows, createdAt })),
      risks: projects.filter((p) => p.risks.length).map((p) => ({ projectId: p.id, name: p.name, flags: p.risks })).slice(0, 30),
      newDeviceLogins: attempts.filter((a) => a.newDevice && a.result === "success").length,
      failedLogins24h: attempts.filter((a) => a.result !== "success").length,
      recentAudit: ctx.env.db.list("AuditLogs").filter((l) => u.workgroupIds === null || l.actorId === u.sub).sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 10),
      totals
    };
  }
  function listRequests(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    const st = cleanText(b.status, 20);
    return ctx.env.db.list("AccessRequests").filter((r2) => !st || st === "all" || r2.status === st).sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
  }
  function decideRequest(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const req = ctx.env.db.list("AccessRequests").find((r2) => r2.id === b.requestId);
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
      const next = { ...cur, ...fields, tokenVersion: Number(cur.tokenVersion) + 1, version: cur.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub };
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
      settings: { autoCommitClean: s.autoCommitClean, defaultQuarterTargets: s.defaultQuarterTargets, maxUploadMB: s.maxUploadMB, backupRetentionDays: s.backupRetentionDays, publicNotice: s.publicNotice }
    };
  }
  var EDITABLE_SETTINGS = /* @__PURE__ */ new Set(["autoCommitClean", "defaultQuarterTargets", "maxUploadMB", "backupRetentionDays", "publicNotice"]);
  function saveSettings(ctx, b) {
    requireRole(ctx, "superadmin");
    for (const [k, v] of Object.entries(b.settings ?? {})) {
      if (!EDITABLE_SETTINGS.has(k)) throw new AppError("VALIDATION_FAILED", `\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ${k} \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49`);
      const val = cleanText(v, 500);
      if (k === "autoCommitClean" && !["true", "false"].includes(val)) throw new AppError("VALIDATION_FAILED", "autoCommitClean \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 true/false");
      if ((k === "maxUploadMB" || k === "backupRetentionDays") && !(Number(val) > 0 && Number(val) <= 365)) throw new AppError("VALIDATION_FAILED", `${k} \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`);
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
    if (rows.some((r2) => r2.code.toLowerCase() === code.toLowerCase() && r2.id !== b.item.id)) throw new AppError("VALIDATION_FAILED", "\u0E23\u0E2B\u0E31\u0E2A\u0E0B\u0E49\u0E33");
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
    const rows = ctx.env.db.list("ImportRows").filter((r2) => r2.jobId === job.id && r2.rowKey.startsWith("raw:"));
    const max = rows.reduce((m, r2) => Math.max(m, Number(r2.rowNo)), meta.headerRow + meta.headerSpan);
    const matrix = Array.from({ length: max }, () => []);
    matrix[meta.headerRow] = meta.headers;
    for (const r2 of rows) {
      try {
        matrix[Number(r2.rowNo) - 1] = JSON.parse(r2.raw);
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
    ctx.env.db.insert("ImportRows", table.rows.slice(firstData).map((r2, i) => ({
      id: ctx.env.uuid(),
      jobId: job.id,
      rowNo: firstData + i + 1,
      rowKey: "raw:",
      status: "",
      messages: "",
      raw: JSON.stringify(r2.slice(0, 60).map((c) => c instanceof Date ? c.toISOString().slice(0, 10) : c)).slice(0, 8e3),
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
          const r2 = commitImport(ctx, { jobId: pv.job.id, acceptWarnings: false });
          out.push({ file: f.name, result: `\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 ${r2.committed} \u0E41\u0E16\u0E27` });
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
  var toTable = (rows) => rows.map((r2) => r2.map((c) => c === null || c === void 0 ? "" : String(c)));
  function previewPlan(ctx, b) {
    requireRole(ctx, "minisuper", "superadmin");
    if (b.sheetUrl) {
      const url = cleanText(b.sheetUrl, 500);
      if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{20,}/.test(url)) throw new AppError("VALIDATION_FAILED", "\u0E25\u0E34\u0E07\u0E01\u0E4C Google Sheets \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      const tables = ctx.env.files.readSheetUrl(url);
      const best2 = bestTable(tables.map((t2) => t2.rows));
      return { table: toTable(best2.rows), parsed: best2.parsed, sourceFileId: "", sourceFileName: "Google Sheets", fromOcr: false };
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
        throw new AppError("IMPORT_REVIEW_REQUIRED", "\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E32\u0E01\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E44\u0E1F\u0E25\u0E4C Excel/CSV \u0E15\u0E32\u0E21\u0E41\u0E21\u0E48\u0E41\u0E1A\u0E1A (\u0E44\u0E1F\u0E25\u0E4C\u0E15\u0E49\u0E19\u0E09\u0E1A\u0E31\u0E1A\u0E16\u0E39\u0E01\u0E40\u0E01\u0E47\u0E1A\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27)");
      }
      const parsed = parsePlanText(text);
      return { table: planToTable(parsed), parsed, sourceFileId: stored.id, sourceFileName: name, fromOcr: true };
    }
    const best = bestTable(ctx.env.files.readTables(stored.id, mime).map((t2) => t2.rows));
    return { table: toTable(best.rows), parsed: best.parsed, sourceFileId: stored.id, sourceFileName: name, fromOcr: false };
  }
  function bestTable(tables) {
    let best = null;
    for (const rows of tables) {
      if (!rows.length) continue;
      const parsed = parsePlanTable(rows);
      if (!best || parsed.leafCount > best.parsed.leafCount) best = { rows, parsed };
    }
    if (!best || !best.parsed.nodes.length) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E1C\u0E19\u0E07\u0E32\u0E19/\u0E42\u0E04\u0E23\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C \u2014 \u0E15\u0E23\u0E27\u0E08\u0E27\u0E48\u0E32\u0E21\u0E35\u0E04\u0E2D\u0E25\u0E31\u0E21\u0E19\u0E4C \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23, \u0E2B\u0E19\u0E48\u0E27\u0E22\u0E19\u0E31\u0E1A, \u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E07\u0E32\u0E19, \u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13");
    return best;
  }
  function commitPlan(ctx, b) {
    const u = requireRole(ctx, "minisuper", "superadmin");
    const fy = Number(b.fiscalYear);
    if (!Number.isInteger(fy) || fy < 2560 || fy > 2650) throw new AppError("VALIDATION_FAILED", "\u0E1B\u0E35\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    if (!live(ctx.env.db.list("FundingSources")).some((f) => f.id === b.fundingSourceId)) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E07\u0E1A");
    if (!Array.isArray(b.table) || b.table.length > 5e3) throw new AppError("VALIDATION_FAILED", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    const parsed = parsePlanTable(b.table.map((r2) => Array.isArray(r2) ? r2.slice(0, 20).map((c) => cleanText(c, 1e3)) : []));
    const errors = parsed.issues.filter((i) => i.level === "ERROR");
    if (errors.length) throw new AppError("VALIDATION_FAILED", `\u0E41\u0E1C\u0E19\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14 ${errors.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u0E41\u0E01\u0E49\u0E44\u0E02\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01`, errors.slice(0, 20));
    if (!parsed.leafCount) throw new AppError("VALIDATION_FAILED", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E22\u0E48\u0E2D\u0E22\u0E43\u0E19\u0E41\u0E1C\u0E19");
    const warnings = parsed.issues.filter((i) => i.level === "WARNING").length;
    if (warnings && !b.acceptWarnings) throw new AppError("IMPORT_REVIEW_REQUIRED", `\u0E21\u0E35 ${warnings} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E27\u0E08 \u2014 \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E27\u0E48\u0E32\u0E15\u0E23\u0E27\u0E08\u0E41\u0E25\u0E49\u0E27\u0E01\u0E48\u0E2D\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01`);
    const round = Math.max(1, Math.min(20, Number(b.round) || 1));
    const prev = live(ctx.env.db.list("PlanDocs")).find((d) => d.status === "ACTIVE" && Number(d.fiscalYear) === fy && d.fundingSourceId === b.fundingSourceId && Number(d.round) === round);
    if (prev) {
      const taken = live(ctx.env.db.list("PlanItems")).filter((i) => i.planDocId === prev.id && i.workgroupId);
      if (taken.length) throw new AppError("VALIDATION_FAILED", `\u0E41\u0E1C\u0E19\u0E1B\u0E35 ${fy} \u0E07\u0E27\u0E14\u0E17\u0E35\u0E48 ${round} \u0E21\u0E35\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E25\u0E49\u0E27 ${taken.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 \u2014 \u0E43\u0E2B\u0E49\u0E19\u0E33\u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E07\u0E27\u0E14\u0E43\u0E2B\u0E21\u0E48 \u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E48\u0E2D\u0E19`);
      ctx.env.db.update("PlanDocs", prev.id, { ...prev, status: "REPLACED", version: prev.version + 1, updatedAt: nowIso(ctx), updatedBy: u.sub });
    }
    const fs = live(ctx.env.db.list("FundingSources")).find((f) => f.id === b.fundingSourceId);
    const doc = {
      ...newMeta(ctx),
      fiscalYear: fy,
      fundingSourceId: b.fundingSourceId,
      round,
      title: cleanText(b.title, 200) || `\u0E41\u0E1C\u0E19\u0E07\u0E1A\u0E1B\u0E23\u0E30\u0E21\u0E32\u0E13 ${fs.name} \u0E1B\u0E35 ${fy} \u0E07\u0E27\u0E14\u0E17\u0E35\u0E48 ${round}`,
      docNo: cleanText(b.docNo, 80),
      docDate: cleanText(b.docDate, 20),
      budgetType: cleanText(b.budgetType, 60) || "\u0E07\u0E1A\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E07\u0E32\u0E19",
      totalSatang: parsed.computedTotal,
      leafCount: parsed.leafCount,
      sourceFileId: cleanText(b.sourceFileId, 100),
      sourceFileName: cleanText(b.sourceFileName, 200),
      status: "ACTIVE",
      note: ""
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
    audit(ctx, "plan.import", "PlanDoc", doc.id, { after: { title: doc.title, fiscalYear: fy, total: doc.totalSatang, leaves: doc.leafCount, replaced: prev?.id ?? "" } });
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
    return { doc, items };
  }
  function projectCodeFor(doc, projectNode, wg) {
    return `P${projectNode.planIndex}-${projectNode.number || projectNode.seq}-${wg.code}`;
  }
  function assignPlanItems(ctx, b) {
    const u = requireRole(ctx, "admin", "minisuper", "superadmin");
    const wg = live(ctx.env.db.list("Workgroups")).find((g) => g.id === b.workgroupId);
    if (!wg) throw new AppError("VALIDATION_FAILED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19");
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
      if (item.workgroupId) {
        skipped.push({ id, reason: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27" });
        continue;
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

  // src/core/router.ts
  var r = (fn, write, limit) => ({ fn, write, limit });
  var ROUTES = {
    "public.lookups": r((c) => lookups(c), false, "public"),
    "public.summary": r(publicSummary, false, "public"),
    "public.projects": r(publicProjects, false, "public"),
    "public.project": r(publicProject, false, "public"),
    "auth.requestAccess": r(requestAccess, true, "auth"),
    "auth.login": r(loginAdmin, true, "auth"),
    "auth.loginSuper": r(loginSuper, true, "auth"),
    "auth.me": r((c) => c.user, false, "admin"),
    "auth.logout": r((c) => {
      logoutAll(c);
      return { ok: true };
    }, true, "admin"),
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
    "plans.commit": r(commitPlan, true, "import"),
    "plans.list": r(listPlans, false, "admin"),
    "plans.get": r(getPlan, false, "admin"),
    "plans.assign": r(assignPlanItems, true, "admin"),
    "plans.unassign": r(unassignPlanItems, true, "admin"),
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
      const run = () => route.fn(ctx, body);
      const data = route.write ? env.lock.withLock(() => {
        const out = run();
        env.db.flush?.();
        return out;
      }) : run();
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
    ] },
    { code: "KPP-DISTRICT", name: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E33\u0E40\u0E20\u0E2D (\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E40\u0E1E\u0E0A\u0E23)", groups: [
      { code: "DIST", name: "\u0E2A\u0E33\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E01\u0E29\u0E15\u0E23\u0E2D\u0E33\u0E40\u0E20\u0E2D" }
    ] }
  ];
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
  function toCell(type, v) {
    if (type === "number") return v === "" || v === null || v === void 0 || Number.isNaN(Number(v)) ? 0 : Number(v);
    if (type === "boolean") return v === true || v === "TRUE" || v === "true";
    if (v === null || v === void 0) return "";
    return escapeCell(String(v));
  }
  function fromCell(type, v) {
    if (type === "number") return v === "" ? 0 : Number(v);
    if (type === "boolean") return v === true || v === "TRUE" || v === "true";
    if (v instanceof Date) return Utilities.formatDate(v, "Asia/Bangkok", "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
    return unescapeCell(v === null || v === void 0 ? "" : String(v));
  }
  var SheetsDb = class {
    constructor() {
      __publicField(this, "books", /* @__PURE__ */ new Map());
      __publicField(this, "memo", /* @__PURE__ */ new Map());
    }
    book(file) {
      if (!this.books.has(file)) this.books.set(file, SpreadsheetApp.openById(fileIds()[file]));
      return this.books.get(file);
    }
    load(table) {
      const cached2 = this.memo.get(table);
      if (cached2) return cached2;
      const def = TABLES[table];
      const sheet = this.book(def.file).getSheetByName(table);
      if (!sheet) throw new AppError("INTERNAL_ERROR", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E0A\u0E35\u0E15 ${table} \u2014 \u0E23\u0E31\u0E19 setup \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07`);
      const values = sheet.getDataRange().getValues();
      const header = (values[0] ?? []).map(String);
      const idx = new Map(header.map((h, i) => [h, i]));
      const pk = primaryKeyOf(table);
      const rows = [];
      const rowNum = /* @__PURE__ */ new Map();
      for (let r2 = 1; r2 < values.length; r2++) {
        const line = values[r2];
        if (line.every((c) => c === "" || c === null)) continue;
        const obj = {};
        for (const [col, type] of def.columns) obj[col] = fromCell(type, idx.has(col) ? line[idx.get(col)] : "");
        rows.push(obj);
        rowNum.set(String(obj[pk]), r2 + 1);
      }
      const m = { sheet, header, rows, rowNum, pending: [] };
      this.memo.set(table, m);
      return m;
    }
    toLine(table, m, row) {
      const types = new Map(TABLES[table].columns.map(([c, t2]) => [c, t2]));
      return m.header.map((h) => types.has(h) ? toCell(types.get(h), row[h]) : "");
    }
    list(table) {
      return this.load(table).rows.map((r2) => ({ ...r2 }));
    }
    insert(table, rows) {
      if (!rows.length) return;
      const m = this.load(table);
      for (const r2 of rows) {
        const norm = {};
        for (const [col, type] of TABLES[table].columns) norm[col] = fromCell(type, toCell(type, r2[col]));
        m.rows.push(norm);
        m.pending.push(norm);
      }
    }
    update(table, id, patch) {
      const m = this.load(table);
      const pk = primaryKeyOf(table);
      const i = m.rows.findIndex((r2) => r2[pk] === id);
      if (i < 0) throw new AppError("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 ${table}`);
      const next = { ...m.rows[i], ...patch };
      m.rows[i] = next;
      const p = m.pending.findIndex((r2) => r2[pk] === id);
      if (p >= 0) {
        m.pending[p] = next;
        return;
      }
      const n = m.rowNum.get(id);
      if (!n) throw new AppError("INTERNAL_ERROR", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E41\u0E16\u0E27 ${table}`);
      m.sheet.getRange(n, 1, 1, m.header.length).setValues([this.toLine(table, m, next)]);
    }
    flush() {
      for (const [table, m] of this.memo) {
        if (!m.pending.length) continue;
        const start = m.sheet.getLastRow() + 1;
        const lines = m.pending.map((r2) => this.toLine(table, m, r2));
        m.sheet.getRange(start, 1, lines.length, m.header.length).setValues(lines);
        const pk = primaryKeyOf(table);
        m.pending.forEach((r2, i) => m.rowNum.set(String(r2[pk]), start + i));
        m.pending = [];
      }
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
    return json(handle(createGasEnv(), body));
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
  return __toCommonJS(main_exports);
})();
function doGet() { return KPP.doGet.apply(null, arguments); }
function doPost() { return KPP.doPost.apply(null, arguments); }
function setup() { return KPP.setup.apply(null, arguments); }
function setSuperAdmin() { return KPP.setSuperAdmin.apply(null, arguments); }
function installTriggers() { return KPP.installTriggers.apply(null, arguments); }
function autoImportInbox() { return KPP.autoImportInbox.apply(null, arguments); }
function dailyMaintenance() { return KPP.dailyMaintenance.apply(null, arguments); }
