import { SupabaseClient } from '@supabase/supabase-js';
import { mooneyRepository } from '@/lib/repository/localRepository';
import {
  SupabaseTransactionRepository,
  SupabaseIncomeRepository,
  SupabaseCategoryRepository,
  SupabaseRecurringBillRepository,
  SupabaseSettingsRepository,
  mapTransactionToDb,
  mapIncomeToDb,
  mapCategoryToDb,
  mapBillToDb,
  mapSettingsToDb,
} from '@/lib/repository/supabaseRepository';
import { Transaction } from '@/types/transaction';
import { IncomeItem } from '@/types/income';
import { Category } from '@/types/category';
import { RecurringBill } from '@/types/bill';

export interface SyncResult {
  success: boolean;
  error?: string;
  migratedCount: number;
  syncedCount: number;
  lastSyncedAt: string;
}

const LAST_SYNC_KEY = 'mooney_last_synced_at';

/**
 * Lấy thời gian đồng bộ lần cuối
 */
export function getLastSyncedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function setLastSyncedAt(timestamp: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, timestamp);
}

/**
 * Giải thuật Deterministic Conflict Resolution (Last-Write-Wins)
 * So sánh 2 danh sách thực thể và trả về danh sách đồng bộ nhất quán.
 */
export function resolveEntityConflicts<T extends { id: string; updatedAt?: string }>(
  localItems: T[],
  remoteItems: T[]
): {
  merged: T[];
  toUpload: T[];
  toSaveLocal: T[];
} {
  const localMap = new Map<string, T>(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map<string, T>(remoteItems.map((item) => [item.id, item]));

  const merged: T[] = [];
  const toUpload: T[] = [];
  const toSaveLocal: T[] = [];

  // 1. Duyệt qua local items
  for (const [id, localItem] of localMap.entries()) {
    const remoteItem = remoteMap.get(id);

    if (!remoteItem) {
      // Có ở local mà chưa có ở remote -> đẩy lên remote
      merged.push(localItem);
      toUpload.push(localItem);
    } else {
      // Có ở cả hai -> so sánh updatedAt
      const localTime = new Date(localItem.updatedAt || 0).getTime();
      const remoteTime = new Date(remoteItem.updatedAt || 0).getTime();

      if (localTime >= remoteTime) {
        merged.push(localItem);
        if (localTime > remoteTime) {
          toUpload.push(localItem);
        }
      } else {
        merged.push(remoteItem);
        toSaveLocal.push(remoteItem);
      }
    }
  }

  // 2. Duyệt qua remote items chưa có ở local
  for (const [id, remoteItem] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      merged.push(remoteItem);
      toSaveLocal.push(remoteItem);
    }
  }

  return { merged, toUpload, toSaveLocal };
}

/**
 * Thực hiện đồng bộ 2 chiều hoàn chỉnh (Full Bidirectional Sync) giữa Local Storage và Supabase Cloud
 */
