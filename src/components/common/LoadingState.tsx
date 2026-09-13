'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-surface-secondary dark:bg-surface-secondary/60',
        className
      )}
    />
  );
}

export function LoadingState({ type = 'card' }: { type?: 'card' | 'calendar' | 'list' }) {
  if (type === 'calendar') {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border">
        <div className="flex justify-between items-center px-2 py-1">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-16 h-6" />
        </div>
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface dark:bg-surface-elevated border border-border"
          >
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-3" />
            </div>
            <Skeleton className="w-20 h-5" />
          </div>
        ))}
      </div>
    );
  }

  // Default card skeleton (like balance card)
  return (
    <div className="p-6 rounded-3xl bg-surface dark:bg-surface-elevated border border-border shadow-soft flex flex-col gap-3">
      <Skeleton className="w-20 h-3" />
      <Skeleton className="w-48 h-9" />
      <Skeleton className="w-36 h-4" />
    </div>
  );
}
