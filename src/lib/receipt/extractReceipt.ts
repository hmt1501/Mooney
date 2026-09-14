import { ExtractedField, OcrLine, ReceiptExtraction } from '@/types/receipt';

/**
 * Trích xuất Số tiền / Ngày / Người nhận từ chữ OCR của biên lai chuyển khoản.
 *
 * Nguyên tắc: OCR không bao giờ đúng tuyệt đối. Mỗi trường đi kèm mức độ chắc chắn,
 * và chỉ đạt "high" khi có nhiều tín hiệu đồng thuận (nhãn, đơn vị tiền, chữ rõ,
 * không có giá trị cạnh tranh). Còn lại là "low" để người dùng xác nhận.
 */

const MIN_LINE_CONFIDENCE_HIGH = 75;
const MAX_AMOUNT = 100_000_000_000;

/** Bỏ dấu tiếng Việt + chữ thường, dùng để so khớp nhãn */
export function foldVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function field<T>(value: T | null, confidence: ExtractedField<T>['confidence']): ExtractedField<T> {
  return value === null ? { value: null, confidence: 'none' } : { value, confidence };
}

function hasAny(folded: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(folded));
}

// ==========================================================================
// SỐ TIỀN
// ==========================================================================

const AMOUNT_LABELS = [
  /\bso tien\b/,
  /\bamount\b/,
  /\btong tien\b/,
  /\btong cong\b/,
  /\bthanh tien\b/,
  /\btong thanh toan\b/,
  /\btotal\b/,
  /\bgia tri giao dich\b/,
];

/** Dòng có các nhãn này thì con số trên dòng không phải số tiền đã chi */
const NON_AMOUNT_LABELS = [
  /\bphi\b/,
  /\bfee\b/,
  /\bso du\b/,
  /\bbalance\b/,
  /\btai khoan\b/,
  /\bstk\b/,
  /\baccount\b/,
  /\bso dien thoai\b/,
  /\bphone\b/,
  /\bhotline\b/,
  /\bma giao dich\b/,
  /\bso tham chieu\b/,
  /\bma tham chieu\b/,
  /\btransaction id\b/,
  /\breference\b/,
  /\bchiet khau\b/,
  /\bdiscount\b/,
  /\bhan muc\b/,
  /\bvat\b/,
  /\bthue\b/,
];

// "VND" hay bị OCR đọc lệch ở ký tự cuối (VNĐ, VN0, VNO, VNHU...) -> chấp nhận "VN" + tối đa 2 ký tự nhiễu
const CURRENCY_AFTER = /^\s*(?:vn[dđ0ohu]{0,2}\.?|đồng|dong|đ|₫|d)(?![a-zà-ỹ])/i;
const CURRENCY_BEFORE = /(?:vnd|vnđ|₫)\s*[:\-]?\s*$/i;

interface AmountCandidate {
  value: number;
  score: number;
  lineIndex: number;
  lineConfidence: number;
  /** Hai lượt OCR đọc con số này khác nhau */
  disputed: boolean;
}

/** Tiêu đề màn hình thành công của app ngân hàng / ví (chịu được lỗi OCR ở dấu) */
const SUCCESS_HEADING = /\b(?:th[a-z]{1,2}nh c[a-z]ng|successful|success|hoan tat|da chuyen)\b/;

function lineFolded(line: OcrLine): string {
  return foldVietnamese(line.alt ? `${line.text} ${line.alt}` : line.text);
}

/** Cụm chữ số trong dòng có bị hai lượt OCR đọc khác nhau không */
export function isDisputed(line: OcrLine, digits: string): boolean {
  if (!line.uncertainTokens || !digits) return false;
  return line.uncertainTokens.some((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    return tokenDigits.includes(digits) || digits.includes(tokenDigits);
  });
}

/** Sửa lỗi OCR hay gặp trong cụm số: O -> 0, l/I -> 1 */
function repairDigits(text: string): string {
  let repaired = text;
  let previous = '';
  while (repaired !== previous) {
    previous = repaired;
    repaired = repaired
      .replace(/(?<=\d[.,]?)[Oo](?=[\d.,Oo]|\s*(?:vnd|đ|₫)|$)/gi, '0')
      .replace(/(?<=\d)[lI](?=\d)/g, '1');
  }
  return repaired;
}

