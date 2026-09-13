'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatMonthYear } from '@/lib/utils/date';

interface MonthSelectorProps {
  year: number;
  month: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
}

export function MonthSelector({
  year,
  month,
  onMonthChange,
}: MonthSelectorProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = year === currentYear && month === currentMonth;

  const handlePrev = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const handleJumpToCurrent = () => {
    onMonthChange(currentYear, currentMonth);
  };

  return (
    <div className="relative flex items-center justify-between px-2 py-1 select-none">
      {/* Nút lùi tháng - Touch target 44px */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Tháng trước"
        className="flex items-center justify-center w-11 h-11 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-90 transition-all"
      >
        <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
      </button>

      {/* Nhãn tháng năm ở giữa */}
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold tracking-tight text-text-primary">
          {formatMonthYear(year, month)}
        </span>

        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleJumpToCurrent}
            aria-label="Về tháng hiện tại"
            className="flex items-center gap-1 px-2 py-0.5 ml-1 rounded-full text-[10px] font-bold bg-primary-soft text-primary hover:opacity-90 active:scale-95 transition-all"
          >
            <CalendarIcon className="w-3 h-3" />
            <span>Hôm nay</span>
          </button>
        )}
      </div>

      {/* Nút tiến tháng - Touch target 44px */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Tháng sau"
        className="flex items-center justify-center w-11 h-11 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-90 transition-all"
      >
        <ChevronRight className="w-5 h-5 stroke-[2.2]" />
      </button>
    </div>
  );
}
