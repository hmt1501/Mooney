'use client';

import React from 'react';
import { Mascot } from '@/components/common/Mascot';
import { formatCurrency } from '@/lib/utils/currency';
import { getFinancialInsight } from '@/lib/constants/insights';

interface AvailableBalanceCardProps {
  availableBalance: number;
  totalIncome: number;
  totalExpense: number;
  daysRemaining: number;
  onEditStartingBalance?: () => void;
}

export function AvailableBalanceCard({
  availableBalance,
  totalIncome,
  totalExpense,
  daysRemaining,
  onEditStartingBalance,
}: AvailableBalanceCardProps) {
  // Tính insight dựa trên quy tắc chuẩn (Rule-based, không AI)
  const insight = getFinancialInsight({
    availableBalance,
    totalIncome,
    totalExpense,
    daysRemaining,
  });

  const isNegative = availableBalance < 0;

  // Kích thước font responsive theo độ dài số tiền
  const balanceStr = formatCurrency(availableBalance);
  const isVeryLong = balanceStr.length > 13;

  return (
    <div className="relative overflow-hidden p-6 rounded-3xl bg-primary text-primary-content shadow-card transition-all select-none">
      {/* Họa tiết trang trí nền nhẹ nhàng */}
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 opacity-90">
            <span className="text-[11px] font-extrabold tracking-widest uppercase text-primary-content/80">
              Số Tiền Khả Dụng
            </span>
            {onEditStartingBalance && (
              <button
                type="button"
                onClick={onEditStartingBalance}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
                title="Thay đổi số dư ban đầu"
              >
                Sửa số dư
              </button>
            )}
          </div>

          <div
            className={`font-black tracking-tight leading-tight mb-2 truncate ${
              isVeryLong ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
            } ${isNegative ? 'text-status-warning' : 'text-white'}`}
          >
            {balanceStr}
          </div>
        </div>

        {/* Mascot Mooney với cảm xúc đồng bộ theo tình hình chi tiêu */}
        <div className="shrink-0 pt-0.5">
          <Mascot mood={insight.mood} size={58} />
        </div>
      </div>

      {/* Insight tài chính dựa trên quy tắc (Rule-based) */}
      <div className="relative z-10 pt-3 border-t border-white/15 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isNegative
                ? 'bg-status-danger'
                : insight.mood === 'good_spending' || insight.mood === 'happy'
                ? 'bg-primary-soft'
                : 'bg-status-warning'
            }`}
          />
          <span>{insight.message}</span>
        </div>
        {insight.subMessage && (
          <p className="text-[11px] text-primary-content/80 pl-3.5 leading-relaxed">
            {insight.subMessage}
          </p>
        )}
      </div>
    </div>
  );
}
