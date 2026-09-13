'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-[440px] max-h-[88vh] bg-surface dark:bg-surface-elevated rounded-t-3xl shadow-sheet border-t border-border flex flex-col z-10 transition-transform duration-300 animate-in slide-in-from-bottom',
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-10 h-1.5 rounded-full bg-border-default hover:bg-text-muted transition-colors" />
        </div>

        {/* Header (optional) */}
        {(title || description) && (
          <div className="flex items-center justify-between px-6 pt-2 pb-3 border-b border-border/60">
            <div>
              {title && (
                <h2 className="text-base font-bold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-text-muted mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body content with scrolling */}
        <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
