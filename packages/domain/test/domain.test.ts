import { describe, expect, it } from 'vitest';
import {
  bahtToSatang, parseMoney, parseThaiBahtText, thaiWordsToInt, formatBaht,
  parseThaiDate, fiscalYearOf, fiscalYearRange, fiscalMonthIndex, excelSerialToIso,
  normalizePhone, isValidPhone, maskPhone,
  escapeCell, unescapeCell, toCsv, parseDelimited,
  computeBudget, reconciles, monthlyCumulative, monthlyTargetPct, riskFlags, addSummaries,
} from '../src/index';
import type { Allocation, Disbursement } from '../src/index';

describe('money', () => {
  it('rounds half-up to satang without float drift', () => {
    expect(bahtToSatang(1.005)).toBe(101);
    expect(bahtToSatang(0.1 + 0.2)).toBe(30);
    expect(bahtToSatang(-2.345)).toBe(-235);
    expect(bahtToSatang(1234567.89)).toBe(123456789);
  });
  it('parses Thai money text', () => {
    expect(parseMoney('1,234.50').satang).toBe(123450);
    expect(parseMoney('(1,000)').satang).toBe(-100000);
    expect(parseMoney('฿ ๑,๐๐๐ บาท').satang).toBe(100000);
    expect(parseMoney('-500').satang).toBe(-50000);
    expect(parseMoney(2500.5).satang).toBe(250050);
    expect(parseMoney('').empty).toBe(true);
    expect(parseMoney('-').empty).toBe(true);
    expect(parseMoney('12,34').ok).toBe(false);
    expect(parseMoney('abc').ok).toBe(false);
    expect(parseMoney('=1+1').ok).toBe(false);
  });
  it('reads Thai baht words', () => {
    expect(thaiWordsToInt('หนึ่งหมื่นสองพันห้าร้อยยี่สิบเอ็ด')).toBe(12521);
    expect(thaiWordsToInt('สิบเอ็ด')).toBe(11);
    expect(thaiWordsToInt('หนึ่งล้านสองแสน')).toBe(1200000);
    expect(thaiWordsToInt('สองล้านล้าน')).toBe(2_000_000_000_000);
    expect(parseThaiBahtText('หนึ่งหมื่นบาทถ้วน')).toBe(1000000);
    expect(parseThaiBahtText('สามร้อยบาทห้าสิบสตางค์')).toBe(30050);
    expect(parseThaiBahtText('ไม่ใช่ตัวเลขบาท')).toBeNull();
  });
  it('formats in th-TH', () => {
    expect(formatBaht(123456789)).toBe('1,234,567.89');
  });
});

describe('dates', () => {
  it('parses Thai and ISO formats to ISO (CE)', () => {
    expect(parseThaiDate('2026-01-15')).toBe('2026-01-15');
    expect(parseThaiDate('15/01/2569')).toBe('2026-01-15');
    expect(parseThaiDate('15-1-69')).toBe('2026-01-15');
    expect(parseThaiDate('15 ม.ค. 2569')).toBe('2026-01-15');
    expect(parseThaiDate('๑๕ มกราคม ๒๕๖๙')).toBe('2026-01-15');
    expect(parseThaiDate('วันที่ 3 ต.ค. 69')).toBe('2026-10-03');
    expect(parseThaiDate(46037)).toBe('2026-01-15');
    expect(parseThaiDate('31/02/2569')).toBeNull();
    expect(parseThaiDate('ไม่ใช่วันที่')).toBeNull();
  });
  it('computes Thai fiscal year (Oct–Sep)', () => {
    expect(fiscalYearOf('2025-10-01')).toBe(2569);
    expect(fiscalYearOf('2025-09-30')).toBe(2568);
    expect(fiscalYearOf('2026-11-05')).toBe(2570);
    expect(fiscalYearRange(2570)).toEqual({ start: '2026-10-01', end: '2027-09-30' });
    expect(fiscalMonthIndex('2026-10-15')).toBe(1);
    expect(fiscalMonthIndex('2027-09-01')).toBe(12);
  });
  it('rejects absurd Excel serials', () => {
    expect(excelSerialToIso(-5)).toBeNull();
  });
});

describe('phone', () => {
  it('normalizes and masks', () => {
    expect(normalizePhone('+66 81-234-5678')).toBe('0812345678');
    expect(normalizePhone('812345678')).toBe('0812345678');
    expect(normalizePhone('๐๘๑๒๓๔๕๖๗๘')).toBe('0812345678');
    expect(isValidPhone('0812345678')).toBe(true);
    expect(isValidPhone('0112345678')).toBe(false);
    expect(maskPhone('0812345678')).toBe('081-xxx-5678');
  });
});

