'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RecurringBill, CreateBillInput, BillFrequency } from '@/types/bill';
import { Category } from '@/types/category';
import { BottomSheet } from '@/components/common/BottomSheet';
import { CategorySelector } from '@/components/transaction/CategorySelector';
import { Modal } from '@/components/common/Modal';
import { validateBillInput } from '@/lib/validation/bill';
import { formatCurrency } from '@/lib/utils/currency';
import { REPEAT_LABELS } from '@/lib/utils/bill';
import { Calendar, Trash2, ReceiptText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialBill?: RecurringBill | null;
  onSave: (billData: CreateBillInput, billId?: string) => Promise<void>;
  onDelete?: (billId: string) => Promise<void>;
}

const QUICK_AMOUNTS = [
  { label: '+50k', value: 50000 },
  { label: '+100k', value: 100000 },
  { label: '+200k', value: 200000 },
  { label: '+500k', value: 500000 },
  { label: '+1tr', value: 1000000 },
];

const FREQUENCIES: BillFrequency[] = ['never', 'weekly', 'monthly', 'yearly'];

export function BillFormSheet({
  isOpen,
  onClose,
  categories,
  initialBill,
  onSave,
  onDelete,
}: BillFormSheetProps) {
  const isEditMode = !!initialBill;

  // Form states
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [repeat, setRepeat] = useState<BillFrequency>('monthly');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Lọc chỉ lấy danh mục chi tiêu cho hóa đơn
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const clearError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Đổ dữ liệu khi mở form hoặc chuyển đổi chế độ
  useEffect(() => {
    if (initialBill) {
      setName(initialBill.name);
      setAmount(initialBill.amount);
      setAmountStr(initialBill.amount.toLocaleString('vi-VN'));
      setCategoryId(initialBill.categoryId);
      setDueDate(initialBill.dueDate);
      setRepeat(initialBill.repeat);
      setNote(initialBill.note || '');
    } else {
      setName('');
      setAmount(0);
      setAmountStr('');
      const defaultCat = expenseCategories.find((c) => c.id === 'cat-bills') || expenseCategories[0];
      setCategoryId(defaultCat?.id || '');
      setDueDate(new Date().toISOString().split('T')[0]);
      setRepeat('monthly');
      setNote('');
    }
    setErrors({});
  }, [initialBill, isOpen, expenseCategories]);


  // Xử lý nhập số tiền với định dạng phân cách hàng nghìn
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountStr('');
      setAmount(0);
      return;
    }
    const num = parseInt(rawValue, 10);
    setAmount(num);
    setAmountStr(num.toLocaleString('vi-VN'));
    clearError('amount');
  };

  // Cộng dồn nhanh số tiền
  const addQuickAmount = (val: number) => {
    const newAmount = amount + val;
    setAmount(newAmount);
    setAmountStr(newAmount.toLocaleString('vi-VN'));
    clearError('amount');
  };


  // Chọn ngày nhanh
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // Xử lý gửi form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const inputData: CreateBillInput = {
      name: name.trim(),
      amount,
      categoryId,
      dueDate,
      repeat,
      note: note.trim() || undefined,
    };

    const validation = validateBillInput(
      inputData,
      expenseCategories.map((c) => c.id)
    );

    if (!validation.isValid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(inputData, initialBill?.id);
      onClose();
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu hóa đơn' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xóa
  const handleDeleteConfirm = async () => {
    if (!initialBill || !onDelete) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialBill.id);
      setShowDeleteModal(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? 'Chỉnh Sửa Hóa Đơn' : 'Thêm Hóa Đơn Mới'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-2">
          {/* Lỗi tổng quát nếu có */}
          {errors.form && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-status-danger-soft text-status-danger text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* 1. Tên hóa đơn */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Tên hóa đơn <span className="text-status-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError('name');
                }}
                placeholder="Ví dụ: Tiền phòng, Internet, Netflix..."
                maxLength={100}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl bg-surface-secondary border border-border text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                  errors.name && 'border-status-danger focus:ring-status-danger/30'
                )}
              />

            </div>
            {errors.name && (
              <span className="text-[11px] font-bold text-status-danger px-1">
                {errors.name}
              </span>
            )}
          </div>

          {/* 2. Ô nhập số tiền lớn */}
          <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-surface-secondary/70 border border-border/70 text-center gap-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Số tiền thanh toán
            </span>

            <div className="flex items-center justify-center gap-1 w-full">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0"
                autoFocus={!isEditMode}
                className="w-full text-center text-3xl font-black bg-transparent border-none focus:outline-none text-text-primary tracking-tight placeholder:text-text-muted tabular-nums"
              />
              <span className="text-lg font-black text-text-muted shrink-0">đ</span>
            </div>

            {errors.amount && (
              <span className="text-xs font-bold text-status-danger">
                {errors.amount}
              </span>
            )}

            {/* Chips cộng nhanh số tiền */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-1">
              {QUICK_AMOUNTS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => addQuickAmount(chip.value)}
                  className="px-2.5 py-1 rounded-xl bg-surface dark:bg-surface-elevated text-text-primary border border-border/80 text-[11px] font-bold hover:bg-primary-soft hover:text-primary active:scale-95 transition-all shadow-xs"
                >
                  {chip.label}
                </button>
              ))}
              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(0);
                    setAmountStr('');
                  }}
                  className="px-2 py-1 rounded-xl text-text-muted hover:text-status-danger text-[11px] font-bold active:scale-95 transition-all"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* 3. Tần suất lặp lại (Segmented Control) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Chu kỳ lặp lại <span className="text-status-danger">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-surface-secondary rounded-2xl border border-border">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setRepeat(freq)}
                  className={cn(
                    'py-2 px-1 rounded-xl text-xs font-bold transition-all text-center truncate',
                    repeat === freq
                      ? 'bg-primary text-white shadow-soft font-extrabold'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {REPEAT_LABELS[freq]}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Ngày đến hạn */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-muted">
                Ngày đến hạn <span className="text-status-danger">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="text-[11px] font-bold text-primary hover:underline px-1"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="text-[11px] font-bold text-primary hover:underline px-1"
                >
                  Ngày mai
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="text-[11px] font-bold text-primary hover:underline px-1"
                >
                  +7 ngày
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  clearError('dueDate');
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl bg-surface-secondary border border-border text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                  errors.dueDate && 'border-status-danger focus:ring-status-danger/30'
                )}
              />
            </div>
            {errors.dueDate && (
              <span className="text-[11px] font-bold text-status-danger px-1">
                {errors.dueDate}
              </span>
            )}
          </div>

          {/* 5. Chọn danh mục */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Danh mục chi tiêu <span className="text-status-danger">*</span>
            </label>
            <CategorySelector
              categories={expenseCategories}
              selectedCategoryId={categoryId}
              type="expense"
              onSelectCategory={(id) => {
                setCategoryId(id);
                clearError('categoryId');
              }}
            />
            {errors.categoryId && (
              <span className="text-[11px] font-bold text-status-danger px-1">
                {errors.categoryId}
              </span>
            )}
          </div>

          {/* 6. Ghi chú (tùy chọn) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Ghi chú thêm (tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú chi tiết cho hóa đơn..."
              maxLength={200}
              className="w-full px-4 py-3 rounded-2xl bg-surface-secondary border border-border text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Thao tác Form */}
          <div className="flex flex-col gap-2 pt-3 border-t border-border/80">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-primary text-white text-sm font-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ReceiptText className="w-4 h-4" />
              <span>{isEditMode ? 'Lưu Thay Đổi' : 'Lưu Hóa Đơn'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl bg-surface-secondary text-text-secondary text-xs font-bold hover:bg-surface-secondary/80 active:scale-95 transition-all text-center"
              >
                Hủy
              </button>

              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isSubmitting}
                  className="px-4 py-3 rounded-2xl bg-status-danger-soft text-status-danger text-xs font-bold hover:bg-status-danger hover:text-white active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </BottomSheet>

      {/* Modal xác nhận xóa hóa đơn */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận xóa hóa đơn"
        description={`Bạn có chắc chắn muốn xóa hóa đơn "${initialBill?.name}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa hóa đơn"
        cancelText="Giữ lại"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
      />

    </>
  );
}
