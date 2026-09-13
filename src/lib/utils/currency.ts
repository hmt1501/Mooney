/**
 * Định dạng tiền tệ VNĐ chuẩn hiển thị (ví dụ: 6.390.000 đ)
 */
export function formatCurrency(amount: number, showSign = false): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formatted = absAmount.toLocaleString('vi-VN');

  if (showSign) {
    if (amount > 0) return `+${formatted} đ`;
    if (amount < 0) return `-${formatted} đ`;
    return `${formatted} đ`;
  }

  return `${isNegative ? '-' : ''}${formatted} đ`;
}

/**
 * Định dạng tiền tệ thu gọn cho ô lịch (ví dụ: 150k, 1,2tr, 0đ)
 */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return '0đ';
  if (abs < 1_000) return `${abs}đ`;
  if (abs < 1_000_000) {
    const k = Math.round(abs / 1_000);
    return `${k}k`;
  }
  const tr = (abs / 1_000_000).toFixed(1).replace('.0', '');
  return `${tr}tr`;
}
