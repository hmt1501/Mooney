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
} from './interfaces';
import { DEFAULT_SETTINGS } from '@/lib/constants/seedData';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';

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
    created_at: item.createdAt,
    updated_at: item.updatedAt || new Date().toISOString(),
  };
}

export function mapIncomeFromDb(row: any): IncomeItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
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
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    amount: item.amount,
    type: item.type || (item.recurrence === 'monthly' ? 'recurring' : 'one_time'),
    recurrence: typeof item.recurrence === 'string' ? item.recurrence : 'never',
    receive_day: item.receiveDay || null,
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
    isActive: row.is_active !== false,
    lastPaidDate: row.last_paid_date || undefined,
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
    is_active: item.isActive !== false,
    last_paid_date: item.lastPaidDate || null,
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
    theme: row.theme || 'system',
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

  async getAll(): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[SupabaseTransactionRepository] getAll error:', error);
      return [];
    }
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

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const now = new Date().toISOString();
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tx: Transaction = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const row = mapTransactionToDb(tx, this.userId);
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

  async getAll(): Promise<IncomeItem[]> {
    const { data, error } = await this.supabase
      .from('incomes')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseIncomeRepository] getAll error:', error);
      return [];
    }
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

  async getAll(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
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

  async getAll(): Promise<RecurringBill[]> {
    const { data, error } = await this.supabase
      .from('recurring_bills')
      .select('*')
      .eq('user_id', this.userId)
      .order('due_date', { ascending: true });

    if (error) return [];
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

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }
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
