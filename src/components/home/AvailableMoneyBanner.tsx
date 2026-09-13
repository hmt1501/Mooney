'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mascot } from '@/components/common/Mascot';
import { formatCurrency } from '@/lib/utils/currency';
import { SafeDailySpendingResult, SpendingPaceResult } from '@/types/calculations';
import { Sparkles, ChevronRight, TrendingDown, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailableMoneyBannerProps {
  availableMoney?: number;
  availableBalance?: number;
  spentMoney: number;
  safeDailyResult: SafeDailySpendingResult;
  spendingPace: SpendingPaceResult;
  onEditStartingBalance?: () => void;
  onOpenStartingBalance?: () => void;
  onNavigateToIncome?: () => void;
}

export function AvailableMoneyBanner({
  availableMoney,
  availableBalance,
  spentMoney,
  safeDailyResult,
  spendingPace,
  onEditStartingBalance,
  onOpenStartingBalance,
  onNavigateToIncome,
}: AvailableMoneyBannerProps) {
  // Chế độ xem: 'available' (Tiền khả dụng) | 'spent' (Đã chi tiêu)
  const [viewMode, setViewMode] = useState<'available' | 'spent'>('available');

  const actualAvailable = availableMoney ?? availableBalance ?? 0;
  const actualEditBalance = onEditStartingBalance ?? onOpenStartingBalance;

  const isAvailableView = viewMode === 'available';
  const isNegative = actualAvailable < 0;

  const displayAmount = isAvailableView ? actualAvailable : spentMoney;
  const amountStr = formatCurrency(displayAmount);
  const isVeryLong = amountStr.length > 13;

  // Xác định màu sắc chấm nhịp độ chi tiêu
  const paceDotColor =
    spendingPace.status === 'warning'
      ? 'bg-status-danger'
      : spendingPace.status === 'fast'
      ? 'bg-status-warning'
      : spendingPace.status === 'normal'
      ? 'bg-primary-soft'
      : 'bg-status-income';

  return (
    <div className="relative overflow-hidden p-5 rounded-3xl bg-primary text-primary-content shadow-card transition-all select-none flex flex-col gap-4">
      {/* Họa tiết trang trí nền tinh tế */}
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      {/* 1. Thanh Toggle Chuyển Góc Nhìn (Available Money ↔ Spent Money) */}
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

        {/* Nút sửa Số Dư Ban Đầu */}
        {actualEditBalance && (
          <button
            type="button"
            onClick={actualEditBalance}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white"
            title="Cập nhật Số Dư Ban Đầu"
          >
            <Wallet className="w-3 h-3" />
            <span>Sửa số dư</span>
          </button>
        )}
      </div>

      {/* 2. Vùng Số Tiền Lớn (Trọng Tâm Thị Giác) */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-content/80 block mb-1">
            {isAvailableView ? 'Số Tiền Khả Dụng' : 'Tổng Chi Tiêu Tháng Này'}
          </span>

          <div
            className={cn(
              'font-black tracking-tight leading-tight tabular-nums truncate',
              isVeryLong ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl',
              isAvailableView && isNegative ? 'text-status-warning' : 'text-white'
            )}
          >
            {amountStr}
          </div>

          {/* Link chuyển đến màn hình Quản Lý Thu Nhập khi ở góc nhìn Available */}
          {isAvailableView ? (
            <Link
              href="/income"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-white/90 hover:text-white mt-1.5 group transition-colors"
            >
              <span>Quản lý nguồn thu & định kỳ</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <span className="text-[11px] text-primary-content/80 block mt-1">
              Tính trên các khoản chi trong tháng đang xem
            </span>
          )}
        </div>

        {/* Mascot Mooney */}
        <div className="shrink-0 pt-0.5">
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

      {/* 3. Phần Hợp Nhất: Chi Tiêu An Toàn & Tốc Độ Chi Tiêu (Mỗi mục 1 dòng tối giản) */}
      <div className="relative z-10 pt-2.5 border-t border-white/15 flex flex-col gap-1.5 text-xs">
        {/* Chi tiêu an toàn: 1 dòng */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-1.5 text-white">
          <span className="text-[11px] font-bold text-primary-content/90">Chi tiêu an toàn</span>
          <span className="text-xs font-black tabular-nums">
            {safeDailyResult.isNegative ? '0 đ' : formatCurrency(safeDailyResult.amountPerDay)}
            <span className="text-[10px] font-normal text-primary-content/80 ml-1">/ngày</span>
          </span>
        </div>

        {/* Tốc độ chi tiêu: 1 dòng */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full shrink-0', paceDotColor)} />
            <span className="text-[11px] font-bold text-primary-content/90">Tốc độ chi tiêu</span>
          </div>
          <span className="text-xs font-extrabold text-white">
            {spendingPace.message}
          </span>
        </div>
      </div>
    </div>
  );
}
