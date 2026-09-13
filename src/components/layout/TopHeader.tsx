'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function TopHeader({
  title = 'MOONEY',
  subtitle = 'Money Calendar',
  rightAction,
}: TopHeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-4 pb-2 bg-background/95 backdrop-blur-sm transition-colors">
      <div className="flex flex-col">
        <h1 className="text-xl font-black tracking-tight text-primary leading-tight">
          {title}
        </h1>
        {subtitle && (
          <span className="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {rightAction}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="flex items-center justify-center w-11 h-11 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-status-warning transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-text-secondary transition-transform" />
          )}
        </button>
      </div>
    </header>
  );
}
