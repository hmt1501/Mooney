import { ExpenseDraft } from '@/types/expenseDraft';
import { ExtractedField } from '@/types/receipt';
import { foldVietnamese, parseVietnameseAmountWords } from '@/lib/receipt/extractReceipt';

/**
 * Hiểu câu nói tự nhiên thành bản nháp khoản chi (VND).
 *   "Ăn sáng 35 nghìn"             -> 35.000, hôm nay, "Ăn sáng", Ăn uống
 *   "Grab 80 nghìn hôm nay"        -> 80.000, hôm nay, "Grab", Đi lại
 *   "Ngày 12 tôi ăn trưa 50 nghìn" -> 50.000, ngày 12, "Ăn trưa", Ăn uống
 *   "Mua cà phê 45k"               -> 45.000, hôm nay, "Mua cà phê", Ăn uống
 *
 * Nguyên tắc: không đoán liều. Con số không có đơn vị ("Mua đồ 50") không được tự nhân lên,
 * mà để trống và đưa ra các cách hiểu để người dùng chạm chọn.
 */

const MAX_AMOUNT = 100_000_000_000;

interface Span {
  start: number;
  end: number;
}

function field<T>(value: T | null, confidence: ExtractedField<T>['confidence']): ExtractedField<T> {
  return value === null ? { value: null, confidence: 'none' } : { value, confidence };
}

function blank(text: string, span: Span): string {
  return text.slice(0, span.start) + ' '.repeat(span.end - span.start) + text.slice(span.end);
}

/** "3,5" / "3.5" -> 3.5 ; "1.500" (nhóm 3 chữ số) -> 1500 */
function parseNumber(raw: string): number {
  const match = raw.match(/^(\d+)(?:[.,](\d+))?$/);
  if (!match) return NaN;
  if (!match[2]) return Number(match[1]);
  if (match[2].length === 3) return Number(match[1] + match[2]);
  return Number(`${match[1]}.${match[2]}`);
}

// ==========================================================================
// NGÀY
// ==========================================================================

function isoFromParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const WEEKDAY_WORDS: Record<string, number> = {
  'chu nhat': 0, cn: 0, 'thu hai': 1, 'thu 2': 1, 'thu ba': 2, 'thu 3': 2, 'thu tu': 3, 'thu 4': 3,
  'thu nam': 4, 'thu 5': 4, 'thu sau': 5, 'thu 6': 5, 'thu bay': 6, 'thu 7': 6,
};

interface DateMatch {
  value: string | null;
  confidence: 'high' | 'low';
  span: Span;
}

function findDate(folded: string, today: string): DateMatch | null {
  const [ty, tm] = today.split('-').map(Number);

  const relative: [RegExp, number][] = [
    [/\b(?:hom|bua|sang|trua|chieu|toi|dem) nay\b/, 0],
    [/\b(?:hom|bua|sang|trua|chieu|toi|dem) qua\b/, -1],
    [/\b(?:hom|bua) kia\b/, -2],
  ];
  for (const [pattern, offset] of relative) {
    const match = pattern.exec(folded);
    if (match) {
      return { value: shiftDays(today, offset), confidence: 'high', span: { start: match.index, end: match.index + match[0].length } };
    }
  }

  const daysAgo = /\b(\d{1,2}) ngay truoc\b/.exec(folded);
  if (daysAgo) {
    return { value: shiftDays(today, -Number(daysAgo[1])), confidence: 'high', span: { start: daysAgo.index, end: daysAgo.index + daysAgo[0].length } };
  }

  // "ngày 12", "mùng 5", "ngày 12 tháng 9", "ngày 12 tháng 9 năm 2026", "12/9", "12-9-2026"
  const explicit =
    /\b(?:ngay|mung|hom)\s+(\d{1,2})(?:\s+thang\s+(\d{1,2}))?(?:\s+nam\s+(\d{4}))?\b/.exec(folded) ??
    /(?<![\d.,])(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:\s*[\/-]\s*(\d{4}|\d{2}))?(?![\d.,])/.exec(folded);
  if (explicit) {
    const span = { start: explicit.index, end: explicit.index + explicit[0].length };
    const day = Number(explicit[1]);
    let month = explicit[2] ? Number(explicit[2]) : tm;
    let year = explicit[3] ? Number(explicit[3].length === 2 ? `20${explicit[3]}` : explicit[3]) : ty;
    let confidence: 'high' | 'low' = 'high';

    let iso = isoFromParts(year, month, day);
    if (iso && iso > today) {
      // Khoản chi đã xảy ra: ngày lớn hơn hôm nay nghĩa là tháng/năm trước, nhưng cần người dùng xác nhận
      if (explicit[3]) {
        iso = null;
      } else if (explicit[2]) {
        year -= 1;
        iso = isoFromParts(year, month, day);
        confidence = 'low';
      } else {
        month -= 1;
        if (month === 0) {
          month = 12;
          year -= 1;
        }
        iso = isoFromParts(year, month, day);
        confidence = 'low';
      }
    }
    return { value: iso, confidence: iso ? confidence : 'low', span };
  }

  // "thứ hai", "thứ 6 tuần trước", "chủ nhật"
  const weekday = /\b(chu nhat|cn|thu (?:hai|ba|tu|nam|sau|bay|[2-7]))\b(\s+tuan truoc)?/.exec(folded);
  if (weekday) {
    const target = WEEKDAY_WORDS[weekday[1]];
    const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    let back = (todayWeekday - target + 7) % 7;
    const daysSinceMonday = (todayWeekday + 6) % 7;
    if (weekday[2] && back <= daysSinceMonday) back += 7; // "tuần trước": lùi sang tuần trước
    return { value: shiftDays(today, -back), confidence: 'low', span: { start: weekday.index, end: weekday.index + weekday[0].length } };
  }

  return null;
}