describe('sanitize', () => {
  it('escapes formula injection and round-trips', () => {
    for (const v of ['=HYPERLINK("x")', '+1', '-2+3', '@SUM(A1)', '\tx']) {
      expect(String(escapeCell(v)).startsWith("'")).toBe(true);
      expect(unescapeCell(escapeCell(v))).toBe(v);
    }
    expect(escapeCell('ปกติ')).toBe('ปกติ');
    expect(escapeCell(-5)).toBe(-5);
  });
  it('builds CSV with BOM and escaping', () => {
    const csv = toCsv([['a', 'b,c'], ['=1', 'x"y']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"b,c"');
    expect(csv).toContain("'=1");
    expect(csv).toContain('"x""y"');
  });
  it('parses CSV/TSV with quotes and detects delimiter', () => {
    expect(parseDelimited('a,b\n"x, y",2\n')).toEqual([['a', 'b'], ['x, y', '2']]);
    expect(parseDelimited('a\tb\r\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseDelimited('"multi\nline",z')).toEqual([['multi\nline', 'z']]);
  });
});

const meta = { id: 'x', createdAt: '', createdBy: '', updatedAt: '', updatedBy: '', version: 1, isDeleted: false };
const alloc = (type: Allocation['type'], amountSatang: number, isDeleted = false) => ({ ...meta, type, amountSatang, isDeleted });
const disb = (status: Disbursement['status'], amountSatang: number, date = '2026-11-10', isDeleted = false) =>
  ({ ...meta, status, amountSatang, date, isDeleted });

describe('budget rules', () => {
  it('follows the master formula', () => {
    const s = computeBudget(
      [alloc('ORIGINAL', 1_000_000_00), alloc('TRANSFER_IN', 200_000_00), alloc('TRANSFER_OUT', 50_000_00), alloc('ORIGINAL', 999, true)],
      [disb('COMMITTED', 100_000_00), disb('APPROVED', 300_000_00), disb('PAID', 150_000_00), disb('VOID', 999_999_00), disb('PAID', 1, '2026-11-10', true)],
    );
    expect(s.originalBudget).toBe(1_000_000_00);
    expect(s.currentBudget).toBe(1_150_000_00);
    expect(s.committed).toBe(100_000_00);
    expect(s.disbursed).toBe(450_000_00);
    expect(s.paid).toBe(150_000_00);
    expect(s.remaining).toBe(700_000_00);
    expect(s.spendingPct).toBe(39.13);
    expect(reconciles(s)).toBe(true);
  });
  it('spendingPct is 0 when no budget', () => {
    expect(computeBudget([], [disb('PAID', 100)]).spendingPct).toBe(0);
  });
  it('adds summaries deterministically', () => {
    const a = computeBudget([alloc('ORIGINAL', 100)], [disb('PAID', 30)]);
    const b = computeBudget([alloc('ORIGINAL', 300)], [disb('APPROVED', 100)]);
    const t = addSummaries([a, b]);
    expect(t.currentBudget).toBe(400);
    expect(t.spendingPct).toBe(32.5);
    expect(reconciles(t)).toBe(true);
  });
  it('builds monthly cumulative series within the fiscal year', () => {
    const m = monthlyCumulative([disb('PAID', 10, '2026-10-05'), disb('APPROVED', 20, '2027-01-02'), disb('PAID', 99, '2026-09-30')], 2570);
    expect(m[0]).toBe(10);
    expect(m[3]).toBe(30);
    expect(m[11]).toBe(30);
  });
  it('interpolates quarterly targets', () => {
    const t = monthlyTargetPct('30,55,80,100');
    expect(t).toHaveLength(12);
    expect(t[2]).toBe(30);
    expect(t[11]).toBe(100);
    expect(t[0]).toBe(10);
  });
  it('raises risk flags', () => {
    const s = computeBudget([alloc('ORIGINAL', 100)], [disb('APPROVED', 150)]);
    const flags = riskFlags(
      { status: 'IN_PROGRESS', endDate: '2027-01-01', quarterTargets: '30,55,80,100', fiscalYear: 2570, lastProgressAt: '', startDate: '2026-10-01' },
      s, '2027-03-01',
    );
    expect(flags).toEqual(expect.arrayContaining(['OVER_BUDGET', 'OVERDUE', 'NO_RECENT_REPORT']));
    const low = computeBudget([alloc('ORIGINAL', 1000)], [disb('APPROVED', 10)]);
    expect(riskFlags({ status: 'IN_PROGRESS', endDate: '', quarterTargets: '', fiscalYear: 2570, lastProgressAt: '2027-02-20', startDate: '2026-10-01' }, low, '2027-03-01'))
      .toEqual(['BEHIND_SPENDING']);
  });
});
