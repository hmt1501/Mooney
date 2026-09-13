'use client';

import React from 'react';
import { IncomeItem } from '@/types/income';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface IncomeCardProps {
  income: IncomeItem;
  onEdit: (income: IncomeItem) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (id: string) => void;
  isUpcoming?: boolean;
}

export function IncomeCard({
  income,
  onEdit,
  onDelete,
  onToggleActive,
  isUpcoming,
}: IncomeCardProps) {
  const isRecurring =
    income.type === 'recurring' ||
    income.recurrence === 'monthly' ||
    (typeof income.recurrence === 'object' && income.recurrence !== null);

  const isPaused = income.isActive === false;

  const dayOfMonth =
    income.receiveDay ??
    (typeof income.recurrence === 'object' && income.recurrence !== null
      ? income.recurrence.dayOfMonth
      : 1) ??
    1;

  const dateStr = income.date || income.receivedDate;
  const recurrenceLabel = isRecurring
    ? `Hàng tháng vào ngày ${dayOfMonth}`
    : `Ngày ${dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Không rõ'}`;

  return (
    <div
      className={cn(
        'p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-card transition-all flex flex-col gap-3',
        isPaused && 'opacity-60 bg-surface-secondary/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black',
              isPaused
                ? 'bg-text-disabled/20 text-text-disabled'
                : 'bg-status-income/15 text-status-income'
            )}
          >
            {isRecurring ? '🔄' : '💵'}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-text-primary">
                {income.name}
              </h4>
              {isUpcoming && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Sắp nhận
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-text-muted">
              {recurrenceLabel}
            </span>
          </div>
        </div>

        {/* Right amount */}
        <div className="flex flex-col items-end">
          <span className="text-base font-black text-status-income tabular-nums">
            +{formatCurrency(income.amount)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {isRecurring ? 'Định kỳ' : 'Một lần'}
          </span>
        </div>
      </div>

      {income.note && (
        <p className="text-xs text-text-muted bg-surface-secondary/50 rounded-xl px-2.5 py-1.5 line-clamp-2">
          {income.note}
        </p>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs font-semibold">
        {isRecurring && onToggleActive ? (
          <button
            type="button"
            onClick={() => onToggleActive(income.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
              isPaused
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-surface-secondary text-text-muted hover:text-text-primary'
            )}
          >
            {isPaused ? '▶ Kích hoạt lại' : '⏸ Tạm dừng'}
          </button>
        ) : (
          <span className="text-[11px] text-text-muted">Thu nhập phát sinh</span>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(income)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-secondary transition-all"
            title="Chỉnh sửa"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => onDelete(income.id)}
            className="p-1.5 text-status-danger/80 hover:text-status-danger rounded-xl hover:bg-status-danger/10 transition-all"
            title="Xóa"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
