'use client';

import React, { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { IncomeItem, IncomeType } from '@/types/income';
import { toDateString } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface IncomeFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingIncome: IncomeItem | null;
  onSave: (data: {
    name: string;
    amount: number;
    type: IncomeType;
    recurrence?: { frequency: 'monthly'; dayOfMonth: number };
    receivedDate?: string;
    note?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function IncomeFormSheet({
  isOpen,
  onClose,
  editingIncome,
  onSave,
  onDelete,
}: IncomeFormSheetProps) {
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<IncomeType>('recurring');
  const [dayOfMonth, setDayOfMonth] = useState<number>(25);
  const [receivedDate, setReceivedDate] = useState<string>(toDateString(new Date()));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingIncome) {
      setName(editingIncome.name);
      setAmountStr(String(editingIncome.amount));
      const isRec =
        editingIncome.type === 'recurring' ||
        editingIncome.recurrence === 'monthly' ||
        (typeof editingIncome.recurrence === 'object' && editingIncome.recurrence !== null);
      setType(isRec ? 'recurring' : 'one_time');

      if (editingIncome.receiveDay) {
        setDayOfMonth(editingIncome.receiveDay);
      } else if (
        typeof editingIncome.recurrence === 'object' &&
        editingIncome.recurrence !== null &&
        editingIncome.recurrence.dayOfMonth
      ) {
        setDayOfMonth(editingIncome.recurrence.dayOfMonth);
      }

      const d = editingIncome.date || editingIncome.receivedDate;
      if (d) {
        setReceivedDate(d);
      }
      setNote(editingIncome.note || '');
    } else {
      setName('');
      setAmountStr('');
      setType('recurring');
      setDayOfMonth(25);
      setReceivedDate(toDateString(new Date()));
      setNote('');
    }
  }, [editingIncome, isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmountStr(raw);
  };

  const parsedAmount = parseInt(amountStr, 10) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || parsedAmount <= 0) return;

    try {
      setIsSubmitting(true);
      const safeDay = Math.min(Math.max(dayOfMonth, 1), 31);
      await onSave({
        name: name.trim(),
        amount: parsedAmount,
        type,
        recurrence: type === 'recurring' ? 'monthly' : 'never',
        receiveDay: type === 'recurring' ? safeDay : undefined,
        date: type === 'one_time' ? receivedDate : toDateString(new Date()),
        receivedDate: type === 'one_time' ? receivedDate : undefined,
        note: note.trim() || undefined,
      } as any);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingIncome ? 'Sửa Khoản Thu Nhập' : 'Thêm Nguồn Thu Nhập'}
      description="Quản lý các nguồn thu định kỳ hoặc một lần để tính toán số tiền khả dụng."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {/* Type Toggle: Định kỳ vs Một lần */}
        <div className="flex bg-surface-secondary p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('recurring')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              type === 'recurring'
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            🔄 Định kỳ (Hàng tháng)
          </button>
          <button
            type="button"
            onClick={() => setType('one_time')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              type === 'one_time'
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            💵 Một lần
          </button>
        </div>

        {/* Tên khoản thu */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-muted">Tên khoản thu</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'recurring' ? 'Ví dụ: Lương cứng, Trợ cấp...' : 'Ví dụ: Freelance dự án A, Thưởng...'}
            className="w-full px-4 py-3 rounded-2xl bg-surface-secondary text-sm font-semibold text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Số tiền */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-muted">Số tiền (VNĐ)</label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              required
              value={parsedAmount > 0 ? parsedAmount.toLocaleString('vi-VN') : ''}
              onChange={handleAmountChange}
              placeholder="15.000.000"
              className="w-full px-4 py-3 rounded-2xl bg-surface-secondary text-xl font-bold text-status-income placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-4 font-bold text-text-muted">đ</span>
          </div>
        </div>

        {/* Cài đặt thời gian theo Type */}
        {type === 'recurring' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Ngày nhận hàng tháng (1 - 31)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-4 py-3 rounded-2xl bg-surface-secondary text-base font-bold text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-xs font-medium text-text-muted">
                Khoản này sẽ tự động được cộng vào Ngày {dayOfMonth} mỗi tháng.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">Ngày nhận khoản tiền</label>
            <input
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-secondary text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Ghi chú */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-muted">Ghi chú (tùy chọn)</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm mô tả nguồn thu..."
            className="w-full px-4 py-2.5 rounded-2xl bg-surface-secondary text-xs font-medium text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-3">
          {editingIncome && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Bạn có chắc muốn xóa nguồn thu "${editingIncome.name}"?`)) {
                  await onDelete(editingIncome.id);
                  onClose();
                }
              }}
              className="px-4 py-3 rounded-2xl bg-status-danger/10 text-status-danger font-bold text-xs hover:bg-status-danger/20 active:scale-95 transition-all"
            >
              Xóa
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || parsedAmount <= 0}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-content font-bold text-sm shadow-md hover:bg-primary-hover active:scale-98 disabled:opacity-50 transition-all text-center"
          >
            {editingIncome ? 'Lưu Thay Đổi' : 'Tạo Nguồn Thu'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