function findAmountCandidates(lines: OcrLine[]): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  const numberPattern = /(\d{1,3}(?:([.,])\d{3})(?:\2\d{3})*|\d{1,3}(?: \d{3})+|\d+)((?:[.,]\d{2})?)/g;

  lines.forEach((line, lineIndex) => {
    const raw = repairDigits(line.text);
    const folded = foldVietnamese(raw);
    const previousFolded = lineIndex > 0 ? foldVietnamese(lines[lineIndex - 1].text) : '';
    const isNonAmountLine = hasAny(folded, NON_AMOUNT_LABELS);
    const hasAmountLabel = hasAny(folded, AMOUNT_LABELS);
    const previousIsAmountLabel =
      hasAny(previousFolded, AMOUNT_LABELS) && !/\d/.test(previousFolded) && !hasAny(previousFolded, NON_AMOUNT_LABELS);
    const followsSuccessHeading = lines
      .slice(Math.max(0, lineIndex - 2), lineIndex)
      .some((previous) => SUCCESS_HEADING.test(lineFolded(previous)));

    for (const match of raw.matchAll(numberPattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const before = raw.slice(0, start);
      const after = raw.slice(end);
      const token = match[1];
      const separator = match[2] || (token.includes(' ') ? ' ' : '');

      // Một phần của ngày/giờ (13/09/2026, 14:32) hoặc mã chữ-số (FT2625...)
      if (/[\/:]$/.test(before) || /^[\/:]\d/.test(after)) continue;
      if (/[A-Za-zÀ-ỹ]$/.test(before) || /^[A-Za-z]/.test(after.replace(CURRENCY_AFTER, ''))) {
        if (!CURRENCY_AFTER.test(after)) continue;
      }
      // Phân tách bằng khoảng trắng chỉ hợp lệ khi có đơn vị tiền (tránh số điện thoại "0901 234 567")
      const hasCurrency = CURRENCY_AFTER.test(after) || CURRENCY_BEFORE.test(before);
      if (separator === ' ' && !hasCurrency) continue;

      const digits = token.replace(/\D/g, '');
      // Chuỗi số dài không phân tách, không đơn vị: số tài khoản / số điện thoại / mã
      if (!separator && digits.length >= 9 && !hasCurrency) continue;
      if (!separator && digits.startsWith('0') && digits.length > 1) continue;

      const value = parseInt(digits, 10);
      if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) continue;

      // Số tiền đứng riêng một dòng (đơn vị "VND" nhỏ phía trên thường bị OCR bỏ sót, vd. VCB Digibank)
      const leftover = (before + after.replace(CURRENCY_AFTER, '')).replace(/[\s"'“”‘’`´.,:;!|()\-−_~*°^]/g, '');
      const isStandalone = separator !== '' && leftover.length <= 1 && !/[A-Za-zÀ-ỹ]{2}/.test(leftover);

      let score = 0;
      if (hasCurrency) score += 3;
      if (hasAmountLabel) score += 3;
      else if (previousIsAmountLabel) score += 2;
      if (separator) score += 1;
      if (isStandalone) score += followsSuccessHeading ? 3 : 1;
      if (/[-−]\s*$/.test(before)) score += 1; // ghi nợ: "-125.000 VND"
      if (value < 1_000) score -= 3;
      if (isNonAmountLine) score -= 6;

      if (score >= 2) {
        candidates.push({ value, score, lineIndex, lineConfidence: line.confidence, disputed: isDisputed(line, digits) });
      }
    }
  });

  return candidates;
}

// --------------------------------------------------------------------------
// Số tiền bằng chữ: "Một trăm hai mươi lăm nghìn đồng"
// --------------------------------------------------------------------------

const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  lam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
};
const SCALE_WORDS: Record<string, number> = {
  nghin: 1_000,
  ngan: 1_000,
  trieu: 1_000_000,
  ty: 1_000_000_000,
  ti: 1_000_000_000,
};
const FILLER_WORDS = new Set(['le', 'linh', 'dong', 'chan', 'vnd']);

/** Đọc số tiền viết bằng chữ tiếng Việt. Trả về null nếu dòng không phải số bằng chữ. */
export function parseVietnameseAmountWords(text: string): number | null {
  const folded = foldVietnamese(text).replace(/[^a-z\s]/g, ' ');
  if (/\d/.test(text)) return null;
  const words = folded.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  if (!words.some((word) => word in SCALE_WORDS || word === 'dong' || word === 'tram')) return null;

  let total = 0;
  let group = 0;
  let pending = 0;
  let numberWords = 0;

  for (const word of words) {
    if (word in DIGIT_WORDS) {
      pending = DIGIT_WORDS[word];
      numberWords++;
    } else if (word === 'tram') {
      group += (pending || 1) * 100;
      pending = 0;
      numberWords++;
    } else if (word === 'muoi') {
      group += (pending || 1) * 10;
      pending = 0;
      numberWords++;
    } else if (word in SCALE_WORDS) {
      total += (group + pending || 1) * SCALE_WORDS[word];
      group = 0;
      pending = 0;
      numberWords++;
    } else if (FILLER_WORDS.has(word)) {
      continue;
    } else {
      return null;
    }
  }

  total += group + pending;
  return numberWords >= 2 && total > 0 ? total : null;
}

