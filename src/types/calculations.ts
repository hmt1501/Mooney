export interface DailyTotals {
  date: string; // 'YYYY-MM-DD'
  totalExpense: number;
  totalIncome: number;
  netChange: number;
  transactionCount: number;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number; // 0 to 100
}

export interface SafeDailySpendingResult {
  amountPerDay: number;
  remainingDays: number;
  remainingBalance: number;
  isNegative: boolean;
  explanation: string;
}

export interface MonthlyRecap {
  month: string; // 'YYYY-MM'
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  endingAvailableBalance: number;
  savingsRate: number; // % (0-100), = ((income - expense) / income) * 100 khi income > 0
  cashKept: number; // = income - expense (nếu > 0, ngược lại 0)
  topSpendingDay: {
    date: string;
    amount: number;
  } | null;
  transactionCount: number;
}

export type SpendingPaceStatus = 'slow' | 'normal' | 'fast' | 'warning';

export interface SpendingPaceResult {
  status: SpendingPaceStatus;
  message: string;
  subMessage?: string;
  expectedDailySpending: number;
  actualDailySpending: number;
  ratio: number;
}

export interface MonthlyIncomeSummary {
  month: string; // 'YYYY-MM'
  total: number; // Tổng dự tính trong tháng
  realized: number; // Đã nhận trong tháng (Khả dụng)
  upcoming: number; // Sắp nhận trong tháng
  totalReceived: number; // Tương thích ngược với realized
  totalUpcoming: number; // Tương thích ngược với upcoming
  recurringTotal: number;
  oneTimeTotal: number;
  count: number;
}

export type CategorySortOption = 'spending' | 'frequency';

