import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@/types/transaction';
import { IncomeItem, CreateIncomeInput, UpdateIncomeInput } from '@/types/income';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';
import { RecurringBill, CreateBillInput, UpdateBillInput } from '@/types/bill';
import { UserSettings, UpdateSettingsInput } from '@/types/settings';
import {
  ITransactionRepository,
  IIncomeRepository,
  ICategoryRepository,
  IRecurringBillRepository,
  ISettingsRepository,
  CreateTransactionOptions,
} from './interfaces';
import { DEFAULT_SETTINGS } from '@/lib/constants/seedData';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';

/**
 * supabase-js trả lỗi dưới dạng giá trị ({ error }) thay vì ném exception.
 * Mọi thao tác phục vụ đồng bộ phải gọi hàm này, nếu không lỗi sẽ bị nuốt mất
 * và app báo "đã đồng bộ" dù cloud chưa nhận dữ liệu.
 */
export class SupabaseSyncError extends Error {
  constructor(operation: string, public readonly cause: { message?: string; code?: string } | null) {
    super(`${operation}: ${cause?.message || 'Lỗi không xác định từ Supabase'}`);
    this.name = 'SupabaseSyncError';
  }
}

function throwIfError(operation: string, error: { message?: string; code?: string } | null): void {
  if (error) {
    throw new SupabaseSyncError(operation, error);
  }
}

// ==========================================
// MAPPERS: CamelCase <-> SnakeCase
// ==========================================

