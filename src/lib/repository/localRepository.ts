import {
  ITransactionRepository,
  ICategoryRepository,
  IRecurringBillRepository,
  IIncomeRepository,
  ISettingsRepository,
  IDataManagementRepository,
  ExportDataStructure,
} from './interfaces';
import {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '@/types/transaction';
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/category';
import {
  RecurringBill,
  CreateBillInput,
  UpdateBillInput,
} from '@/types/bill';
import {
  IncomeItem,
  CreateIncomeInput,
  UpdateIncomeInput,
} from '@/types/income';
import { UserSettings, UpdateSettingsInput } from '@/types/settings';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';
import { DEFAULT_SETTINGS, generateSeedData } from '@/lib/constants/seedData';

// Khóa lưu trữ LocalStorage phân tầng
const KEYS = {
  INITIALIZED: 'mooney_v1_initialized',
  SETTINGS: 'mooney_v1_settings',
  CATEGORIES: 'mooney_v1_categories',
  TRANSACTIONS: 'mooney_v1_transactions',
  BILLS: 'mooney_v1_bills',
  INCOMES: 'mooney_v1_incomes',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.error(`[Mooney Repository] Lỗi đọc key ${key}:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Mooney Repository] Lỗi ghi key ${key}:`, err);
  }
}

// ----------------------------------------------------
// 1. Transaction Repository Implementation
// ----------------------------------------------------
export class LocalTransactionRepository implements ITransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return getItem<Transaction[]>(KEYS.TRANSACTIONS, []);
  }

  async getById(id: string): Promise<Transaction | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  async getByDate(date: string): Promise<Transaction[]> {
    const list = await this.getAll();
    return list.filter((item) => item.date === date);
  }

  async getByMonth(month: string): Promise<Transaction[]> {
    const list = await this.getAll();
    return list.filter((item) => item.date.startsWith(month));
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: input.type,
      amount: Math.abs(input.amount),
      categoryId: input.categoryId,
      date: input.date,
      note: input.note,
      billId: input.billId,
      createdAt: now,
      updatedAt: now,
    };
    list.push(newTx);
    setItem(KEYS.TRANSACTIONS, list);
    return newTx;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy giao dịch với id: ${id}`);
    }

    const current = list[index];
    const updated: Transaction = {
      ...current,
      type: input.type ?? current.type,
      amount: input.amount !== undefined ? Math.abs(input.amount) : current.amount,
      categoryId: input.categoryId ?? current.categoryId,
      date: input.date ?? current.date,
      note: input.note !== undefined ? input.note : current.note,
      billId: input.billId !== undefined ? input.billId : current.billId,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    setItem(KEYS.TRANSACTIONS, list);
    return updated;
  }


  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(KEYS.TRANSACTIONS, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 2. Category Repository Implementation
// ----------------------------------------------------
export class LocalCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    return getItem<Category[]>(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  async getById(id: string): Promise<Category | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const list = await this.getAll();
    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    list.push(newCat);
    setItem(KEYS.CATEGORIES, list);
    return newCat;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy danh mục với id: ${id}`);
    }

    const current = list[index];
    const updated: Category = {
      ...current,
      name: input.name ?? current.name,
      icon: input.icon ?? current.icon,
      color: input.color ?? current.color,
      isActive: input.isActive ?? current.isActive,
    };

    list[index] = updated;
    setItem(KEYS.CATEGORIES, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(KEYS.CATEGORIES, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 3. Recurring Bill Repository Implementation
// ----------------------------------------------------
export class LocalRecurringBillRepository implements IRecurringBillRepository {
  private transactionRepo: ITransactionRepository;

  constructor(transactionRepo: ITransactionRepository) {
    this.transactionRepo = transactionRepo;
  }

  async getAll(): Promise<RecurringBill[]> {
    return getItem<RecurringBill[]>(KEYS.BILLS, []);
  }

  async getById(id: string): Promise<RecurringBill | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateBillInput): Promise<RecurringBill> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const newBill: RecurringBill = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      amount: Math.abs(input.amount),
      categoryId: input.categoryId,
      dueDate: input.dueDate,
      repeat: input.repeat,
      note: input.note,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    list.push(newBill);
    setItem(KEYS.BILLS, list);
    return newBill;
  }

  async update(id: string, input: UpdateBillInput): Promise<RecurringBill> {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy hóa đơn với id: ${id}`);
    }

    const current = list[index];
    const updated: RecurringBill = {
      ...current,
      name: input.name ?? current.name,
      amount: input.amount !== undefined ? Math.abs(input.amount) : current.amount,
      categoryId: input.categoryId ?? current.categoryId,
      dueDate: input.dueDate ?? current.dueDate,
      repeat: input.repeat ?? current.repeat,
      note: input.note !== undefined ? input.note : current.note,
      isActive: input.isActive ?? current.isActive,
      lastPaidDate: input.lastPaidDate ?? current.lastPaidDate,
      lastPaidDueDate: input.lastPaidDueDate !== undefined ? input.lastPaidDueDate : current.lastPaidDueDate,
      paidOccurrences: input.paidOccurrences !== undefined ? input.paidOccurrences : current.paidOccurrences,
      updatedAt: new Date().toISOString(),
    };


    list[index] = updated;
    setItem(KEYS.BILLS, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(KEYS.BILLS, filtered);
    return true;
  }

  /**
   * Đánh dấu đã thanh toán:
   * - Tạo 1 Transaction chi tiêu thực tế vào ngày paymentDate
   * - Cập nhật lastPaidDate và tính toán dueDate chu kỳ tiếp theo (nếu có lặp)
   * - Ngăn ngừa bấm trùng lặp
   */
  async markAsPaid(
    billId: string,
    paymentDate: string
  ): Promise<{ bill: RecurringBill; createdTransaction: Transaction }> {
    const bill = await this.getById(billId);
    if (!bill) {
      throw new Error(`Không tìm thấy hóa đơn: ${billId}`);
    }

    // 0. Kiểm tra chống thanh toán trùng lặp (Duplicate-Payment Protection)
    if (bill.repeat === 'never') {
      if (bill.lastPaidDate) {
        throw new Error(`Hóa đơn "${bill.name}" đã được thanh toán.`);
      }
    } else {
      const currentOccurrence = bill.dueDate;
      if (bill.paidOccurrences?.includes(currentOccurrence) || bill.lastPaidDueDate === currentOccurrence) {
        throw new Error(`Hóa đơn "${bill.name}" đã được thanh toán cho kỳ này.`);
      }
      if (bill.repeat === 'monthly' && bill.lastPaidDate && bill.lastPaidDate.slice(0, 7) === paymentDate.slice(0, 7)) {
        throw new Error(`Hóa đơn "${bill.name}" đã được thanh toán trong tháng này.`);
      }
    }

    // 1. Tạo giao dịch chi tiêu thực tế kèm metadata billId
    const createdTransaction = await this.transactionRepo.create({
      type: 'expense',
      amount: bill.amount,
      categoryId: bill.categoryId,
      date: paymentDate,
      note: `Thanh toán hóa đơn: ${bill.name}${bill.note ? ` (${bill.note})` : ''}`,
      billId: bill.id,
    });

    // 2. Tính ngày đến hạn kỳ tiếp theo nếu có lặp
    const currentOccurrence = bill.dueDate;
    let nextDueDate = bill.dueDate;
    let nextIsActive = bill.isActive;

    if (bill.repeat !== 'never') {
      const currentDue = new Date(bill.dueDate);
      if (bill.repeat === 'weekly') {
        currentDue.setDate(currentDue.getDate() + 7);
      } else if (bill.repeat === 'monthly') {
        currentDue.setMonth(currentDue.getMonth() + 1);
      } else if (bill.repeat === 'yearly') {
        currentDue.setFullYear(currentDue.getFullYear() + 1);
      }
      nextDueDate = currentDue.toISOString().split('T')[0];
    } else {
      // Hóa đơn 1 lần: sau khi trả xong chuyển sang hoàn tất
      nextIsActive = false;
    }

    const updatedBill = await this.update(billId, {
      lastPaidDate: paymentDate,
      lastPaidDueDate: currentOccurrence,
      paidOccurrences: [...(bill.paidOccurrences || []), currentOccurrence],
      dueDate: nextDueDate,
      isActive: nextIsActive,
    });

    return { bill: updatedBill, createdTransaction };
  }

}

// ----------------------------------------------------
// 4. Income Repository Implementation (Phase 2)
// ----------------------------------------------------
export class LocalIncomeRepository implements IIncomeRepository {
  async getAll(): Promise<IncomeItem[]> {
    return getItem<IncomeItem[]>(KEYS.INCOMES, []);
  }

  async getById(id: string): Promise<IncomeItem | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateIncomeInput): Promise<IncomeItem> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const newIncome: IncomeItem = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      amount: Math.abs(input.amount),
      categoryId: input.categoryId,
      date: input.date,
      recurrence: input.recurrence,
      receiveDay: input.receiveDay,
      isActive: true,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };
    list.push(newIncome);
    setItem(KEYS.INCOMES, list);
    return newIncome;
  }

  async update(id: string, input: UpdateIncomeInput): Promise<IncomeItem> {
    const list = await this.getAll();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy khoản thu nhập với id: ${id}`);
    }

    const current = list[index];
    const updated: IncomeItem = {
      ...current,
      name: input.name ?? current.name,
      amount: input.amount !== undefined ? Math.abs(input.amount) : current.amount,
      categoryId: input.categoryId ?? current.categoryId,
      date: input.date ?? current.date,
      recurrence: input.recurrence ?? current.recurrence,
      receiveDay: input.receiveDay ?? current.receiveDay,
      isActive: input.isActive ?? current.isActive,
      note: input.note !== undefined ? input.note : current.note,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    setItem(KEYS.INCOMES, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(KEYS.INCOMES, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 5. Settings Repository Implementation
// ----------------------------------------------------
export class LocalSettingsRepository implements ISettingsRepository {
  async get(): Promise<UserSettings> {
    return getItem<UserSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  async update(input: UpdateSettingsInput): Promise<UserSettings> {
    const current = await this.get();
    const updated: UserSettings = {
      ...current,
      startingBalance:
        input.startingBalance !== undefined
          ? input.startingBalance
          : current.startingBalance,
      currency: input.currency ?? current.currency,
      theme: input.theme ?? current.theme,
      heatmapTheme: input.heatmapTheme ?? current.heatmapTheme,
      spendingLevels: input.spendingLevels ?? current.spendingLevels,
      updatedAt: new Date().toISOString(),
    };
    setItem(KEYS.SETTINGS, updated);
    return updated;
  }

  async updateStartingBalance(amount: number): Promise<UserSettings> {
    return this.update({ startingBalance: amount });
  }
}

// ----------------------------------------------------
// 6. Data Management Repository (Seed, Reset, Export, Import)
// ----------------------------------------------------
export class LocalDataManagementRepository implements IDataManagementRepository {
  async isInitialized(): Promise<boolean> {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(KEYS.INITIALIZED) === 'true';
  }

  async initializeWithSeedData(force = false): Promise<void> {
    if (!isBrowser()) return;
    const initialized = await this.isInitialized();
    if (initialized && !force) {
      // Đã từng khởi tạo -> Tuyệt đối không sinh đè seed data khi reload!
      return;
    }

    const seed = generateSeedData();
    setItem(KEYS.SETTINGS, seed.settings);
    setItem(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    setItem(KEYS.TRANSACTIONS, seed.transactions);
    setItem(KEYS.BILLS, seed.recurringBills);
    setItem(KEYS.INCOMES, seed.incomes);
    window.localStorage.setItem(KEYS.INITIALIZED, 'true');
  }

  async resetAllData(): Promise<void> {
    if (!isBrowser()) return;
    window.localStorage.removeItem(KEYS.INITIALIZED);
    window.localStorage.removeItem(KEYS.SETTINGS);
    window.localStorage.removeItem(KEYS.CATEGORIES);
    window.localStorage.removeItem(KEYS.TRANSACTIONS);
    window.localStorage.removeItem(KEYS.BILLS);
    window.localStorage.removeItem(KEYS.INCOMES);

    // Khởi tạo lại với dữ liệu mẫu nguyên bản
    await this.initializeWithSeedData(true);
  }

  async exportJSON(): Promise<string> {
    const settings = getItem<UserSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
    const categories = getItem<Category[]>(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    const transactions = getItem<Transaction[]>(KEYS.TRANSACTIONS, []);
    const recurringBills = getItem<RecurringBill[]>(KEYS.BILLS, []);
    const incomes = getItem<IncomeItem[]>(KEYS.INCOMES, []);

    const exportData: ExportDataStructure = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      categories,
      transactions,
      recurringBills,
      incomes,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importJSON(jsonString: string): Promise<boolean> {
    if (!isBrowser()) return false;
    try {
      const parsed = JSON.parse(jsonString) as ExportDataStructure;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.settings ||
        typeof parsed.settings.startingBalance !== 'number' ||
        !Array.isArray(parsed.transactions) ||
        !Array.isArray(parsed.categories)
      ) {
        throw new Error('Định dạng dữ liệu tệp sao lưu không đúng chuẩn Mooney.');
      }

      // Kiểm tra tính hợp lệ của từng bản ghi giao dịch
      for (const tx of parsed.transactions) {
        if (!tx.id || !tx.type || typeof tx.amount !== 'number' || !tx.categoryId || !tx.date) {
          throw new Error('Tệp sao lưu chứa dữ liệu giao dịch không hợp lệ.');
        }
      }

      // Kiểm tra tính hợp lệ của từng danh mục
      for (const cat of parsed.categories) {
        if (!cat.id || !cat.name || !cat.type || !cat.icon || !cat.color) {
          throw new Error('Tệp sao lưu chứa dữ liệu danh mục không hợp lệ.');
        }
      }

      setItem(KEYS.SETTINGS, parsed.settings);
      setItem(KEYS.CATEGORIES, parsed.categories);
      setItem(KEYS.TRANSACTIONS, parsed.transactions);
      if (Array.isArray(parsed.recurringBills)) {
        setItem(KEYS.BILLS, parsed.recurringBills);
      }
      if (Array.isArray(parsed.incomes)) {
        setItem(KEYS.INCOMES, parsed.incomes);
      }
      window.localStorage.setItem(KEYS.INITIALIZED, 'true');
      return true;
    } catch (err) {
      console.error('[Mooney Repository] Import JSON thất bại:', err);
      throw err;
    }
  }
}

// ----------------------------------------------------
// Unified Mooney Data Service (Singleton)
// ----------------------------------------------------
const transactionRepo = new LocalTransactionRepository();
const categoryRepo = new LocalCategoryRepository();
const billRepo = new LocalRecurringBillRepository(transactionRepo);
const incomeRepo = new LocalIncomeRepository();
const settingsRepo = new LocalSettingsRepository();
const dataManagementRepo = new LocalDataManagementRepository();

export const mooneyRepository = {
  transactions: transactionRepo,
  categories: categoryRepo,
  bills: billRepo,
  incomes: incomeRepo,
  settings: settingsRepo,
  dataManagement: dataManagementRepo,
};
