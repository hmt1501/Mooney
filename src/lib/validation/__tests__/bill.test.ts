import { describe, it, expect } from 'vitest';
import { validateBillInput } from '../bill';

describe('validateBillInput', () => {
  it('hợp lệ khi đủ các trường bắt buộc', () => {
    const result = validateBillInput(
      {
        name: 'Tiền Internet FPT',
        amount: 220000,
        dueDate: '2026-09-20',
        repeat: 'monthly',
        categoryId: 'cat-bills',
      },
      ['cat-bills', 'cat-food']
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('báo lỗi khi thiếu hoặc sai tên', () => {
    const emptyName = validateBillInput({
      name: '',
      amount: 100000,
      dueDate: '2026-09-20',
      repeat: 'monthly',
      categoryId: 'cat-bills',
    });
    expect(emptyName.isValid).toBe(false);
    expect(emptyName.errors.name).toBeDefined();

    const tooLongName = validateBillInput({
      name: 'A'.repeat(101),
      amount: 100000,
      dueDate: '2026-09-20',
      repeat: 'monthly',
      categoryId: 'cat-bills',
    });
    expect(tooLongName.isValid).toBe(false);
    expect(tooLongName.errors.name).toBeDefined();
  });

  it('báo lỗi khi số tiền không hợp lệ (<= 0 hoặc NaN)', () => {
    const zeroAmount = validateBillInput({
      name: 'Internet',
      amount: 0,
      dueDate: '2026-09-20',
      repeat: 'monthly',
      categoryId: 'cat-bills',
    });
    expect(zeroAmount.isValid).toBe(false);
    expect(zeroAmount.errors.amount).toBeDefined();

    const negativeAmount = validateBillInput({
      name: 'Internet',
      amount: -50000,
      dueDate: '2026-09-20',
      repeat: 'monthly',
      categoryId: 'cat-bills',
    });
    expect(negativeAmount.isValid).toBe(false);
    expect(negativeAmount.errors.amount).toBeDefined();
  });

  it('báo lỗi khi ngày đến hạn sai định dạng', () => {
    const invalidDate = validateBillInput({
      name: 'Internet',
      amount: 100000,
      dueDate: '20-09-2026',
      repeat: 'monthly',
      categoryId: 'cat-bills',
    });
    expect(invalidDate.isValid).toBe(false);
    expect(invalidDate.errors.dueDate).toBeDefined();
  });

  it('báo lỗi khi tần suất lặp không hợp lệ', () => {
    const invalidRepeat = validateBillInput({
      name: 'Internet',
      amount: 100000,
      dueDate: '2026-09-20',
      repeat: 'daily' as any,
      categoryId: 'cat-bills',
    });
    expect(invalidRepeat.isValid).toBe(false);
    expect(invalidRepeat.errors.repeat).toBeDefined();
  });

  it('báo lỗi khi danh mục không tồn tại trong danh sách hợp lệ', () => {
    const invalidCategory = validateBillInput(
      {
        name: 'Internet',
        amount: 100000,
        dueDate: '2026-09-20',
        repeat: 'monthly',
        categoryId: 'cat-non-existent',
      },
      ['cat-bills', 'cat-food']
    );
    expect(invalidCategory.isValid).toBe(false);
    expect(invalidCategory.errors.categoryId).toBeDefined();
  });
});
