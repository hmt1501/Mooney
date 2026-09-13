'use client';

import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-surface/60 dark:bg-surface-elevated/40 border border-border/60 transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-soft text-primary mb-3.5 shadow-sm">
        <Icon className="w-7 h-7 stroke-[1.8]" />
      </div>

      <h4 className="text-base font-bold text-text-primary mb-1">
        {title}
      </h4>

      {description && (
        <p className="text-xs text-text-muted max-w-[240px] leading-relaxed mb-4">
          {description}
        </p>
      )}

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-full text-xs font-bold bg-primary text-primary-content hover:bg-primary-hover active:scale-95 shadow-soft transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
