/**
 * Id giao dịch cho khoản chi tạo từ hóa đơn. Dùng làm khóa idempotency:
 * cùng một id thì chỉ có tối đa một giao dịch, dù người dùng bấm hai lần,
 * đọc lại ảnh, hay mạng thử gửi lại khi đồng bộ.
 */

function fnv1a(text: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * - Có mã giao dịch ngân hàng: id cố định theo (người dùng, mã giao dịch)
 *   -> quét lại cùng một hóa đơn vào lúc khác cũng không tạo khoản chi thứ hai.
 *   Gắn với người dùng vì ảnh chuyển khoản hay được gửi cho người khác; id trên cloud là duy nhất toàn hệ thống.
 * - Không có mã: id theo phiên quét (giữ nguyên qua các lần chụp lại / đọc lại trong cùng phiên).
 */
export function buildReceiptTransactionId(params: {
  ownerScope: string | null;
  reference: string | null;
  sessionId: string;
}): string {
  const reference = params.reference?.replace(/\s+/g, '').toUpperCase();
  if (reference && reference.length >= 6 && /\d/.test(reference)) {
    const key = `${params.ownerScope ?? 'guest'}|${reference}`;
    return `tx-rcpt-${fnv1a(key, 0x811c9dc5)}${fnv1a(key, 0x01234567)}`;
  }
  return `tx-rcpt-s-${params.sessionId}`;
}

export function createScanSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
