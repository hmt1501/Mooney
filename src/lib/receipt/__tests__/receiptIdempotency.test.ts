import { describe, it, expect, beforeEach } from 'vitest';
import { buildReceiptTransactionId } from '../receiptTransactionId';
import { measureSharpness, meanLuminance } from '../imageProcessing';
import { createLocalRepositories } from '@/lib/repository/localRepository';
import { calculateAvailableBalance, calculateCategoryTotals, calculateDailyTotals } from '@/lib/calculations/financial';

const store = new Map<string, string>();
(globalThis as unknown as { window: { localStorage: Storage } }).window = {
  localStorage: {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  },
};

describe('Id giao dịch từ hóa đơn', () => {
  it('cùng người dùng + cùng mã giao dịch -> cùng id, dù quét ở phiên khác', () => {
    const a = buildReceiptTransactionId({ ownerScope: 'user-1', reference: 'FT26256123456789', sessionId: 's1' });
    const b = buildReceiptTransactionId({ ownerScope: 'user-1', reference: 'ft26256123456789 ', sessionId: 's2' });
    expect(a).toBe(b);
  });

  it('người khác quét cùng ảnh chuyển khoản -> id khác (không đụng bản ghi của nhau trên cloud)', () => {
    const a = buildReceiptTransactionId({ ownerScope: 'user-1', reference: 'FT26256123456789', sessionId: 's' });
    const b = buildReceiptTransactionId({ ownerScope: 'user-2', reference: 'FT26256123456789', sessionId: 's' });
    expect(a).not.toBe(b);
  });

  it('không có mã giao dịch -> id theo phiên quét', () => {
    expect(buildReceiptTransactionId({ ownerScope: null, reference: null, sessionId: 'abc' })).toBe('tx-rcpt-s-abc');
    expect(buildReceiptTransactionId({ ownerScope: null, reference: 'ABC', sessionId: 'abc' })).toBe('tx-rcpt-s-abc');
  });
});

describe('Tạo khoản chi idempotent', () => {
  beforeEach(() => store.clear());

  it('gửi lại cùng id (bấm 2 lần, thử lại) chỉ tạo một giao dịch', async () => {
    const repo = createLocalRepositories('user-1');
    await repo.dataManagement.initializeWithSeedData();
    const input = { type: 'expense' as const, amount: 125_000, categoryId: 'cat-exp-other', date: '2026-09-13', note: 'Nguyen Van An' };

    const [first, second] = await Promise.all([
      repo.transactions.create(input, { id: 'tx-rcpt-1' }),
      repo.transactions.create(input, { id: 'tx-rcpt-1' }),
    ]);
    const third = await repo.transactions.create({ ...input, amount: 999 }, { id: 'tx-rcpt-1' });

    const all = await repo.transactions.getAll();
    expect(all.filter((tx) => tx.id === 'tx-rcpt-1')).toHaveLength(1);
    expect(first.id).toBe(second.id);
    expect(third.amount).toBe(125_000);
  });

  it('khoản chi từ hóa đơn cập nhật Số dư, Lịch và Thống kê từ cùng nguồn giao dịch', async () => {
    const repo = createLocalRepositories('user-1');
    await repo.dataManagement.initializeWithSeedData();
    await repo.settings.updateStartingBalance(1_000_000);
    await repo.transactions.create(
      { type: 'expense', amount: 125_000, categoryId: 'cat-exp-other', date: '2026-09-13' },
      { id: 'tx-rcpt-2' }
    );

    const transactions = await repo.transactions.getAll();
    expect(calculateAvailableBalance(1_000_000, transactions, [])).toBe(875_000);
    expect(calculateDailyTotals(transactions, '2026-09-13').totalExpense).toBe(125_000);
    const totals = calculateCategoryTotals(transactions, await repo.categories.getAll(), '2026-09');
    expect(totals.find((t) => t.categoryId === 'cat-exp-other')?.totalAmount).toBe(125_000);
  });
});

describe('Đo độ nét ảnh', () => {
  const makeImage = (width: number, height: number, sharp: boolean) => {
    const gray = new Uint8ClampedArray(width * height).fill(245);
    for (let y = 20; y < height - 20; y += 12) {
      for (let x = 10; x < width - 10; x++) {
        if ((x >> 3) % 2 === 0) gray[y * width + x] = 20;
        if (sharp) continue;
      }
    }
    if (sharp) return gray;
    // làm mờ: trung bình hộp 7x7 lặp 3 lần
    let current = gray;
    for (let pass = 0; pass < 3; pass++) {
      const next = new Uint8ClampedArray(current.length);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < height && xx >= 0 && xx < width) { sum += current[yy * width + xx]; count++; }
          }
          next[y * width + x] = sum / count;
        }
      }
      current = next;
    }
    return current;
  };

  it('ảnh chữ nét có điểm cao hơn hẳn ảnh mờ và vượt ngưỡng', () => {
    const sharp = measureSharpness(makeImage(320, 400, true), 320, 400);
    const blurry = measureSharpness(makeImage(320, 400, false), 320, 400);
    expect(sharp).toBeGreaterThan(1000);
    expect(blurry).toBeLessThan(60);
  });

  it('độ sáng trung bình phát hiện ảnh nền tối', () => {
    expect(meanLuminance(new Uint8ClampedArray(100).fill(20))).toBe(20);
  });
});
