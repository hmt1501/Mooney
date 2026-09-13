'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isDestructive?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  isDestructive = false,
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-[360px] bg-surface dark:bg-surface-elevated rounded-3xl p-6 shadow-floating border border-border z-10 animate-in zoom-in-95 duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          {title && (
            <h3 className="text-lg font-bold text-text-primary leading-tight">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {description}
          </p>
        )}

        {children}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                'px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-transform active:scale-95',
                isDestructive
                  ? 'bg-status-danger text-white hover:bg-status-danger/90'
                  : 'bg-primary text-primary-content hover:bg-primary-hover'
              )}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
