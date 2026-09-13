export type IncomeType = 'recurring' | 'one_time';

export type IncomeRecurrence =
  | 'never'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | { frequency: string; dayOfMonth?: number };

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  date?: string; // ISO format 'YYYY-MM-DD'
  receivedDate?: string; // Ngày nhận thực tế / ngày cụ thể
  type?: IncomeType;
  recurrence?: IncomeRecurrence;
  receiveDay?: number; // Ngày trong tháng nhận tiền (1-31) đối với recurring monthly
  isActive: boolean; // true: đang hoạt động, false: tạm dừng (chỉ áp dụng cho recurring)
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeInput {
  name: string;
  amount: number;
  categoryId?: string;
  date?: string; // 'YYYY-MM-DD'
  receivedDate?: string;
  type?: IncomeType;
  recurrence?: IncomeRecurrence;
  receiveDay?: number;
  note?: string;
}

export interface UpdateIncomeInput {
  name?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
  receivedDate?: string;
  type?: IncomeType;
  recurrence?: IncomeRecurrence;
  receiveDay?: number;
  isActive?: boolean;
  note?: string;
}

export interface IncomeOccurrence {
  incomeId: string;
  name: string;
  amount: number;
  categoryId?: string;
  date: string; // Ngày phát sinh cụ thể 'YYYY-MM-DD'
  isReceived: boolean; // Đã đến ngày nhận hay chưa (date <= today)
  isRecurring: boolean;
}
