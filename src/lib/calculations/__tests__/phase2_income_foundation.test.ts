import { describe, it, expect } from 'vitest';
import {
  calculateAvailableBalance,
  calculateSpentMoney,
  calculateSafeDailySpending,
  calculateSpendingPace,
  sortCategoryTotals,
  sortCategoryTransactions,
} from '../financial';
import {
  calculateRealizedIncome,
  calculateMonthlyIncomeSummary,
  getIncomeOccurrencesForMonth,
  getUpcomingIncomes,
  getDaysInMonth,
} from '../income';
import { getHeatLevel } from '@/lib/constants/heatmap';
import { IncomeItem } from '@/types/income';
import { Transaction } from '@/types/transaction';
import { CategoryTotal } from '@/types/calculations';

describe('Phase 2: Income Management & Financial Foundation Tests', () => {
  // 1. Accounting Equation: Starting + Realized Income - Expense = Available Money
  describe('1. Available Money & Spent Money calculation', () => {
    it('chính xác theo yêu cầu: Starting = 5m, Income = 10m, Expense = 2m => Available = 13m, Spent = 2m', () => {
      const startingBalance = 5_000_000;

      const incomes: IncomeItem[] = [
        {
          id: 'inc-1',
          name: 'Freelance',
          amount: 10_000_000,
          type: 'one_time',
          receivedDate: '2026-09-05',
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ];

      const transactions: Transaction[] = [
        {
          id: 'tx-1',
          type: 'expense',
          amount: 2_000_000,
          categoryId: 'cat-food',
          date: '2026-09-06',
          createdAt: '2026-09-06T00:00:00Z',
          updatedAt: '2026-09-06T00:00:00Z',
        },
      ];

      const availableMoney = calculateAvailableBalance(
        startingBalance,
        transactions,
        incomes,
        '2026-09-10'
      );
      const spentMoney = calculateSpentMoney(transactions, '2026-09');

      expect(availableMoney).toBe(13_000_000);
      expect(spentMoney).toBe(2_000_000);
    });

    it('cộng chính xác CẢ HAI nguồn thu: từ Incomes (định kỳ/một lần) VÀ giao dịch thu nhập trực tiếp (type=income)', () => {
      const startingBalance = 0; // Mặc định 0 đ

      // 1. Nguồn thu từ Incomes (ví dụ Lương nhận ngày 05/09)
      const incomes: IncomeItem[] = [
        {
          id: 'inc-salary',
          name: 'Lương',
          amount: 10_000_000,
          type: 'recurring',
          recurrence: 'monthly',
          receiveDay: 5,
          isActive: true,
          date: '2026-09-01',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ];

      // 2. Giao dịch nhập tay: 1 khoản thu 3m, 1 khoản chi 4m
      const transactions: Transaction[] = [
        {
          id: 'tx-manual-inc',
          type: 'income',
          amount: 3_000_000,
          categoryId: 'cat-bonus',
          date: '2026-09-08',
          createdAt: '2026-09-08T00:00:00Z',
          updatedAt: '2026-09-08T00:00:00Z',
        },
        {
          id: 'tx-manual-exp',
          type: 'expense',
          amount: 4_000_000,
          categoryId: 'cat-food',
          date: '2026-09-09',
          createdAt: '2026-09-09T00:00:00Z',
          updatedAt: '2026-09-09T00:00:00Z',
        },
      ];

      // Available = 0 + 10m (incomes) + 3m (tx income) - 4m (tx expense) = 9m
      const available = calculateAvailableBalance(
        startingBalance,
        transactions,
        incomes,
        '2026-09-10'
      );
      const spent = calculateSpentMoney(transactions, '2026-09');

      expect(available).toBe(9_000_000);
      expect(spent).toBe(4_000_000);
    });

    it('Starting Balance KHÔNG phải là Transaction hay Income (không bị cộng dồn trong Income Summary)', () => {
      const startingBalance = 5_000_000;
      const incomes: IncomeItem[] = [
        {
          id: 'inc-1',
          name: 'Thưởng',
          amount: 3_000_000,
          type: 'one_time',
          receivedDate: '2026-09-10',
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summary = calculateMonthlyIncomeSummary(
        incomes,
        2026,
        9,
        new Date('2026-09-15')
      );

      // Tổng income chỉ là 3m, không được chứa 5m starting balance
      expect(summary.total).toBe(3_000_000);
      expect(summary.realized).toBe(3_000_000);
    });
  });

  // 2. Recurring Income & Timing Rule: Không được tính lương trước ngày nhận
  describe('2. Recurring Income timing & Idempotency', () => {
    const salaryIncome: IncomeItem = {
      id: 'inc-salary',
      name: 'Salary',
      amount: 15_000_000,
      type: 'recurring',
      date: '2026-09-01',
      recurrence: {
        frequency: 'monthly',
        dayOfMonth: 25,
      },
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    it('Ngày 20: Salary chưa được nhận -> không cộng vào Available Money', () => {
      const startingBalance = 5_000_000;
      const transactions: Transaction[] = [];

      // Giả sử hôm nay là ngày 20/09/2026
      const balanceOn20th = calculateAvailableBalance(
        startingBalance,
        transactions,
        [salaryIncome],
        '2026-09-20'
      );

      // Chỉ có starting balance 5m, 15m lương chưa đến ngày nhận
      expect(balanceOn20th).toBe(5_000_000);
    });

    it('Ngày 25: Salary occurrence được ghi nhận -> cộng vào Available Money', () => {
      const startingBalance = 5_000_000;
      const transactions: Transaction[] = [];

      // Hôm nay là ngày 25/09/2026 (ngày nhận lương)
      const balanceOn25th = calculateAvailableBalance(
        startingBalance,
        transactions,
        [salaryIncome],
        '2026-09-25'
      );

      // 5m + 15m = 20m
      expect(balanceOn25th).toBe(20_000_000);
    });

    it('Cơ chế Idempotency: Gọi calculateAvailableBalance nhiều lần liên tiếp không làm nhân đôi số tiền', () => {
      const startingBalance = 5_000_000;
      const transactions: Transaction[] = [];

      const call1 = calculateAvailableBalance(
        startingBalance,
        transactions,
        [salaryIncome],
        '2026-09-28'
      );
      const call2 = calculateAvailableBalance(
        startingBalance,
        transactions,
        [salaryIncome],
        '2026-09-28'
      );
      const call3 = calculateAvailableBalance(
        startingBalance,
        transactions,
        [salaryIncome],
        '2026-09-28'
      );

      expect(call1).toBe(20_000_000);
      expect(call2).toBe(20_000_000);
      expect(call3).toBe(20_000_000);
    });

    it('Tạm dừng nguồn thu (isActive = false): không được tính vào Available Money', () => {
      const pausedSalary: IncomeItem = {
        ...salaryIncome,
        isActive: false,
      };

      const balance = calculateAvailableBalance(
        5_000_000,
        [],
        [pausedSalary],
        '2026-09-26'
      );

      expect(balance).toBe(5_000_000);
    });
  });

  // 3. Recurrence Engine: Next occurrence, month lengths & edge cases
  describe('3. Recurrence Engine & Month Lengths', () => {
    it('xử lý ngày nhận 31 vào tháng chỉ có 30 ngày (ví dụ tháng 9)', () => {
      const incomeEndMonth: IncomeItem = {
        id: 'inc-end',
        name: 'End Month Bonus',
        amount: 2_000_000,
        type: 'recurring',
        recurrence: {
          frequency: 'monthly',
          dayOfMonth: 31,
        },
        isActive: true,
        createdAt: '',
        updatedAt: '',
      };

      const occurrences = getIncomeOccurrencesForMonth(incomeEndMonth, 2026, 9);
      expect(occurrences).toHaveLength(1);
      // Tháng 9 chỉ có 30 ngày => rơi vào ngày 30
      expect(occurrences[0].date).toBe('2026-09-30');
    });

    it('xử lý tháng 2 năm nhuận 2028 (29 ngày) và không nhuận 2026 (28 ngày)', () => {
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2028, 2)).toBe(29);

      const recurringDay30: IncomeItem = {
        id: 'inc-30',
        name: 'Test',
        amount: 1_000_000,
        type: 'recurring',
        date: '2026-01-01',
        recurrence: { frequency: 'monthly', dayOfMonth: 30 },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const feb2026 = getIncomeOccurrencesForMonth(recurringDay30, 2026, 2);
      expect(feb2026[0].date).toBe('2026-02-28');

      const feb2028 = getIncomeOccurrencesForMonth(recurringDay30, 2028, 2);
      expect(feb2028[0].date).toBe('2026-02-29'.replace('2026', '2028'));
    });

    it('xác định chính xác Upcoming Incomes trong 30 ngày tới', () => {
      const incomes: IncomeItem[] = [
        {
          id: 'inc-salary',
          name: 'Salary',
          amount: 15_000_000,
          type: 'recurring',
          recurrence: { frequency: 'monthly', dayOfMonth: 25 },
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
      ];

      // Ngày 15/09/2026
      const upcoming = getUpcomingIncomes(incomes, new Date('2026-09-15'), 30);
      expect(upcoming.length).toBeGreaterThanOrEqual(1);
      expect(upcoming[0].date).toBe('2026-09-25');
      expect(upcoming[0].amount).toBe(15_000_000);
    });
  });

  // 4. Safe Daily Spending & Spending Pace
  describe('4. Safe Daily Spending & Spending Pace (Rule-based, NO AI)', () => {
    it('tính đúng Safe Daily Spending', () => {
      // 13m trong ngày 10/09 (tháng 9 có 30 ngày => 30 - 10 + 1 = 21 ngày)
      const result = calculateSafeDailySpending(13_000_000, '2026-09-10');
      expect(result.remainingDays).toBe(21);
      expect(result.amountPerDay).toBe(Math.floor(13_000_000 / 21));
      expect(result.isNegative).toBe(false);
    });

    it('xử lý số dư âm cho Safe Daily Spending', () => {
      const result = calculateSafeDailySpending(-500_000, '2026-09-10');
      expect(result.amountPerDay).toBe(0);
      expect(result.isNegative).toBe(true);
    });

    it('tính đúng Spending Pace theo các ngưỡng rule-based', () => {
      // Chưa chi tiêu
      const pace0 = calculateSpendingPace(0, 30, 10, 10_000_000);
      expect(pace0.status).toBe('slow');

      // Chi tiêu bình thường (tiến độ chi tương ứng tiến độ ngày)
      const paceNormal = calculateSpendingPace(3_000_000, 30, 10, 10_000_000);
      expect(paceNormal.status).toBe('normal');

      // Chi tiêu quá nhanh
      const paceWarning = calculateSpendingPace(8_000_000, 30, 10, 10_000_000);
      expect(paceWarning.status).toBe('warning');
    });
  });

  // 5. Custom Spending Levels (Heatmap Configuration)
  describe('5. Custom Spending Levels', () => {
    it('sử dụng threshold mặc định (100k, 500k)', () => {
      expect(getHeatLevel(50_000)).toBe('low');
      expect(getHeatLevel(200_000)).toBe('medium');
      expect(getHeatLevel(600_000)).toBe('high');
    });

    it('sử dụng custom thresholds (lowMax: 50k, mediumMax: 200k)', () => {
      const customConfig = {
        lowMax: 50_000,
        mediumMax: 200_000,
      };

      expect(getHeatLevel(40_000, customConfig)).toBe('low');
      expect(getHeatLevel(150_000, customConfig)).toBe('medium');
      expect(getHeatLevel(300_000, customConfig)).toBe('high');
    });
  });

  // 6. Category Sorting (Total Spending vs Frequency)
  describe('6. Category Sorting logic', () => {
    const categories: CategoryTotal[] = [
      {
        categoryId: 'cat-food',
        categoryName: 'Ăn uống',
        categoryIcon: 'Utensils',
        categoryColor: '#EF4444',
        totalAmount: 3_500_000,
        percentage: 60,
        transactionCount: 18,
      },
      {
        categoryId: 'cat-transport',
        categoryName: 'Di chuyển',
        categoryIcon: 'Bus',
        categoryColor: '#3B82F6',
        totalAmount: 2_000_000,
        percentage: 40,
        transactionCount: 25,
      },
    ];

    it('Sort by Total Spending: ưu tiên danh mục có tổng chi lớn hơn', () => {
      const sortedBySpending = sortCategoryTotals(categories, 'spending');
      expect(sortedBySpending[0].categoryName).toBe('Ăn uống');
      expect(sortedBySpending[1].categoryName).toBe('Di chuyển');
    });

    it('Sort by Frequency: ưu tiên danh mục có số lần chi nhiều hơn', () => {
      const sortedByFreq = sortCategoryTotals(categories, 'frequency');
      expect(sortedByFreq[0].categoryName).toBe('Di chuyển'); // 25 transactions > 18 transactions
      expect(sortedByFreq[1].categoryName).toBe('Ăn uống');
    });

    it('Sort Category Transactions by amount vs date', () => {
      const txs: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amount: 50_000,
          categoryId: 'cat-food',
          date: '2026-09-12',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          type: 'expense',
          amount: 200_000,
          categoryId: 'cat-food',
          date: '2026-09-05',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const byAmount = sortCategoryTransactions(txs, 'amount');
      expect(byAmount[0].amount).toBe(200_000);

      const byDate = sortCategoryTransactions(txs, 'date');
      expect(byDate[0].date).toBe('2026-09-12');
    });
  });
});
