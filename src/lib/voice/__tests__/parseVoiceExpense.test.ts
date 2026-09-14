import { describe, it, expect } from 'vitest';
import { parseVoiceExpense } from '../parseVoiceExpense';

// Thứ Hai, 14/09/2026
const TODAY = '2026-09-14';
const parse = (text: string) => parseVoiceExpense(text, { today: TODAY });

describe('Các câu mẫu trong đặc tả', () => {
  it('"Ăn sáng 35 nghìn"', () => {
    const r = parse('Ăn sáng 35 nghìn');
    expect(r.amount).toEqual({ value: 35_000, confidence: 'high' });
    expect(r.date).toEqual({ value: TODAY, confidence: 'high' });
    expect(r.dateIsDefault).toBe(true);
    expect(r.note.value).toBe('Ăn sáng');
    expect(r.categoryId?.value).toBe('cat-exp-food');
  });

  it('"Grab 80 nghìn hôm nay"', () => {
    const r = parse('Grab 80 nghìn hôm nay');
    expect(r.amount.value).toBe(80_000);
    expect(r.date).toEqual({ value: TODAY, confidence: 'high' });
    expect(r.dateIsDefault).toBe(false);
    expect(r.note.value).toBe('Grab');
    expect(r.categoryId?.value).toBe('cat-exp-transport');
  });

  it('"Ngày 12 tôi ăn trưa 50 nghìn"', () => {
    const r = parse('Ngày 12 tôi ăn trưa 50 nghìn');
    expect(r.amount).toEqual({ value: 50_000, confidence: 'high' });
    expect(r.date).toEqual({ value: '2026-09-12', confidence: 'high' });
    expect(r.note.value).toBe('Ăn trưa');
    expect(r.categoryId?.value).toBe('cat-exp-food');
  });

  it('"Mua cà phê 45k"', () => {
    const r = parse('Mua cà phê 45k');
    expect(r.amount.value).toBe(45_000);
    expect(r.note.value).toBe('Mua cà phê');
    expect(r.categoryId?.value).toBe('cat-exp-food');
  });

  it('"Mua đồ 50": không đoán đơn vị, đưa ra lựa chọn', () => {
    const r = parse('Mua đồ 50');
    expect(r.amount).toEqual({ value: null, confidence: 'none' });
    expect(r.amountSuggestions).toEqual([50_000, 50_000_000]);
    expect(r.amountHint).toContain('50');
    expect(r.note.value).toBe('Mua đồ');
    expect(r.categoryId?.value).toBe('cat-exp-shopping');
    expect(r.understood).toBe(true);
  });
});

describe('Số tiền', () => {
  it.each([
    ['35 nghìn', 35_000],
    ['35 ngàn', 35_000],
    ['35k', 35_000],
    ['35 K', 35_000],
    ['35.000', 35_000],
    ['35,000', 35_000],
    ['35000', 35_000],
    ['35.000 đồng', 35_000],
    ['350k', 350_000],
    ['35 triệu', 35_000_000],
    ['35tr', 35_000_000],
    ['3.5 triệu', 3_500_000],
    ['3,5 triệu', 3_500_000],
    ['3 triệu rưỡi', 3_500_000],
    ['1 triệu 2', 1_200_000],
    ['1 triệu 250', 1_250_000],
    ['2 triệu 500 nghìn', 2_500_000],
    ['1 triệu 2 trăm', 1_200_000],
    ['2 trăm nghìn', 200_000],
    ['2,5k', 2_500],
    ['35 nghìn rưỡi', 35_500],
    ['1.250.000 đồng', 1_250_000],
    ['ba mươi lăm nghìn', 35_000],
    ['1 tỷ', 1_000_000_000],
  ])('"Chi %s" -> %d', (spoken, expected) => {
    const r = parse(`Chi ${spoken}`);
    expect(r.amount.value).toBe(expected);
    expect(r.amount.confidence).toBe('high');
  });

  it('không nhầm "35 triệu" với 35 nghìn và ngược lại', () => {
    expect(parse('Mua xe 35 triệu').amount.value).toBe(35_000_000);
    expect(parse('Mua xe 35 nghìn').amount.value).toBe(35_000);
  });

  it('số lượng không phải số tiền khi đã có số tiền rõ ràng', () => {
    const r = parse('Mua 2 ly trà sữa 90 nghìn');
    expect(r.amount).toEqual({ value: 90_000, confidence: 'high' });
    expect(r.amountSuggestions).toBeUndefined();
    expect(r.note.value).toBe('Mua 2 ly trà sữa');
  });

  it('giờ trong câu không phải số tiền', () => {
    const r = parse('7 giờ sáng ăn phở 45 nghìn');
    expect(r.amount.value).toBe(45_000);
  });

  it('hai khoản trong một câu: cộng lại nhưng bắt xác nhận', () => {
    const r = parse('Ăn sáng 35 nghìn cà phê 20 nghìn');
    expect(r.amount).toEqual({ value: 55_000, confidence: 'low' });
    expect(r.amountHint).toContain('35.000 + 20.000');
  });

  it('không có số tiền -> trống', () => {
    const r = parse('Ăn sáng');
    expect(r.amount.confidence).toBe('none');
    expect(r.amountSuggestions).toBeUndefined();
    expect(r.understood).toBe(true);
  });

  it('câu không hiểu được', () => {
    expect(parse('').understood).toBe(false);
    expect(parse('ờ ờ à').understood).toBe(false);
  });
});

