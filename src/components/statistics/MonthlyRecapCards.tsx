'use client';

import React from 'react';
import { MonthlyRecap, CategoryTotal } from '@/types/calculations';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY } from '@/lib/utils/date';
import {
  TrendingUp,
  PiggyBank,
  CalendarDays,
  ShoppingBag,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyRecapCardsProps {
  recap: MonthlyRecap;
  topCategory?: CategoryTotal | null;
}

export function MonthlyRecapCards({
  recap,
  topCategory,
}: MonthlyRecapCardsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-text-primary">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Tổng Kết Tháng</span>
        </div>
        <span className="text-[11px] font-bold text-text-muted">
          {recap.transactionCount} giao dịch
        </span>
      </div>

      {/* Lưới các thẻ chỉ số gọn gàng (2 cột) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Tỷ lệ tiết kiệm */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted">
              Tỷ lệ tiết kiệm
            </span>
            <div className="w-6 h-6 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2">
            <span className="text-xl font-black text-primary tracking-tight">
              {recap.totalIncome > 0 ? `${recap.savingsRate}%` : '0%'}
            </span>
            {recap.totalIncome > 0 && (
              <div className="w-full bg-surface-secondary h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, recap.savingsRate)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 2. Tiền giữ lại */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted">
              Tiền giữ lại
            </span>
            <div className="w-6 h-6 rounded-lg bg-status-income-soft text-status-income flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2">
            <span
              className={cn(
                'text-base font-black tracking-tight tabular-nums truncate block',
                recap.netChange >= 0
                  ? 'text-status-income'
                  : 'text-text-primary'
              )}
            >
              {recap.netChange >= 0 ? '+' : ''}
              {formatCurrency(recap.netChange)}
            </span>
            <span className="text-[10px] text-text-muted mt-0.5 block">
              {recap.netChange >= 0 ? 'Thu vượt chi' : 'Chi vượt thu'}
            </span>
          </div>
        </div>

        {/* 3. Ngày chi nhiều nhất */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted">
              Ngày chi nhiều nhất
            </span>
            <div className="w-6 h-6 rounded-lg bg-surface-secondary text-text-muted flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2">
            {recap.topSpendingDay ? (
              <>
                <span className="text-sm font-black text-text-primary tracking-tight">
                  {formatDateDMY(recap.topSpendingDay.date)}
                </span>
                <span className="text-xs font-bold text-text-muted block tabular-nums mt-0.5">
                  {formatCurrency(recap.topSpendingDay.amount)}
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-text-muted">Chưa có chi tiêu</span>
            )}
          </div>
        </div>


        {/* 4. Danh mục chi nhiều nhất */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted">
              Chi nhiều nhất vào
            </span>
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: topCategory ? `${topCategory.categoryColor}18` : undefined,
                color: topCategory?.categoryColor,
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-2">
            {topCategory && topCategory.totalAmount > 0 ? (
              <>
                <span className="text-sm font-black text-text-primary tracking-tight truncate block">
                  {topCategory.categoryName}
                </span>
                <span className="text-xs font-bold text-text-muted block tabular-nums mt-0.5">
                  {formatCurrency(topCategory.totalAmount)} ({topCategory.percentage}%)
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-text-muted">Chưa có chi tiêu</span>
            )}
          </div>
        </div>
      </div>

      {/* Dòng tóm tắt đối chiếu Thu vs Chi */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-secondary/70 border border-border/70 text-xs">
        <div className="flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4 text-status-income" />
          <span className="font-bold text-text-muted">Tổng thu:</span>
          <span className="font-black text-text-primary tabular-nums">
            {formatCurrency(recap.totalIncome)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpRight className="w-4 h-4 text-text-muted" />
          <span className="font-bold text-text-muted">Tổng chi:</span>
          <span className="font-black text-text-primary tabular-nums">
            {formatCurrency(recap.totalExpense)}
          </span>
        </div>
      </div>
    </div>
  );
}
