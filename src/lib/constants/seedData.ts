import { Transaction } from '@/types/transaction';
import { RecurringBill } from '@/types/bill';
import { IncomeItem } from '@/types/income';
import { UserSettings } from '@/types/settings';
import { DEFAULT_CATEGORIES } from './categories';

export const DEFAULT_SETTINGS: UserSettings = {
  startingBalance: 0, // Mặc định 0 đ
  currency: 'VND',
  theme: 'light',
  heatmapTheme: 'classic',
  spendingLevels: {
    lowMax: 100_000,
    mediumMax: 500_000,
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Khởi tạo dữ liệu mặc định ban đầu: toàn bộ trở về 0
 */
export function generateSeedData(): {
  settings: UserSettings;
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  incomes: IncomeItem[];
} {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      startingBalance: 0,
      updatedAt: new Date().toISOString(),
    },
    transactions: [],
    recurringBills: [],
    incomes: [],
  };
}