// ==========================================================================
// SỐ TIỀN
// ==========================================================================

interface AmountMatch {
  value: number;
  span: Span;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

function findAmounts(folded: string): { amounts: AmountMatch[]; bareNumbers: { value: number; span: Span }[] } {
  let working = folded;
  const amounts: AmountMatch[] = [];
  const take = (pattern: RegExp, toValue: (match: RegExpExecArray) => number) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(working))) {
      const value = Math.round(toValue(match));
      const span = { start: match.index, end: match.index + match[0].length };
      if (Number.isFinite(value) && value > 0) amounts.push({ value, span });
      working = blank(working, span);
      pattern.lastIndex = span.end;
    }
  };

  // Tỷ
  take(new RegExp(String.raw`(?<![\d.,])${NUM}\s*(?:ty|ti)\b`, 'g'), (m) => parseNumber(m[1]) * 1_000_000_000);

  // Triệu: "35 triệu", "3,5 triệu", "1 triệu 2", "1 triệu 250", "1 triệu 2 trăm", "2 triệu 500 nghìn", "3 triệu rưỡi"
  take(
    new RegExp(String.raw`(?<![\d.,])${NUM}\s*(?:trieu|tr|cu)\b(?:\s+(\d{1,3})(?:\s*(tram|nghin|ngan|k)\b|(?=\s*(?:$|[,.;]|ruoi\b))))?(\s+ruoi)?`, 'g'),
    (m) => {
      let value = parseNumber(m[1]) * 1_000_000;
      if (m[2]) {
        const rest = Number(m[2]);
        if (m[3] === 'tram') value += rest * 100_000;
        else if (m[3]) value += rest * 1_000;
        else value += rest * (m[2].length === 1 ? 100_000 : m[2].length === 2 ? 10_000 : 1_000);
      }
      if (m[4]) value += 500_000;
      return value;
    }
  );

  // "2 trăm nghìn", "2 trăm rưỡi nghìn"
  take(new RegExp(String.raw`(?<![\d.,])(\d{1,3})\s*tram(\s+ruoi)?\s*(?:nghin|ngan|k)\b`, 'g'), (m) => (Number(m[1]) * 100 + (m[2] ? 50 : 0)) * 1_000);

  // Nghìn: "35 nghìn", "35k", "2,5k", "35 nghìn 5", "35 nghìn rưỡi"
  take(
    new RegExp(String.raw`(?<![\d.,])${NUM}\s*(?:nghin|ngan|k)\b(?:\s+(\d)(?=\s*(?:$|[,.;])))?(\s+ruoi)?`, 'g'),
    (m) => parseNumber(m[1]) * 1_000 + (m[2] ? Number(m[2]) * 100 : 0) + (m[3] ? 500 : 0)
  );

  // Số có phân tách hàng nghìn: "35.000", "35,000", "1.250.000 đồng"
  take(/(?<![\d.,])(\d{1,3}(?:([.,])\d{3})(?:\2\d{3})*)(?![\d.,])(?:\s*(?:dong|d|vnd)\b)?/g, (m) => Number(m[1].replace(/\D/g, '')));

  // Số liền từ 4 chữ số: "35000", "5000 đồng"
  take(/(?<![\d.,])(\d{4,12})(?![\d.,])(?:\s*(?:dong|d|vnd)\b)?/g, (m) => Number(m[1]));

  // Số bằng chữ: "ba mươi lăm nghìn"
  const wordPattern = /\b(?:(?:mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi|tram|le|linh|ruoi)\s+)*(?:mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi|tram)\s+(?:nghin|ngan|trieu)(?:\s+(?:mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin|muoi|tram|le|linh|nghin|ngan|dong))*\b/g;
  take(wordPattern, (m) => parseVietnameseAmountWords(m[0]) ?? NaN);

  // Số nhỏ không đơn vị: không tự hiểu, chỉ ghi nhận để hỏi lại
  const bareNumbers: { value: number; span: Span }[] = [];
  for (const match of working.matchAll(/(?<![\d.,])(\d{1,3})(?![\d.,])(?:\s*(?:dong|d)\b)?/g)) {
    bareNumbers.push({ value: Number(match[1]), span: { start: match.index ?? 0, end: (match.index ?? 0) + match[0].length } });
  }

  return { amounts, bareNumbers };
}

