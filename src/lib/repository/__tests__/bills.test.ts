import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalRecurringBillRepository,
  LocalTransactionRepository,
  LocalSettingsRepository,
} from '../localRepository';
import { calculateAvailableBalance } from '@/lib/calculations/financial';
import { getBillStatus } from '@/lib/utils/bill';

// Mock localStorage in node environment for vitest
const storageMap = new Map<string, string>();

const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
  localStorage: mockLocalStorage,
};

describe('Recurring Bills Domain & Repository', () => {
  let billRepo: LocalRecurringBillRepository;
  let txRepo: LocalTransactionRepository;
  let settingsRepo: LocalSettingsRepository;

  beforeEach(() => {
    storageMap.clear();
    txRepo = new LocalTransactionRepository();
    billRepo = new LocalRecurringBillRepository(txRepo);
    settingsRepo = new LocalSettingsRepository();
  });

  it('tạo hóa đơn KHÔNG tự động tạo giao dịch chi tiêu', async () => {
    const initialTxList = await txRepo.getAll();
    expect(initialTxList.length).toBe(0);

    const bill = await billRepo.create({
      name: 'Tiền Nhà',
      amount: 4500000,
      categoryId: 'cat-bills',
      dueDate: '2026-09-25',
      repeat: 'monthly',
      note: 'Phòng 302',
    });

    expect(bill.id).toBeDefined();
    expect(bill.name).toBe('Tiền Nhà');

    // Số lượng giao dịch vẫn phải bằng 0!
    const txAfterBillCreation = await txRepo.getAll();
    expect(txAfterBillCreation.length).toBe(0);
  });

  it('hỗ trợ chỉnh sửa và xóa hóa đơn', async () => {
    const bill = await billRepo.create({
      name: 'Netflix Gia Đình',
      amount: 260000,
      categoryId: 'cat-entertainment',
      dueDate: '2026-09-15',
      repeat: 'monthly',
    });

    const updated = await billRepo.update(bill.id, {
      amount: 280000,
      note: 'Gói 4K',
    });
    expect(updated.amount).toBe(280000);
    expect(updated.note).toBe('Gói 4K');

    const deleted = await billRepo.delete(bill.id);
    expect(deleted).toBe(true);

    const check = await billRepo.getById(bill.id);
    expect(check).toBeNull();
  });

  it('markAsPaid tạo đúng 1 transaction chi tiêu với metadata billId và cập nhật số dư', async () => {
    await settingsRepo.updateStartingBalance(10000000); // 10 triệu
    const bill = await billRepo.create({
      name: 'Tiền Điện EVN',
      amount: 850000,
      categoryId: 'cat-bills',
      dueDate: '2026-09-14',
      repeat: 'monthly',
    });

    // Ban đầu
    let allTx = await txRepo.getAll();
    let balance = calculateAvailableBalance(10000000, allTx);
    expect(balance).toBe(10000000);

    // Đánh dấu thanh toán
    const result = await billRepo.markAsPaid(bill.id, '2026-09-14');

    expect(result.createdTransaction).toBeDefined();
    expect(result.createdTransaction.type).toBe('expense');
    expect(result.createdTransaction.amount).toBe(850000);
    expect(result.createdTransaction.categoryId).toBe('cat-bills');
    expect(result.createdTransaction.date).toBe('2026-09-14');
    expect(result.createdTransaction.billId).toBe(bill.id);

    // Kiểm tra bill state
    expect(result.bill.lastPaidDate).toBe('2026-09-14');
    expect(result.bill.lastPaidDueDate).toBe('2026-09-14');
    expect(result.bill.dueDate).toBe('2026-10-14'); // Chu kỳ tiếp theo

    // Kiểm tra Available Balance cập nhật chính xác (giảm 850.000)
    allTx = await txRepo.getAll();
    expect(allTx.length).toBe(1);
    balance = calculateAvailableBalance(10000000, allTx);
    expect(balance).toBe(9150000);
  });

  it('chống thanh toán trùng lặp (Duplicate-Payment Protection)', async () => {
    const bill = await billRepo.create({
      name: 'Internet FPT',
      amount: 220000,
      categoryId: 'cat-bills',
      dueDate: '2026-09-14',
      repeat: 'monthly',
    });

    // Lần thanh toán đầu tiên: Thành công
    await billRepo.markAsPaid(bill.id, '2026-09-14');

    // Lần thanh toán thứ hai trong cùng kỳ: Phải bị từ chối
    await expect(billRepo.markAsPaid(bill.id, '2026-09-14')).rejects.toThrow(
      'đã được thanh toán'
    );

    // Đảm bảo vẫn chỉ có đúng 1 giao dịch chi tiêu được tạo ra
    const allTx = await txRepo.getAll();
    expect(allTx.length).toBe(1);
  });

  it('xác định chính xác các trạng thái hóa đơn (due_today, due_soon, upcoming, overdue, paid)', () => {
    const today = '2026-09-14';

    // 1. Quá hạn (overdue)
    const overdueBill = {
      id: '1',
      name: 'Nước',
      amount: 100000,
      categoryId: 'cat-bills',
      dueDate: '2026-09-10',
      repeat: 'monthly' as const,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    expect(getBillStatus(overdueBill, today).status).toBe('overdue');

    // 2. Hôm nay (due_today)
    const todayBill = {
      ...overdueBill,
      dueDate: '2026-09-14',
    };
    expect(getBillStatus(todayBill, today).status).toBe('due_today');

    // 3. Sắp đến hạn (due_soon: <= 3 ngày)
    const soonBill = {
      ...overdueBill,
      dueDate: '2026-09-16',
    };
    expect(getBillStatus(soonBill, today).status).toBe('due_soon');

    // 4. Sắp tới (upcoming: > 3 ngày)
    const upcomingBill = {
      ...overdueBill,
      dueDate: '2026-09-25',
    };
    expect(getBillStatus(upcomingBill, today).status).toBe('upcoming');

    // 5. Đã thanh toán (paid)
    const paidBill = {
      ...overdueBill,
      repeat: 'never' as const,
      lastPaidDate: '2026-09-14',
    };
    expect(getBillStatus(paidBill, today).status).toBe('paid');
    expect(getBillStatus(paidBill, today).canMarkPaid).toBe(false);
  });
});
