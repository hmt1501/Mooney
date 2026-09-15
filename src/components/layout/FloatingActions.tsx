'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Mic, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ReceiptScannerSheet, ReceiptScanMode } from '@/components/receipt/ReceiptScannerSheet';
import { VoiceExpenseSheet } from '@/components/voice/VoiceExpenseSheet';
import { cn } from '@/lib/utils';

const FAB_CLASS =
  'relative flex items-center justify-center w-11 h-11 rounded-full bg-surface dark:bg-surface-elevated text-primary border border-border shadow-card hover:bg-surface-secondary active:scale-95 transition-all';

export function FloatingActions() {
  const pathname = usePathname();
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const [scanner, setScanner] = useState<{ mode: ReceiptScanMode; image: File | null } | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Esc để thu gọn menu camera
  useEffect(() => {
    if (!isCameraMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCameraMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCameraMenuOpen]);

  if (pathname !== '/') return null;

  const handleTakePhoto = () => {
    setIsCameraMenuOpen(false);
    setScanner({ mode: 'camera', image: null });
  };

  // Mở hộp chọn ảnh ngay trong thao tác chạm (iOS chặn nếu gọi sau khi render)
  const handlePickFromLibrary = () => {
    setIsCameraMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // cho phép chọn lại cùng một ảnh
    if (file) setScanner({ mode: 'library', image: file });
  };

  const menuItemClass = (translate: string, delay: string) =>
    cn(
      FAB_CLASS,
      'absolute top-0 left-0 duration-200 ease-out',
      isCameraMenuOpen
        ? cn('opacity-100 scale-100', translate, delay)
        : 'opacity-0 scale-50 translate-x-0 translate-y-0 pointer-events-none'
    );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-testid="fab-library-input"
      />

      {/* Lớp nền trong suốt: chạm ra ngoài để thu gọn menu camera */}
      {isCameraMenuOpen && (
        <div className="fixed inset-0 z-20" aria-hidden="true" onClick={() => setIsCameraMenuOpen(false)} />
      )}

      <div
        className="fixed right-4 bottom-24 z-30 flex flex-col items-center gap-2.5 pointer-events-auto"
        style={{
          // Ensure it aligns with the right boundary of the centered mobile app container
          right: 'max(1rem, calc((100vw - 440px) / 2 + 1rem))',
        }}
      >
        <div className="relative w-11 h-11">
          {/* Chụp ảnh: bắn lên trên */}
          <button
            type="button"
            onClick={handleTakePhoto}
            aria-label="Chụp ảnh hóa đơn"
            title="Chụp ảnh"
            tabIndex={isCameraMenuOpen ? 0 : -1}
            aria-hidden={!isCameraMenuOpen}
            className={menuItemClass('-translate-y-14', 'delay-0')}
          >
            <Camera className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Thư viện ảnh: bắn sang trái */}
          <button
            type="button"
            onClick={handlePickFromLibrary}
            aria-label="Chọn ảnh từ thư viện"
            title="Thư viện ảnh"
            tabIndex={isCameraMenuOpen ? 0 : -1}
            aria-hidden={!isCameraMenuOpen}
            className={menuItemClass('-translate-x-14', 'delay-75')}
          >
            <ImagePlus className="w-5 h-5 stroke-[1.8]" />
          </button>

          <button
            type="button"
            onClick={() => setIsCameraMenuOpen((open) => !open)}
            aria-label={isCameraMenuOpen ? 'Đóng' : 'Chụp hóa đơn'}
            aria-expanded={isCameraMenuOpen}
            className={cn(FAB_CLASS, isCameraMenuOpen && 'bg-primary text-primary-content hover:bg-primary-hover')}
          >
            <span className={cn('flex transition-transform duration-200', isCameraMenuOpen && 'rotate-90')}>
              {isCameraMenuOpen ? <X className="w-5 h-5 stroke-[2]" /> : <Camera className="w-5 h-5 stroke-[1.8]" />}
            </span>
          </button>
        </div>

        <button type="button" onClick={() => setIsVoiceOpen(true)} aria-label="Nói khoản chi" className={FAB_CLASS}>
          <Mic className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>

      <ReceiptScannerSheet
        isOpen={scanner !== null}
        mode={scanner?.mode ?? 'camera'}
        initialImage={scanner?.image ?? null}
        onClose={() => setScanner(null)}
      />
      <VoiceExpenseSheet isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
}
