'use client';

import React from 'react';
import { CategoryTotal } from '@/types/calculations';
import { formatCurrency } from '@/lib/utils/currency';
import { ChevronRight, Layers } from 'lucide-react';
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

interface CategoryBreakdownListProps {
  categoryTotals: CategoryTotal[];
  selectedCategoryId?: string | null;
  onSelectCategory: (categoryId: string) => void;
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

export function CategoryBreakdownList({
  categoryTotals,
  selectedCategoryId,
  onSelectCategory,
}: CategoryBreakdownListProps) {
  const activeTotals = categoryTotals.filter((c) => c.totalAmount > 0);

  if (activeTotals.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-text-primary">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Cơ Cấu Chi Tiêu</span>
        </div>
        <span className="text-[11px] font-bold text-text-muted">
          {activeTotals.length} danh mục
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {activeTotals.map((cat) => {
          const IconComponent = ICON_MAP[cat.categoryIcon] || MoreHorizontal;
          const isSelected = selectedCategoryId === cat.categoryId;

          return (
            <div
              key={cat.categoryId}
              onClick={() => onSelectCategory(cat.categoryId)}
              className="group flex flex-col p-3 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft hover:shadow-card active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Icon + Tên & Số giao dịch */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
                    style={{
                      backgroundColor: `${cat.categoryColor}18`,
                      color: cat.categoryColor,
                    }}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-text-primary truncate">
                      {cat.categoryName}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {cat.transactionCount} giao dịch
                    </span>
                  </div>
                </div>

                {/* Số tiền & Tỷ lệ % */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-text-primary tabular-nums tracking-tight">
                      {formatCurrency(cat.totalAmount)}
                    </span>
                    <span className="text-[11px] font-extrabold text-primary">
                      {cat.percentage}%
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Thanh tiến trình % trực quan */}
              <div className="w-full bg-surface-secondary h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                    backgroundColor: cat.categoryColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
