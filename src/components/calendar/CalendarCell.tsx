'use client';

import React, { useRef } from 'react';
import { CalendarDayInfo } from '@/lib/utils/date';
import { formatCompactCurrency } from '@/lib/utils/currency';
import { getHeatLevel } from '@/lib/constants/heatmap';
import { SpendingLevelConfig } from '@/types/settings';
import { cn } from '@/lib/utils';

interface CalendarCellProps {
  dayInfo: CalendarDayInfo;
  expenseAmount: number;
  incomeAmount: number;
  isSelected: boolean;
  thresholds?: SpendingLevelConfig;
  onSelect: (dateStr: string) => void;
  onQuickAdd: (dateStr: string) => void;
}

export function CalendarCell({
  dayInfo,
  expenseAmount,
  incomeAmount,
  isSelected,
  thresholds,
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
      ? getHeatLevel(expenseAmount, thresholds)
      : 'none';

  // Ngày tương lai vẫn hiển thị số tiền đã ghi (dạng mờ, "dự kiến"), chưa tính vào số dư
  const hasIncome = isCurrentMonth && incomeAmount > 0;
  const hasExpense = isCurrentMonth && expenseAmount > 0;

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
      aria-label={`Ngày ${dateStr}${isFuture ? ' (dự kiến)' : ''}, chi tiêu ${expenseAmount} đồng, thu nhập ${incomeAmount} đồng`}
      className={cn(
        'relative aspect-square w-full rounded-xl p-1 flex flex-col items-center transition-all select-none',
        'active:scale-95 touch-manipulation focus:outline-none',
        // Màu chữ & độ mờ theo tháng
        isCurrentMonth ? 'text-text-primary' : 'text-text-disabled opacity-40',
        // Nền xám nhạt để phân biệt ô ngày với nền lịch (Heatmap ghi đè)
        heatLevel === 'none' && 'bg-surface-secondary',
        heatLevel === 'low' && 'bg-heat-low',
        heatLevel === 'medium' && 'bg-heat-medium',
        heatLevel === 'high' && 'bg-heat-high',
        // Viền: hôm nay đậm, các ngày khác nhạt
        isToday ? 'border-2 border-primary' : 'border border-border/60',
        // Ngày đang chọn (không phải hôm nay): vòng sáng nhẹ
        isSelected && !isToday && 'ring-2 ring-primary/40 font-bold'
      )}
    >
      {/* 1. Số ngày */}
      <div className="flex items-center justify-center w-full shrink-0">
        <span
          className={cn(
            'text-[11px] font-semibold leading-none',
            isToday && 'text-primary font-black',
            !isToday && isSelected && 'text-primary font-bold'
          )}
        >
          {dayNumber}
        </span>
      </div>

      {/* 2. Số tiền thu / chi nằm giữa ô */}
      <div
        className={cn(
          'flex-1 w-full min-h-0 flex flex-col items-center justify-center gap-0.5 text-center',
          isFuture && 'opacity-60'
        )}
      >
        {hasIncome && (
          <span
            className={cn(
              'text-[8.5px] font-bold leading-none truncate max-w-full tabular-nums',
              isFuture ? 'text-text-muted' : 'text-status-income'
            )}
          >
            +{formatCompactCurrency(incomeAmount)}
          </span>
        )}

        {hasExpense ? (
          <span
            className={cn(
              'text-[9px] font-extrabold leading-none block truncate max-w-full tabular-nums',
              isFuture && 'text-text-muted',
              heatLevel === 'low' && 'text-heat-low-text',
              heatLevel === 'medium' && 'text-heat-medium-text',
              heatLevel === 'high' && 'text-heat-high-text'
            )}
          >
            {formatCompactCurrency(expenseAmount)}
          </span>
        ) : (
          !hasIncome &&
          isCurrentMonth &&
          !isFuture && (
            <span className="text-[8px] text-text-muted/40 font-medium leading-none block">
              -
            </span>
          )
        )}
      </div>
    </button>
  );
}
