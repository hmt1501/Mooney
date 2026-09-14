import { describe, it, expect } from 'vitest';
import { extractReceipt, parseVietnameseAmountWords } from '../extractReceipt';
import { OcrLine } from '@/types/receipt';

const TODAY = '2026-09-14';
const lines = (rows: [number, string][]): OcrLine[] => rows.map(([confidence, text]) => ({ text, confidence }));

// Các dòng dưới đây là kết quả Tesseract (vie) thật trên ảnh biên lai mẫu, giữ nguyên lỗi OCR
const MB_BANK = lines([
  [75, 'Chuyển khoản thành công'],
  [83, '-125.000 VND'],
  [95, 'Một trăm hai mươi lăm nghìn đồng'],
  [96, 'Thời gian 14:32:10 13/09/2026'],
  [96, 'Tài khoản nguồn 0123456789'],
  [95, 'Tên người nhận NGUYEN VAN AN'],
  [95, 'Tài khoản nhận 9704229876543210'],
  [96, 'Ngân hàng nhận Vietcombank'],
  [85, 'Nội dung TRAN THỊ B chuyen tien com'],
  [95, 'Phí giao dịch 0VND'],
  [94, 'Mã giao dịch FT26256123456789'],
]);

const VIETCOMBANK = lines([
  [90, 'CHUYỀN KHOẢN THÀNH CÔNG'],
  [92, '2.450.000 VND'],
  [96, '09:05 Thứ Bảy 12/09/2026'],
  [93, 'Tên người thụ hưởng CONG TY TNHH CAFE MAY'],
  [96, 'Tài khoản thụ hưởng 1012345678'],
  [95, 'Ngân hàng thụ hưởng Techcombank'],
  [96, 'Mã giao dịch 5123456789'],
  [95, 'Số dư sau giao dịch 8.320.500 VND'],
  [93, 'Nội dung chuyên khoản Thanh toan don hang 8812'],
]);

const MOMO = lines([
  [96, 'Giao dịch thành công'],
  [84, '-350.000đ'],
  [95, 'Thời gian 20:15- 11/09/2026'],
  [96, 'Người nhận Cửa hàng Bách Hóa Xanh'],
  [96, 'Số điện thoại 0901 234 567'],
  [96, 'Phí giao dịch Miễn phí'],
  [95, 'Tổng tiền 350.000đ'],
  [95, 'Mã giao dịch 48812345678'],
]);

// Nền tối, nhãn xám bị OCR bỏ sót
const TECHCOMBANK_DARK = lines([
  [95, 'Chuyền tiền thành công'],
  [92, 'VND 89.000'],
  [92, 'PHAM MINH KHOA'],
  [61, '13 thg 9, 2026 19:47'],
  [82, 'FT26256987654321'],
  [96, 'tien tra sua'],
]);

const ENGLISH = lines([
  [90, 'Transfer successful'],
  [80, 'Amount 1,200,000 VND'],
  [93, 'Date 10/09/2026 08:12'],
  [92, 'Beneficiary name LE HOANG NAM'],
  [93, 'Beneficiary account 0071000123456'],
  [89, 'Fee 0VND'],
  [73, 'Transaction ID TPB2609100812AB'],
]);

describe('extractReceipt: biên lai ngân hàng thật', () => {
  it('MB Bank: đọc đủ và chắc chắn, đối chiếu số tiền bằng chữ', () => {
    const result = extractReceipt(MB_BANK, { today: TODAY });
    expect(result.amount).toEqual({ value: 125_000, confidence: 'high' });
    expect(result.date).toEqual({ value: '2026-09-13', confidence: 'high' });
    expect(result.merchant).toEqual({ value: 'Nguyen Van An', confidence: 'high' });
    expect(result.reference).toEqual({ value: 'FT26256123456789', confidence: 'high' });
  });

  it('Vietcombank: không nhầm số dư sau giao dịch hay số tài khoản thành số tiền', () => {
    const result = extractReceipt(VIETCOMBANK, { today: TODAY });
    expect(result.amount).toEqual({ value: 2_450_000, confidence: 'high' });
    expect(result.date.value).toBe('2026-09-12');
    expect(result.merchant.value).toBe('Cong Ty TNHH Cafe May');
    expect(result.reference.value).toBe('5123456789');
  });

  it('MoMo: bỏ qua số điện thoại có dấu cách, tổng tiền trùng số tiền', () => {
    const result = extractReceipt(MOMO, { today: TODAY });
    expect(result.amount).toEqual({ value: 350_000, confidence: 'high' });
    expect(result.date).toEqual({ value: '2026-09-11', confidence: 'high' });
    expect(result.merchant).toEqual({ value: 'Cửa hàng Bách Hóa Xanh', confidence: 'high' });
  });

  it('Techcombank nền tối thiếu nhãn: vẫn gợi ý nhưng các trường không chắc phải là low', () => {
    const result = extractReceipt(TECHCOMBANK_DARK, { today: TODAY });
    expect(result.amount.value).toBe(89_000);
    expect(result.date).toEqual({ value: '2026-09-13', confidence: 'low' }); // dòng mờ (61)
    expect(result.merchant).toEqual({ value: 'Pham Minh Khoa', confidence: 'low' });
    expect(result.reference).toEqual({ value: 'FT26256987654321', confidence: 'low' });
  });

  it('biên lai tiếng Anh', () => {
    const result = extractReceipt(ENGLISH, { today: TODAY });
    expect(result.amount).toEqual({ value: 1_200_000, confidence: 'high' });
    expect(result.date.value).toBe('2026-09-10');
    expect(result.merchant.value).toBe('Le Hoang Nam');
    expect(result.reference.value).toBe('TPB2609100812AB');
  });
});