function extractAmount(lines: OcrLine[]): { field: ExtractedField<number>; lineIndex: number } {
  const candidates = findAmountCandidates(lines);
  const wordAmounts = lines
    .map((line) => parseVietnameseAmountWords(line.text))
    .filter((value): value is number => value !== null);

  if (candidates.length === 0) {
    // Chỉ có số bằng chữ: vẫn gợi ý nhưng cần xác nhận
    return wordAmounts.length > 0
      ? { field: field(wordAmounts[0], 'low'), lineIndex: -1 }
      : { field: field<number>(null, 'none'), lineIndex: -1 };
  }

  const best = [...candidates].sort((a, b) => b.score - a.score || a.lineIndex - b.lineIndex)[0];
  const competitors = candidates.filter((c) => c.value !== best.value && c.score >= best.score - 1);
  const matchesWords = wordAmounts.includes(best.value);
  const contradictsWords = wordAmounts.length > 0 && !matchesWords;

  const isHigh =
    !best.disputed &&
    !contradictsWords &&
    competitors.length === 0 &&
    ((best.score >= 4 && best.lineConfidence >= MIN_LINE_CONFIDENCE_HIGH) || (matchesWords && best.score >= 3));

  return { field: field(best.value, isHigh ? 'high' : 'low'), lineIndex: best.lineIndex };
}

// ==========================================================================
// NGÀY
// ==========================================================================

const DATE_LABELS_STRONG = [/\bthoi gian giao dich\b/, /\bngay giao dich\b/, /\btransaction (?:date|time)\b/, /\bngay chuyen\b/];
const DATE_LABELS = [/\bthoi gian\b/, /\bngay\b/, /\bdate\b/, /\btime\b/];
const DATE_LABELS_WEAK = [/\bluc\b/];

function dateLabelScore(folded: string): number {
  if (hasAny(folded, DATE_LABELS_STRONG)) return 3;
  if (hasAny(folded, DATE_LABELS)) return 2;
  if (hasAny(folded, DATE_LABELS_WEAK)) return 1;
  return 0;
}
const NON_TRANSACTION_DATE_LABELS = [/\bhet han\b/, /\bexpir/, /\bngay sinh\b/, /\bhieu luc\b/, /\bvalid\b/, /\bdue\b/];
const MONTHS_EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

function findDatesInLine(text: string): string[] {
  const found: string[] = [];
  const folded = foldVietnamese(text);

  for (const m of text.matchAll(/(?<![\d:.,])(\d{1,2})([\/.\-])(\d{1,2})\2(\d{4}|\d{2})(?![\d.,])/g)) {
    if (m[4].length === 2 && m[2] !== '/') continue; // "12.09.26" dễ nhầm với số tiền
    const iso = toIsoDate(+m[4], +m[3], +m[1]);
    if (iso) found.push(iso);
  }
  for (const m of text.matchAll(/(?<!\d)(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})(?!\d)/g)) {
    const iso = toIsoDate(+m[1], +m[2], +m[3]);
    if (iso) found.push(iso);
  }
  for (const m of folded.matchAll(/(?<!\d)(\d{1,2})\s*(?:thg|thang)\s*(\d{1,2})\s*,?\s*(?:nam\s*)?(\d{4})(?!\d)/g)) {
    const iso = toIsoDate(+m[3], +m[2], +m[1]);
    if (iso) found.push(iso);
  }
  for (const m of folded.matchAll(/(?<!\d)(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})/g)) {
    const iso = toIsoDate(+m[3], MONTHS_EN[m[2]], +m[1]);
    if (iso) found.push(iso);
  }
  for (const m of folded.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/g)) {
    const iso = toIsoDate(+m[3], MONTHS_EN[m[1]], +m[2]);
    if (iso) found.push(iso);
  }
  return found;
}

