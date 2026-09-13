'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ReceiptText, PieChart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Lịch',
    href: '/',
    icon: CalendarDays,
  },
  {
    name: 'Hóa đơn',
    href: '/bills',
    icon: ReceiptText,
  },
  {
    name: 'Thống kê',
    href: '/statistics',
    icon: PieChart,
  },
  {
    name: 'Cá nhân',
    href: '/profile',
    icon: User,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-[420px] px-4 pointer-events-none"
      aria-label="Thanh điều hướng chính"
    >
      <div className="pointer-events-auto flex items-center justify-around py-2 px-3 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-md rounded-full shadow-floating border border-border/80 transition-all">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] h-[48px] px-3 py-1 rounded-full transition-all duration-200 active:scale-95',
                isActive
                  ? 'bg-primary-soft text-primary font-bold'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                )}
              />
              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
