'use client';

import React, { useState } from 'react';
import { CategoryTotal } from '@/types/calculations';
import { formatCurrency } from '@/lib/utils/currency';
import { PieChart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpendingDonutChartProps {
  categoryTotals: CategoryTotal[];
  totalExpense: number;
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string) => void;
}

export function SpendingDonutChart({
  categoryTotals,
  totalExpense,
  selectedCategoryId,
  onSelectCategory,
}: SpendingDonutChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<CategoryTotal | null>(null);

  // Lọc bỏ danh mục có số tiền bằng 0 để tránh phân đoạn ảo gây hiểu nhầm
  const activeSegments = categoryTotals.filter((c) => c.totalAmount > 0);

  // Danh mục đang được ưu tiên hiển thị ở tâm biểu đồ
  const activeDetail =
    hoveredCategory ||
    (selectedCategoryId
      ? activeSegments.find((c) => c.categoryId === selectedCategoryId) || null
      : null);

  // Kích thước SVG
  const size = 220;
  const strokeWidth = 26;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 8;
  const circumference = 2 * Math.PI * radius;

  // Tính toán offset cộng dồn cho từng phân đoạn
  let cumulativePercentage = 0;
  const segmentsWithOffset = activeSegments.map((cat) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
    cumulativePercentage += cat.percentage;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  if (totalExpense === 0 || activeSegments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft text-center min-h-[260px]">
        <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-dashed border-border/70 mb-3">
          <div className="flex flex-col items-center justify-center">
            <PieChart className="w-8 h-8 text-text-muted stroke-[1.8] mb-1" />
            <span className="text-xs font-bold text-text-muted">0 đ</span>
          </div>
        </div>
        <span className="text-xs font-bold text-text-primary">
          Chưa có chi tiêu trong tháng này
        </span>
        <span className="text-[11px] text-text-muted mt-1 max-w-[220px]">
          Các khoản chi bạn ghi nhận sẽ được tự động phân bổ cơ cấu tại đây.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-5 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft">
      {/* Vùng chứa Donut SVG */}
      <div className="relative flex items-center justify-center w-[220px] h-[220px]">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transition-all duration-300"
          role="img"
          aria-label="Biểu đồ phân bổ chi tiêu theo danh mục"
        >
          {/* Vòng nền mờ phía dưới */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-secondary"
          />

          {/* Các phân đoạn danh mục */}
          {segmentsWithOffset.map((segment) => {
            const isSelected =
              selectedCategoryId === segment.categoryId ||
              hoveredCategory?.categoryId === segment.categoryId;

            return (
              <circle
                key={segment.categoryId}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.categoryColor}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onClick={() => onSelectCategory && onSelectCategory(segment.categoryId)}
                onMouseEnter={() => setHoveredCategory(segment)}
                onMouseLeave={() => setHoveredCategory(null)}
              />
            );
          })}
        </svg>

        {/* Thông tin ở tâm vòng tròn */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4 select-none">
          {activeDetail ? (
            <>
              <span
                className="text-[11px] font-black uppercase tracking-wider truncate max-w-[130px]"
                style={{ color: activeDetail.categoryColor }}
              >
                {activeDetail.categoryName}
              </span>
              <span className="text-base font-black text-text-primary tracking-tight tabular-nums mt-0.5">
                {formatCurrency(activeDetail.totalAmount)}
              </span>
              <span className="text-[11px] font-bold text-text-muted mt-0.5">
                {activeDetail.percentage}% ({activeDetail.transactionCount} giao dịch)
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Tổng Chi Tiêu
              </span>
              <span className="text-lg font-black text-text-primary tracking-tight tabular-nums mt-0.5">
                {formatCurrency(totalExpense)}
              </span>
              <span className="text-[11px] font-bold text-text-muted mt-0.5">
                {activeSegments.length} danh mục
              </span>
            </>
          )}
        </div>
      </div>

      {/* Gợi ý tương tác */}
      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-text-muted">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Chạm vào cung tròn hoặc danh mục để xem chi tiết</span>
      </div>
    </div>
  );
}
