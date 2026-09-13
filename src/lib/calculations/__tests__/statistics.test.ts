import { describe, it, expect } from 'vitest';
import {
  calculateCategoryTotals,
  calculateMonthlyRecap,
  calculateAvailableBalance,
} from '../financial';
import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';

describe('Statistics Domain Calculations', () => {
  const categories: Category[] = DEFAULT_CATEGORIES;
  const month = '2026-09';

  it('xử lý chính xác tháng không có giao dịch (Empty Month)', () => {
    const transactions: Transaction[] = [];
    const catTotals = calculateCategoryTotals(transactions, categories, month, 'expense');
    const recap = calculateMonthlyRecap(5000000, transactions, month);

    expect(catTotals).toEqual([]);
    expect(recap.totalExpense).toBe(0);
    expect(recap.totalIncome).toBe(0);
    expect(recap.netChange).toBe(0);
    expect(recap.cashKept).toBe(0);
    expect(recap.savingsRate).toBe(0);
    expect(recap.topSpendingDay).toBeNull();
    expect(recap.transactionCount).toBe(0);
  });

  it('xử lý chính xác tháng chỉ có thu nhập (Income-Only Month)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 15000000,
        categoryId: 'cat-salary',
        date: '2026-09-05',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const catTotals = calculateCategoryTotals(transactions, categories, month, 'expense');
    const recap = calculateMonthlyRecap(5000000, transactions, month);

    // Không có khoản chi -> Danh mục chi tiêu rỗng (không tạo segment ảo)
    expect(catTotals.length).toBe(0);
    expect(recap.totalExpense).toBe(0);
    expect(recap.totalIncome).toBe(15000000);
    expect(recap.netChange).toBe(15000000);
    expect(recap.cashKept).toBe(15000000);
    expect(recap.savingsRate).toBe(100); // Tiết kiệm 100%
    expect(recap.topSpendingDay).toBeNull();
  });

  it('xử lý chính xác tháng chỉ có chi tiêu (Expense-Only Month)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 300000,
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 700000,
        categoryId: 'cat-shopping',
        date: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const catTotals = calculateCategoryTotals(transactions, categories, month, 'expense');
    const recap = calculateMonthlyRecap(5000000, transactions, month);

    expect(catTotals.length).toBe(2);
    // Danh mục chi nhiều nhất xếp đầu (shopping: 700k = 70%)
    expect(catTotals[0].categoryId).toBe('cat-shopping');
    expect(catTotals[0].totalAmount).toBe(700000);
    expect(catTotals[0].percentage).toBe(70);

    expect(catTotals[1].categoryId).toBe('cat-food');
    expect(catTotals[1].totalAmount).toBe(300000);
    expect(catTotals[1].percentage).toBe(30);

    expect(recap.totalExpense).toBe(1000000);
    expect(recap.totalIncome).toBe(0);
    expect(recap.netChange).toBe(-1000000);
    expect(recap.cashKept).toBe(0);
    expect(recap.savingsRate).toBe(0); // Không có thu nhập -> 0%
    expect(recap.topSpendingDay).toEqual({ date: '2026-09-10', amount: 1000000 });
  });

  it('xử lý chính xác tháng hỗn hợp cả thu và chi (Mixed Month)', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 10000000,
        categoryId: 'cat-salary',
        date: '2026-09-01',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 2000000,
        categoryId: 'cat-food',
        date: '2026-09-05',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        type: 'expense',
        amount: 1500000,
        categoryId: 'cat-bills',
        date: '2026-09-15',
        createdAt: '',
        updatedAt: '',
      },
    ];

    const catTotals = calculateCategoryTotals(transactions, categories, month, 'expense');
    const recap = calculateMonthlyRecap(5000000, transactions, month);

    expect(recap.totalIncome).toBe(10000000);
    expect(recap.totalExpense).toBe(3500000);
    expect(recap.netChange).toBe(6500000);
    expect(recap.cashKept).toBe(6500000);
    // (10tr - 3.5tr) / 10tr = 65%
    expect(recap.savingsRate).toBe(65);
    expect(recap.topSpendingDay).toEqual({ date: '2026-09-05', amount: 2000000 });

    // Kiểm tra danh mục chi tiêu = 0 không được xuất hiện
    const zeroCats = catTotals.filter((c) => c.totalAmount === 0);
    expect(zeroCats.length).toBe(0);

    // Tính nhất quán với Available Balance
    const balance = calculateAvailableBalance(5000000, transactions);
    // 5.000.000 + 10.000.000 - 3.500.000 = 11.500.000
    expect(balance).toBe(11500000);
    expect(recap.endingAvailableBalance).toBe(11500000);
  });

  it('bỏ qua giao dịch của tháng khác khi tính thống kê tháng hiện tại', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 500000,
        categoryId: 'cat-food',
        date: '2026-08-30', // Tháng trước
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 400000,
        categoryId: 'cat-food',
        date: '2026-09-02', // Tháng này
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        type: 'expense',
        amount: 900000,
        categoryId: 'cat-food',
        date: '2026-10-01', // Tháng sau
        createdAt: '',
        updatedAt: '',
      },
    ];

    const catTotals = calculateCategoryTotals(transactions, categories, month, 'expense');
    const recap = calculateMonthlyRecap(0, transactions, month);

    expect(catTotals.length).toBe(1);
    expect(catTotals[0].totalAmount).toBe(400000);
    expect(recap.totalExpense).toBe(400000);
  });
});
