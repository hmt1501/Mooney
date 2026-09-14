import { describe, it, expect } from 'vitest';
import { fuseOcrPasses } from '../fuseOcrPasses';
import { extractReceipt } from '../extractReceipt';
import { OcrLine } from '@/types/receipt';

const pass = (rows: [number, number, number, string][]): OcrLine[] =>
  rows.map(([confidence, y0, y1, text]) => ({ text, confidence, bbox: { y0, y1 } }));

// Kết quả Tesseract thật (vie và eng) trên ảnh chụp màn hình VCB Digibank và MB Bank của người dùng
const VCB_VIE = pass([  [67, 38, 70, "13:58 si > Ø2"],
  [70, 154, 203, "VCBDigibank"],
  [96, 418, 464, "Giao dịch thành công!"],
  [30, 497, 555, "45,000”"],
  [62, 545, 563, "LJ"],
  [95, 602, 628, "15:57 Thứ Hai 14/09/2026"],
  [96, 723, 762, "Tài khoản nhận 984485869999"],
  [82, 846, 886, "Tên người nhận PHAM HONG VUI"],
  [86, 968, 1008, "Ngân hàng nhận 2“ MB"],
  [96, 1048, 1079, "Ngân hàng Quân Đội"],
  [93, 1132, 1170, "Nội dung HOANG MANH TAN"],
  [96, 1183, 1221, "chuyen tien"],
  [96, 1297, 1343, "Phí chuyển tiền Miễn phí"],
  [96, 1405, 1464, "Hình thức chuyển Chuyển tiền nhanh"],
  [0, 1463, 1491, "2A7"],
  [95, 1549, 1588, "Mã giao dịch 16049952251"],
  [96, 1718, 1762, "Lưu mẫu chuyển tiền"],
  [0, 1858, 1896, "LMới]"],
  [96, 1974, 2014, "Thực hiện giao dịch mới"]]);

const VCB_ENG = pass([  [43, 38, 70, "13:58 ull TE)"],
  [78, 154, 203, "VCBDigibank a)"],
  [91, 418, 464, "Giao dich thanh cong!"],
  [62, 497, 555, "45,000\""],
  [66, 545, 563, "J"],
  [77, 602, 628, "13:57 ThirHai 14/09/2026"],
  [90, 723, 762, "Tai khoan nhan 984483869999"],
  [75, 846, 886, "Tén ngudi nhan PHAM HONG VUI"],
  [83, 968, 1008, "Ngan hang nhan we MB"],
  [73, 1048, 1079, "Ngan hang Quan Boi"],
  [82, 1132, 1170, "N&i dung HOANG MANH TAN"],
  [93, 1183, 1221, "chuyen tien"],
  [91, 1297, 1343, "Phi chuyén tién Mién phi"],
  [82, 1405, 1464, "Hinh thuc chuyén Chuyén tién nhanh"],
  [68, 1463, 1491, "2417"],
  [94, 1549, 1588, "Ma giao dich 16049932251"],
  [85, 1718, 1762, "Luu mau chuyén tién"],
  [9, 1858, 1896, "(Mi)"],
  [85, 1974, 2014, "Thuc hién giao dich mdi"]]);

const MB_VIE = pass([  [83, 489, 534, "Thơnh toón thònh công"],
  [92, 572, 634, "45,000 VND"],
  [93, 673, 699, "18:59 - 09/09/2026"],
  [60, 883, 921, "PHAM TRẤN MÌNH NGOC"],
  [60, 941, 1004, "Xử* MBBonk (MB)"],
  [72, 1029, 1061, "0836972007 (VQRGAKNCX9654)"],
  [77, 1092, 1120, "BUI THUY LINH thanh toan"],
  [2, 1181, 1194, "Ma"],
  [91, 1286, 1315, "Cảm ơn bạn đã sử dụng dịch vụ của MB"],
  [50, 1354, 1378, "số"],
  [25, 1366, 1417, "x-MB"],
  [59, 1511, 1574, "œ (9) (ì"],
  [81, 1622, 1653, "Chia sẻ Lưuởnh Lưu thụ hưởng"],
  [92, 2006, 2047, "Thực hiện giao dịch khóc"],
  [0, 2132, 2145, "\"qua"]]);

