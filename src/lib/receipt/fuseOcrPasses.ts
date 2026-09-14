import { OcrLine } from '@/types/receipt';

/**
 * Ghép hai lượt OCR của cùng một ảnh:
 * - Lượt tiếng Việt: đọc đúng nhãn có dấu ("Tên người nhận", "Thời gian") -> giữ làm khung.
 * - Lượt tiếng Anh: đọc chữ số và tên viết hoa không dấu chính xác hơn nhiều
 *   (thực tế với font của VCB, model tiếng Việt đọc nhầm 3 thành 5).
 *
 * Với mỗi dòng: các cụm có chữ số lấy theo lượt tiếng Anh; cụm nào hai lượt đọc khác nhau
 * được đánh dấu "không chắc" để bước trích xuất không coi là chắc chắn.
 */

const DIGIT_TOKEN = /\d/;
const UPPER_WORD = /^[A-ZÀ-Ỹ]{2,}$/;

function foldUpper(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Đ/g, 'D').toUpperCase();
}

function digitsOf(token: string): string {
  return token.replace(/[^\d]/g, '');
}

function verticalOverlap(a: OcrLine, b: OcrLine): number {
  if (!a.bbox || !b.bbox) return 0;
  const overlap = Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0);
  const minHeight = Math.min(a.bbox.y1 - a.bbox.y0, b.bbox.y1 - b.bbox.y0);
  return minHeight > 0 ? Math.max(0, overlap) / minHeight : 0;
}

function fuseLine(primary: OcrLine, secondary: OcrLine): OcrLine {
  const tokens = primary.text.split(/\s+/);
  const altTokens = secondary.text.split(/\s+/);
  const uncertain: string[] = [];

  // 1. Cụm chữ số: thay theo thứ tự nếu hai lượt có cùng số cụm
  const digitIndexes = tokens.map((token, index) => (DIGIT_TOKEN.test(token) ? index : -1)).filter((index) => index >= 0);
  const altDigitTokens = altTokens.filter((token) => DIGIT_TOKEN.test(token));

  if (digitIndexes.length > 0) {
    if (digitIndexes.length === altDigitTokens.length) {
      digitIndexes.forEach((tokenIndex, i) => {
        const altToken = altDigitTokens[i];
        if (digitsOf(tokens[tokenIndex]) !== digitsOf(altToken)) uncertain.push(altToken);
        tokens[tokenIndex] = altToken;
      });
    } else {
      digitIndexes.forEach((tokenIndex) => uncertain.push(tokens[tokenIndex]));
    }
  }

  // 2. Tên viết hoa (tên tài khoản ngân hàng luôn không dấu): bỏ dấu thừa do model tiếng Việt thêm vào
  const upperIndexes = tokens.map((token, index) => (UPPER_WORD.test(token) ? index : -1)).filter((index) => index >= 0);
  const altUpper = altTokens.filter((token) => /^[A-Z]{2,}$/.test(token));
  let namesAgree = false;
  if (upperIndexes.length > 0 && upperIndexes.length === altUpper.length) {
    namesAgree = upperIndexes.every((tokenIndex, i) => foldUpper(tokens[tokenIndex]) === altUpper[i]);
    if (namesAgree) upperIndexes.forEach((tokenIndex, i) => (tokens[tokenIndex] = altUpper[i]));
  }
  const isContiguous = upperIndexes.every((tokenIndex, i) => i === 0 || tokenIndex === upperIndexes[i - 1] + 1);
  if (!namesAgree && upperIndexes.length > 0 && altUpper.length > 0 && isContiguous) {
    // Cùng tên nhưng khác cách tách từ ("PHAMHONG VUI" / "PHAM HONG VUI"): lấy bản tách nhiều từ hơn
    const primaryRun = upperIndexes.map((tokenIndex) => foldUpper(tokens[tokenIndex])).join('');
    if (primaryRun === altUpper.join('') && altUpper.length > upperIndexes.length) {
      tokens.splice(upperIndexes[0], upperIndexes.length, ...altUpper);
    }
  }

  // Hai model độc lập đọc ra đúng cùng chữ số / cùng tên -> tín hiệu mạnh hơn điểm tin cậy của từng lượt
  const digitsAgree = digitIndexes.length > 0 && uncertain.length === 0;
  const allAgree = (digitsAgree || (digitIndexes.length === 0 && namesAgree)) && uncertain.length === 0;

  return {
    text: tokens.join(' '),
    confidence: Math.max(primary.confidence, secondary.confidence, allAgree ? 85 : 0),
    bbox: primary.bbox,
    alt: secondary.text,
    uncertainTokens: uncertain.length > 0 ? uncertain : undefined,
  };
}

export function fuseOcrPasses(primary: OcrLine[], secondary: OcrLine[]): OcrLine[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary.map((line) => ({ ...line, confidence: Math.min(line.confidence, 70) }));

  // Ghép cặp theo vị trí dọc, mỗi dòng chỉ ghép một lần, ưu tiên cặp chồng lấn nhiều nhất
  const pairs: { p: number; s: number; overlap: number }[] = [];
  primary.forEach((line, p) =>
    secondary.forEach((other, s) => {
      const overlap = verticalOverlap(line, other);
      if (overlap >= 0.5) pairs.push({ p, s, overlap });
    })
  );
  pairs.sort((a, b) => b.overlap - a.overlap);

  const matchOfPrimary = new Map<number, number>();
  const usedSecondary = new Set<number>();
  for (const pair of pairs) {
    if (matchOfPrimary.has(pair.p) || usedSecondary.has(pair.s)) continue;
    matchOfPrimary.set(pair.p, pair.s);
    usedSecondary.add(pair.s);
  }

  const fused: OcrLine[] = primary.map((line, index) => {
    const match = matchOfPrimary.get(index);
    return match === undefined ? line : fuseLine(line, secondary[match]);
  });

  // Dòng chỉ lượt thứ hai đọc được: giữ lại nhưng không đủ tin cậy để thành "chắc chắn"
  secondary.forEach((line, index) => {
    if (!usedSecondary.has(index)) fused.push({ ...line, confidence: Math.min(line.confidence, 70) });
  });

  return fused.sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));
}
