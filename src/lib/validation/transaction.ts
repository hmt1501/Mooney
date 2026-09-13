import { CreateTransactionInput, TransactionType } from '@/types/transaction';

export interface ValidationResult {
  isValid: boolean;
  errors: {
    amount?: string;
    type?: string;
    categoryId?: string;
    date?: string;
    note?: string;
  };
}

/**
 * Kiểm tra tính hợp lệ nghiêm ngặt của giao dịch theo đúng đặc tả:
 * - amount: bắt buộc, số dương (> 0), hữu hạn
 * - type: bắt buộc là 'expense' hoặc 'income'
 * - categoryId: bắt buộc, không được để trống
 * - date: bắt buộc, định dạng 'YYYY-MM-DD' hợp lệ
 * - note: tùy chọn, tối đa 200 ký tự
 */
export function validateTransactionInput(
  input: Partial<CreateTransactionInput>
): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  // 1. Kiểm tra số tiền (Amount)
  if (input.amount === undefined || input.amount === null || isNaN(input.amount)) {
    errors.amount = 'Vui lòng nhập số tiền.';
  } else if (input.amount <= 0) {
    errors.amount = 'Số tiền phải lớn hơn 0 đ.';
  } else if (!Number.isFinite(input.amount)) {
    errors.amount = 'Số tiền không hợp lệ.';
  } else if (input.amount > 100_000_000_000) {
    errors.amount = 'Số tiền vượt quá giới hạn cho phép (tối đa 100 tỷ đ).';
  }

  // 2. Kiểm tra loại giao dịch (Type)
  if (!input.type || (input.type !== 'expense' && input.type !== 'income')) {
    errors.type = 'Loại giao dịch phải là Chi tiêu hoặc Thu nhập.';
  }

  // 3. Kiểm tra danh mục (Category)
  if (!input.categoryId || typeof input.categoryId !== 'string' || input.categoryId.trim() === '') {
    errors.categoryId = 'Vui lòng chọn một danh mục.';
  }

  // 4. Kiểm tra ngày (Date)
  if (!input.date || typeof input.date !== 'string') {
    errors.date = 'Vui lòng chọn ngày giao dịch.';
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      errors.date = 'Định dạng ngày không hợp lệ (YYYY-MM-DD).';
    } else {
      const parsed = new Date(input.date + 'T00:00:00');
      if (isNaN(parsed.getTime())) {
        errors.date = 'Ngày giao dịch không tồn tại.';
      }
    }
  }

  // 5. Kiểm tra ghi chú (Note - tùy chọn)
  if (input.note && input.note.length > 200) {
    errors.note = 'Ghi chú không được vượt quá 200 ký tự.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
