'use client';

import React from 'react';
import { PenLine } from 'lucide-react';
import { Mascot, MascotMood } from '@/components/common/Mascot';
import { cn } from '@/lib/utils';

export interface FlowStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FlowStateViewProps {
  mood?: MascotMood;
  title: string;
  description: string;
  primary?: FlowStateAction;
  secondary?: FlowStateAction;
  onManualEntry?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/** Trạng thái thân thiện dùng chung cho các luồng nhập nhanh (camera, giọng nói): quyền truy cập, lỗi, mất mạng... */
export function FlowStateView({
  mood = 'normal',
  title,
  description,
  primary,
  secondary,
  onManualEntry,
  children,
  className,
}: FlowStateViewProps) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-4 py-2', className)} role="status">
      {children ?? <Mascot mood={mood} size={72} />}

      <div className="flex flex-col gap-1.5 max-w-[300px]">
        <h3 className="text-base font-extrabold text-text-primary">{title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-col w-full gap-2 pt-1">
        {primary && (
          <button
            type="button"
            onClick={primary.onClick}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-content text-sm font-bold shadow-soft hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {primary.icon && <primary.icon className="w-4 h-4" />}
            <span>{primary.label}</span>
          </button>
        )}
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="w-full py-3 rounded-2xl bg-surface-secondary border border-border text-text-primary text-sm font-bold hover:bg-border/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {secondary.icon && <secondary.icon className="w-4 h-4 text-text-muted" />}
            <span>{secondary.label}</span>
          </button>
        )}
        {onManualEntry && (
          <button
            type="button"
            onClick={onManualEntry}
            className="w-full py-2.5 rounded-2xl text-xs font-bold text-text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Tự nhập khoản chi</span>
          </button>
        )}
      </div>
    </div>
  );
}
