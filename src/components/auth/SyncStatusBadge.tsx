'use client';

import React from 'react';
import { Cloud, CloudOff, CloudUpload, RefreshCw, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error' | 'offline' | 'unauthenticated';

interface SyncStatusBadgeProps {
  status: SyncState;
  lastSyncedAt?: string | null;
  errorMessage?: string | null;
  onTriggerSync?: () => void;
  className?: string;
}

export function SyncStatusBadge({
  status,
  lastSyncedAt,
  errorMessage,
  onTriggerSync,
  className,
}: SyncStatusBadgeProps) {
  return (
    <button
      type="button"
      onClick={onTriggerSync}
      disabled={status === 'syncing'}
      title={
        status === 'error' && errorMessage
          ? `Đồng bộ thất bại: ${errorMessage}`
          : lastSyncedAt
          ? `Lần cuối đồng bộ: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
          : 'Bấm để đồng bộ dữ liệu'
      }
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all select-none',
        status === 'synced' && 'bg-primary/10 text-primary hover:bg-primary/20',
        status === 'syncing' && 'bg-surface-secondary text-text-muted cursor-wait',
        status === 'pending' && 'bg-status-warning/15 text-status-warning hover:bg-status-warning/25',
        status === 'error' && 'bg-status-danger/10 text-status-danger hover:bg-status-danger/20',
        status === 'offline' && 'bg-status-warning/15 text-status-warning',
        status === 'unauthenticated' && 'bg-surface-secondary text-text-muted hover:text-text-primary',
        className
      )}
    >
      {status === 'synced' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-primary" />
          <span>Đã đồng bộ</span>
        </>
      )}

      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-text-muted" />
          <span>Đang đồng bộ...</span>
        </>
      )}

      {status === 'pending' && (
        <>
          <CloudUpload className="w-3.5 h-3.5 text-status-warning" />
          <span>Chưa đồng bộ</span>
        </>
      )}

      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-status-danger" />
          <span>Đồng bộ thất bại</span>
        </>
      )}

      {status === 'offline' && (
        <>
          <HardDrive className="w-3.5 h-3.5 text-status-warning" />
          <span>Lưu cục bộ (Offline)</span>
        </>
      )}

      {status === 'unauthenticated' && (
        <>
          <HardDrive className="w-3.5 h-3.5 text-text-muted" />
          <span>Cục bộ • Đăng nhập để đồng bộ</span>
        </>
      )}
    </button>
  );
}
