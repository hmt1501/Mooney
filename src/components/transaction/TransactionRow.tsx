'use client';

import React from 'react';
import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { AmountDisplay } from './AmountDisplay';
import { Trash2, MoreHorizontal } from 'lucide-react';
import {
  Utensils,
  Bus,
  ShoppingBag,
  Gamepad2,
  Receipt,
  HeartPulse,
  GraduationCap,
  Home,
  Banknote,
  Award,
  Laptop,
  TrendingUp,
} from 'lucide-react';

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Bus,
  ShoppingBag,
  Gamepad2,
  Receipt,
  HeartPulse,
  GraduationCap,
  Home,
  MoreHorizontal,
  Banknote,
  Award,
  Laptop,
  TrendingUp,
};

export function TransactionRow({
  transaction,
  category,
  onClick,
  onDelete,
  showDate = false,
}: TransactionRowProps) {
  const IconComponent = category?.icon ? ICON_MAP[category.icon] || MoreHorizontal : MoreHorizontal;
  const isExpense = transaction.type === 'expense';

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft hover:bg-surface-secondary/70 active:scale-[0.99] cursor-pointer transition-all select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon danh mục với màu thương hiệu */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 font-bold transition-transform group-hover:scale-105"
          style={{
            backgroundColor: `${category?.color || '#1B4332'}18`,
            color: category?.color || '#1B4332',
          }}
        >
          <IconComponent className="w-5 h-5 stroke-[2]" />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-text-primary truncate">
            {category?.name || 'Giao dịch'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-text-muted truncate">
            {showDate && <span>{transaction.date} •</span>}
            <span className="truncate">
              {transaction.note || (isExpense ? 'Khoản chi' : 'Khoản thu')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <AmountDisplay
          amount={transaction.amount}
          type={transaction.type}
          size="md"
        />

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Xóa giao dịch"
            aria-label="Xóa giao dịch"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-text-muted/50 hover:text-status-danger hover:bg-status-danger-soft active:scale-90 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
