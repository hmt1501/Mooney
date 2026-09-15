'use client';

import React, { useState, useMemo } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { useToast } from '@/components/common/ToastContext';
import { AvailableMoneyBanner } from '@/components/home/AvailableMoneyBanner';
import { FinancialCalendar } from '@/components/calendar/FinancialCalendar';
import { SpendingLevelModal } from '@/components/calendar/SpendingLevelModal';
import { UpcomingBillsPreview } from '@/components/home/UpcomingBillsPreview';
import { DailyDetailSheet } from '@/components/transaction/DailyDetailSheet';
import { TransactionFormSheet } from '@/components/transaction/TransactionFormSheet';
import { LoadingState } from '@/components/common/LoadingState';
import { toDateString } from '@/lib/utils/date';
import {
  calculateAverageSpendingPerActiveDay,
  calculateSafeDailySpending,
  calculateSpendingPace,
} from '@/lib/calculations/financial';
import { getDaysInMonth } from '@/lib/calculations/income';
import { Transaction, TransactionType } from '@/types/transaction';
import { SpendingLevelConfig } from '@/types/settings';
import { formatCurrency } from '@/lib/utils/currency';

export default function CalendarHomePage() {
  const {
    transactions,
    categories,
    bills,
    settings,
    availableBalance,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    markBillAsPaid,
    updateSettings,
  } = useMooneyData();

  const { success, error } = useToast();

  const now = useMemo(() => new Date(), []);
  const { year, month } = useSelectedMonth(); // 1-12, điều khiển từ TopHeader
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(now));

  // Sheets & Modals state
  const [isDailyDetailOpen, setIsDailyDetailOpen] = useState<boolean>(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState<boolean>(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Modal tùy chỉnh Mức chi tiêu (Heatmap)
  const [isSpendingConfigOpen, setIsSpendingConfigOpen] = useState<boolean>(false);

  // Lọc transactions của tháng đang xem để tính tổng thu & tổng chi
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const totalExpenseMonth = useMemo(() => {
    let exp = 0;
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith(monthPrefix)) exp += tx.amount;
    }
    return exp;
  }, [transactions, monthPrefix]);

  // Giá trị chi tiêu trung bình mỗi ngày có chi tiêu (tính đến hôm nay)
  const averageDailySpending = useMemo(() => {
    return calculateAverageSpendingPerActiveDay(transactions, monthPrefix, toDateString(now));
  }, [transactions, monthPrefix, now]);

  // Tính hạn mức chi tiêu an toàn hàng ngày cho ngày đang chọn
  const safeDailyResult = useMemo(() => {
    return calculateSafeDailySpending(availableBalance, selectedDate);
  }, [availableBalance, selectedDate]);

  // Tính Spending Pace cho tháng đang chọn
  const spendingPace = useMemo(() => {
    const daysInCurMonth = getDaysInMonth(year, month);
    const isCurrentActualMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const curDay = isCurrentActualMonth ? now.getDate() : daysInCurMonth;
    const totalBudget = Math.max(availableBalance + totalExpenseMonth, 0);
    return calculateSpendingPace(totalExpenseMonth, daysInCurMonth, curDay, totalBudget);
  }, [year, month, availableBalance, totalExpenseMonth, now]);

  // 1. Single tap ngày: Chọn ngày & Mở DailyDetailSheet
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDailyDetailOpen(true);
  };

  // 2. Double tap ngày: Mở ngay TransactionFormSheet với type = expense và date = dateStr
  const handleQuickAdd = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFormType('expense');
    setEditingTx(null);
    setIsDailyDetailOpen(false);
    setIsTransactionFormOpen(true);
  };

  // Thêm giao dịch mới từ DailyDetailSheet
  const handleOpenAddFromDaily = (type: TransactionType) => {
    setFormType(type);
    setEditingTx(null);
    setIsDailyDetailOpen(false);
    setIsTransactionFormOpen(true);
  };

  // Chỉnh sửa giao dịch từ DailyDetailSheet
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setIsDailyDetailOpen(false);
    setIsTransactionFormOpen(true);
  };

  // Xử lý lưu giao dịch
  const handleSaveTransaction = async (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
  }) => {
    if (editingTx) {
      await updateTransaction(editingTx.id, data);
      success('Đã cập nhật giao dịch thành công!');
    } else {
      await addTransaction(data);
      success(
        data.type === 'expense'
          ? `Đã thêm khoản chi ${formatCurrency(data.amount)}!`
          : `Đã thêm khoản thu ${formatCurrency(data.amount)}!`
      );
    }
  };

  // Xử lý xóa giao dịch
  const handleDeleteTransaction = async (txId: string) => {
    const ok = await deleteTransaction(txId);
    if (ok) {
      success('Đã xóa giao dịch thành công!');
      setIsTransactionFormOpen(false);
      setEditingTx(null);
    } else {
      error('Không thể xóa giao dịch này.');
    }
  };

  // Xử lý đánh dấu thanh toán hóa đơn
  const handleMarkBillPaid = async (billId: string) => {
    try {
      const todayStr = toDateString(new Date());
      const result = await markBillAsPaid(billId, todayStr);
      success(`Đã thanh toán "${result.bill.name}" thành công!`);
    } catch {
      error('Đã có lỗi khi thanh toán hóa đơn.');
    }
  };

  const handleSaveSpendingLevels = async (levels: SpendingLevelConfig) => {
    await updateSettings({ spendingLevels: levels });
    setIsSpendingConfigOpen(false);
    success('Đã lưu cấu hình mức chi tiêu!');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <LoadingState type="card" />
        <LoadingState type="calendar" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* 1. Unified Financial Banner (Available Money ↔ Spent Money) */}
      <AvailableMoneyBanner
        availableBalance={availableBalance}
        monthExpense={totalExpenseMonth}
        averageDailySpending={averageDailySpending}
        safeDailyResult={safeDailyResult}
        spendingPace={spendingPace}
      />

      {/* 2. Financial Calendar (T2 - CN, Heatmap, Single & Double tap, Spending Level Gear) */}
      <FinancialCalendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        transactions={transactions}
        spendingLevels={settings.spendingLevels}
        onSelectDate={handleSelectDate}
        onQuickAdd={handleQuickAdd}
        onOpenSpendingConfig={() => setIsSpendingConfigOpen(true)}
      />

      {/* 3. Upcoming Bills Preview */}
      <UpcomingBillsPreview
        bills={bills}
        categories={categories}
        onMarkPaid={handleMarkBillPaid}
      />

      {/* 4. Daily Detail Bottom Sheet */}
      <DailyDetailSheet
        isOpen={isDailyDetailOpen}
        onClose={() => setIsDailyDetailOpen(false)}
        dateStr={selectedDate}
        transactions={transactions}
        categories={categories}
        onOpenAddTransaction={handleOpenAddFromDaily}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
      />

      {/* 5. Quick Transaction Entry Bottom Sheet */}
      <TransactionFormSheet
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTx(null);
        }}
        initialDate={selectedDate}
        initialType={formType}
        editingTransaction={editingTx}
        categories={categories}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* 6. Spending Level Customization Modal */}
      <SpendingLevelModal
        isOpen={isSpendingConfigOpen}
        onClose={() => setIsSpendingConfigOpen(false)}
        currentConfig={settings.spendingLevels}
        onSave={handleSaveSpendingLevels}
      />
    </div>
  );
}
