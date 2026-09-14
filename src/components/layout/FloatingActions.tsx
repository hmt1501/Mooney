'use client';

import React, { useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ReceiptScannerSheet } from '@/components/receipt/ReceiptScannerSheet';
import { VoiceExpenseSheet } from '@/components/voice/VoiceExpenseSheet';

export function FloatingActions() {
  const pathname = usePathname();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  if (pathname !== '/') return null;

  return (
    <>
    <div
      className="fixed right-4 bottom-24 z-30 flex flex-col items-center gap-2.5 pointer-events-auto"
      style={{
        // Ensure it aligns with the right boundary of the centered mobile app container
        right: 'max(1rem, calc((100vw - 440px) / 2 + 1rem))',
      }}
    >
      <button
        type="button"
        onClick={() => setIsScannerOpen(true)}
        aria-label="Chụp hóa đơn"
        className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-surface dark:bg-surface-elevated text-primary border border-border shadow-card hover:bg-surface-secondary active:scale-95 transition-all"
      >
        <Camera className="w-5 h-5 stroke-[1.8]" />
      </button>

      <button
        type="button"
        onClick={() => setIsVoiceOpen(true)}
        aria-label="Nói khoản chi"
        className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-surface dark:bg-surface-elevated text-primary border border-border shadow-card hover:bg-surface-secondary active:scale-95 transition-all"
      >
        <Mic className="w-5 h-5 stroke-[1.8]" />
      </button>
    </div>

    <ReceiptScannerSheet isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    <VoiceExpenseSheet isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
}
