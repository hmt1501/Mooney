export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // ISO format 'YYYY-MM-DD'
  note?: string;
  billId?: string; // ID hóa đơn định kỳ (nếu giao dịch được sinh ra từ hóa đơn)
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // 'YYYY-MM-DD'
  note?: string;
  billId?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  categoryId?: string;
  date?: string;
  note?: string;
  billId?: string;
}

