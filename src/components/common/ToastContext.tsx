'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );
  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );
  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );
  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast container pinned within mobile shell */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-[420px] px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-floating text-sm font-medium transition-all duration-300 transform translate-y-0',
              'animate-in fade-in slide-in-from-top-3 border',
              t.type === 'success' &&
                'bg-surface border-border text-text-primary dark:bg-surface-elevated',
              t.type === 'error' &&
                'bg-status-danger-soft border-status-danger/20 text-status-danger dark:bg-status-danger-soft/30',
              t.type === 'warning' &&
                'bg-status-warning-soft border-status-warning/20 text-status-warning dark:bg-status-warning-soft/30',
              t.type === 'info' &&
                'bg-surface border-border text-text-primary dark:bg-surface-elevated'
            )}
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-status-danger shrink-0" />
            )}
            {t.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
            )}
            {t.type === 'info' && (
              <Info className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-full text-text-muted hover:text-text-primary transition-colors"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