const MB_ENG = pass([  [90, 489, 534, "Thanh todn thanh céng"],
  [96, 572, 634, "45,000 VND"],
  [93, 673, 699, "18:59 - 09/09/2026"],
  [94, 883, 921, "PHAM TRAN MINH NGOC"],
  [72, 941, 1004, "Yd MBBank (MB)"],
  [91, 1029, 1061, "0836972007 (VQRQAKNCX9654)"],
  [92, 1092, 1120, "BUI THUY LINH thanh toan"],
  [35, 1181, 1194, "Vv"],
  [76, 1286, 1315, "Cém on ban da si dung dich vu cia MB"],
  [37, 1354, 1378, "J"],
  [13, 1366, 1417, "¥i-MB"],
  [69, 1507, 1577, "es © A"],
  [69, 1622, 1653, "Chia sé Lwu anh  Lwu thu hudng"],
  [87, 2006, 2047, "Thuc hién giao dich khac"],
  [33, 2132, 2145, "c________________________ J"]]);

const TODAY = '2026-09-14';

describe('Ghép 2 lượt OCR trên biên lai thật', () => {
  it('VCB Digibank: sửa lỗi 3/5 của model tiếng Việt, nhận số tiền đứng riêng dưới tiêu đề thành công', () => {
    const lines = fuseOcrPasses(VCB_VIE, VCB_ENG);
    const result = extractReceipt(lines, { today: TODAY });
    expect(result.amount).toEqual({ value: 45_000, confidence: 'high' });
    expect(result.date).toEqual({ value: '2026-09-14', confidence: 'high' });
    expect(result.merchant).toEqual({ value: 'Pham Hong Vui', confidence: 'high' });
    // Hai model đọc mã giao dịch khác nhau -> lấy bản tiếng Anh nhưng không coi là chắc chắn
    expect(result.reference).toEqual({ value: '16049932251', confidence: 'low' });
    expect(lines.find((line) => line.text.startsWith('Tài khoản nhận'))?.text).toBe('Tài khoản nhận 984483869999');
  });

  it('VCB chỉ với lượt tiếng Việt vẫn gợi ý được số tiền', () => {
    const result = extractReceipt(VCB_VIE, { today: TODAY });
    expect(result.amount.value).toBe(45_000);
    expect(result.amount.confidence).toBe('low'); // dòng số tiền mờ (30)
  });

  it('MB Bank: tên người nhận viết hoa không bị thêm dấu sai', () => {
    const result = extractReceipt(fuseOcrPasses(MB_VIE, MB_ENG), { today: TODAY });
    expect(result.amount).toEqual({ value: 45_000, confidence: 'high' });
    expect(result.date).toEqual({ value: '2026-09-09', confidence: 'high' });
    expect(result.merchant).toEqual({ value: 'Pham Tran Minh Ngoc', confidence: 'low' });
  });

  it('không có lượt thứ hai: giữ nguyên lượt chính', () => {
    expect(fuseOcrPasses(MB_VIE, [])).toBe(MB_VIE);
  });

  it('số lượng cụm chữ số lệch nhau: giữ bản tiếng Việt và đánh dấu không chắc', () => {
    const [line] = fuseOcrPasses(
      [{ text: 'Số tiền 45.000 VND', confidence: 95, bbox: { y0: 0, y1: 20 } }],
      [{ text: 'So tien 45 000 VND', confidence: 90, bbox: { y0: 0, y1: 20 } }]
    );
    expect(line.text).toBe('Số tiền 45.000 VND');
    expect(line.uncertainTokens).toEqual(['45.000']);
    expect(extractReceipt([line], { today: TODAY }).amount.confidence).toBe('low');
  });
});
