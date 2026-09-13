import { describe, it, expect } from 'vitest';
import { resolveEntityConflicts } from '../syncEngine';
import {
  mapTransactionToDb,
  mapTransactionFromDb,
  mapIncomeToDb,
  mapIncomeFromDb,
  mapCategoryToDb,
  mapCategoryFromDb,
  mapBillToDb,
  mapBillFromDb,
  mapSettingsToDb,
  mapSettingsFromDb,
} from '@/lib/repository/supabaseRepository';
import { Transaction } from '@/types/transaction';
import { IncomeItem } from '@/types/income';

describe('Cloud Sync & Conflict Resolution Tests', () => {
  describe('1. Deterministic Conflict Resolution (Last-Write-Wins)', () => {
    it('khi item chỉ có ở local: đưa vào toUpload và merged', () => {
      const localItems: Transaction[] = [
        {
          id: 'tx-1',
          type: 'expense',
          amount: 50_000,
          categoryId: 'cat-food',
          date: '2026-09-10',
          createdAt: '2026-09-10T10:00:00Z',
          updatedAt: '2026-09-10T10:00:00Z',
        },
      ];
      const remoteItems: Transaction[] = [];

      const result = resolveEntityConflicts(localItems, remoteItems);

      expect(result.merged).toHaveLength(1);
      expect(result.toUpload).toHaveLength(1);
      expect(result.toUpload[0].id).toBe('tx-1');
      expect(result.toSaveLocal).toHaveLength(0);
    });

    it('khi item chỉ có ở remote: đưa vào toSaveLocal và merged', () => {
      const localItems: Transaction[] = [];
      const remoteItems: Transaction[] = [
        {
          id: 'tx-remote-1',
          type: 'income',
          amount: 15_000_000,
          categoryId: 'cat-salary',
          date: '2026-09-25',
          createdAt: '2026-09-25T08:00:00Z',
          updatedAt: '2026-09-25T08:00:00Z',
        },
      ];

      const result = resolveEntityConflicts(localItems, remoteItems);

      expect(result.merged).toHaveLength(1);
      expect(result.toSaveLocal).toHaveLength(1);
      expect(result.toSaveLocal[0].id).toBe('tx-remote-1');
      expect(result.toUpload).toHaveLength(0);
    });

    it('khi cả hai cùng có item nhưng local mới hơn (Last-Write-Wins): chọn local và upload lên remote', () => {
      const localItem: Transaction = {
        id: 'tx-shared',
        type: 'expense',
        amount: 120_000, // Cập nhật mới hơn ở local
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T12:00:00Z', // Mới hơn
      };

      const remoteItem: Transaction = {
        id: 'tx-shared',
        type: 'expense',
        amount: 100_000,
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z', // Cũ hơn
      };

      const result = resolveEntityConflicts([localItem], [remoteItem]);

      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].amount).toBe(120_000);
      expect(result.toUpload).toHaveLength(1);
      expect(result.toSaveLocal).toHaveLength(0);
    });

    it('khi cả hai cùng có item nhưng remote mới hơn (Last-Write-Wins): chọn remote và lưu vào local', () => {
      const localItem: Transaction = {
        id: 'tx-shared',
        type: 'expense',
        amount: 100_000,
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z', // Cũ hơn
      };

      const remoteItem: Transaction = {
        id: 'tx-shared',
        type: 'expense',
        amount: 150_000,
        categoryId: 'cat-food',
        date: '2026-09-10',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T14:00:00Z', // Mới hơn
      };

      const result = resolveEntityConflicts([localItem], [remoteItem]);

      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].amount).toBe(150_000);
      expect(result.toSaveLocal).toHaveLength(1);
      expect(result.toUpload).toHaveLength(0);
    });

    it('tuyệt đối không tạo duplicate IDs trong danh sách merged', () => {
      const localItems: IncomeItem[] = [
        {
          id: 'inc-1',
          name: 'Lương',
          amount: 15_000_000,
          type: 'recurring',
          recurrence: 'monthly',
          receiveDay: 25,
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'inc-2',
          name: 'Thưởng',
          amount: 2_000_000,
          type: 'one_time',
          date: '2026-09-15',
          isActive: true,
          createdAt: '2026-09-02T00:00:00Z',
          updatedAt: '2026-09-02T00:00:00Z',
        },
      ];

      const remoteItems: IncomeItem[] = [
        {
          id: 'inc-1',
          name: 'Lương Cty',
          amount: 15_000_000,
          type: 'recurring',
          recurrence: 'monthly',
          receiveDay: 25,
          isActive: true,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T05:00:00Z',
        },
        {
          id: 'inc-3',
          name: 'Freelance',
          amount: 5_000_000,
          type: 'one_time',
          date: '2026-09-18',
          isActive: true,
          createdAt: '2026-09-03T00:00:00Z',
          updatedAt: '2026-09-03T00:00:00Z',
        },
      ];

      const result = resolveEntityConflicts(localItems, remoteItems);

      // Tổng số unique IDs phải là 3: inc-1, inc-2, inc-3
      expect(result.merged).toHaveLength(3);
      const ids = result.merged.map((i) => i.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('2. Supabase Data Mappers', () => {
    const userId = 'user-uuid-1234';

    it('chuyển đổi Transaction sang DB row và ngược lại chính xác', () => {
      const tx: Transaction = {
        id: 'tx-100',
        type: 'expense',
        amount: 85_000,
        categoryId: 'cat-food',
        date: '2026-09-12',
        note: 'Cà phê sáng',
        createdAt: '2026-09-12T08:00:00Z',
        updatedAt: '2026-09-12T08:00:00Z',
      };

      const dbRow = mapTransactionToDb(tx, userId);
      expect(dbRow.user_id).toBe(userId);
      expect(dbRow.category_id).toBe('cat-food');
      expect(dbRow.amount).toBe(85_000);

      const restored = mapTransactionFromDb(dbRow);
      expect(restored.id).toBe(tx.id);
      expect(restored.categoryId).toBe(tx.categoryId);
      expect(restored.amount).toBe(tx.amount);
      expect(restored.note).toBe(tx.note);
    });

    it('chuyển đổi Settings (bao gồm Starting Balance & Spending Levels) chính xác', () => {
      const settings = {
        startingBalance: 5_000_000,
        currency: 'VND',
        heatmapTheme: 'forest' as const,
        theme: 'dark' as const,
        spendingLevels: {
          lowMax: 80_000,
          mediumMax: 300_000,
        },
        updatedAt: '2026-09-12T00:00:00Z',
      };

      const dbRow = mapSettingsToDb(settings, userId);
      expect(dbRow.starting_balance).toBe(5_000_000);
      expect(dbRow.spending_levels.lowMax).toBe(80_000);

      const restored = mapSettingsFromDb(dbRow);
      expect(restored.startingBalance).toBe(5_000_000);
      expect(restored.spendingLevels?.lowMax).toBe(80_000);
      expect(restored.spendingLevels?.mediumMax).toBe(300_000);
    });
  });
});