describe('extractReceipt: không âm thầm dùng giá trị không chắc', () => {
  it('hai số tiền khác nhau cùng mạnh -> low', () => {
    const result = extractReceipt(lines([[95, 'Số tiền 150.000 VND'], [95, 'Tổng tiền 180.000 VND']]), { today: TODAY });
    expect(result.amount.confidence).toBe('low');
  });

  it('số tiền bằng số mâu thuẫn với số tiền bằng chữ -> low', () => {
    const result = extractReceipt(lines([[90, '-126.000 VND'], [95, 'Một trăm hai mươi lăm nghìn đồng']]), { today: TODAY });
    expect(result.amount).toEqual({ value: 126_000, confidence: 'low' });
  });

  it('dòng chữ mờ -> low dù có nhãn và đơn vị', () => {
    const result = extractReceipt(lines([[52, 'Số tiền 125.000 VND']]), { today: TODAY });
    expect(result.amount.confidence).toBe('low');
  });

  it('không có số tiền -> none', () => {
    const result = extractReceipt(lines([[95, 'Chuyển khoản thành công'], [95, 'Tài khoản 0123456789']]), { today: TODAY });
    expect(result.amount).toEqual({ value: null, confidence: 'none' });
  });

  it('không có ngày -> none; ngày trong tương lai bị loại', () => {
    expect(extractReceipt(lines([[95, 'Số tiền 50.000 VND']]), { today: TODAY }).date.confidence).toBe('none');
    expect(extractReceipt(lines([[95, 'Ngày 20/12/2026']]), { today: TODAY }).date.confidence).toBe('none');
  });

  it('nhiều ngày khác nhau -> low, ưu tiên dòng có nhãn thời gian', () => {
    const result = extractReceipt(lines([[95, 'Ngày hết hạn 01/01/2027'], [95, 'In lúc 14/09/2026'], [95, 'Thời gian giao dịch 12/09/2026']]), { today: TODAY });
    expect(result.date).toEqual({ value: '2026-09-12', confidence: 'low' });
  });

  it('ngày quá cũ -> low', () => {
    expect(extractReceipt(lines([[95, 'Thời gian 01/01/2024']]), { today: TODAY }).date.confidence).toBe('low');
  });

  it('ảnh không có chữ -> hasText=false', () => {
    expect(extractReceipt(lines([[20, '~ .']]), { today: TODAY }).hasText).toBe(false);
  });

  it('nhãn ngắn "Đến" không nhận nhầm câu thường', () => {
    const result = extractReceipt(lines([[95, 'Đến hạn thanh toán ngày 20/09']]), { today: TODAY });
    expect(result.merchant.confidence).toBe('none');
  });

  it('chấp nhận chữ VND bị đọc lệch (TPBank: "250.000 VNHU")', () => {
    const result = extractReceipt(lines([[96, 'Giao dịch thành công'], [85, '250.000 VNHU']]), { today: TODAY });
    expect(result.amount).toEqual({ value: 250_000, confidence: 'high' });
  });

  it('sửa lỗi OCR chữ O thay số 0', () => {
    const result = extractReceipt(lines([[90, 'Số tiền 45.OOO VND']]), { today: TODAY });
    expect(result.amount.value).toBe(45_000);
  });
});

describe('parseVietnameseAmountWords', () => {
  it.each([
    ['Một trăm hai mươi lăm nghìn đồng', 125_000],
    ['Hai triệu bốn trăm năm mươi nghìn đồng', 2_450_000],
    ['Mười lăm nghìn đồng', 15_000],
    ['Một tỷ hai trăm triệu đồng chẵn', 1_200_000_000],
    ['Ba trăm linh năm nghìn đồng', 305_000],
    ['Hai mươi mốt triệu đồng', 21_000_000],
  ])('%s -> %d', (text, expected) => {
    expect(parseVietnameseAmountWords(text)).toBe(expected);
  });

  it('câu thường không phải số bằng chữ', () => {
    expect(parseVietnameseAmountWords('Chuyển khoản thành công')).toBeNull();
    expect(parseVietnameseAmountWords('Tên người nhận')).toBeNull();
  });
});
