'use client';

import React from 'react';
import { Camera, Mic } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';

export function FloatingActions() {
  const pathname = usePathname();
  const { info } = useToast();

  if (pathname !== '/') return null;

  const handlePlaceholderClick = (feature: string) => {
    info(`Tính năng ${feature} sẽ ra mắt trong phiên bản tiếp theo!`);
  };

  return (
    <div
      className="fixed right-4 bottom-24 z-30 flex flex-col items-center gap-2.5 pointer-events-auto"
      style={{
        // Ensure it aligns with the right boundary of the centered mobile app container
        right: 'max(1rem, calc((100vw - 440px) / 2 + 1rem))',
      }}
    >
      <button
        type="button"
        onClick={() => handlePlaceholderClick('chụp hóa đơn (Camera)')}
        aria-label="Chụp hóa đơn (Chưa khả dụng)"
        className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-surface dark:bg-surface-elevated text-text-secondary border border-border shadow-card hover:bg-surface-secondary active:scale-95 transition-all opacity-80 hover:opacity-100"
      >
        <Camera className="w-5 h-5 stroke-[1.8]" />
      </button>

      <button
        type="button"
        onClick={() => handlePlaceholderClick('nhập giọng nói (Microphone)')}
        aria-label="Nhập giọng nói (Chưa khả dụng)"
        className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-surface dark:bg-surface-elevated text-text-secondary border border-border shadow-card hover:bg-surface-secondary active:scale-95 transition-all opacity-80 hover:opacity-100"
      >
        <Mic className="w-5 h-5 stroke-[1.8]" />
      </button>
    </div>
  );
}
