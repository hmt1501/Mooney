import { describe, it, expect } from 'vitest';
import {
  calculateAvailableBalance,
  calculateDailyTotals,
  calculateSafeDailySpending,
  calculateCategoryTotals,
  calculateMonthlyRecap,
} from '../financial';
import { getHeatLevel, DEFAULT_HEATMAP_THRESHOLDS } from '@/lib/constants/heatmap';
import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';

describe('1. calculateAvailableBalance', () => {
  it('trả về số dư ban đầu khi không có giao dịch nào', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [];
    const balance = calculateAvailableBalance(startingBalance, transactions);
    expect(balance).toBe(5_000_000);
  });

  it('tăng số dư khi có thu nhập (income)', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 10_000_000,
        categoryId: 'cat-salary',
        date: '2026-09-01',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const balance = calculateAvailableBalance(startingBalance, transactions);
    expect(balance).toBe(15_000_000);
  });

  it('giảm số dư khi có chi tiêu (expense)', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 1_200_000,
        categoryId: 'cat-food',
        date: '2026-09-02',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const balance = calculateAvailableBalance(startingBalance, transactions);
    expect(balance).toBe(3_800_000);
  });

  it('tính đúng Available Balance = Starting + Income - Expense', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 10_000_000,
        categoryId: 'cat-salary',
        date: '2026-09-01',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 8_610_000,
        categoryId: 'cat-food',
        date: '2026-09-03',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const balance = calculateAvailableBalance(startingBalance, transactions);
    expect(balance).toBe(6_390_000);
  });

  it('xử lý số dư khả dụng âm một cách chính xác', () => {
    const startingBalance = 1_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 1_500_000,
        categoryId: 'cat-rent',
        date: '2026-09-05',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const balance = calculateAvailableBalance(startingBalance, transactions);
    expect(balance).toBe(-500_000);
  });

  it('khi sửa giao dịch không bị đếm trùng (replace transaction)', () => {
    const startingBalance = 5_000_000;
    let transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 200_000,
        categoryId: 'cat-food',
        date: '2026-09-03',
        createdAt: '',
        updatedAt: '',
      },
    ];

    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(4_800_000);

    // Sửa amount từ 200k lên 500k
    transactions = transactions.map((tx) =>
      tx.id === 'tx-1' ? { ...tx, amount: 500_000 } : tx
    );

    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(4_500_000);
  });

  it('khi xóa giao dịch sẽ đảo ngược hoàn toàn ảnh hưởng tài chính', () => {
    const startingBalance = 5_000_000;
    const tx1: Transaction = {
      id: 'tx-1',
      type: 'expense',
      amount: 1_000_000,
      categoryId: 'cat-food',
      date: '2026-09-03',
      createdAt: '',
      updatedAt: '',
    };
    const tx2: Transaction = {
      id: 'tx-2',
      type: 'income',
      amount: 2_000_000,
      categoryId: 'cat-salary',
      date: '2026-09-04',
      createdAt: '',
      updatedAt: '',
    };

    let transactions = [tx1, tx2];
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(6_000_000);

    // Xóa tx1 (khoản chi 1M)
    transactions = transactions.filter((t) => t.id !== 'tx-1');
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(7_000_000);
  });
});

describe('2. calculateDailyTotals', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 150_000,
      categoryId: 'food',
      date: '2026-09-13',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      type: 'expense',
      amount: 50_000,
      categoryId: 'transport',
      date: '2026-09-13',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      type: 'income',
      amount: 500_000,
      categoryId: 'freelance',
      date: '2026-09-13',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '4',
      type: 'expense',
      amount: 300_000,
      categoryId: 'other',
      date: '2026-09-14',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('tính đúng tổng chi, thu và net change trong ngày cụ thể', () => {
    const daily = calculateDailyTotals(transactions, '2026-09-13');
    expect(daily.totalExpense).toBe(200_000); // 150k + 50k
    expect(daily.totalIncome).toBe(500_000);
    expect(daily.netChange).toBe(300_000); // 500k - 200k
    expect(daily.transactionCount).toBe(3);
  });

  it('trả về 0 cho ngày không có giao dịch', () => {
    const daily = calculateDailyTotals(transactions, '2026-09-20');
    expect(daily.totalExpense).toBe(0);
    expect(daily.totalIncome).toBe(0);
    expect(daily.netChange).toBe(0);
    expect(daily.transactionCount).toBe(0);
  });
});

describe('3. calculateSafeDailySpending', () => {
  it('tính đúng hạn mức gợi ý mỗi ngày cho tháng 30 ngày (Tháng 9)', () => {
    // Tháng 9 có 30 ngày. Ngày 14/09 còn lại: 30 - 14 + 1 = 17 ngày.
    // 6.390.000 / 17 = 375.882 đ/ngày
    const result = calculateSafeDailySpending(6_390_000, '2026-09-14', 30);
    expect(result.remainingDays).toBe(17);
    expect(result.amountPerDay).toBe(375_882);
    expect(result.isNegative).toBe(false);
  });

  it('xử lý trường hợp số dư khả dụng âm', () => {
    const result = calculateSafeDailySpending(-500_000, '2026-09-14', 30);
    expect(result.amountPerDay).toBe(0);
    expect(result.isNegative).toBe(true);
    expect(result.explanation).toContain('vượt số tiền khả dụng');
  });

  it('xử lý ngày cuối cùng của tháng', () => {
    // Ngày 30/09: còn lại 1 ngày
    const result = calculateSafeDailySpending(300_000, '2026-09-30', 30);
    expect(result.remainingDays).toBe(1);
    expect(result.amountPerDay).toBe(300_000);
  });

  it('tự động xác định số ngày tháng 2 năm nhuận (29 ngày) và không nhuận (28 ngày)', () => {
    // Năm 2024 nhuận: 29 ngày. Ngày 01/02 còn 29 ngày
    const leap = calculateSafeDailySpending(2_900_000, '2024-02-01');
    expect(leap.remainingDays).toBe(29);
    expect(leap.amountPerDay).toBe(100_000);

    // Năm 2025 không nhuận: 28 ngày. Ngày 01/02 còn 28 ngày
    const nonLeap = calculateSafeDailySpending(2_800_000, '2025-02-01');
    expect(nonLeap.remainingDays).toBe(28);
    expect(nonLeap.amountPerDay).toBe(100_000);
  });
});

