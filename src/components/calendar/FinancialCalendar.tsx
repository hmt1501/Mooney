'use client';

import React, { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { getCalendarMonthMatrix, WEEKDAYS_VI } from '@/lib/utils/date';
import { CalendarCell } from './CalendarCell';
import { CalendarLegend } from './CalendarLegend';
import { calculateDailyTotals } from '@/lib/calculations/financial';

interface FinancialCalendarProps {
  year: number;
  month: number; // 1-12
  selectedDate: string; // 'YYYY-MM-DD'
  transactions: Transaction[];
  onSelectDate: (dateStr: string) => void;
  onQuickAdd: (dateStr: string) => void;
}

export function FinancialCalendar({
  year,
  month,
  selectedDate,
  transactions,
  onSelectDate,
  onQuickAdd,
}: FinancialCalendarProps) {
  // Tạo ma trận các ngày T2 -> CN
  const matrixDays = useMemo(() => {
    return getCalendarMonthMatrix(year, month);
  }, [year, month]);

  // Tạo map tính sẵn tổng chi và thu từng ngày để tối ưu render
  const dailyTotalsMap = useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>();
    for (const day of matrixDays) {
      const totals = calculateDailyTotals(transactions, day.dateStr);
      map.set(day.dateStr, {
        expense: totals.totalExpense,
        income: totals.totalIncome,
      });
    }
    return map;
  }, [matrixDays, transactions]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Tiêu đề mục lịch */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔥</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
            Lịch Tài Chính
          </h3>
        </div>
        <span className="text-[10px] font-bold text-text-muted">
          Chạm đúp để thêm chi tiêu
        </span>
      </div>

      {/* Thẻ chứa lịch 7 cột */}
      <div className="p-2.5 sm:p-3.5 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-card flex flex-col gap-2 transition-all">
        {/* Hàng tiêu đề thứ trong tuần (T2 - CN) */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center pb-1.5 border-b border-border/50">
          {WEEKDAYS_VI.map((w, index) => (
            <span
              key={w}
              className={`text-[11px] font-bold ${
                index === 6 ? 'text-status-danger/80' : 'text-text-muted'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Lưới các ngày trong tháng */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {matrixDays.map((day) => {
            const totals = dailyTotalsMap.get(day.dateStr) || {
              expense: 0,
              income: 0,
            };

            return (
              <CalendarCell
                key={day.dateStr}
                dayInfo={day}
                expenseAmount={totals.expense}
                incomeAmount={totals.income}
                isSelected={day.dateStr === selectedDate}
                onSelect={onSelectDate}
                onQuickAdd={onQuickAdd}
              />
            );
          })}
        </div>

        {/* Chú thích mức nhiệt chi tiêu */}
        <CalendarLegend />
      </div>
    </div>
  );
}
