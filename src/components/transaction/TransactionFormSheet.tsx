'use client';

import React, { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Modal } from '@/components/common/Modal';
import { Transaction, TransactionType } from '@/types/transaction';
import { Category } from '@/types/category';
import { CategorySelector } from './CategorySelector';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY, toDateString } from '@/lib/utils/date';
import { validateTransactionInput } from '@/lib/validation/transaction';
import { Trash2, Calendar as CalendarIcon, Tag, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string; // 'YYYY-MM-DD'
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  categories: Category[];
  onSave: (data: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// Các nút phím tắt cộng nhanh số tiền cho trải nghiệm mobile siêu tốc
const QUICK_AMOUNTS = [
  { label: '+50k', value: 50_000 },
  { label: '+100k', value: 100_000 },
  { label: '+200k', value: 200_000 },
  { label: '+500k', value: 500_000 },
];

export function TransactionFormSheet({
  isOpen,
  onClose,
  initialDate,
  initialType = 'expense',
  editingTransaction,
  categories,
  onSave,
  onDelete,
}: TransactionFormSheetProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(initialDate);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Populate form khi mở sheet
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({});
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmountStr(String(editingTransaction.amount));
        setCategoryId(editingTransaction.categoryId);
        setDate(editingTransaction.date);
        setNote(editingTransaction.note || '');
      } else {
        setType(initialType);
        setAmountStr('');
        setDate(initialDate);
        setNote('');

        // Tự động chọn category đầu tiên hợp lệ
        const suitable = categories.filter(
          (c) => c.type === initialType && (c.isActive ?? true)
        );
        if (suitable.length > 0) {
          setCategoryId(suitable[0].id);
        }
      }
    }
  }, [isOpen, editingTransaction, initialDate, initialType, categories]);

  // Đổi loại Chi tiêu / Thu nhập
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const suitable = categories.filter(
      (c) => c.type === newType && (c.isActive ?? true)
    );
    if (suitable.length > 0) {
      setCategoryId(suitable[0].id);
    }
    setValidationErrors((prev) => ({ ...prev, type: '' }));
  };

  const rawNumber = parseInt(amountStr.replace(/\D/g, '') || '0', 10);

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmountStr(value);
    setValidationErrors((prev) => ({ ...prev, amount: '' }));
  };

  // Nút cộng dồn nhanh số tiền
  const handleAddQuickAmount = (val: number) => {
    const nextVal = rawNumber + val;
    setAmountStr(String(nextVal));
    setValidationErrors((prev) => ({ ...prev, amount: '' }));
  };

  const handleClearAmount = () => {
    setAmountStr('');
  };

  // Quick date shortcuts
  const todayStr = toDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateTransactionInput({
      type,
      amount: rawNumber,
      categoryId,
      date,
      note: note.trim() || undefined,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        type,
        amount: rawNumber,
        categoryId,
        date,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setValidationErrors({ amount: 'Đã có lỗi xảy ra khi lưu giao dịch.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (editingTransaction && onDelete) {
      await onDelete(editingTransaction.id);
      setIsDeleteModalOpen(false);
      onClose();
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={
          editingTransaction
            ? 'Chỉnh Sửa Giao Dịch'
            : type === 'expense'
            ? 'Ghi Khoản Chi Mới'
            : 'Ghi Khoản Thu Mới'
        }
        description={`Ngày ${formatDateDMY(date)}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1 select-none">
          {/* 1. Toggle Chi tiêu / Thu nhập */}
          <div className="flex p-1 rounded-2xl bg-surface-secondary border border-border/80">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all',
                type === 'expense'
                  ? 'bg-surface dark:bg-surface-elevated text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all',
                type === 'income'
                  ? 'bg-surface dark:bg-surface-elevated text-status-income shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Thu nhập
            </button>
          </div>

          {/* 2. Ô nhập số tiền lớn — Trọng tâm thị giác */}
          <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-surface-secondary border border-border/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              Số tiền ({type === 'expense' ? 'Khoản chi' : 'Khoản thu'})
            </span>

            <div className="relative flex items-center justify-center w-full">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={rawNumber > 0 ? rawNumber.toLocaleString('vi-VN') : ''}
                onChange={handleAmountInputChange}
                placeholder="0"
                className={cn(
                  'w-full text-center text-3xl sm:text-4xl font-black bg-transparent tracking-tight text-text-primary focus:outline-none placeholder:text-text-muted/30',
                  type === 'income' && 'text-status-income'
                )}
              />
              <span className="absolute right-4 text-base font-bold text-text-muted pointer-events-none">
                đ
              </span>
            </div>

            {/* Phím bấm cộng nhanh số tiền */}
            <div className="flex items-center gap-1.5 mt-3">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => handleAddQuickAmount(q.value)}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-surface dark:bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:bg-border/60 active:scale-95 transition-all shadow-sm"
                >
                  {q.label}
                </button>
              ))}
              {rawNumber > 0 && (
                <button
                  type="button"
                  onClick={handleClearAmount}
                  className="px-2 py-1 rounded-xl text-[10px] font-bold text-status-danger hover:bg-status-danger-soft active:scale-95 transition-all"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Lỗi số tiền */}
            {validationErrors.amount && (
              <span className="text-xs font-bold text-status-danger mt-2 animate-in fade-in">
                {validationErrors.amount}
              </span>
            )}
          </div>

          {/* 3. Lựa chọn danh mục */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-text-muted" />
                <span>Danh mục</span>
              </label>
              {validationErrors.categoryId && (
                <span className="text-[11px] font-bold text-status-danger">
                  {validationErrors.categoryId}
                </span>
              )}
            </div>

            <CategorySelector
              categories={categories}
              selectedCategoryId={categoryId}
              onSelectCategory={(id) => {
                setCategoryId(id);
                setValidationErrors((prev) => ({ ...prev, categoryId: '' }));
              }}
              type={type}
            />
          </div>

          {/* 4. Chọn ngày giao dịch */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-text-muted" />
                <span>Ngày ghi nhận</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all',
                    date === todayStr
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all',
                    date === yesterdayStr
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  Hôm qua
                </button>
              </div>
            </div>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 5. Ghi chú (Tùy chọn) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-text-muted" />
              <span>Ghi chú (Tùy chọn)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Ví dụ: Cơm trưa, đổ xăng, cafe bạn bè..."
              className="w-full px-4 py-2.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 6. Hàng nút Hành động: Lưu, Hủy, Xóa */}
          <div className="flex items-center gap-2 pt-2">
            {editingTransaction && onDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-3.5 rounded-2xl bg-status-danger-soft text-status-danger hover:bg-status-danger hover:text-white active:scale-95 transition-all shadow-sm"
                title="Xóa giao dịch"
                aria-label="Xóa giao dịch"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-soft active:scale-95 transition-all flex items-center justify-center gap-1.5',
                type === 'expense'
                  ? 'bg-primary text-primary-content hover:bg-primary-hover'
                  : 'bg-status-income text-white hover:opacity-90'
              )}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {editingTransaction
                  ? 'Lưu thay đổi'
                  : type === 'expense'
                  ? 'Lưu khoản chi'
                  : 'Lưu khoản thu'}
              </span>
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Modal xác nhận xóa khi đang sửa giao dịch */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xóa giao dịch này?"
        description="Giao dịch sẽ được gỡ bỏ khỏi toàn bộ hệ thống. Số tiền khả dụng và thống kê sẽ được cập nhật tự động."
        confirmText="Xác nhận xóa"
        cancelText="Giữ lại"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