export async function performFullSync(
  supabase: SupabaseClient,
  userId: string
): Promise<SyncResult> {
  const now = new Date().toISOString();
  let migratedCount = 0;
  let syncedCount = 0;

  try {
    // 1. Khởi tạo Supabase Repositories cho user hiện tại
    const remoteTxRepo = new SupabaseTransactionRepository(supabase, userId);
    const remoteIncomeRepo = new SupabaseIncomeRepository(supabase, userId);
    const remoteCatRepo = new SupabaseCategoryRepository(supabase, userId);
    const remoteBillRepo = new SupabaseRecurringBillRepository(supabase, userId);
    const remoteSettingsRepo = new SupabaseSettingsRepository(supabase, userId);

    // 2. Lấy dữ liệu song song từ cả Local và Cloud
    const [
      localTx,
      remoteTx,
      localIncomes,
      remoteIncomes,
      localCats,
      remoteCats,
      localBills,
      remoteBills,
      localSettings,
      remoteSettings,
    ] = await Promise.all([
      mooneyRepository.transactions.getAll(),
      remoteTxRepo.getAll(),
      mooneyRepository.incomes.getAll(),
      remoteIncomeRepo.getAll(),
      mooneyRepository.categories.getAll(),
      remoteCatRepo.getAll(),
      mooneyRepository.bills.getAll(),
      remoteBillRepo.getAll(),
      mooneyRepository.settings.get(),
      remoteSettingsRepo.get(),
    ]);

    // 3. FIRST-TIME MIGRATION: Nếu trên Cloud chưa có transactions hay incomes nào,
    // nhưng local đã có dữ liệu từ Phase 1/Phase 2.1 (khách vãng lai trước khi đăng ký)
    const isCloudEmpty = remoteTx.length === 0 && remoteIncomes.length === 0;

    if (isCloudEmpty && (localTx.length > 0 || localIncomes.length > 0)) {
      console.log('[SyncEngine] Phát hiện dữ liệu offline, bắt đầu migrate lên Cloud...');

      // Đẩy hàng loạt transactions
      if (localTx.length > 0) {
        const rows = localTx.map((tx) => mapTransactionToDb(tx, userId));
        await supabase.from('transactions').upsert(rows);
        migratedCount += localTx.length;
      }

      // Đẩy incomes
      if (localIncomes.length > 0) {
        const rows = localIncomes.map((inc) => mapIncomeToDb(inc, userId));
        await supabase.from('incomes').upsert(rows);
        migratedCount += localIncomes.length;
      }

      // Đẩy categories tuỳ chỉnh
      const customCats = localCats.filter((c) => !c.isDefault);
      if (customCats.length > 0) {
        const rows = customCats.map((c) => mapCategoryToDb(c, userId));
        await supabase.from('categories').upsert(rows);
        migratedCount += customCats.length;
      }

      // Đẩy recurring bills
      if (localBills.length > 0) {
        const rows = localBills.map((b) => mapBillToDb(b, userId));
        await supabase.from('recurring_bills').upsert(rows);
        migratedCount += localBills.length;
      }

      // Đẩy settings
      const settingsRow = mapSettingsToDb(localSettings, userId);
      await supabase.from('user_settings').upsert(settingsRow, { onConflict: 'user_id' });

      setLastSyncedAt(now);
      return {
        success: true,
        migratedCount,
        syncedCount: migratedCount,
        lastSyncedAt: now,
      };
    }

    // 4. BIDIRECTIONAL DETERMINISTIC SYNC (Last-Write-Wins)
    // A. Transactions
    const txSync = resolveEntityConflicts<Transaction>(localTx, remoteTx);
    if (txSync.toUpload.length > 0) {
      const rows = txSync.toUpload.map((tx) => mapTransactionToDb(tx, userId));
      await supabase.from('transactions').upsert(rows);
      syncedCount += txSync.toUpload.length;
    }
    if (txSync.toSaveLocal.length > 0) {
      // Cập nhật local storage
      const txMap = new Map(localTx.map((t) => [t.id, t]));
      for (const item of txSync.toSaveLocal) {
        txMap.set(item.id, item);
      }
      localStorage.setItem('mooney_transactions', JSON.stringify(Array.from(txMap.values())));
      syncedCount += txSync.toSaveLocal.length;
    }

    // B. Incomes
    const incomeSync = resolveEntityConflicts<IncomeItem>(localIncomes, remoteIncomes);
    if (incomeSync.toUpload.length > 0) {
      const rows = incomeSync.toUpload.map((inc) => mapIncomeToDb(inc, userId));
      await supabase.from('incomes').upsert(rows);
      syncedCount += incomeSync.toUpload.length;
    }
    if (incomeSync.toSaveLocal.length > 0) {
      const incMap = new Map(localIncomes.map((i) => [i.id, i]));
      for (const item of incomeSync.toSaveLocal) {
        incMap.set(item.id, item);
      }
      localStorage.setItem('mooney_incomes', JSON.stringify(Array.from(incMap.values())));
      syncedCount += incomeSync.toSaveLocal.length;
    }

    // C. Categories
    const catSync = resolveEntityConflicts<Category>(localCats, remoteCats);
    if (catSync.toUpload.length > 0) {
      const rows = catSync.toUpload.map((c) => mapCategoryToDb(c, userId));
      await supabase.from('categories').upsert(rows);
    }
    if (catSync.toSaveLocal.length > 0) {
      const catMap = new Map(localCats.map((c) => [c.id, c]));
      for (const item of catSync.toSaveLocal) {
        catMap.set(item.id, item);
      }
      localStorage.setItem('mooney_categories', JSON.stringify(Array.from(catMap.values())));
    }

    // D. Bills
    const billSync = resolveEntityConflicts<RecurringBill>(localBills, remoteBills);
    if (billSync.toUpload.length > 0) {
      const rows = billSync.toUpload.map((b) => mapBillToDb(b, userId));
      await supabase.from('recurring_bills').upsert(rows);
    }
    if (billSync.toSaveLocal.length > 0) {
      const billMap = new Map(localBills.map((b) => [b.id, b]));
      for (const item of billSync.toSaveLocal) {
        billMap.set(item.id, item);
      }
      localStorage.setItem('mooney_bills', JSON.stringify(Array.from(billMap.values())));
    }

    // E. Settings
    const settingsRow = mapSettingsToDb(localSettings, userId);
    await supabase.from('user_settings').upsert(settingsRow, { onConflict: 'user_id' });

    setLastSyncedAt(now);
    return {
      success: true,
      migratedCount: 0,
      syncedCount,
      lastSyncedAt: now,
    };
  } catch (err: any) {
    console.error('[SyncEngine] Sync error:', err);
    return {
      success: false,
      error: err?.message || 'Lỗi không xác định khi đồng bộ',
      migratedCount: 0,
      syncedCount: 0,
      lastSyncedAt: getLastSyncedAt() || now,
    };
  }
}
