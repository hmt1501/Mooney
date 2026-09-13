'use client';

import React from 'react';
import { SpendingLevelConfig } from '@/types/settings';
import { formatCompactCurrency } from '@/lib/utils/currency';

interface CalendarLegendProps {
  spendingLevels?: SpendingLevelConfig;
  onOpenConfig?: () => void;
}

export function CalendarLegend({ spendingLevels, onOpenConfig }: CalendarLegendProps) {
  const lowMax = spendingLevels?.lowMax ?? 100000;
  const mediumMax = spendingLevels?.mediumMax ?? 500000;

  return (
    <div className="flex items-center justify-between pt-2.5 border-t border-border/60 text-[11px] font-medium text-text-muted select-none">
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
          Chi tiêu:
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-heat-low border border-heat-low-text/20" />
          <span>&lt;{formatCompactCurrency(lowMax)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-heat-medium border border-heat-medium-text/20" />
          <span>{formatCompactCurrency(lowMax)}-{formatCompactCurrency(mediumMax)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-heat-high border border-heat-high-text/20" />
          <span>&gt;{formatCompactCurrency(mediumMax)}</span>
        </span>
      </div>

      {onOpenConfig && (
        <button
          type="button"
          onClick={onOpenConfig}
          aria-label="Tùy chỉnh mức chi tiêu"
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all text-sm ml-1"
          title="Tùy chỉnh mức chi tiêu"
        >
          ⚙
        </button>
      )}
    </div>
  );
}

