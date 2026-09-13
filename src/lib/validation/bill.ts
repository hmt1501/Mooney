import { CreateBillInput, BillFrequency } from '@/types/bill';

export interface BillValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    amount?: string;
    dueDate?: string;
    repeat?: string;
    categoryId?: string;
    note?: string;
  };
}

const VALID_FREQUENCIES: BillFrequency[] = ['never', 'weekly', 'monthly', 'yearly'];

export function validateBillInput(
  input: Partial<CreateBillInput>,
  validCategoryIds?: string[]
): BillValidationResult {
  const errors: BillValidationResult['errors'] = {};

  // 1. Tên hóa đơn
  if (!input.name || input.name.trim().length === 0) {
    errors.name = 'Vui lòng nhập tên hóa đơn';
  } else if (input.name.trim().length > 100) {
    errors.name = 'Tên hóa đơn không được vượt quá 100 ký tự';
  }

  // 2. Số tiền
  if (input.amount === undefined || input.amount === null || isNaN(input.amount)) {
    errors.amount = 'Vui lòng nhập số tiền';
  } else if (input.amount <= 0) {
    errors.amount = 'Số tiền hóa đơn phải lớn hơn 0';
  } else if (!isFinite(input.amount) || input.amount > 100_000_000_000) {
    errors.amount = 'Số tiền không hợp lệ hoặc quá lớn';
  }

  // 3. Ngày đến hạn
  if (!input.dueDate || typeof input.dueDate !== 'string') {
    errors.dueDate = 'Vui lòng chọn ngày đến hạn';
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.dueDate)) {
      errors.dueDate = 'Ngày đến hạn không hợp lệ (định dạng YYYY-MM-DD)';
    } else {
      const parsed = new Date(input.dueDate + 'T00:00:00');
      if (isNaN(parsed.getTime())) {
        errors.dueDate = 'Ngày đến hạn không tồn tại';
      }
    }
  }

  // 4. Tần suất lặp lại
  if (!input.repeat || !VALID_FREQUENCIES.includes(input.repeat)) {
    errors.repeat = 'Tần suất lặp lại không hợp lệ (never, weekly, monthly, yearly)';
  }

  // 5. Danh mục
  if (!input.categoryId || input.categoryId.trim().length === 0) {
    errors.categoryId = 'Vui lòng chọn danh mục cho hóa đơn';
  } else if (validCategoryIds && validCategoryIds.length > 0 && !validCategoryIds.includes(input.categoryId)) {
    errors.categoryId = 'Danh mục được chọn không hợp lệ';
  }

  // 6. Ghi chú (tùy chọn)
  if (input.note && input.note.length > 200) {
    errors.note = 'Ghi chú không được vượt quá 200 ký tự';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
