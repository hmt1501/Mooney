'use client';

import React, { useRef } from 'react';
import { CalendarDayInfo } from '@/lib/utils/date';
import { formatCompactCurrency } from '@/lib/utils/currency';
import { getHeatLevel } from '@/lib/constants/heatmap';
import { cn } from '@/lib/utils';

interface CalendarCellProps {
  dayInfo: CalendarDayInfo;
  expenseAmount: number;
  incomeAmount: number;
  isSelected: boolean;
  onSelect: (dateStr: string) => void;
  onQuickAdd: (dateStr: string) => void;
}

export function CalendarCell({
  dayInfo,
  expenseAmount,
  incomeAmount,
  isSelected,
  onSelect,
  onQuickAdd,
}: CalendarCellProps) {
  const { dateStr, dayNumber, isCurrentMonth, isToday, isFuture } = dayInfo;

  // Xử lý phân biệt Single tap vs Double tap (ngưỡng 280ms)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (clickTimerRef.current) {
      // Double tap phát hiện!
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onQuickAdd(dateStr);
    } else {
      // Chờ xem có tap lần 2 không
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onSelect(dateStr);
      }, 260);
    }
  };

  // Cấp độ Heatmap theo ngưỡng tập trung (chỉ hiển thị cho ngày trong quá khứ/hiện tại có chi tiêu)
  const heatLevel =
    !isFuture && isCurrentMonth && expenseAmount > 0
      ? getHeatLevel(expenseAmount)
      : 'none';

  const hasIncome = !isFuture && isCurrentMonth && incomeAmount > 0;
  const hasExpense = !isFuture && isCurrentMonth && expenseAmount > 0;

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        onQuickAdd(dateStr);
      }}
      aria-label={`Ngày ${dateStr}, chi tiêu ${expenseAmount} đồng, thu nhập ${incomeAmount} đồng`}
      className={cn(
        'relative aspect-square w-full rounded-xl p-1 flex flex-col items-center justify-between transition-all select-none',
        'active:scale-95 touch-manipulation focus:outline-none',
        // Màu chữ & độ mờ theo tháng
        isCurrentMonth ? 'text-text-primary' : 'text-text-disabled opacity-40',
        // Heatmap background
        heatLevel === 'low' && 'bg-heat-low',
        heatLevel === 'medium' && 'bg-heat-medium',
        heatLevel === 'high' && 'bg-heat-high',
        heatLevel === 'none' && isCurrentMonth && 'hover:bg-surface-secondary',
        // Viền khi được chọn (Selected state)
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background font-bold',
        // Chỉ báo ngày hôm nay (Today state)
        isToday && !isSelected && 'border border-primary/50'
      )}
    >
      {/* 1. Số ngày */}
      <div className="flex items-center justify-center w-full">
        <span
          className={cn(
            'text-[11px] font-semibold leading-none',
            isToday && 'w-5 h-5 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold',
            !isToday && isSelected && 'text-primary font-bold'
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* 2. Chỉ báo thu nhập (+tiền) nếu có */}
      {hasIncome && (
        <span className="text-[8.5px] font-bold text-status-income leading-none truncate max-w-full tabular-nums">
          +{formatCompactCurrency(incomeAmount)}
        </span>
      )}

      {/* 3. Số tiền chi tiêu hàng ngày */}
      <div className="w-full text-center">
        {hasExpense ? (
          <span
            className={cn(
              'text-[9px] font-extrabold leading-none block truncate tabular-nums',
              heatLevel === 'low' && 'text-heat-low-text',
              heatLevel === 'medium' && 'text-heat-medium-text',
              heatLevel === 'high' && 'text-heat-high-text'
            )}
          >
            {formatCompactCurrency(expenseAmount)}
          </span>
        ) : (
          isCurrentMonth && !isFuture && (
            <span className="text-[8px] text-text-muted/40 font-medium leading-none block">
              -
            </span>
          )
        )}
      </div>
    </button>
  );
}
