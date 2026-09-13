'use client';

import React from 'react';
import { Category } from '@/types/category';
import { TransactionType } from '@/types/transaction';
import { cn } from '@/lib/utils';
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

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  type: TransactionType;
  className?: string;
}

// Map icon name -> Lucide icon component
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

export function CategorySelector({
  categories,
  selectedCategoryId,
  onSelectCategory,
  type,
  className,
}: CategorySelectorProps) {
  const filtered = categories.filter(
    (c) => c.type === type && (c.isActive ?? true)
  );

  return (
    <div className={cn('grid grid-cols-3 sm:grid-cols-4 gap-2', className)}>
      {filtered.map((cat) => {
        const isSelected = cat.id === selectedCategoryId;
        const IconComponent = ICON_MAP[cat.icon] || MoreHorizontal;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            aria-pressed={isSelected}
            className={cn(
              'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition-all select-none',
              'min-h-[64px] active:scale-95 touch-manipulation focus:outline-none',
              isSelected
                ? 'border-primary bg-primary-soft text-primary font-bold shadow-sm ring-1 ring-primary'
                : 'border-border/60 bg-surface dark:bg-surface-elevated text-text-secondary hover:bg-surface-secondary'
            )}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-transform"
              style={{
                backgroundColor: `${cat.color}22`,
                color: cat.color,
              }}
            >
              <IconComponent className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="truncate max-w-full text-[11px] leading-tight">
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
