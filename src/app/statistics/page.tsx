'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { useToast } from '@/components/common/ToastContext';
import { SpendingDonutChart } from '@/components/statistics/SpendingDonutChart';
import { CategoryBreakdownList } from '@/components/statistics/CategoryBreakdownList';
import { CategoryDetailSheet } from '@/components/statistics/CategoryDetailSheet';
import { MonthlyRecapCards } from '@/components/statistics/MonthlyRecapCards';
import { TransactionFormSheet } from '@/components/transaction/TransactionFormSheet';
import {
  calculateCategoryTotals,
  calculateMonthlyRecap,
} from '@/lib/calculations/financial';
import { formatMonthYear } from '@/lib/utils/date';
import { Transaction, CreateTransactionInput } from '@/types/transaction';

export default function StatisticsPage() {
  const {
    transactions,
    categories,
    settings,
    updateTransaction,
    deleteTransaction,
  } = useMooneyData();

  const { success } = useToast();

  // 1. Tháng đang xem dùng chung với tab Lịch (điều khiển từ TopHeader)
  const today = new Date();
  const { year, month } = useSelectedMonth();

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

  // Reset drill-down khi đổi tháng
  useEffect(() => {
    setSelectedCategoryId(null);
  }, [monthPrefix]);

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
      {/* 1. Biểu Đồ Donut SVG Phân Bổ Chi Tiêu */}
      <SpendingDonutChart
        categoryTotals={categoryTotals}
        totalExpense={recap.totalExpense}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* 2. Danh Sách Cơ Cấu Từng Danh Mục */}
      <CategoryBreakdownList
        categoryTotals={categoryTotals}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* 3. Thẻ Tổng Kết Tháng (Factual Monthly Recap) */}
      <MonthlyRecapCards
        recap={recap}
        topCategory={categoryTotals[0] || null}
      />

      {/* 4. Category Drill-down BottomSheet */}
      <CategoryDetailSheet
        isOpen={!!selectedCategoryId}
        onClose={handleCloseCategoryDetail}
        category={selectedCategory}
        categoryStat={selectedCategoryStat}
        transactions={selectedCategoryTransactions}
        monthLabel={monthLabel}
        onSelectTransaction={handleSelectTransactionToEdit}
      />

      {/* 5. Transaction Edit Form Sheet */}
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
