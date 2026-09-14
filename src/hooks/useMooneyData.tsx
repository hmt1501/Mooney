'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
import { mooneyRepository, setActiveStorageScope } from '@/lib/repository/localRepository';
import { calculateAvailableBalance, calculateSpentMoney } from '@/lib/calculations/financial';
import { DEFAULT_SETTINGS } from '@/lib/constants/seedData';
import { DEFAULT_CATEGORIES } from '@/lib/constants/categories';
import { useAuth } from '@/lib/auth/authContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  performFullSync,
  getLastSyncedAt,
  hasPendingChanges,
  resetSyncBase,
  SyncResult,
} from '@/lib/sync/syncEngine';

/**
 * - synced: lần đồng bộ gần nhất thành công và không còn thay đổi cục bộ chưa đẩy
 * - pending: có thay đổi cục bộ chưa được đồng bộ (hoặc chưa từng đồng bộ thành công)
 * - error: lần đồng bộ gần nhất thất bại
 */
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline' | 'unauthenticated';

interface MooneyDataContextType {
  // State
  transactions: Transaction[];
  categories: Category[];
  bills: RecurringBill[];
  incomes: IncomeItem[];
  settings: UserSettings;
  availableBalance: number;
  spentMoney: number;
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;

  // Transaction actions
  addTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  updateTransaction: (
    id: string,
    input: UpdateTransactionInput
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<boolean>;

  // Income actions (Phase 2)
  addIncome: (input: CreateIncomeInput) => Promise<IncomeItem>;
  updateIncome: (id: string, input: UpdateIncomeInput) => Promise<IncomeItem>;
  deleteIncome: (id: string) => Promise<boolean>;
  toggleIncomeActive: (id: string) => Promise<IncomeItem>;

  // Category actions
  addCategory: (input: CreateCategoryInput) => Promise<Category>;
  updateCategory: (
    id: string,
    input: UpdateCategoryInput
  ) => Promise<Category>;
  deleteCategory: (id: string) => Promise<boolean>;

  // Bill actions
  addBill: (input: CreateBillInput) => Promise<RecurringBill>;
  createBill: (input: CreateBillInput) => Promise<RecurringBill>;
  updateBill: (id: string, input: UpdateBillInput) => Promise<RecurringBill>;
  deleteBill: (id: string) => Promise<boolean>;
  markBillAsPaid: (
    billId: string,
    paymentDate: string
  ) => Promise<{ bill: RecurringBill; createdTransaction: Transaction }>;

  // Settings actions
  updateStartingBalance: (amount: number) => Promise<UserSettings>;
  updateSettings: (input: UpdateSettingsInput) => Promise<UserSettings>;

  // Data management
  resetToSeedData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonString: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  triggerSync: () => Promise<SyncResult>;
}

const MooneyDataContext = createContext<MooneyDataContextType | undefined>(
  undefined
);

export function MooneyDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;
  // Tài khoản mà UI đang hiển thị; dùng để bỏ qua kết quả đồng bộ của tài khoản đã đăng xuất
  const activeUserIdRef = useRef<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);

  // Sync status derivation: chỉ báo "đã đồng bộ" khi lần đồng bộ thực sự thành công
  const syncStatus: SyncStatus = useMemo(() => {
    if (!isConfigured) return 'offline';
    if (!user) return 'unauthenticated';
    if (isSyncing) return 'syncing';
    if (syncError) return 'error';
    if (pendingChanges || !lastSyncedAt) return 'pending';
    return 'synced';
  }, [isConfigured, user, isSyncing, syncError, pendingChanges, lastSyncedAt]);

  // Load toàn bộ dữ liệu từ Repository (Local-first)
  const refresh = useCallback(async () => {
    try {
      // 1. Khởi tạo seed data nếu là lần đầu tiên mở ứng dụng
      await mooneyRepository.dataManagement.initializeWithSeedData(false);

      // 2. Tải song song dữ liệu từ các repositories
      const [txList, catList, billList, incomeList, currentSettings] = await Promise.all([
        mooneyRepository.transactions.getAll(),
        mooneyRepository.categories.getAll(),
        mooneyRepository.bills.getAll(),
        mooneyRepository.incomes.getAll(),
        mooneyRepository.settings.get(),
      ]);

      setTransactions(txList);
      setCategories(catList);
      setBills(billList);
      setIncomes(incomeList);
      setSettings(currentSettings);
      setLastSyncedAtState(getLastSyncedAt(activeUserIdRef.current));
    } catch (error) {
      console.error('[MooneyDataProvider] Lỗi tải dữ liệu:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hàm trigger sync thủ công hoặc khi đăng nhập
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      return {
        success: false,
        error: !supabase ? 'Supabase chưa được cấu hình.' : 'Bạn cần đăng nhập để đồng bộ.',
        migratedCount: 0,
        syncedCount: 0,
        uploadedCount: 0,
        downloadedCount: 0,
        deletedRemoteCount: 0,
        deletedLocalCount: 0,
        lastSyncedAt: getLastSyncedAt(userId),
      };
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await performFullSync(supabase, userId);
      // Người dùng đã đăng xuất / đổi tài khoản trong lúc đồng bộ -> không cập nhật UI hiện tại
      if (activeUserIdRef.current !== userId) return result;

      if (result.success) {
        // Tải lại state mới nhất từ cache cục bộ vừa được hợp nhất
        await refresh();
      } else {
        setSyncError(result.error || 'Đồng bộ thất bại.');
      }
      return result;
    } finally {
      if (activeUserIdRef.current === userId) {
        setIsSyncing(false);
      }
    }
  }, [userId, refresh]);

  // Khi trạng thái đăng nhập đã rõ: chuyển sang vùng dữ liệu của đúng tài khoản (hoặc khách),
  // tải dữ liệu cục bộ của vùng đó, rồi đồng bộ ngầm nếu đã đăng nhập.
  useEffect(() => {
    if (isAuthLoading) return;

    activeUserIdRef.current = userId;
    setActiveStorageScope(userId);
    setIsLoading(true);
    setIsSyncing(false);
    setSyncError(null);
    setPendingChanges(false);

    refresh().then(() => {
      if (userId && isConfigured && activeUserIdRef.current === userId) {
        triggerSync();
      }
    });
    // triggerSync/refresh chỉ phụ thuộc userId, không cần chạy lại khi chúng đổi tham chiếu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, userId, isConfigured]);

  // Theo dõi thay đổi cục bộ chưa đồng bộ
  useEffect(() => {
    if (!userId || isLoading) return;
    let cancelled = false;
    hasPendingChanges(userId).then((pending) => {
      if (!cancelled) setPendingChanges(pending);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isLoading, transactions, categories, bills, incomes, settings, lastSyncedAt]);

  // Đồng bộ chủ đề Heatmap vào thẻ html
  useEffect(() => {
    if (typeof document !== 'undefined' && settings?.heatmapTheme) {
      document.documentElement.setAttribute('data-heatmap', settings.heatmapTheme);
    }
  }, [settings?.heatmapTheme]);

  // CÔNG THỨC CANONICAL CHUẨN PHASE 2:
  // Available Money = Starting Balance + Realized Income - Total Expense
  const availableBalance = useMemo(() => {
    return calculateAvailableBalance(settings.startingBalance, transactions, incomes);
  }, [settings.startingBalance, transactions, incomes]);

  // Spent Money trong chu kỳ hiện tại
  const spentMoney = useMemo(() => {
    return calculateSpentMoney(transactions);
  }, [transactions]);

  // Actions
  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      const created = await mooneyRepository.transactions.create(input);
      setTransactions((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const updateTransaction = useCallback(
    async (id: string, input: UpdateTransactionInput) => {
      const updated = await mooneyRepository.transactions.update(id, input);
      setTransactions((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    const success = await mooneyRepository.transactions.delete(id);
    if (success) {
      setTransactions((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }, []);

  const addCategory = useCallback(async (input: CreateCategoryInput) => {
    const created = await mooneyRepository.categories.create(input);
    setCategories((prev) => [...prev, created]);
    return created;
  }, []);

  const updateCategory = useCallback(
    async (id: string, input: UpdateCategoryInput) => {
      const updated = await mooneyRepository.categories.update(id, input);
      setCategories((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteCategory = useCallback(async (id: string) => {
    const success = await mooneyRepository.categories.delete(id);
    if (success) {
      setCategories((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }, []);

  const addBill = useCallback(async (input: CreateBillInput) => {
    const created = await mooneyRepository.bills.create(input);
    setBills((prev) => [...prev, created]);
    return created;
  }, []);

  const updateBill = useCallback(
    async (id: string, input: UpdateBillInput) => {
      const updated = await mooneyRepository.bills.update(id, input);
      setBills((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteBill = useCallback(async (id: string) => {
    const success = await mooneyRepository.bills.delete(id);
    if (success) {
      setBills((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }, []);

  const markBillAsPaid = useCallback(
    async (billId: string, paymentDate: string) => {
      const result = await mooneyRepository.bills.markAsPaid(
        billId,
        paymentDate
      );
      setBills((prev) =>
        prev.map((item) => (item.id === billId ? result.bill : item))
      );
      setTransactions((prev) => [...prev, result.createdTransaction]);
      return result;
    },
    []
  );

  const updateStartingBalance = useCallback(async (amount: number) => {
    const updated = await mooneyRepository.settings.updateStartingBalance(
      amount
    );
    setSettings(updated);
    return updated;
  }, []);

  const updateSettings = useCallback(async (input: UpdateSettingsInput) => {
    const updated = await mooneyRepository.settings.update(input);
    setSettings(updated);
    return updated;
  }, []);

  const resetToSeedData = useCallback(async () => {
    await mooneyRepository.dataManagement.resetAllData();
    // Không coi dữ liệu cục bộ vừa bị xóa là "đã xóa trên cloud"
    if (userId) resetSyncBase(userId);
    await refresh();
  }, [refresh, userId]);

  const exportData = useCallback(async () => {
    return mooneyRepository.dataManagement.exportJSON();
  }, []);

  const importData = useCallback(
    async (jsonString: string) => {
      const success = await mooneyRepository.dataManagement.importJSON(
        jsonString
      );
      if (success) {
        // Dữ liệu nhập được gộp với cloud ở lần đồng bộ sau, không xóa dữ liệu cloud
        if (userId) resetSyncBase(userId);
        await refresh();
      }
      return success;
    },
    [refresh, userId]
  );

  // Income Actions (Phase 2)
  const addIncome = useCallback(async (input: CreateIncomeInput) => {
    const created = await mooneyRepository.incomes.create(input);
    setIncomes((prev) => [...prev, created]);
    return created;
  }, []);

  const updateIncome = useCallback(
    async (id: string, input: UpdateIncomeInput) => {
      const updated = await mooneyRepository.incomes.update(id, input);
      setIncomes((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteIncome = useCallback(async (id: string) => {
    const success = await mooneyRepository.incomes.delete(id);
    if (success) {
      setIncomes((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }, []);

  const toggleIncomeActive = useCallback(
    async (id: string) => {
      const target = incomes.find((item) => item.id === id);
      if (!target) {
        throw new Error(`Không tìm thấy khoản thu nhập với id: ${id}`);
      }
      const updated = await mooneyRepository.incomes.update(id, {
        isActive: !target.isActive,
      });
      setIncomes((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    [incomes]
  );

  return (
    <MooneyDataContext.Provider
      value={{
        transactions,
        categories,
        bills,
        incomes,
        settings,
        availableBalance,
        spentMoney,
        isLoading,
        isSyncing,
        syncStatus,
        syncError,
        lastSyncedAt,
        triggerSync,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addIncome,
        updateIncome,
        deleteIncome,
        toggleIncomeActive,
        addCategory,
        updateCategory,
        deleteCategory,
        addBill,
        createBill: addBill,
        updateBill,
        deleteBill,
        markBillAsPaid,
        updateStartingBalance,
        updateSettings,
        resetToSeedData,
        exportData,
        importData,
        refresh,
      }}
    >
      {children}
    </MooneyDataContext.Provider>
  );
}

export function useMooneyData() {
  const context = useContext(MooneyDataContext);
  if (!context) {
    throw new Error('useMooneyData must be used within a MooneyDataProvider');
  }
  return context;
}
