import { describe, it, expect } from 'vitest';
import { validateTransactionInput } from '../transaction';
import { CreateTransactionInput } from '@/types/transaction';

describe('Transaction Validation', () => {
  it('hợp lệ khi đủ các trường bắt buộc chuẩn', () => {
    const res = validateTransactionInput({
      type: 'expense',
      amount: 150_000,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
      note: 'Ăn trưa',
    });
    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
  });

  it('báo lỗi khi số tiền <= 0 hoặc rỗng', () => {
    const resZero = validateTransactionInput({
      type: 'expense',
      amount: 0,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
    });
    expect(resZero.isValid).toBe(false);
    expect(resZero.errors.amount).toBeDefined();

    const resNeg = validateTransactionInput({
      type: 'expense',
      amount: -50_000,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
    });
    expect(resNeg.isValid).toBe(false);
    expect(resNeg.errors.amount).toBeDefined();
  });

  it('báo lỗi khi thiếu categoryId', () => {
    const res = validateTransactionInput({
      type: 'expense',
      amount: 100_000,
      categoryId: '',
      date: '2026-09-13',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.categoryId).toBeDefined();
  });

  it('báo lỗi khi ngày sai định dạng hoặc không hợp lệ', () => {
    const res = validateTransactionInput({
      type: 'income',
      amount: 10_000_000,
      categoryId: 'cat-inc-salary',
      date: 'invalid-date',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.date).toBeDefined();
  });

  it('báo lỗi khi loại giao dịch không hợp lệ', () => {
    const res = validateTransactionInput({
      type: 'transfer' as unknown as CreateTransactionInput['type'],
      amount: 100_000,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
    });
    expect(res.isValid).toBe(false);
    expect(res.errors.type).toBeDefined();
  });
});
