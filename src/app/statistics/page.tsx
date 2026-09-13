'use client';

import React, { useState, useMemo } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useToast } from '@/components/common/ToastContext';
import { MonthSelector } from '@/components/home/MonthSelector';
import { SpendingDonutChart } from '@/components/statistics/SpendingDonutChart';
import { CategoryBreakdownList } from '@/components/statistics/CategoryBreakdownList';
import { CategoryDetailSheet } from '@/components/statistics/CategoryDetailSheet';
import { MonthlyRecapCards } from '@/components/statistics/MonthlyRecapCards';
import { TransactionFormSheet } from '@/components/transaction/TransactionFormSheet';
import {
  calculateCategoryTotals,
  calculateMonthlyRecap,
} from '@/lib/calculations/financial';
import { formatCurrency } from '@/lib/utils/currency';
import { formatMonthYear } from '@/lib/utils/date';
import { Transaction, CreateTransactionInput } from '@/types/transaction';
import { TrendingUp, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatisticsPage() {
  const {
    transactions,
    categories,
    settings,
    updateTransaction,
    deleteTransaction,
  } = useMooneyData();

  const { success } = useToast();

  // 1. Quản lý tháng được chọn (Mặc định tháng hiện tại)
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const monthPrefix = useMemo(() => {
    return `${year}-${String(month).padStart(2, '0')}`;
  }, [year, month]);

  const monthLabel = useMemo(() => {
    return formatMonthYear(year, month);
  }, [year, month]);

  // 2. Tính toán các chỉ số dẫn xuất từ Transaction gốc (Canonical Data)
  const categoryTotals = useMemo(() => {
    return calculateCategoryTotals(
      transactions,
      categories,
      monthPrefix,
      'expense'
    );
  }, [transactions, categories, monthPrefix]);

  const recap = useMemo(() => {
    return calculateMonthlyRecap(
      settings.startingBalance,
      transactions,
      monthPrefix
    );
  }, [settings.startingBalance, transactions, monthPrefix]);

  // 3. State quản lý Category Drill-down Sheet
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  const selectedCategoryStat = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoryTotals.find((c) => c.categoryId === selectedCategoryId) || null;
  }, [selectedCategoryId, categoryTotals]);

  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return transactions.filter(
      (tx) =>
        tx.categoryId === selectedCategoryId &&
        tx.date.startsWith(monthPrefix) &&
        tx.type === 'expense'
    );
  }, [selectedCategoryId, transactions, monthPrefix]);

  // 4. State quản lý Transaction Edit Sheet khi bấm từ Category Detail
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleCloseCategoryDetail = () => {
    setSelectedCategoryId(null);
  };

  const handleSelectTransactionToEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsEditFormOpen(true);
  };

  const handleSaveEditedTransaction = async (
    input: CreateTransactionInput,
    id?: string
  ) => {
    if (id) {
      await updateTransaction(id, input);
      success('Đã cập nhật giao dịch thành công');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const ok = await deleteTransaction(id);
    if (ok) {
      success('Đã xóa giao dịch thành công');
      setIsEditFormOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-1 pb-6">
      {/* 1. Header Trang & Bộ Chọn Tháng */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              Thống Kê Chi Tiêu
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Cơ cấu danh mục & tổng kết dòng tiền thực tế
            </p>
          </div>
        </div>

        {/* Month Selector Component */}
        <div className="mt-1">
          <MonthSelector
            year={year}
            month={month}
            onMonthChange={(newYear, newMonth) => {
              setYear(newYear);
              setMonth(newMonth);
              setSelectedCategoryId(null); // Reset drill-down khi đổi tháng
            }}
          />
        </div>
      </div>

      {/* 2. Thẻ Tổng Quan Chi Tiêu Tháng Này */}
      <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Chi tiêu tháng này
          </span>
          <span className="text-xs font-bold text-text-muted">
            {recap.transactionCount} giao dịch
          </span>
        </div>

        <div>
          <span className="text-2xl font-black text-text-primary tracking-tight tabular-nums">
            {formatCurrency(recap.totalExpense)}
          </span>
        </div>

        {/* 2 chỉ số dòng tiền phụ: Thu nhập & Tiền giữ lại */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-status-income-soft text-status-income flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-text-muted font-bold">Thu nhập</span>
              <span className="text-xs font-black text-status-income tabular-nums truncate">
                {formatCurrency(recap.totalIncome)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-border/60">
            <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-text-muted font-bold">Tiền giữ lại</span>
              <span
                className={cn(
                  'text-xs font-black tabular-nums truncate',
                  recap.netChange >= 0 ? 'text-status-income' : 'text-text-primary'
                )}
              >
                {recap.netChange >= 0 ? '+' : ''}
                {formatCurrency(recap.netChange)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Biểu Đồ Donut SVG Phân Bổ Chi Tiêu */}
      <SpendingDonutChart
        categoryTotals={categoryTotals}
        totalExpense={recap.totalExpense}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* 4. Danh Sách Cơ Cấu Từng Danh Mục */}
      <CategoryBreakdownList
        categoryTotals={categoryTotals}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* 5. Thẻ Tổng Kết Tháng (Factual Monthly Recap) */}
      <MonthlyRecapCards
        recap={recap}
        topCategory={categoryTotals[0] || null}
      />

      {/* 6. Category Drill-down BottomSheet */}
      <CategoryDetailSheet
        isOpen={!!selectedCategoryId}
        onClose={handleCloseCategoryDetail}
        category={selectedCategory}
        categoryStat={selectedCategoryStat}
        transactions={selectedCategoryTransactions}
        monthLabel={monthLabel}
        onSelectTransaction={handleSelectTransactionToEdit}
      />

      {/* 7. Transaction Edit Form Sheet */}
      <TransactionFormSheet
        isOpen={isEditFormOpen}
        onClose={() => {
          setIsEditFormOpen(false);
          setEditingTransaction(null);
        }}
        initialDate={editingTransaction?.date || today.toISOString().split('T')[0]}
        initialType={editingTransaction?.type || 'expense'}
        editingTransaction={editingTransaction}
        categories={categories}
        onSave={async (data) => {
          if (editingTransaction) {
            await handleSaveEditedTransaction(data, editingTransaction.id);
            setIsEditFormOpen(false);
            setEditingTransaction(null);
          }
        }}
        onDelete={handleDeleteTransaction}
      />

    </div>
  );
}
