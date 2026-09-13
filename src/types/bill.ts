export type BillFrequency = 'never' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dueDate: string; // 'YYYY-MM-DD' của kỳ tiếp theo
  repeat: BillFrequency;
  note?: string;
  isActive: boolean;
  lastPaidDate?: string; // 'YYYY-MM-DD' khi hóa đơn được đánh dấu thanh toán
  lastPaidDueDate?: string; // 'YYYY-MM-DD' ngày đến hạn của kỳ vừa được thanh toán
  paidOccurrences?: string[]; // Mảng các dueDate đã thanh toán để chống trùng lặp
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillInput {
  name: string;
  amount: number;
  categoryId: string;
  dueDate: string;
  repeat: BillFrequency;
  note?: string;
}

export interface UpdateBillInput {
  name?: string;
  amount?: number;
  categoryId?: string;
  dueDate?: string;
  repeat?: BillFrequency;
  note?: string;
  isActive?: boolean;
  lastPaidDate?: string;
  lastPaidDueDate?: string;
  paidOccurrences?: string[];
}

