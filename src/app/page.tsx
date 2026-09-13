'use client';

import React, { useState, useMemo } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useToast } from '@/components/common/ToastContext';
import { MonthSelector } from '@/components/home/MonthSelector';
import { AvailableBalanceCard } from '@/components/home/AvailableBalanceCard';
import { SafeSpendingCard } from '@/components/home/SafeSpendingCard';
import { FinancialCalendar } from '@/components/calendar/FinancialCalendar';
import { UpcomingBillsPreview } from '@/components/home/UpcomingBillsPreview';
import { DailyDetailSheet } from '@/components/transaction/DailyDetailSheet';
import { TransactionFormSheet } from '@/components/transaction/TransactionFormSheet';
import { Modal } from '@/components/common/Modal';
import { LoadingState } from '@/components/common/LoadingState';
import { toDateString } from '@/lib/utils/date';
import { calculateSafeDailySpending } from '@/lib/calculations/financial';
import { Transaction, TransactionType } from '@/types/transaction';
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
    updateStartingBalance,
  } = useMooneyData();

  const { success, error } = useToast();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(now));

  // Sheets & Modals state
  const [isDailyDetailOpen, setIsDailyDetailOpen] = useState<boolean>(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState<boolean>(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Modal chỉnh sửa Số dư ban đầu
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [startingBalanceInput, setStartingBalanceInput] = useState<string>('');

  // Lọc transactions của tháng đang xem để tính tổng thu & tổng chi
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const { totalIncomeMonth, totalExpenseMonth } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      if (tx.date.startsWith(monthPrefix)) {
        if (tx.type === 'income') inc += tx.amount;
        else if (tx.type === 'expense') exp += tx.amount;
      }
    }
    return { totalIncomeMonth: inc, totalExpenseMonth: exp };
  }, [transactions, monthPrefix]);

  // Tính hạn mức chi tiêu an toàn hàng ngày cho ngày đang chọn
  const safeDailyResult = useMemo(() => {
    return calculateSafeDailySpending(availableBalance, selectedDate);
  }, [availableBalance, selectedDate]);

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

  // Mở modal sửa số dư ban đầu
  const handleOpenStartingBalanceModal = () => {
    setStartingBalanceInput(String(settings.startingBalance));
    setIsBalanceModalOpen(true);
  };

  const handleSaveStartingBalance = async () => {
    const raw = parseInt(startingBalanceInput.replace(/\D/g, '') || '0', 10);
    await updateStartingBalance(raw);
    setIsBalanceModalOpen(false);
    success(`Đã cập nhật số dư ban đầu: ${formatCurrency(raw)}`);
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
      {/* 1. Month Selector */}
      <MonthSelector
        year={year}
        month={month}
        onMonthChange={(newYear, newMonth) => {
          setYear(newYear);
          setMonth(newMonth);
        }}
      />

      {/* 2. Available Balance Card */}
      <AvailableBalanceCard
        availableBalance={availableBalance}
        totalIncome={totalIncomeMonth}
        totalExpense={totalExpenseMonth}
        daysRemaining={safeDailyResult.remainingDays}
        onEditStartingBalance={handleOpenStartingBalanceModal}
      />

      {/* 3. Safe Daily Spending Card */}
      <SafeSpendingCard safeDailyResult={safeDailyResult} />

      {/* 4. Financial Calendar (T2 - CN, Heatmap, Single & Double tap) */}
      <FinancialCalendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        transactions={transactions}
        onSelectDate={handleSelectDate}
        onQuickAdd={handleQuickAdd}
      />

      {/* 5. Upcoming Bills Preview */}
      <UpcomingBillsPreview
        bills={bills}
        categories={categories}
        onMarkPaid={handleMarkBillPaid}
      />

      {/* 6. Daily Detail Bottom Sheet */}
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

      {/* 7. Quick Transaction Entry Bottom Sheet */}
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

      {/* 8. Starting Balance Modal */}
      <Modal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        title="Số Dư Ban Đầu"
        description="Số tiền bạn có khi bắt đầu sử dụng Mooney. Đây là mốc xuất phát để tính Số Tiền Khả Dụng."
        confirmText="Lưu số dư"
        cancelText="Hủy"
        onConfirm={handleSaveStartingBalance}
      >
        <div className="flex flex-col gap-2 my-2">
          <label className="text-xs font-bold text-text-muted">
            Nhập số tiền ban đầu (VNĐ)
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={
                parseInt(startingBalanceInput.replace(/\D/g, '') || '0', 10) > 0
                  ? parseInt(
                      startingBalanceInput.replace(/\D/g, '') || '0',
                      10
                    ).toLocaleString('vi-VN')
                  : ''
              }
              onChange={(e) =>
                setStartingBalanceInput(e.target.value.replace(/\D/g, ''))
              }
              placeholder="5.000.000"
              className="w-full px-4 py-3 rounded-2xl bg-surface-secondary text-xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-4 font-bold text-text-muted">
              đ
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
