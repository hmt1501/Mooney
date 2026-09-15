'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { MonthSelector } from '@/components/home/MonthSelector';

interface HeaderConfig {
  title: string;
  subtitle?: string;
  /** Hiện bộ chọn tháng thu nhỏ ở giữa + nút sáng/tối bên phải */
  withMonthAndTheme: boolean;
}

function getHeaderConfig(pathname: string): HeaderConfig | null {
  if (pathname === '/') {
    return { title: 'Mooney', subtitle: 'Mooney calendar', withMonthAndTheme: true };
  }
  if (pathname.startsWith('/statistics')) {
    return { title: 'Thống kê', subtitle: 'Chi tiêu', withMonthAndTheme: true };
  }
  if (pathname.startsWith('/bills')) {
    return { title: 'Hóa Đơn', withMonthAndTheme: false };
  }
  if (pathname.startsWith('/profile')) {
    return { title: 'Cài đặt', withMonthAndTheme: false };
  }
  // Các trang con (vd. /income) tự có header riêng với nút quay lại
  return null;
}

export function TopHeader() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const { year, month, setMonth } = useSelectedMonth();

  const config = getHeaderConfig(pathname);
  if (!config) return null;

  return (
    <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-4 pt-4 pb-2 mb-2 bg-surface border-b border-border/60 transition-colors">
      <div className="flex flex-col min-w-0">
        <h1 className="text-lg font-black tracking-tight text-primary leading-tight whitespace-nowrap">
          {config.title}
        </h1>
        {config.subtitle && (
          <span className="text-[11px] font-semibold text-text-muted leading-tight truncate">
            {config.subtitle}
          </span>
        )}
      </div>

      <div className="flex justify-center">
        {config.withMonthAndTheme && (
          <MonthSelector year={year} month={month} onMonthChange={setMonth} variant="compact" />
        )}
      </div>

      <div className="flex items-center justify-end">
        {config.withMonthAndTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="flex items-center justify-center w-10 h-10 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-status-warning transition-transform" />
            ) : (
              <Moon className="w-5 h-5 text-text-secondary transition-transform" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
