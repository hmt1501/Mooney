'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã có chút gián đoạn. Bạn vui lòng thử lại nhé.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-status-danger-soft/30 border border-status-danger/20 transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-status-danger-soft text-status-danger mb-3">
        <AlertCircle className="w-6 h-6 stroke-[1.8]" />
      </div>

      <h4 className="text-sm font-bold text-text-primary mb-1">
        {title}
      </h4>

      <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed mb-4">
        {description}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-secondary active:scale-95 shadow-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
}
