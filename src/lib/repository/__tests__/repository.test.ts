import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalTransactionRepository,
  LocalCategoryRepository,
  LocalRecurringBillRepository,
  LocalSettingsRepository,
  LocalDataManagementRepository,
} from '../localRepository';

// Mock localStorage in node environment for vitest
const storageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

// Setup window mock
(globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
  localStorage: mockLocalStorage,
};

describe('Mooney Repository Abstraction', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('khởi tạo seed data lần đầu và không ghi đè khi gọi lại', async () => {
    const dataRepo = new LocalDataManagementRepository();
    const txRepo = new LocalTransactionRepository();

    expect(await dataRepo.isInitialized()).toBe(false);

    // Lần đầu khởi tạo
    await dataRepo.initializeWithSeedData();
    expect(await dataRepo.isInitialized()).toBe(true);

    const initialTxs = await txRepo.getAll();
    expect(initialTxs.length).toBe(0);

    // Thêm 1 giao dịch người dùng
    await txRepo.create({
      type: 'expense',
      amount: 99_000,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
      note: 'Giao dịch của user',
    });

    const withUserTx = await txRepo.getAll();
    expect(withUserTx.length).toBe(initialTxs.length + 1);

    // Gọi lại initializeWithSeedData (mô phỏng reload trang) -> KHÔNG được ghi đè
    await dataRepo.initializeWithSeedData(false);
    const afterReload = await txRepo.getAll();
    expect(afterReload.length).toBe(initialTxs.length + 1);
  });

  it('thực hiện đầy đủ CRUD cho Transaction', async () => {
    const txRepo = new LocalTransactionRepository();

    // Create
    const created = await txRepo.create({
      type: 'expense',
      amount: 150_000,
      categoryId: 'cat-exp-food',
      date: '2026-09-13',
      note: 'Ăn trưa',
    });
    expect(created.id).toBeDefined();
    expect(created.amount).toBe(150_000);

    // Read by id
    const found = await txRepo.getById(created.id);
    expect(found?.note).toBe('Ăn trưa');

    // Update
    const updated = await txRepo.update(created.id, {
      amount: 180_000,
      note: 'Ăn trưa kèm trà',
    });
    expect(updated.amount).toBe(180_000);
    expect(updated.note).toBe('Ăn trưa kèm trà');

    // Delete
    const deleted = await txRepo.delete(created.id);
    expect(deleted).toBe(true);

    const notFound = await txRepo.getById(created.id);
    expect(notFound).toBeNull();
  });

  it('đánh dấu thanh toán hóa đơn: tạo 1 expense transaction và cập nhật ngày đến hạn kỳ tiếp theo', async () => {
    const txRepo = new LocalTransactionRepository();
    const billRepo = new LocalRecurringBillRepository(txRepo);

    // Tạo 1 bill lặp lại hàng tháng
    const bill = await billRepo.create({
      name: 'Internet FPT',
      amount: 220_000,
      categoryId: 'cat-exp-bills',
      dueDate: '2026-09-15',
      repeat: 'monthly',
      note: 'Cáp quang',
    });

    // Đánh dấu đã thanh toán vào ngày 14/09
    const result = await billRepo.markAsPaid(bill.id, '2026-09-14');

    expect(result.createdTransaction).toBeDefined();
    expect(result.createdTransaction.type).toBe('expense');
    expect(result.createdTransaction.amount).toBe(220_000);
    expect(result.createdTransaction.date).toBe('2026-09-14');

    // Hóa đơn được cập nhật lastPaidDate và dueDate dời sang tháng sau (15/10/2026)
    expect(result.bill.lastPaidDate).toBe('2026-09-14');
    expect(result.bill.dueDate).toBe('2026-10-15');

    // Kiểm tra transaction thực tế trong repository
    const allTxs = await txRepo.getAll();
    expect(allTxs.some((t) => t.id === result.createdTransaction.id)).toBe(true);
  });

  it('xuất JSON và nhập JSON phục hồi dữ liệu chuẩn xác', async () => {
    const dataRepo = new LocalDataManagementRepository();
    const settingsRepo = new LocalSettingsRepository();
    const txRepo = new LocalTransactionRepository();

    await settingsRepo.updateStartingBalance(10_000_000);
    await txRepo.create({
      type: 'income',
      amount: 5_000_000,
      categoryId: 'cat-inc-bonus',
      date: '2026-09-10',
      note: 'Thưởng dự án',
    });

    // Export JSON
    const exportedJson = await dataRepo.exportJSON();
    expect(exportedJson).toContain('10000000');
    expect(exportedJson).toContain('Thưởng dự án');

    // Reset sạch dữ liệu
    storageMap.clear();

    // Import JSON
    const importSuccess = await dataRepo.importJSON(exportedJson);
    expect(importSuccess).toBe(true);

    const restoredSettings = await settingsRepo.get();
    expect(restoredSettings.startingBalance).toBe(10_000_000);

    const restoredTxs = await txRepo.getAll();
    expect(restoredTxs.length).toBe(1);
    expect(restoredTxs[0].note).toBe('Thưởng dự án');
  });
});
