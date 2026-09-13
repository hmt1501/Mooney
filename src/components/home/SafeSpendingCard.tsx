'use client';

import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { SafeDailySpendingResult } from '@/types/calculations';
import { formatCurrency } from '@/lib/utils/currency';

interface SafeSpendingCardProps {
  safeDailyResult: SafeDailySpendingResult;
}

export function SafeSpendingCard({ safeDailyResult }: SafeSpendingCardProps) {
  const { amountPerDay, remainingDays, isNegative, explanation } =
    safeDailyResult;

  return (
    <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft transition-all select-none">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
          {isNegative ? (
            <AlertCircle className="w-3.5 h-3.5 text-status-warning" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="uppercase tracking-wider text-[10px]">
            Hạn Mức Chi Tiêu An Toàn
          </span>
        </div>
        <span className="text-[11px] font-semibold text-text-muted">
          Còn {remainingDays} ngày
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          {isNegative ? '0 đ' : formatCurrency(amountPerDay)}
        </span>
        <span className="text-xs font-semibold text-text-muted">/ ngày</span>
      </div>

      <p className="text-[11px] text-text-muted leading-snug">
        {explanation}
      </p>
    </div>
  );
}