function extractDate(lines: OcrLine[], today: string): ExtractedField<string> {
  const candidates: { value: string; score: number; lineConfidence: number; tooOld: boolean; disputed: boolean }[] = [];

  lines.forEach((line, index) => {
    const folded = foldVietnamese(line.text);
    if (hasAny(folded, NON_TRANSACTION_DATE_LABELS)) return;
    const previousFolded = index > 0 ? foldVietnamese(lines[index - 1].text) : '';

    for (const value of findDatesInLine(line.text)) {
      const age = daysBetween(value, today);
      if (age < -1) continue; // ngày trong tương lai: không phải ngày giao dịch đã diễn ra
      let score = 1 + dateLabelScore(folded);
      if (score === 1 && index > 0 && dateLabelScore(previousFolded) >= 2 && findDatesInLine(lines[index - 1].text).length === 0) {
        score += 1; // nhãn nằm ở dòng phía trên
      }
      // Ngày bị tranh chấp khi cụm chứa ngày được hai lượt OCR đọc khác nhau (giờ lệch thì không sao)
      const [year, month, day] = value.split('-');
      const disputed = (line.uncertainTokens ?? []).some((token) => {
        const digits = token.replace(/\D/g, '');
        return digits.includes(year) || (digits.length >= 4 && digits.includes(`${day}${month}`));
      });
      candidates.push({ value, score, lineConfidence: line.confidence, tooOld: age > 400, disputed });
    }
  });

  if (candidates.length === 0) return field<string>(null, 'none');

  const best = [...candidates].sort((a, b) => b.score - a.score)[0];
  const distinct = new Set(candidates.map((c) => c.value));
  const isHigh = distinct.size === 1 && best.lineConfidence >= 70 && !best.tooOld && !best.disputed;
  return field(best.value, isHigh ? 'high' : 'low');
}

// ==========================================================================
// NGƯỜI NHẬN / CỬA HÀNG
// ==========================================================================

const MERCHANT_LABELS: RegExp[] = [
  /^(?:ten )?nguoi thu huong\b/,
  /^(?:ten )?don vi thu huong\b/,
  /^ten tai khoan (?:nhan|thu huong|den)\b/,
  /^(?:ten )?nguoi nhan\b/,
  /^(?:ten )?nguoi huong(?: thu)?\b/,
  /^chuyen toi\b/,
  /^(?:ten )?don vi nhan\b/,
  /^beneficiary(?: name)?\b/,
  /^recipient(?: name)?\b/,
  /^receiver(?: name)?\b/,
  /^payee\b/,
  /^merchant(?: name)?\b/,
  /^cua hang\b/,
  /^nha cung cap\b/,
  /^chuyen den\b/,
  /^toi\b/,
  /^den\b/,
  /^to\b/,
];

/** Nhãn bắt đầu giống người nhận nhưng thực ra là số tài khoản / ngân hàng */
const MERCHANT_LABEL_EXCLUSIONS = /^(?:beneficiary|recipient|receiver|nguoi nhan|nguoi thu huong)\s+(?:account|acc|bank|so|tai khoan|ngan hang|stk)\b/;

function looksLikeName(value: string): boolean {
  const letters = (value.match(/[A-Za-zÀ-ỹ]/g) || []).length;
  const digits = (value.match(/\d/g) || []).length;
  return value.length >= 2 && value.length <= 60 && letters >= 2 && digits / value.length < 0.3;
}

function tidyName(value: string): string {
  const cleaned = value.replace(/^[\s:\-–|]+/, '').replace(/\s+/g, ' ').trim();
  const isAllCaps = cleaned === cleaned.toUpperCase() && /[A-ZÀ-Ỹ]/.test(cleaned);
  if (!isAllCaps) return cleaned;
  // Tên tài khoản ngân hàng luôn viết hoa không dấu; dấu xuất hiện là do OCR đoán thêm
  return foldVietnamese(cleaned)
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length <= 4 && /^(tnhh|jsc|cp|tmcp|dv|tm)$/.test(foldVietnamese(word)) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Cắt phần nhãn khỏi dòng gốc (giữ nguyên dấu) dựa trên độ dài nhãn đã bỏ dấu */
function stripLabel(raw: string, foldedLabelLength: number): string {
  // Bỏ dấu không đổi số ký tự cơ sở sau khi chuẩn hóa NFC -> cắt theo số ký tự tương ứng
  const normalized = raw.normalize('NFC');
  return normalized.slice(foldedLabelLength);
}

function extractMerchant(lines: OcrLine[], amountLineIndex: number): ExtractedField<string> {
  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index].text.trim().normalize('NFC');
    const folded = foldVietnamese(raw);
    if (MERCHANT_LABEL_EXCLUSIONS.test(folded)) continue;

    for (const label of MERCHANT_LABELS) {
      const match = folded.match(label);
      if (!match) continue;
      const isShortLabel = match[0].length <= 3;
      let value = stripLabel(raw, match[0].length).trim();
      let confidence = lines[index].confidence;

      if (isShortLabel && value && !/^[:\-]|^[A-ZÀ-Ỹ]/.test(value)) break; // "to be...", "đến hạn..."
      if (!value.replace(/^[\s:\-–]+/, '')) {
        const next = lines[index + 1];
        if (!next) break;
        value = next.text;
        confidence = Math.min(confidence, next.confidence);
      }
      value = tidyName(value);
      if (!looksLikeName(value)) break;
      return field(value, confidence >= 80 ? 'high' : 'low');
    }
  }

  // Không có nhãn (vd. chữ nhãn quá nhạt): tên viết hoa ngay sau dòng số tiền -> chỉ gợi ý
  if (amountLineIndex >= 0) {
    let inspected = 0;
    for (let index = amountLineIndex + 1; index < lines.length && inspected < 3; index++) {
      const text = lines[index].text.trim();
      // Bỏ qua dòng ngày giờ và dòng biểu tượng (mũi tên, logo) khi dò
      if (findDatesInLine(text).length > 0 || (text.match(/[A-Za-zÀ-ỹ]/g) || []).length < 2) continue;
      inspected++;
      const words = text.split(/\s+/);
      if (/^[A-ZÀ-Ỹ][A-ZÀ-Ỹ\s.]+$/.test(text) && words.length >= 2 && words.length <= 6) {
        return field(tidyName(text), 'low');
      }
    }
  }

  return field<string>(null, 'none');
}

