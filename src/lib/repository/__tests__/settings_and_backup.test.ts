import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalSettingsRepository,
  LocalCategoryRepository,
  LocalTransactionRepository,
  LocalDataManagementRepository,
} from '../localRepository';
import { calculateAvailableBalance } from '@/lib/calculations/financial';

// Mock localStorage
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

describe('Settings, Category Management & Data Backup', () => {
  let settingsRepo: LocalSettingsRepository;
  let categoryRepo: LocalCategoryRepository;
  let txRepo: LocalTransactionRepository;
  let dataRepo: LocalDataManagementRepository;

  beforeEach(() => {
    storageMap.clear();
    settingsRepo = new LocalSettingsRepository();
    categoryRepo = new LocalCategoryRepository();
    txRepo = new LocalTransactionRepository();
    dataRepo = new LocalDataManagementRepository();
  });

  it('Starting Balance cập nhật Available Balance ngay lập tức và KHÔNG tạo giao dịch', async () => {
    // Khởi tạo ban đầu
    const settings = await settingsRepo.updateStartingBalance(5000000);
    expect(settings.startingBalance).toBe(5000000);

    const initialTxs = await txRepo.getAll();
    expect(initialTxs.length).toBe(0);

    let balance = calculateAvailableBalance(settings.startingBalance, initialTxs);
    expect(balance).toBe(5000000);

    // Cập nhật số dư ban đầu lên 8.000.000
    const updated = await settingsRepo.updateStartingBalance(8000000);
    expect(updated.startingBalance).toBe(8000000);

    // Danh sách giao dịch vẫn phải bằng 0 (Starting balance không phải transaction)
    const currentTxs = await txRepo.getAll();
    expect(currentTxs.length).toBe(0);

    // Available Balance tăng tương ứng
    balance = calculateAvailableBalance(updated.startingBalance, currentTxs);
    expect(balance).toBe(8000000);
  });

  it('quản lý danh mục: thêm, sửa, và ẩn danh mục an toàn (giữ nguyên giao dịch lịch sử)', async () => {
    // 1. Thêm danh mục mới
    const newCat = await categoryRepo.create({
      name: 'Thú Cưng',
      type: 'expense',
      icon: 'HeartPulse',
      color: '#E07A5F',
    });
    expect(newCat.id).toBeDefined();
    expect(newCat.name).toBe('Thú Cưng');
    expect(newCat.isActive).toBe(true);

    // 2. Tạo 1 giao dịch gắn với danh mục này
    const tx = await txRepo.create({
      type: 'expense',
      amount: 150000,
      categoryId: newCat.id,
      date: '2026-09-10',
      note: 'Thức ăn cho mèo',
    });
    expect(tx.categoryId).toBe(newCat.id);

    // 3. Chỉnh sửa danh mục
    const editedCat = await categoryRepo.update(newCat.id, {
      name: 'Chăm Sóc Thú Cưng',
    });
    expect(editedCat.name).toBe('Chăm Sóc Thú Cưng');

    // 4. Ẩn danh mục (isActive = false)
    const hiddenCat = await categoryRepo.update(newCat.id, {
      isActive: false,
    });
    expect(hiddenCat.isActive).toBe(false);

    // 5. Kiểm tra tính toàn vẹn: Giao dịch lịch sử vẫn còn nguyên và danh mục vẫn tồn tại trong hệ thống
    const storedCat = await categoryRepo.getById(newCat.id);
    expect(storedCat).not.toBeNull();
    expect(storedCat?.name).toBe('Chăm Sóc Thú Cưng');

    const storedTx = await txRepo.getById(tx.id);
    expect(storedTx).not.toBeNull();
    expect(storedTx?.categoryId).toBe(newCat.id);
  });

  it('exportJSON xuất đầy đủ các bảng dữ liệu', async () => {
    await dataRepo.initializeWithSeedData(true);
    const jsonStr = await dataRepo.exportJSON();

    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.settings).toBeDefined();
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect(Array.isArray(parsed.transactions)).toBe(true);
    expect(Array.isArray(parsed.recurringBills)).toBe(true);
    expect(parsed.transactions.length).toBe(0);
  });

  it('importJSON thành công với dữ liệu hợp lệ và từ chối dữ liệu sai cấu trúc', async () => {
    // 1. Chuẩn bị dữ liệu hợp lệ
    await dataRepo.initializeWithSeedData(true);
    const validJson = await dataRepo.exportJSON();

    // Thay đổi 1 giá trị và import lại
    const modified = JSON.parse(validJson);
    modified.settings.startingBalance = 99000000;
    const ok = await dataRepo.importJSON(JSON.stringify(modified));
    expect(ok).toBe(true);

    const checkSettings = await settingsRepo.get();
    expect(checkSettings.startingBalance).toBe(99000000);

    // 2. Thử import dữ liệu hỏng / sai cấu trúc -> Phải bị từ chối
    const invalidJson = JSON.stringify({
      version: '1.0.0',
      settings: { startingBalance: 'not-a-number' }, // Sai kiểu
      transactions: 'not-an-array',
    });

    await expect(dataRepo.importJSON(invalidJson)).rejects.toThrow();

    // Dữ liệu trong database không bị phá hủy
    const afterFailedImport = await settingsRepo.get();
    expect(afterFailedImport.startingBalance).toBe(99000000);
  });

  it('resetAllData khôi phục lại dữ liệu mẫu gốc', async () => {
    await dataRepo.initializeWithSeedData(true);

    // Sửa đổi dữ liệu
    await settingsRepo.updateStartingBalance(123456);

    // Reset
    await dataRepo.resetAllData();

    // Kiểm tra đã về dữ liệu mẫu (DEFAULT_SETTINGS startingBalance)
    const settings = await settingsRepo.get();
    expect(settings.startingBalance).not.toBe(123456);
  });
});