// ==========================================================================
// DANH MỤC
// ==========================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cat-exp-food': [
    'an sang', 'an trua', 'an toi', 'an dem', 'an vat', 'an uong', 'an nhau', 'an', 'com', 'pho', 'bun', 'mien', 'hu tieu', 'banh mi', 'banh',
    'chao', 'lau', 'nuong', 'ca phe', 'cafe', 'coffee', 'tra sua', 'tra da', 'tra chanh', 'nuoc mia', 'sinh to', 'nuoc ngot', 'do uong', 'bia',
    'highlands', 'starbucks', 'phuc long', 'kfc', 'lotteria', 'jollibee', 'pizza', 'grabfood', 'grab food', 'shopeefood', 'baemin',
    'nha hang', 'quan an', 'di cho', 'rau', 'thit', 'ca', 'trai cay', 'hoa qua', 'do an',
  ],
  'cat-exp-transport': [
    'grab', 'grabbike', 'grabcar', 'xanh sm', 'gojek', 'taxi', 'xe om', 'xang', 'do xang', 'gui xe', 've xe', 'xe buyt', 'bus', 'tau',
    've tau', 'may bay', 've may bay', 'phi duong', 'cau duong', 'sua xe', 'rua xe', 'thay nhot', 'dau nhot',
  ],
  'cat-exp-shopping': [
    'mua sam', 'quan ao', 'ao so mi', 'ao khoac', 'ao thun', 'giay', 'dep', 'tui xach', 'my pham', 'son moi', 'shopee', 'lazada', 'tiki',
    'sieu thi', 'winmart', 'coopmart', 'bach hoa xanh', 'do dung', 'mua do', 'phu kien', 'dong ho',
  ],
  'cat-exp-entertainment': ['xem phim', 'phim', 'rap phim', 'cgv', 'netflix', 'spotify', 'karaoke', 'game', 'nap game', 'du lich', 'di choi', 'bowling', 'concert'],
  'cat-exp-bills': [
    'tien dien', 'tien nuoc', 'dien nuoc', 'internet', 'wifi', 'tien mang', 'cuoc dien thoai', 'nap dien thoai', 'nap the', '4g', 'truyen hinh',
    'hoa don', 'phi dich vu', 'tien rac', 'phi quan ly',
  ],
  'cat-exp-health': ['thuoc', 'nha thuoc', 'kham benh', 'kham', 'benh vien', 'phong kham', 'nha khoa', 'nho rang', 'vitamin', 'gym', 'tap gym', 'yoga', 'bao hiem y te'],
  'cat-exp-education': ['hoc phi', 'sach', 'khoa hoc', 'hoc them', 'gia su', 'lop hoc', 'van phong pham', 'but', 'vo viet'],
  'cat-exp-home': ['tien nha', 'thue nha', 'tien phong', 'thue phong', 'sua nha', 'noi that', 'do gia dung', 'dien may', 'giat ui', 'don nha', 'binh gas', 'gas'],
};

export function suggestCategory(foldedText: string): string | null {
  let best: { id: string; length: number; index: number } | null = null;
  for (const [id, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const match = new RegExp(String.raw`\b${keyword}\b`).exec(foldedText);
      if (!match) continue;
      if (!best || keyword.length > best.length || (keyword.length === best.length && match.index < best.index)) {
        best = { id, length: keyword.length, index: match.index };
      }
    }
  }
  return best?.id ?? null;
}

// ==========================================================================
// GHI CHÚ
// ==========================================================================

/**
 * Từ đệm bị cắt ở hai đầu cụm ghi chú. So khớp theo chữ có dấu, vì bỏ dấu sẽ nhầm
 * "trả" (trả tiền) với "trà" (trà sữa), "tôi" với "tối" (ăn tối), "nha" với "nhà".
 */