export function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date: row.date,
    note: row.note || undefined,
    billId: row.bill_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransactionToDb(item: Transaction, userId: string): any {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    amount: item.amount,
    category_id: item.categoryId,
    date: item.date,
    note: item.note || null,
    bill_id: item.billId || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function mapIncomeFromDb(row: any): IncomeItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    categoryId: row.category_id || undefined,
    type: row.type,
    recurrence: row.recurrence,
    receiveDay: row.receive_day || undefined,
    date: row.date || undefined,
    receivedDate: row.date || undefined,
    isActive: row.is_active !== false,
    note: row.note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapIncomeToDb(item: IncomeItem, userId: string): any {
  // Dữ liệu cũ có thể lưu recurrence dạng { frequency, dayOfMonth } -> chuẩn hóa về chuỗi
  const recurrenceObject =
    item.recurrence && typeof item.recurrence === 'object' ? item.recurrence : null;
  const recurrence =
    typeof item.recurrence === 'string'
      ? item.recurrence
      : recurrenceObject?.frequency || 'never';
  const isRecurring = recurrence === 'monthly' || recurrence === 'weekly' || recurrence === 'yearly';

  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    amount: item.amount,
    category_id: item.categoryId || null,
    type: item.type || (isRecurring ? 'recurring' : 'one_time'),
    recurrence,
    receive_day: item.receiveDay || recurrenceObject?.dayOfMonth || null,
    date: item.date || item.receivedDate || null,
    is_active: item.isActive !== false,
    note: item.note || null,
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function mapCategoryFromDb(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isDefault: row.is_system,
    isActive: !row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryToDb(item: Category, userId: string): any {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    icon: item.icon,
    color: item.color,
    type: item.type,
    is_system: item.isDefault || false,
    is_hidden: item.isActive === false,
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function mapBillFromDb(row: any): RecurringBill {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    categoryId: row.category_id,
    repeat: row.recurrence || 'monthly',
    dueDate: row.due_date,
    note: row.note || undefined,
    isActive: row.is_active !== false,
    lastPaidDate: row.last_paid_date || undefined,
    lastPaidDueDate: row.last_paid_due_date || undefined,
    paidOccurrences:
      Array.isArray(row.paid_occurrences) && row.paid_occurrences.length > 0
        ? row.paid_occurrences
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBillToDb(item: RecurringBill, userId: string): any {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    amount: item.amount,
    category_id: item.categoryId,
    recurrence: item.repeat || 'monthly',
    due_date: item.dueDate,
    note: item.note || null,
    is_active: item.isActive !== false,
    last_paid_date: item.lastPaidDate || null,
    last_paid_due_date: item.lastPaidDueDate || null,
    paid_occurrences: item.paidOccurrences || [],
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function mapSettingsFromDb(row: any): UserSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    startingBalance: Number(row.starting_balance || 0),
    currency: row.currency || 'VND',
    heatmapTheme: row.heatmap_theme || 'forest',
    theme: row.theme || 'light',
    spendingLevels: row.spending_levels || DEFAULT_SETTINGS.spendingLevels,
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapSettingsToDb(item: UserSettings, userId: string): any {
  return {
    user_id: userId,
    starting_balance: item.startingBalance,
    currency: item.currency,
    heatmap_theme: item.heatmapTheme,
    theme: item.theme,
    spending_levels: item.spendingLevels,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

// ==========================================
// REPOSITORY IMPLEMENTATIONS
// ==========================================

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  /** Upsert theo id và trả về bản ghi thực tế trên server (updated_at do server đặt). */
  async upsertMany(items: Transaction[]): Promise<Transaction[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.supabase
      .from('transactions')
      .upsert(items.map((item) => mapTransactionToDb(item, this.userId)), { onConflict: 'id' })
      .select();

    throwIfError('Đẩy giao dịch lên cloud', error);
    return (data || []).map(mapTransactionFromDb);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('user_id', this.userId)
      .in('id', ids);

    throwIfError('Xóa giao dịch trên cloud', error);
  }

  async getAll(): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.userId)
      .order('date', { ascending: false });

    throwIfError('Tải giao dịch từ cloud', error);
    return (data || []).map(mapTransactionFromDb);
  }

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapTransactionFromDb(data);
  }

  async getByDate(date: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', date);

    if (error) return [];
    return (data || []).map(mapTransactionFromDb);
  }

  async getByMonth(month: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.userId)
      .like('date', `${month}%`)
      .order('date', { ascending: false });

    if (error) return [];
    return (data || []).map(mapTransactionFromDb);
  }

  async create(input: CreateTransactionInput, options?: CreateTransactionOptions): Promise<Transaction> {
    const now = new Date().toISOString();
    const id = options?.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: Transaction = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const row = mapTransactionToDb(tx, this.userId);
    if (options?.id) {
      // Idempotent: gửi lại cùng id (bấm hai lần, mạng thử lại) không tạo bản ghi thứ hai
      const { error } = await this.supabase
        .from('transactions')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      throwIfError('Tạo giao dịch trên cloud', error);
      return (await this.getById(id)) ?? tx;
    }

    const { error } = await this.supabase.from('transactions').insert(row);
    if (error) {
      console.error('[SupabaseTransactionRepository] create error:', error);
    }
    return tx;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const now = new Date().toISOString();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }

    const updated: Transaction = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    const row = mapTransactionToDb(updated, this.userId);
    const { error } = await this.supabase
      .from('transactions')
      .update(row)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('[SupabaseTransactionRepository] update error:', error);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    return !error;
  }
}

export class SupabaseIncomeRepository implements IIncomeRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  /** Upsert theo id và trả về bản ghi thực tế trên server (updated_at do server đặt). */
  async upsertMany(items: IncomeItem[]): Promise<IncomeItem[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.supabase
      .from('incomes')
      .upsert(items.map((item) => mapIncomeToDb(item, this.userId)), { onConflict: 'id' })
      .select();

    throwIfError('Đẩy thu nhập lên cloud', error);
    return (data || []).map(mapIncomeFromDb);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.supabase
      .from('incomes')
      .delete()
      .eq('user_id', this.userId)
      .in('id', ids);

    throwIfError('Xóa thu nhập trên cloud', error);
  }

  async getAll(): Promise<IncomeItem[]> {
    const { data, error } = await this.supabase
      .from('incomes')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    throwIfError('Tải thu nhập từ cloud', error);
    return (data || []).map(mapIncomeFromDb);
  }

  async getById(id: string): Promise<IncomeItem | null> {
    const { data, error } = await this.supabase
      .from('incomes')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapIncomeFromDb(data);
  }

  async create(input: CreateIncomeInput): Promise<IncomeItem> {
    const now = new Date().toISOString();
    const id = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const item: IncomeItem = {
      id,
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const row = mapIncomeToDb(item, this.userId);
    const { error } = await this.supabase.from('incomes').insert(row);
    if (error) {
      console.error('[SupabaseIncomeRepository] create error:', error);
    }
    return item;
  }

  async update(id: string, input: UpdateIncomeInput): Promise<IncomeItem> {
    const now = new Date().toISOString();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Income ${id} not found`);
    }

    const updated: IncomeItem = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    const row = mapIncomeToDb(updated, this.userId);
    const { error } = await this.supabase
      .from('incomes')
      .update(row)
      .eq('id', id)
      .eq('user_id', this.userId);

    if (error) {
      console.error('[SupabaseIncomeRepository] update error:', error);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    return !error;
  }
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  /** Upsert theo id và trả về bản ghi thực tế trên server (updated_at do server đặt). */
  async upsertMany(items: Category[]): Promise<Category[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.supabase
      .from('categories')
      .upsert(items.map((item) => mapCategoryToDb(item, this.userId)), { onConflict: 'id' })
      .select();

    throwIfError('Đẩy danh mục lên cloud', error);
    return (data || []).map(mapCategoryFromDb);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('user_id', this.userId)
      .in('id', ids);

    throwIfError('Xóa danh mục trên cloud', error);
  }

  async getAll(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    throwIfError('Tải danh mục từ cloud', error);
    if (!data || data.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return data.map(mapCategoryFromDb);
  }

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapCategoryFromDb(data);
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const category: Category = {
      id,
      ...input,
      isDefault: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const row = mapCategoryToDb(category, this.userId);
    await this.supabase.from('categories').insert(row);
    return category;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Category ${id} not found`);
    }

    const updated: Category = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    const row = mapCategoryToDb(updated, this.userId);
    await this.supabase
      .from('categories')
      .update(row)
      .eq('id', id)
      .eq('user_id', this.userId);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    return !error;
  }
}

