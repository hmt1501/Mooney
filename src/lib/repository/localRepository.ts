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
const KEY_NAMES = {
  INITIALIZED: 'initialized',
  SETTINGS: 'settings',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  BILLS: 'bills',
  INCOMES: 'incomes',
} as const;

type KeyName = keyof typeof KEY_NAMES;

/**
 * Phạm vi lưu trữ cục bộ: null = khách (chưa đăng nhập), string = userId.
 * Mỗi tài khoản có vùng dữ liệu riêng trên thiết bị để dữ liệu của người này
 * không bao giờ bị hiển thị hay đẩy lên tài khoản của người khác.
 */
export type StorageScope = string | null;

export const GUEST_SCOPE: StorageScope = null;

/**
 * Khách giữ nguyên khóa cũ 'mooney_v1_*' để tương thích dữ liệu Phase 1.
 */
export function getScopedKey(scope: StorageScope, name: KeyName): string {
  const prefix = scope ? `mooney_v1_user_${scope}_` : 'mooney_v1_';
  return `${prefix}${KEY_NAMES[name]}`;
}

/** Mốc "chưa từng chỉnh sửa" cho settings mặc định của tài khoản, để dữ liệu cloud luôn thắng khi tải lần đầu. */
export const NEVER_EDITED_AT = new Date(0).toISOString();

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
  constructor(private scope: StorageScope = GUEST_SCOPE) {}

  private get key(): string {
    return getScopedKey(this.scope, 'TRANSACTIONS');
  }

  async getAll(): Promise<Transaction[]> {
    return getItem<Transaction[]>(this.key, []);
  }

  /** Ghi đè toàn bộ cache cục bộ (dùng bởi Sync Engine, giữ nguyên id/timestamp). */
  async replaceAll(items: Transaction[]): Promise<void> {
    setItem(this.key, items);
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
    setItem(this.key, list);
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
    setItem(this.key, list);
    return updated;
  }


  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(this.key, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 2. Category Repository Implementation
// ----------------------------------------------------
export class LocalCategoryRepository implements ICategoryRepository {
  constructor(private scope: StorageScope = GUEST_SCOPE) {}

  private get key(): string {
    return getScopedKey(this.scope, 'CATEGORIES');
  }

  async getAll(): Promise<Category[]> {
    return getItem<Category[]>(this.key, DEFAULT_CATEGORIES);
  }

  /** Ghi đè toàn bộ cache cục bộ (dùng bởi Sync Engine, giữ nguyên id/timestamp). */
  async replaceAll(items: Category[]): Promise<void> {
    setItem(this.key, items);
  }

  async getById(id: string): Promise<Category | null> {
    const list = await this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      type: input.type,
      icon: input.icon,
      color: input.color,
      isDefault: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    list.push(newCat);
    setItem(this.key, list);
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
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    setItem(this.key, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(this.key, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 3. Recurring Bill Repository Implementation
// ----------------------------------------------------
export class LocalRecurringBillRepository implements IRecurringBillRepository {
  private transactionRepo: ITransactionRepository;

  constructor(transactionRepo: ITransactionRepository, private scope: StorageScope = GUEST_SCOPE) {
    this.transactionRepo = transactionRepo;
  }

  private get key(): string {
    return getScopedKey(this.scope, 'BILLS');
  }

  async getAll(): Promise<RecurringBill[]> {
    return getItem<RecurringBill[]>(this.key, []);
  }

  /** Ghi đè toàn bộ cache cục bộ (dùng bởi Sync Engine, giữ nguyên id/timestamp). */
  async replaceAll(items: RecurringBill[]): Promise<void> {
    setItem(this.key, items);
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
    setItem(this.key, list);
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
    setItem(this.key, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(this.key, filtered);
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
  constructor(private scope: StorageScope = GUEST_SCOPE) {}

  private get key(): string {
    return getScopedKey(this.scope, 'INCOMES');
  }

  async getAll(): Promise<IncomeItem[]> {
    return getItem<IncomeItem[]>(this.key, []);
  }

  /** Ghi đè toàn bộ cache cục bộ (dùng bởi Sync Engine, giữ nguyên id/timestamp). */
  async replaceAll(items: IncomeItem[]): Promise<void> {
    setItem(this.key, items);
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
    setItem(this.key, list);
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
    setItem(this.key, list);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    setItem(this.key, filtered);
    return true;
  }
}

// ----------------------------------------------------
// 5. Settings Repository Implementation
// ----------------------------------------------------
export class LocalSettingsRepository implements ISettingsRepository {
  constructor(private scope: StorageScope = GUEST_SCOPE) {}

  private get key(): string {
    return getScopedKey(this.scope, 'SETTINGS');
  }

  async get(): Promise<UserSettings> {
    return getItem<UserSettings>(this.key, DEFAULT_SETTINGS);
  }

  /** Ghi đè settings cục bộ (dùng bởi Sync Engine, giữ nguyên timestamp). */
  async replace(settings: UserSettings): Promise<void> {
    setItem(this.key, settings);
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
    setItem(this.key, updated);
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
  constructor(private scope: StorageScope = GUEST_SCOPE) {}

  private key(name: KeyName): string {
    return getScopedKey(this.scope, name);
  }

  async isInitialized(): Promise<boolean> {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(this.key('INITIALIZED')) === 'true';
  }

  /**
   * Khách: dữ liệu khởi tạo như Phase 1.
   * Tài khoản: settings đánh dấu "chưa từng chỉnh sửa" để dữ liệu cloud được ưu tiên khi tải về.
   */
  private buildInitialData() {
    const seed = generateSeedData();
    if (!this.scope) return seed;
    return { ...seed, settings: { ...seed.settings, updatedAt: NEVER_EDITED_AT } };
  }

  async initializeWithSeedData(force = false): Promise<void> {
    if (!isBrowser()) return;
    const initialized = await this.isInitialized();
    if (initialized && !force) {
      // Đã từng khởi tạo -> Tuyệt đối không sinh đè seed data khi reload!
      return;
    }

    const seed = this.buildInitialData();
    setItem(this.key('SETTINGS'), seed.settings);
    setItem(this.key('CATEGORIES'), DEFAULT_CATEGORIES);
    setItem(this.key('TRANSACTIONS'), seed.transactions);
    setItem(this.key('BILLS'), seed.recurringBills);
    setItem(this.key('INCOMES'), seed.incomes);
    window.localStorage.setItem(this.key('INITIALIZED'), 'true');
  }

  async resetAllData(): Promise<void> {
    if (!isBrowser()) return;
    window.localStorage.removeItem(this.key('INITIALIZED'));
    window.localStorage.removeItem(this.key('SETTINGS'));
    window.localStorage.removeItem(this.key('CATEGORIES'));
    window.localStorage.removeItem(this.key('TRANSACTIONS'));
    window.localStorage.removeItem(this.key('BILLS'));
    window.localStorage.removeItem(this.key('INCOMES'));

    // Khởi tạo lại với dữ liệu mẫu nguyên bản
    await this.initializeWithSeedData(true);
  }

  async exportJSON(): Promise<string> {
    const settings = getItem<UserSettings>(this.key('SETTINGS'), DEFAULT_SETTINGS);
    const categories = getItem<Category[]>(this.key('CATEGORIES'), DEFAULT_CATEGORIES);
    const transactions = getItem<Transaction[]>(this.key('TRANSACTIONS'), []);
    const recurringBills = getItem<RecurringBill[]>(this.key('BILLS'), []);
    const incomes = getItem<IncomeItem[]>(this.key('INCOMES'), []);

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

      setItem(this.key('SETTINGS'), parsed.settings);
      setItem(this.key('CATEGORIES'), parsed.categories);
      setItem(this.key('TRANSACTIONS'), parsed.transactions);
      if (Array.isArray(parsed.recurringBills)) {
        setItem(this.key('BILLS'), parsed.recurringBills);
      }
      if (Array.isArray(parsed.incomes)) {
        setItem(this.key('INCOMES'), parsed.incomes);
      }
      window.localStorage.setItem(this.key('INITIALIZED'), 'true');
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
export function createLocalRepositories(scope: StorageScope = GUEST_SCOPE) {
  const transactions = new LocalTransactionRepository(scope);
  return {
    transactions,
    categories: new LocalCategoryRepository(scope),
    bills: new LocalRecurringBillRepository(transactions, scope),
    incomes: new LocalIncomeRepository(scope),
    settings: new LocalSettingsRepository(scope),
    dataManagement: new LocalDataManagementRepository(scope),
  };
}

export type LocalRepositories = ReturnType<typeof createLocalRepositories>;

let activeScope: StorageScope = GUEST_SCOPE;

/**
 * Repository đang phục vụ UI. Các thuộc tính được thay khi đổi phạm vi lưu trữ
 * (đăng nhập / đăng xuất), nên luôn truy cập qua `mooneyRepository.xxx` tại thời điểm gọi.
 */
export const mooneyRepository: LocalRepositories = createLocalRepositories(activeScope);

export function getActiveStorageScope(): StorageScope {
  return activeScope;
}

export function setActiveStorageScope(scope: StorageScope): void {
  if (scope === activeScope) return;
  activeScope = scope;
  Object.assign(mooneyRepository, createLocalRepositories(scope));
}
