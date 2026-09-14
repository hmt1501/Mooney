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

export interface IIncomeRepository {
  getAll(): Promise<IncomeItem[]>;
  getById(id: string): Promise<IncomeItem | null>;
  create(input: CreateIncomeInput): Promise<IncomeItem>;
  update(id: string, input: UpdateIncomeInput): Promise<IncomeItem>;
  delete(id: string): Promise<boolean>;
}

export interface CreateTransactionOptions {
  /**
   * Id do nơi gọi chỉ định, dùng làm khóa idempotency.
   * Nếu đã có giao dịch với id này thì trả về giao dịch đó, không tạo thêm.
   */
  id?: string;
}

export interface ITransactionRepository {
  getAll(): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  getByDate(date: string): Promise<Transaction[]>;
  getByMonth(month: string): Promise<Transaction[]>; // 'YYYY-MM'
  create(input: CreateTransactionInput, options?: CreateTransactionOptions): Promise<Transaction>;
  update(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<boolean>;
}

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<boolean>;
}

export interface IRecurringBillRepository {
  getAll(): Promise<RecurringBill[]>;
  getById(id: string): Promise<RecurringBill | null>;
  create(input: CreateBillInput): Promise<RecurringBill>;
  update(id: string, input: UpdateBillInput): Promise<RecurringBill>;
  delete(id: string): Promise<boolean>;
  /**
   * Đánh dấu đã thanh toán hóa đơn cho kỳ hiện tại.
   * Tạo ra đúng 1 expense transaction tương ứng và dời due date hoặc ghi nhận lastPaidDate,
   * TUYỆT ĐỐI không tạo trùng lặp giao dịch!
   */
  markAsPaid(
    billId: string,
    paymentDate: string
  ): Promise<{ bill: RecurringBill; createdTransaction: Transaction }>;
}

export interface ISettingsRepository {
  get(): Promise<UserSettings>;
  update(input: UpdateSettingsInput): Promise<UserSettings>;
  updateStartingBalance(amount: number): Promise<UserSettings>;
}

export interface ExportDataStructure {
  version: string;
  exportedAt: string;
  settings: UserSettings;
  categories: Category[];
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  incomes?: IncomeItem[];
}

export interface IDataManagementRepository {
  isInitialized(): Promise<boolean>;
  initializeWithSeedData(force?: boolean): Promise<void>;
  resetAllData(): Promise<void>;
  exportJSON(): Promise<string>;
  importJSON(jsonString: string): Promise<boolean>;
}
