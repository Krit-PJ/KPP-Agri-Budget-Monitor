import { describe, expect, it } from 'vitest';
import {
  bahtText, thaiNumberWords, thaiDigits, formatMoneyPlain, formatThaiDateLong, wrapSegments, protectGroups,
  memoParagraphs, memoBody, memoRemaining, validateMemo, memoOverrideStale, memoDocNo, withTitle, parseThaiBahtText,
} from '../src/index';
import type { MemoData } from '../src/index';

const base: MemoData = {
  orgLine: 'กลุ่มอารักขาพืช สำนักงานเกษตรจังหวัดกำแพงเพชร', fax: '0-5571-6858', docPrefix: 'กพ 0009.4', docNumber: '123',
  date: '2026-08-10', to: 'เกษตรจังหวัดกำแพงเพชร', subject: 'ตรวจสอบเอกสารเพื่อขอเบิกเงินราชการ',
  refNo: 'กพ 0109/2269', refDate: '2026-08-05', refFrom: 'เมืองกำแพงเพชร', expense: 'ค่าจัดซื้อวัสดุสนับสนุน',
  projectName: 'ส่งเสริมการจัดการสุขภาพพืชเพื่อเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร',
  mainActivityName: 'สนับสนุนการขับเคลื่อนศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.) สู่ Service Provider ดินปุ๋ยชุมชน',
  fund: 'งบกรมส่งเสริมการเกษตร', budgetCode: '07011152034002000000', mainActivityCode: '07011690009900000',
  subActivityName: 'สนับสนุนการจัดทำแปลงเรียนรู้ด้านการจัดการดินและการใช้ปุ๋ยเฉพาะด้าน',
  budgetSatang: 4_400_000, previousSatang: 3_600_000, requestSatang: 400_000,
  checks: { ok: true, returnFix: false, returnReason: '', forward: true },
  signer: { name: 'นายกิตติ โพธิ์จวง', position: 'นักวิชาการส่งเสริมการเกษตรชำนาญการ' },
  head: { name: 'นายธนจิรพัชร พัฒนศักดิ์ภิญโญ', position: 'นักวิชาการส่งเสริมการเกษตรชำนาญการ', line2: 'รักษาการหัวหน้ากลุ่มอารักขาพืช' },
  align: 'left', thaiNumerals: false,
};

describe('bahtText', () => {
  it('reads official amounts', () => {
    expect(bahtText(4_400_000)).toBe('สี่หมื่นสี่พันบาทถ้วน');
    expect(bahtText(3_600_000)).toBe('สามหมื่นหกพันบาทถ้วน');
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน');
    expect(bahtText(2_100)).toBe('ยี่สิบเอ็ดบาทถ้วน');
    expect(bahtText(10_100)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน');
    expect(bahtText(1_100)).toBe('สิบเอ็ดบาทถ้วน');
    expect(bahtText(100)).toBe('หนึ่งบาทถ้วน');
    expect(bahtText(50)).toBe('ห้าสิบสตางค์');
    expect(bahtText(125_050)).toBe('หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์');
    expect(bahtText(1_100_000_000)).toBe('สิบเอ็ดล้านบาทถ้วน');
    expect(thaiNumberWords(21_000_000)).toBe('ยี่สิบเอ็ดล้าน');
  });
  it('round-trips with the parser', () => {
    for (const s of [100, 101, 1_111, 12_345_678, 100_000_000, 987_654_321_01, 2_000_002_00]) {
      expect(parseThaiBahtText(bahtText(s))).toBe(s);
    }
  });
});

describe('formatting', () => {
  it('formats money, digits and dates', () => {
    expect(formatMoneyPlain(4_400_000)).toBe('44,000');
    expect(formatMoneyPlain(125_050)).toBe('1,250.50');
    expect(thaiDigits('44,000 บาท 2569')).toBe('๔๔,๐๐๐ บาท ๒๕๖๙');
    expect(formatThaiDateLong('2026-08-05')).toBe('5 สิงหาคม 2569');
    expect(formatThaiDateLong('2026-02-30')).toBe('');
    expect(memoDocNo(base)).toBe('กพ 0009.4/123');
    expect(withTitle('นาย', 'กิตติ โพธิ์จวง')).toBe('นายกิตติ โพธิ์จวง');
    expect(withTitle('นาย', 'นายกิตติ')).toBe('นายกิตติ');
  });
});

describe('wrapSegments', () => {
  it('keeps amounts, parentheses and codes together', () => {
    const toks = wrapSegments('ยอดเงิน 44,000 บาท (สี่หมื่นสี่พันบาทถ้วน) รหัส 07011690009900000');
    const kept = toks.filter((t) => t.keep).map((t) => t.t);
    expect(kept).toEqual(['44,000 บาท', '(สี่หมื่นสี่พันบาทถ้วน)', '07011690009900000']);
    expect(toks.map((t) => t.t).join('')).toBe('ยอดเงิน 44,000 บาท (สี่หมื่นสี่พันบาทถ้วน) รหัส 07011690009900000');
  });
  it('protects spaces for Docs', () => {
    expect(protectGroups('(นายกิตติ โพธิ์จวง) 44,000 บาท')).toBe('(นายกิตติ โพธิ์จวง) 44,000 บาท');
  });
});

describe('memo body', () => {
  it('generates the official text', () => {
    const p = memoParagraphs(base);
    expect(p[0]).toBe('ตามหนังสือที่ กพ 0109/2269 ลงวันที่ 5 สิงหาคม 2569 ของอำเภอเมืองกำแพงเพชร ได้ส่งเอกสารหลักฐานเพื่อขอเบิกเงินค่าจัดซื้อวัสดุสนับสนุน โครงการส่งเสริมการจัดการสุขภาพพืชเพื่อเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร กิจกรรมสนับสนุนการขับเคลื่อนศูนย์จัดการดินปุ๋ยชุมชน (ศดปช.) สู่ Service Provider ดินปุ๋ยชุมชน (งบกรมส่งเสริมการเกษตร) (07011152034002000000)');
    expect(p).toContain('งบประมาณคงเหลือ 4,000 บาท (สี่พันบาทถ้วน) (คงเหลือทั้งหมดของกิจกรรมนี้)');
    expect(p.join('')).not.toContain('กิจจกรรม');
    expect(memoRemaining(base)).toBe(400_000);
  });
  it('uses override and detects stale amounts', () => {
    const o = { ...base, bodyOverride: ['ข้อความแก้เอง 44,000 36,000 4,000'] };
    expect(memoBody(o)).toEqual(['ข้อความแก้เอง 44,000 36,000 4,000']);
    expect(memoOverrideStale(o)).toBe(false);
    expect(memoOverrideStale({ ...o, requestSatang: 300_000 })).toBe(true);
  });
  it('validates', () => {
    expect(validateMemo(base)).toEqual([]);
    expect(validateMemo({ ...base, requestSatang: 900_000 })).toContain('ยอดขอเบิกเกินงบประมาณคงเหลือของกิจกรรม');
    expect(validateMemo({ ...base, checks: { ok: true, returnFix: true, returnReason: '', forward: false } }).length).toBe(2);
  });
});