describe('4. calculateCategoryTotals', () => {
  const categories: Category[] = [
    {
      id: 'cat-food',
      name: 'Ăn uống',
      type: 'expense',
      icon: 'Utensils',
      color: '#E67E22',
      createdAt: '',
    },
    {
      id: 'cat-transport',
      name: 'Đi lại',
      type: 'expense',
      icon: 'Bus',
      color: '#3498DB',
      createdAt: '',
    },
    {
      id: 'cat-shopping',
      name: 'Mua sắm',
      type: 'expense',
      icon: 'ShoppingBag',
      color: '#9B59B6',
      createdAt: '',
    },
  ];

  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 600_000,
      categoryId: 'cat-food',
      date: '2026-09-01',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      type: 'expense',
      amount: 400_000,
      categoryId: 'cat-food',
      date: '2026-09-02',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      type: 'expense',
      amount: 500_000,
      categoryId: 'cat-transport',
      date: '2026-09-03',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '4',
      type: 'expense',
      amount: 500_000,
      categoryId: 'cat-shopping',
      date: '2026-09-05',
      createdAt: '',
      updatedAt: '',
    },
    // Giao dịch tháng khác (tháng 8) -> Không được tính vào tháng 9
    {
      id: '5',
      type: 'expense',
      amount: 1_000_000,
      categoryId: 'cat-food',
      date: '2026-08-15',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('tổng hợp theo danh mục, tính đúng % và sắp xếp giảm dần', () => {
    // Tổng chi tháng 9 = 600k + 400k + 500k + 500k = 2.000.000
    // Ăn uống: 1.000.000 (50%)
    // Đi lại: 500.000 (25%)
    // Mua sắm: 500.000 (25%)
    const result = calculateCategoryTotals(transactions, categories, '2026-09');

    expect(result.length).toBe(3);
    expect(result[0].categoryName).toBe('Ăn uống');
    expect(result[0].totalAmount).toBe(1_000_000);
    expect(result[0].percentage).toBe(50);

    expect(result[1].totalAmount).toBe(500_000);
    expect(result[1].percentage).toBe(25);
  });

  it('xử lý tháng không có chi tiêu', () => {
    const result = calculateCategoryTotals(transactions, categories, '2026-10');
    expect(result.length).toBe(0);
  });
});

describe('5. calculateMonthlyRecap', () => {
  it('tính toán chính xác các chỉ số tổng kết tháng (Monthly Recap)', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 10_000_000,
        categoryId: 'salary',
        date: '2026-09-01',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 3_000_000,
        categoryId: 'rent',
        date: '2026-09-05',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        type: 'expense',
        amount: 3_500_000,
        categoryId: 'food',
        date: '2026-09-13',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // Thu: 10M, Chi: 6.5M -> Net: 3.5M
    // Tỷ lệ tiết kiệm = ((10M - 6.5M) / 10M) * 100 = 35%
    // Tiền giữ lại = 3.5M
    // Ngày chi nhiều nhất: 13/09 (3.5M)
    const recap = calculateMonthlyRecap(startingBalance, transactions, '2026-09');

    expect(recap.totalIncome).toBe(10_000_000);
    expect(recap.totalExpense).toBe(6_500_000);
    expect(recap.netChange).toBe(3_500_000);
    expect(recap.cashKept).toBe(3_500_000);
    expect(recap.savingsRate).toBe(35);
    expect(recap.topSpendingDay?.date).toBe('2026-09-13');
    expect(recap.topSpendingDay?.amount).toBe(3_500_000);
    expect(recap.endingAvailableBalance).toBe(8_500_000); // 5M + 10M - 6.5M
  });

  it('xử lý tháng không có thu nhập (savings rate = 0, cash kept = 0)', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 1_000_000,
        categoryId: 'food',
        date: '2026-09-05',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const recap = calculateMonthlyRecap(startingBalance, transactions, '2026-09');
    expect(recap.totalIncome).toBe(0);
    expect(recap.totalExpense).toBe(1_000_000);
    expect(recap.netChange).toBe(-1_000_000);
    expect(recap.savingsRate).toBe(0);
    expect(recap.cashKept).toBe(0);
  });
});

describe('6. getHeatLevel', () => {
  it('xác định cấp độ nhiệt theo ngưỡng tập trung', () => {
    expect(getHeatLevel(0)).toBe('none');
    expect(getHeatLevel(-50_000)).toBe('none');
    expect(getHeatLevel(50_000)).toBe('low');
    expect(getHeatLevel(99_999)).toBe('low');
    expect(getHeatLevel(100_000)).toBe('medium');
    expect(getHeatLevel(350_000)).toBe('medium');
    expect(getHeatLevel(500_000)).toBe('medium');
    expect(getHeatLevel(500_001)).toBe('high');
    expect(getHeatLevel(2_000_000)).toBe('high');
  });
});