const EDGE_FILLERS = new Set([
  'tôi', 'mình', 'em', 'anh', 'chị', 'tao', 'tớ', 'đã', 'vừa', 'mới', 'hết', 'mất', 'tốn', 'là', 'khoảng', 'tầm', 'giá',
  'cho', 'vào', 'ở', 'tại', 'lúc', 'với', 'và', 'đồng', 'nhé', 'nhe', 'nha', 'à', 'rồi', 'ngày', 'hôm',
  // tiếng ậm ừ khi ngập ngừng
  'ờ', 'ừ', 'ừm', 'ờm', 'ơ', 'ạ', 'ừa', 'hmm', 'uhm', 'um', 'uh', 'ê',
]);
/** Chỉ bỏ khi đứng đầu câu (động từ ra lệnh / động từ chi tiêu) */
const LEADING_FILLERS = new Set(['trả', 'chi', 'tiêu', 'ghi', 'thêm', 'khoản', 'tiền']);

function buildNote(original: string, removed: Span[]): string {
  let text = original;
  for (const span of removed) text = blank(text, span);

  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/^[,.;:!?"“”]+|[,.;:!?"“”]+$/g, ''))
    .filter(Boolean);
  const lower = words.map((word) => word.toLocaleLowerCase('vi'));

  let start = 0;
  let end = words.length;
  while (start < end && (EDGE_FILLERS.has(lower[start]) || LEADING_FILLERS.has(lower[start]))) {
    // Giữ "tiền" khi là đầu cụm danh từ: "tiền nhà", "tiền điện"
    if (lower[start] === 'tiền' && start + 1 < end && !EDGE_FILLERS.has(lower[start + 1])) break;
    start++;
  }
  while (end > start && EDGE_FILLERS.has(lower[end - 1])) end--;

  const note = words.slice(start, end).join(' ').trim();
  return note ? note.charAt(0).toLocaleUpperCase('vi') + note.slice(1) : '';
}

// ==========================================================================

export interface ParseVoiceOptions {
  /** 'YYYY-MM-DD' theo giờ máy người dùng */
  today: string;
}

export interface ParsedVoiceExpense extends ExpenseDraft {
  /** Có hiểu được ít nhất số tiền hoặc nội dung chi */
  understood: boolean;
}

export function parseVoiceExpense(transcript: string, options: ParseVoiceOptions): ParsedVoiceExpense {
  const original = transcript.normalize('NFC').replace(/\s+/g, ' ').trim();
  const folded = foldVietnamese(original);

  // 1. Ngày trước, để "ngày 12" không bị hiểu thành số tiền
  const dateMatch = findDate(folded, options.today);
  let working = dateMatch ? blank(folded, dateMatch.span) : folded;

  // Giờ trong câu ("7 giờ sáng", "7h30") không phải số tiền
  const timeSpans: Span[] = [];
  for (const match of working.matchAll(/\b\d{1,2}\s*(?:gio|h)(?:\s*\d{1,2}(?:\s*phut)?)?\b/g)) {
    timeSpans.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  for (const span of timeSpans) working = blank(working, span);

  // 2. Số tiền
  const { amounts, bareNumbers } = findAmounts(working);
  let amount: ExtractedField<number> = field<number>(null, 'none');
  let amountHint: string | undefined;
  let amountSuggestions: number[] | undefined;

  const valid = amounts.filter((item) => item.value <= MAX_AMOUNT);
  if (valid.length === 1) {
    amount = field(valid[0].value, 'high');
  } else if (valid.length > 1) {
    const total = valid.reduce((sum, item) => sum + item.value, 0);
    amount = field(total <= MAX_AMOUNT ? total : null, 'low');
    amountHint = `Mooney đã cộng ${valid.length} khoản: ${valid.map((item) => item.value.toLocaleString('vi-VN')).join(' + ')}`;
  } else if (bareNumbers.length > 0) {
    // "Mua đồ 50": không đoán là 50 đ hay 50.000 đ -> để người dùng chọn
    const bare = bareNumbers[bareNumbers.length - 1].value;
    amountHint = `Bạn nói "${bare}" nhưng chưa rõ đơn vị`;
    amountSuggestions = [bare * 1_000, bare * 1_000_000].filter((value) => value <= MAX_AMOUNT);
  }

  // 3. Danh mục + ghi chú
  const removed: Span[] = [...valid.map((item) => item.span), ...timeSpans];
  if (dateMatch) removed.push(dateMatch.span);
  if (amountSuggestions) removed.push(...bareNumbers.map((item) => item.span));
  const note = buildNote(original, removed);
  const categoryId = suggestCategory(foldVietnamese(note)) ?? suggestCategory(folded);

  const date: ExtractedField<string> = dateMatch
    ? field(dateMatch.value, dateMatch.value ? dateMatch.confidence : 'none')
    : field(options.today, 'high');

  return {
    amount,
    date,
    note: field(note || null, 'high'),
    categoryId: field(categoryId, 'high'),
    amountHint,
    amountSuggestions,
    dateIsDefault: !dateMatch,
    understood: amount.value !== null || !!amountSuggestions || note.length > 0,
  };
}