describe('Ngày', () => {
  it.each([
    ['hôm qua', '2026-09-13', 'high'],
    ['tối qua', '2026-09-13', 'high'],
    ['sáng nay', '2026-09-14', 'high'],
    ['hôm kia', '2026-09-12', 'high'],
    ['3 ngày trước', '2026-09-11', 'high'],
    ['ngày 12 tháng 9', '2026-09-12', 'high'],
    ['mùng 5', '2026-09-05', 'high'],
    ['12/9', '2026-09-12', 'high'],
    ['ngày 20', '2026-08-20', 'low'], // hôm nay mới 14 -> hiểu là tháng trước, cần xác nhận
    ['ngày 20 tháng 12', '2025-12-20', 'low'],
    ['thứ sáu', '2026-09-11', 'low'],
    ['chủ nhật', '2026-09-13', 'low'],
    ['thứ hai tuần trước', '2026-09-07', 'low'],
  ])('"%s ăn phở 45 nghìn" -> %s (%s)', (spoken, expected, confidence) => {
    const r = parse(`${spoken} ăn phở 45 nghìn`);
    expect(r.date).toEqual({ value: expected, confidence });
    expect(r.amount.value).toBe(45_000);
  });

  it('ngày không tồn tại -> trống', () => {
    expect(parse('ngày 31 tháng 2 ăn phở 45 nghìn').date.confidence).toBe('none');
  });

  it('"ngày 12" không bị hiểu là số tiền', () => {
    const r = parse('Ngày 12 mua đồ');
    expect(r.amount.confidence).toBe('none');
    expect(r.amountSuggestions).toBeUndefined();
  });
});

describe('Ghi chú và danh mục', () => {
  it.each([
    ['Tiền điện tháng này 500 nghìn', 'Tiền điện tháng này', 'cat-exp-bills'],
    ['Trả tiền nhà 5 triệu', 'Tiền nhà', 'cat-exp-home'],
    ['Trà sữa 30k', 'Trà sữa', 'cat-exp-food'],
    ['Ăn tối 120 nghìn', 'Ăn tối', 'cat-exp-food'],
    ['Đổ xăng 70 nghìn', 'Đổ xăng', 'cat-exp-transport'],
    ['Mua thuốc 85 nghìn', 'Mua thuốc', 'cat-exp-health'],
    ['Xem phim 150k', 'Xem phim', 'cat-exp-entertainment'],
    ['Học phí 3 triệu', 'Học phí', 'cat-exp-education'],
    ['Mua áo khoác trên Shopee 350 nghìn', 'Mua áo khoác trên Shopee', 'cat-exp-shopping'],
    ['Tôi vừa tiêu 200 nghìn cho quà sinh nhật', 'Quà sinh nhật', null],
  ])('"%s"', (spoken, note, category) => {
    const r = parse(spoken);
    expect(r.note.value).toBe(note);
    expect(r.categoryId?.value ?? null).toBe(category);
  });

  it('câu gõ không dấu vẫn hiểu số tiền và danh mục', () => {
    const r = parse('an sang 35k');
    expect(r.amount.value).toBe(35_000);
    expect(r.categoryId?.value).toBe('cat-exp-food');
  });
});
