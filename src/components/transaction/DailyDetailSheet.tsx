'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Modal } from '@/components/common/Modal';
import { Transaction, TransactionType } from '@/types/transaction';
import { Category } from '@/types/category';
import { calculateDailyTotals } from '@/lib/calculations/financial';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY } from '@/lib/utils/date';
import { TransactionList } from './TransactionList';
import { Plus } from 'lucide-react';

interface DailyDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // 'YYYY-MM-DD'
  transactions: Transaction[];
  categories: Category[];
  onOpenAddTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

export function DailyDetailSheet({
  isOpen,
  onClose,
  dateStr,
  transactions,
  categories,
  onOpenAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: DailyDetailSheetProps) {
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Lọc giao dịch của ngày đã chọn
  const dailyTransactions = transactions.filter((t) => t.date === dateStr);
  const dailyTotals = calculateDailyTotals(transactions, dateStr);

  const handleConfirmDelete = async () => {
    if (deletingTxId) {
      await onDeleteTransaction(deletingTxId);
      setDeletingTxId(null);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={`Chi Tiết Ngày ${formatDateDMY(dateStr)}`}
        description="Tổng quan thu chi và các giao dịch trong ngày"
      >
        <div className="flex flex-col gap-4 py-1 select-none">
          {/* 1. Thẻ tổng quan ngày: Chi, Thu */}
          <div className="grid grid-cols-2 gap-2.5 p-4 rounded-3xl bg-surface-secondary border border-border/80">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Tổng chi
              </span>
              <span className="text-xl font-black text-text-primary tracking-tight mt-0.5">
                {formatCurrency(dailyTotals.totalExpense)}
              </span>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Thu nhập
              </span>
              <span className="text-xl font-black text-status-income tracking-tight mt-0.5">
                {formatCurrency(dailyTotals.totalIncome)}
              </span>
            </div>
          </div>

          {/* 2. Danh sách giao dịch dùng TransactionList */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-text-muted">
                Giao dịch ({dailyTransactions.length})
              </span>
            </div>

            <TransactionList
              transactions={dailyTransactions}
              categories={categories}
              onSelectTransaction={onEditTransaction}
              onDeleteTransaction={(id) => setDeletingTxId(id)}
              emptyMessage="Chưa có giao dịch nào trong ngày này"
            />
          </div>

          {/* 3. Nút Thêm Giao Dịch Nhanh */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenAddTransaction('expense')}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl text-xs font-bold bg-primary text-primary-content hover:bg-primary-hover active:scale-95 shadow-soft transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm khoản chi</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAddTransaction('income')}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl text-xs font-bold bg-surface-secondary text-text-primary hover:bg-border/60 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm thu nhập</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={Boolean(deletingTxId)}
        onClose={() => setDeletingTxId(null)}
        title="Xóa giao dịch này?"
        description="Giao dịch sẽ được gỡ bỏ khỏi toàn bộ hệ thống. Số tiền khả dụng và thống kê sẽ được cập nhật lại tương ứng."
        confirmText="Xác nhận xóa"
        cancelText="Giữ lại"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