// ==========================================================================
// MÃ GIAO DỊCH
// ==========================================================================

const REFERENCE_LABELS = [
  /\bma (?:so )?giao dich\b/,
  /\bso giao dich\b/,
  /\bma gd\b/,
  /\b(?:so|ma) tham chieu\b/,
  /\bso but toan\b/,
  /\btransaction (?:id|no|number|code)\b/,
  /\breference(?: no| number| code)?\b/,
  /\bref(?:\.| no)\b/,
  /\btrace\b/,
];

function extractReference(lines: OcrLine[]): ExtractedField<string> {
  const tokenPattern = /\b([A-Z0-9]{6,32})\b/;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index].text.normalize('NFC');
    const folded = foldVietnamese(raw);
    const labelMatch = REFERENCE_LABELS.map((pattern) => folded.match(pattern)).find(Boolean);
    if (!labelMatch) continue;

    const afterLabel = raw.slice((labelMatch.index ?? 0) + labelMatch[0].length);
    let match = afterLabel.toUpperCase().match(tokenPattern);
    let confidence = lines[index].confidence;
    if (!match && lines[index + 1]) {
      match = lines[index + 1].text.toUpperCase().match(tokenPattern);
      confidence = Math.min(confidence, lines[index + 1].confidence);
    }
    if (match && /\d/.test(match[1])) {
      const disputed = isDisputed(lines[index], match[1].replace(/\D/g, '')) || isDisputed(lines[index + 1] ?? { text: '', confidence: 0 }, match[1].replace(/\D/g, ''));
      return field(match[1], confidence >= 80 && !disputed ? 'high' : 'low');
    }
  }

  // Mã FT của các ngân hàng Việt Nam thường vẫn đọc được dù thiếu nhãn
  for (const line of lines) {
    const match = line.text.toUpperCase().match(/\b(FT\d{10,20}[A-Z0-9]*)\b/);
    if (match) return field(match[1], 'low');
  }

  return field<string>(null, 'none');
}

// ==========================================================================

export interface ExtractReceiptOptions {
  /** Ngày hiện tại 'YYYY-MM-DD' theo giờ máy người dùng */
  today: string;
}

export function extractReceipt(lines: OcrLine[], options: ExtractReceiptOptions): ReceiptExtraction {
  const cleanLines = lines
    .map((line) => ({ ...line, text: line.text.replace(/\s+/g, ' ').trim() }))
    .filter((line) => line.text.length > 0);

  const letterCount = cleanLines.reduce((sum, line) => sum + (line.text.match(/[A-Za-zÀ-ỹ0-9]/g) || []).length, 0);
  const amount = extractAmount(cleanLines);

  const averageConfidence =
    cleanLines.length > 0 ? cleanLines.reduce((sum, line) => sum + line.confidence, 0) / cleanLines.length : 0;

  return {
    amount: amount.field,
    date: extractDate(cleanLines, options.today),
    merchant: extractMerchant(cleanLines, amount.lineIndex),
    reference: extractReference(cleanLines),
    hasText: letterCount >= 8,
    averageConfidence: Math.round(averageConfidence),
  };
}
