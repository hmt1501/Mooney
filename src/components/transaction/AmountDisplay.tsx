'use client';

import React from 'react';
import { TransactionType } from '@/types/transaction';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface AmountDisplayProps {
  amount: number;
  type: TransactionType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  type,
  size = 'md',
  showSign = true,
  className,
}: AmountDisplayProps) {
  const isExpense = type === 'expense';
  const prefix = showSign ? (isExpense ? '-' : '+') : '';
  const formatted = `${prefix}${formatCurrency(amount)}`;

  return (
    <span
      className={cn(
        'font-black tabular-nums tracking-tight select-none',
        // Màu sắc chuẩn Design System V1:
        // Expense dùng neutral text-text-primary, KHÔNG dùng màu đỏ chói
        // Income dùng màu xanh dịu text-status-income
        isExpense ? 'text-text-primary' : 'text-status-income',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg',
        size === 'xl' && 'text-2xl sm:text-3xl',
        className
      )}
    >
      {formatted}
    </span>
  );
}
