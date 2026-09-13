'use client';

import React from 'react';
import { Category } from '@/types/category';
import { Transaction } from '@/types/transaction';
import { CategoryTotal } from '@/types/calculations';
import { BottomSheet } from '@/components/common/BottomSheet';
import { AmountDisplay } from '@/components/transaction/AmountDisplay';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY } from '@/lib/utils/date';
import { Calendar, ReceiptText, ChevronRight } from 'lucide-react';
import {
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
} from 'lucide-react';

interface CategoryDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  categoryStat: CategoryTotal | null;
  transactions: Transaction[];
  monthLabel: string;
  onSelectTransaction?: (transaction: Transaction) => void;
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

export function CategoryDetailSheet({
  isOpen,
  onClose,
  category,
  categoryStat,
  transactions,
  monthLabel,
  onSelectTransaction,
}: CategoryDetailSheetProps) {
  if (!category || !categoryStat) return null;

  const IconComponent = ICON_MAP[category.icon] || MoreHorizontal;
  const color = category.color || '#1B4332';

  // Sắp xếp giao dịch giảm dần theo ngày
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={category.name}>
      <div className="flex flex-col gap-4 pb-2">
        {/* Thẻ Header Chi Tiết Danh Mục */}
        <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-surface-secondary/70 border border-border/70 text-center gap-2">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-3xl shadow-sm mb-1"
            style={{
              backgroundColor: `${color}22`,
              color: color,
            }}
          >
            <IconComponent className="w-7 h-7 stroke-[2.2]" />
          </div>

          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            {monthLabel}
          </span>

          <span className="text-2xl font-black text-text-primary tracking-tight tabular-nums">
            {formatCurrency(categoryStat.totalAmount)}
          </span>

          {/* Badge % trên tổng chi tiêu */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-black text-white"
              style={{ backgroundColor: color }}
            >
              {categoryStat.percentage}% tổng chi tiêu
            </span>
            <span className="text-xs font-bold text-text-muted">
              • {categoryStat.transactionCount} giao dịch
            </span>
          </div>
        </div>

        {/* Danh Sách Giao Dịch Trong Danh Mục */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-text-primary px-1">
            Danh Sách Chi Tiêu ({sortedTransactions.length})
          </span>

          {sortedTransactions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 text-center text-xs text-text-muted">
              Không có giao dịch nào trong danh mục này.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (onSelectTransaction) {
                      onSelectTransaction(tx);
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-xs hover:border-primary/50 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {tx.note || category.name}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDateDMY(tx.date)}</span>
                      </div>

                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <AmountDisplay
                      amount={tx.amount}
                      type={tx.type}
                      size="sm"
                    />
                    {onSelectTransaction && (
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
