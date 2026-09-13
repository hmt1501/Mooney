'use client';

import React from 'react';
import { HeatmapTheme } from '@/types/settings';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapThemeSelectorProps {
  currentTheme: HeatmapTheme;
  onSelectTheme: (theme: HeatmapTheme) => void;
}

interface ThemeOption {
  id: HeatmapTheme;
  name: string;
  description: string;
  colors: [string, string, string]; // Low, Medium, High
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'forest',
    name: 'Xanh Rừng (Forest)',
    description: 'Thư thái & thiên nhiên (Mặc định)',
    colors: ['#E8F5E9', '#FEF3C7', '#FEE2E2'],
  },
  {
    id: 'classic',
    name: 'Cam Ấm (Classic)',
    description: 'Tone cam hổ phách ấm cúng Monii',
    colors: ['#FEF3C7', '#FED7AA', '#FEE2E2'],
  },
  {
    id: 'ocean',
    name: 'Xanh Biển (Ocean)',
    description: 'Hiện đại & trong lành',
    colors: ['#E0F2FE', '#BAE6FD', '#E0E7FF'],
  },
];

export function HeatmapThemeSelector({
  currentTheme,
  onSelectTheme,
}: HeatmapThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {THEME_OPTIONS.map((opt) => {
        const isSelected = currentTheme === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectTheme(opt.id)}
            className={cn(
              'flex items-center justify-between p-3 rounded-2xl border transition-all text-left active:scale-[0.99]',
              isSelected
                ? 'bg-primary-soft/50 border-primary/50 shadow-xs'
                : 'bg-surface-secondary/60 border-border/70 hover:bg-surface-secondary'
            )}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-primary">
                {opt.name}
              </span>
              <span className="text-[11px] text-text-muted mt-0.5">
                {opt.description}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* 3 chấm màu preview */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface dark:bg-surface-elevated border border-border/60">
                {opt.colors.map((c, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Dấu tích chọn */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center transition-all',
                  isSelected
                    ? 'bg-primary text-white'
                    : 'border border-border text-transparent'
                )}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
