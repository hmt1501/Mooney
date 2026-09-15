import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAvailableBalance,
  calculateDailyTotals,
  calculateCategoryTotals,
  calculateMonthlyRecap,
} from '../financial';
import {
  LocalTransactionRepository,
  LocalRecurringBillRepository,
} from '@/lib/repository/localRepository';
import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { RecurringBill } from '@/types/bill';

// Mock localStorage
const storageStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageStore.get(key) || null,
  setItem: (key: string, value: string) => storageStore.set(key, value),
  removeItem: (key: string) => storageStore.delete(key),
  clear: () => storageStore.clear(),
};

(globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
  localStorage: mockLocalStorage,
};

describe('Production Readiness Accounting Audit', () => {
  beforeEach(() => {
    storageStore.clear();
  });

  it('3.1 Kiểm tra công thức cơ bản: Starting 5M + Income 10M - Expense 2M = 13M', () => {
    const startingBalance = 5_000_000;
    const transactions: Transaction[] = [
      {
        id: 'tx-inc-1',
        type: 'income',
        amount: 10_000_000,
        categoryId: 'cat-salary',
        date: '2026-09-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-exp-1',
        type: 'expense',
        amount: 2_000_000,
        categoryId: 'cat-food',
        date: '2026-09-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const availableBalance = calculateAvailableBalance(startingBalance, transactions);
    expect(availableBalance).toBe(13_000_000);
  });

  it('3.2 Kiểm tra chuỗi thao tác: edit expense, delete expense, add income, delete income', () => {
    let startingBalance = 5_000_000;
    let transactions: Transaction[] = [
      {
        id: 'tx-inc-1',
        type: 'income',
        amount: 10_000_000,
        categoryId: 'cat-salary',
        date: '2026-09-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tx-exp-1',
        type: 'expense',
        amount: 2_000_000,
        categoryId: 'cat-food',
        date: '2026-09-02',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Ban đầu: 13M
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(13_000_000);

    // Edit expense: 2M -> 3.5M
    transactions = transactions.map((t) =>
      t.id === 'tx-exp-1' ? { ...t, amount: 3_500_000 } : t
    );
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(11_500_000);

    // Delete expense: xóa tx-exp-1
    transactions = transactions.filter((t) => t.id !== 'tx-exp-1');
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(15_000_000);

    // Add income: thêm 1,500,000
    transactions.push({
      id: 'tx-inc-2',
      type: 'income',
      amount: 1_500_000,
      categoryId: 'cat-bonus',
      date: '2026-09-05',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(16_500_000);

    // Delete income: xóa tx-inc-1 (10M)
    transactions = transactions.filter((t) => t.id !== 'tx-inc-1');
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(6_500_000);

    // Sửa starting balance: 5M -> 8M
    startingBalance = 8_000_000;
    expect(calculateAvailableBalance(startingBalance, transactions)).toBe(9_500_000);
  });

  it('3.3 Kiểm tra nhiều giao dịch cùng ngày và liên tháng (Cross-month)', () => {
    const mockCategories: Category[] = [
      { id: 'cat-food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#1B4332', createdAt: '' },
      { id: 'cat-fuel', name: 'Xăng xe', type: 'expense', icon: 'Bus', color: '#2D6A4F', createdAt: '' },
      { id: 'cat-salary', name: 'Lương', type: 'income', icon: 'Banknote', color: '#52B788', createdAt: '' },
    ];

    const transactions: Transaction[] = [
      // Ngày 2026-09-10 (2 giao dịch cùng ngày)
      {
        id: '1',
        type: 'expense',
        amount: 100_000,
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amount: 50_000,
        categoryId: 'cat-fuel',
        date: '2026-09-10',
        createdAt: '',
        updatedAt: '',
      },
      // Ngày 2026-09-15
      {
        id: '3',
        type: 'income',
        amount: 5_000_000,
        categoryId: 'cat-salary',
        date: '2026-09-15',
        createdAt: '',
        updatedAt: '',
      },
      // Giao dịch tháng 10 (2026-10-01)
      {
        id: '4',
        type: 'expense',
        amount: 500_000,
        categoryId: 'cat-food',
        date: '2026-10-01',
        createdAt: '',
        updatedAt: '',
      },
    ];

    // 1. Kiểm tra Daily Detail ngày 2026-09-10: Tổng chi = 150_000, Thu = 0
    const dayTotals = calculateDailyTotals(transactions, '2026-09-10');
    expect(dayTotals.totalExpense).toBe(150_000);
    expect(dayTotals.totalIncome).toBe(0);

    // 2. Kiểm tra Thống kê tháng 9 (2026-09)
    const septCategoryTotals = calculateCategoryTotals(
      transactions,
      mockCategories,
      '2026-09',
      'expense'
    );
    expect(septCategoryTotals.find((c) => c.categoryId === 'cat-food')?.totalAmount).toBe(100_000);
    expect(septCategoryTotals.find((c) => c.categoryId === 'cat-fuel')?.totalAmount).toBe(50_000);
    // Giao dịch tháng 10 không được xuất hiện trong thống kê tháng 9
    const septRecap = calculateMonthlyRecap(5_000_000, transactions, '2026-09');
    expect(septRecap.totalExpense).toBe(150_000);
    expect(septRecap.totalIncome).toBe(5_000_000);

    // 3. Kiểm tra Thống kê tháng 10 (2026-10)
    const octRecap = calculateMonthlyRecap(5_000_000, transactions, '2026-10');
    expect(octRecap.totalExpense).toBe(500_000);
    expect(octRecap.totalIncome).toBe(0);

    // 4. Số dư khả dụng toàn cục phải phản ánh cả 2 tháng: 5M + 5M - 150k - 500k = 9_350_000
    // (tính tại cuối tháng 10 để cả 2 tháng đều đã diễn ra)
    const totalBalance = calculateAvailableBalance(5_000_000, transactions, undefined, '2026-10-31');
    expect(totalBalance).toBe(9_350_000);
  });

  it('4.1 Kiểm tra Hóa đơn định kỳ: Mark as paid tạo đúng 1 transaction và ngăn thanh toán trùng', async () => {
    const txRepo = new LocalTransactionRepository();
    const billRepo = new LocalRecurringBillRepository(txRepo);

    // Tạo hóa đơn tiền mạng 300_000 đ
    const bill = await billRepo.create({
      name: 'Internet FPT',
      amount: 300_000,
      categoryId: 'cat-bills',
      dueDate: '2026-09-15',
      repeat: 'monthly',
    });

    expect(bill.lastPaidDate).toBeUndefined();

    // Thực hiện mark as paid ngày 2026-09-13
    const result = await billRepo.markAsPaid(bill.id, '2026-09-13');
    expect(result.createdTransaction.amount).toBe(300_000);
    expect(result.createdTransaction.type).toBe('expense');
    expect(result.createdTransaction.billId).toBe(bill.id);
    expect(result.bill.lastPaidDate).toBe('2026-09-13');

    // markAsPaid đã tự động tạo và lưu transaction vào canonical transaction repository
    const allTx = await txRepo.getAll();
    const billTxs = allTx.filter((t) => t.billId === bill.id);
    expect(billTxs.length).toBe(1);

    // Cố gắng thanh toán trùng lần 2 trong cùng tháng -> Phải bị từ chối
    await expect(billRepo.markAsPaid(bill.id, '2026-09-13')).rejects.toThrow(
      /đã được thanh toán/
    );

    // Kiểm tra số lượng transaction vẫn chính xác là 1 (không tạo thêm duplicate)
    const allTxAfter = await txRepo.getAll();
    expect(allTxAfter.filter((t) => t.billId === bill.id).length).toBe(1);
  });
});