export class SupabaseRecurringBillRepository implements IRecurringBillRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  /** Upsert theo id và trả về bản ghi thực tế trên server (updated_at do server đặt). */
  async upsertMany(items: RecurringBill[]): Promise<RecurringBill[]> {
    if (items.length === 0) return [];
    const { data, error } = await this.supabase
      .from('recurring_bills')
      .upsert(items.map((item) => mapBillToDb(item, this.userId)), { onConflict: 'id' })
      .select();

    throwIfError('Đẩy hóa đơn lên cloud', error);
    return (data || []).map(mapBillFromDb);
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.supabase
      .from('recurring_bills')
      .delete()
      .eq('user_id', this.userId)
      .in('id', ids);

    throwIfError('Xóa hóa đơn trên cloud', error);
  }

  async getAll(): Promise<RecurringBill[]> {
    const { data, error } = await this.supabase
      .from('recurring_bills')
      .select('*')
      .eq('user_id', this.userId)
      .order('due_date', { ascending: true });

    throwIfError('Tải hóa đơn từ cloud', error);
    return (data || []).map(mapBillFromDb);
  }

  async getById(id: string): Promise<RecurringBill | null> {
    const { data, error } = await this.supabase
      .from('recurring_bills')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error || !data) return null;
    return mapBillFromDb(data);
  }

  async create(input: CreateBillInput): Promise<RecurringBill> {
    const now = new Date().toISOString();
    const id = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bill: RecurringBill = {
      id,
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const row = mapBillToDb(bill, this.userId);
    await this.supabase.from('recurring_bills').insert(row);
    return bill;
  }

  async update(id: string, input: UpdateBillInput): Promise<RecurringBill> {
    const now = new Date().toISOString();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Bill ${id} not found`);
    }

    const updated: RecurringBill = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    const row = mapBillToDb(updated, this.userId);
    await this.supabase
      .from('recurring_bills')
      .update(row)
      .eq('id', id)
      .eq('user_id', this.userId);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('recurring_bills')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);

    return !error;
  }

  async markAsPaid(
    billId: string,
    paymentDate: string
  ): Promise<{ bill: RecurringBill; createdTransaction: Transaction }> {
    const bill = await this.getById(billId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const txRepo = new SupabaseTransactionRepository(this.supabase, this.userId);
    const createdTransaction = await txRepo.create({
      type: 'expense',
      amount: bill.amount,
      categoryId: bill.categoryId,
      date: paymentDate,
      note: `Thanh toán hóa đơn: ${bill.name}`,
    });

    const updatedBill = await this.update(billId, {
      lastPaidDate: paymentDate,
    });

    return { bill: updatedBill, createdTransaction };
  }
}

export class SupabaseSettingsRepository implements ISettingsRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async get(): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    throwIfError('Tải cài đặt từ cloud', error);
    if (!data) {
      return DEFAULT_SETTINGS;
    }
    return mapSettingsFromDb(data);
  }

  /** Trả về null nếu cloud chưa có dòng settings cho user (khác với settings mặc định). */
  async getRow(): Promise<UserSettings | null> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    throwIfError('Tải cài đặt từ cloud', error);
    return data ? mapSettingsFromDb(data) : null;
  }

  /** Ghi settings và trả về bản ghi thực tế trên server (updated_at do server đặt). */
  async upsert(settings: UserSettings): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert(mapSettingsToDb(settings, this.userId), { onConflict: 'user_id' })
      .select()
      .single();

    throwIfError('Đẩy cài đặt lên cloud', error);
    return mapSettingsFromDb(data);
  }

  async update(input: UpdateSettingsInput): Promise<UserSettings> {
    const current = await this.get();
    const updated: UserSettings = {
      ...current,
      ...input,
      spendingLevels: input.spendingLevels
        ? { ...current.spendingLevels, ...input.spendingLevels }
        : current.spendingLevels,
    };

    const row = mapSettingsToDb(updated, this.userId);
    await this.supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' });

    return updated;
  }

  async updateStartingBalance(amount: number): Promise<UserSettings> {
    return this.update({ startingBalance: amount });
  }
}
