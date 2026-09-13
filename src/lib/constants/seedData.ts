import { Transaction } from '@/types/transaction';
import { RecurringBill } from '@/types/bill';
import { UserSettings } from '@/types/settings';
import { DEFAULT_CATEGORIES } from './categories';

export const DEFAULT_SETTINGS: UserSettings = {
  startingBalance: 5_000_000, // 5 triệu đ số dư ban đầu
  currency: 'VND',
  theme: 'light',
  heatmapTheme: 'classic',
  updatedAt: new Date().toISOString(),
};

/**
 * Sinh bộ dữ liệu mẫu (Seed Data) sống động cho tháng hiện tại
 */
export function generateSeedData(): {
  settings: UserSettings;
  transactions: Transaction[];
  recurringBills: RecurringBill[];
} {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;

  const formatDay = (day: number) =>
    `${monthPrefix}-${String(day).padStart(2, '0')}`;

  const transactions: Transaction[] = [
    // 1. Thu nhập đầu tháng (Income)
    {
      id: 'tx-seed-inc-1',
      type: 'income',
      amount: 12_000_000,
      categoryId: 'cat-inc-salary',
      date: formatDay(1),
      note: 'Lương công ty chuyển khoản',
      createdAt: `${formatDay(1)}T09:00:00.000Z`,
      updatedAt: `${formatDay(1)}T09:00:00.000Z`,
    },
    // 2. Chi tiêu nhẹ (<100k - Low Heat)
    {
      id: 'tx-seed-exp-1',
      type: 'expense',
      amount: 45_000,
      categoryId: 'cat-exp-food',
      date: formatDay(2),
      note: 'Cafe sáng thứ hai',
      createdAt: `${formatDay(2)}T08:15:00.000Z`,
      updatedAt: `${formatDay(2)}T08:15:00.000Z`,
    },
    // 3. Chi tiêu vừa (100k - 500k - Medium Heat)
    {
      id: 'tx-seed-exp-2',
      type: 'expense',
      amount: 160_000,
      categoryId: 'cat-exp-food',
      date: formatDay(3),
      note: 'Ăn trưa cơm văn phòng',
      createdAt: `${formatDay(3)}T12:30:00.000Z`,
      updatedAt: `${formatDay(3)}T12:30:00.000Z`,
    },
    {
      id: 'tx-seed-exp-3',
      type: 'expense',
      amount: 80_000,
      categoryId: 'cat-exp-food',
      date: formatDay(3),
      note: 'Trà sữa buổi chiều',
      createdAt: `${formatDay(3)}T15:45:00.000Z`,
      updatedAt: `${formatDay(3)}T15:45:00.000Z`,
    },
    // 4. Chi tiêu nhẹ (<100k)
    {
      id: 'tx-seed-exp-4',
      type: 'expense',
      amount: 30_000,
      categoryId: 'cat-exp-transport',
      date: formatDay(4),
      note: 'Vé gửi xe & xăng nhẹ',
      createdAt: `${formatDay(4)}T18:00:00.000Z`,
      updatedAt: `${formatDay(4)}T18:00:00.000Z`,
    },
    // 5. Chi tiêu cao (>500k - High Heat)
    {
      id: 'tx-seed-exp-5',
      type: 'expense',
      amount: 850_000,
      categoryId: 'cat-exp-bills',
      date: formatDay(5),
      note: 'Tiền điện nước tháng trước',
      createdAt: `${formatDay(5)}T10:00:00.000Z`,
      updatedAt: `${formatDay(5)}T10:00:00.000Z`,
    },
    // 6. Chi tiêu vừa (Giáo dục)
    {
      id: 'tx-seed-exp-6',
      type: 'expense',
      amount: 220_000,
      categoryId: 'cat-exp-education',
      date: formatDay(6),
      note: 'Mua sách tài chính cá nhân',
      createdAt: `${formatDay(6)}T14:20:00.000Z`,
      updatedAt: `${formatDay(6)}T14:20:00.000Z`,
    },
    // 7. Chi tiêu nhẹ
    {
      id: 'tx-seed-exp-7',
      type: 'expense',
      amount: 55_000,
      categoryId: 'cat-exp-food',
      date: formatDay(7),
      note: 'Bánh mì & nước ép',
      createdAt: `${formatDay(7)}T08:30:00.000Z`,
      updatedAt: `${formatDay(7)}T08:30:00.000Z`,
    },
    // 8. Thu nhập thêm giữa tháng (Freelance)
    {
      id: 'tx-seed-inc-2',
      type: 'income',
      amount: 2_500_000,
      categoryId: 'cat-inc-freelance',
      date: formatDay(8),
      note: 'Thanh toán thiết kế banner dự án',
      createdAt: `${formatDay(8)}T16:00:00.000Z`,
      updatedAt: `${formatDay(8)}T16:00:00.000Z`,
    },
    // 9. Chi tiêu vừa
    {
      id: 'tx-seed-exp-8',
      type: 'expense',
      amount: 350_000,
      categoryId: 'cat-exp-entertainment',
      date: formatDay(9),
      note: 'Vé xem phim & bắp nước cuối tuần',
      createdAt: `${formatDay(9)}T19:30:00.000Z`,
      updatedAt: `${formatDay(9)}T19:30:00.000Z`,
    },
    // 10. Chi tiêu cao (Mua sắm siêu thị)
    {
      id: 'tx-seed-exp-9',
      type: 'expense',
      amount: 1_280_000,
      categoryId: 'cat-exp-food',
      date: formatDay(10),
      note: 'Đi siêu thị thực phẩm gia đình tuần',
      createdAt: `${formatDay(10)}T11:15:00.000Z`,
      updatedAt: `${formatDay(10)}T11:15:00.000Z`,
    },
    // 11. Chi tiêu vừa (Mua sắm cá nhân)
    {
      id: 'tx-seed-exp-10',
      type: 'expense',
      amount: 450_000,
      categoryId: 'cat-exp-shopping',
      date: formatDay(11),
      note: 'Áo thun Uniqlo',
      createdAt: `${formatDay(11)}T17:00:00.000Z`,
      updatedAt: `${formatDay(11)}T17:00:00.000Z`,
    },
    // 12. Chi tiêu cao (Bảo dưỡng xe máy)
    {
      id: 'tx-seed-exp-11',
      type: 'expense',
      amount: 680_000,
      categoryId: 'cat-exp-transport',
      date: formatDay(12),
      note: 'Thay nhớt & bảo dưỡng xe định kỳ',
      createdAt: `${formatDay(12)}T15:30:00.000Z`,
      updatedAt: `${formatDay(12)}T15:30:00.000Z`,
    },
  ];

  const recurringBills: RecurringBill[] = [
    {
      id: 'bill-seed-1',
      name: 'Netflix Premium',
      amount: 159_000,
      categoryId: 'cat-exp-entertainment',
      dueDate: formatDay(15),
      repeat: 'monthly',
      note: 'Tài khoản gia đình 4K',
      isActive: true,
      createdAt: `${formatDay(1)}T00:00:00.000Z`,
      updatedAt: `${formatDay(1)}T00:00:00.000Z`,
    },
    {
      id: 'bill-seed-2',
      name: 'Internet Cáp Quang FPT',
      amount: 220_000,
      categoryId: 'cat-exp-bills',
      dueDate: formatDay(18),
      repeat: 'monthly',
      note: 'Gói cáp quang tốc độ cao',
      isActive: true,
      createdAt: `${formatDay(1)}T00:00:00.000Z`,
      updatedAt: `${formatDay(1)}T00:00:00.000Z`,
    },
    {
      id: 'bill-seed-3',
      name: 'Thẻ Tập Gym Tháng',
      amount: 450_000,
      categoryId: 'cat-exp-health',
      dueDate: formatDay(25),
      repeat: 'monthly',
      note: 'California Fitness pass',
      isActive: true,
      createdAt: `${formatDay(1)}T00:00:00.000Z`,
      updatedAt: `${formatDay(1)}T00:00:00.000Z`,
    },
  ];

  return {
    settings: DEFAULT_SETTINGS,
    transactions,
    recurringBills,
  };
}
