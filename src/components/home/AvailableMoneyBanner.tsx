'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mascot } from '@/components/common/Mascot';
import { formatCurrency } from '@/lib/utils/currency';
import { SafeDailySpendingResult, SpendingPaceResult } from '@/types/calculations';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailableMoneyBannerProps {
  availableBalance: number;
  /** Tổng chi tiêu của tháng đang xem */
  monthExpense: number;
  /** Chi tiêu trung bình mỗi ngày có chi tiêu trong tháng đang xem */
  averageDailySpending: number;
  safeDailyResult: SafeDailySpendingResult;
  spendingPace: SpendingPaceResult;
}

export function AvailableMoneyBanner({
  availableBalance,
  monthExpense,
  averageDailySpending,
  safeDailyResult,
  spendingPace,
}: AvailableMoneyBannerProps) {
  // Chế độ xem: 'available' (Tiền khả dụng) | 'spent' (Đã chi tiêu)
  const [viewMode, setViewMode] = useState<'available' | 'spent'>('available');

  const isAvailableView = viewMode === 'available';
  const isNegative = availableBalance < 0;

  const displayAmount = isAvailableView ? availableBalance : monthExpense;
  const amountStr = formatCurrency(displayAmount);
  const isVeryLong = amountStr.length > 13;

  return (
    <div className="relative overflow-hidden p-5 rounded-3xl bg-primary text-primary-content shadow-card transition-all select-none flex flex-col gap-4">
      {/* Họa tiết trang trí nền tinh tế */}
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      {/* 1. Thanh Toggle Chuyển Góc Nhìn (Available Money ↔ Spent Money) + Quản lý nguồn thu */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex p-1 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('available')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold transition-all',
              isAvailableView
                ? 'bg-white text-primary shadow-sm'
                : 'text-primary-content/70 hover:text-white'
            )}
          >
            Tiền Khả Dụng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('spent')}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold transition-all',
              !isAvailableView
                ? 'bg-white text-primary shadow-sm'
                : 'text-primary-content/70 hover:text-white'
            )}
          >
            Đã Chi Tiêu
          </button>
        </div>

        <Link
          href="/income"
          className="flex items-center gap-0.5 pl-2.5 pr-1.5 py-1 rounded-xl text-[10px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white whitespace-nowrap"
        >
          <span>Quản lý nguồn thu</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 2. Vùng Số Tiền Lớn (Trọng Tâm Thị Giác) */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'font-black tracking-tight leading-tight tabular-nums truncate',
              isVeryLong ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl',
              isAvailableView && isNegative ? 'text-status-warning' : 'text-white'
            )}
          >
            {amountStr}
          </div>

          {!isAvailableView && (
            <span className="text-[11px] text-primary-content/80 block mt-1">
              Tính trên các khoản chi trong tháng đang xem
            </span>
          )}
        </div>

        {/* Mascot Mooney */}
        <div className="shrink-0">
          <Mascot
            mood={
              isNegative
                ? 'warning'
                : spendingPace.status === 'slow' || spendingPace.status === 'normal'
                ? 'happy'
                : 'good_spending'
            }
            size={56}
          />
        </div>
      </div>

      {/* 3. Chi Tiêu An Toàn & Tốc Độ Chi Tiêu (Mỗi mục 1 dòng tối giản) */}
      <div className="relative z-10 pt-2.5 border-t border-white/15 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-1.5 text-white">
          <span className="text-[11px] font-bold text-primary-content/90">Chi tiêu an toàn</span>
          <span className="text-xs font-black tabular-nums">
            {safeDailyResult.isNegative ? '0 đ' : formatCurrency(safeDailyResult.amountPerDay)}
            <span className="text-[10px] font-normal text-primary-content/80 ml-1">/ngày</span>
          </span>
        </div>

        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-1.5 text-white">
          <span className="text-[11px] font-bold text-primary-content/90">Tốc độ chi tiêu</span>
          <span className="text-xs font-black tabular-nums">
            {formatCurrency(averageDailySpending)}
            <span className="text-[10px] font-normal text-primary-content/80 ml-1">/ngày</span>
          </span>
        </div>
      </div>
    </div>
  );
}
