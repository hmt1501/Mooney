'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { ReceiptErrorCode } from '@/types/receipt';
import { classifyCameraError } from '@/lib/receipt/receiptError';
import { cn } from '@/lib/utils';

interface ReceiptCameraProps {
  onCapture: (image: Blob) => void;
  onError: (code: ReceiptErrorCode) => void;
  onPickFile: () => void;
}

/**
 * Khung camera cho mobile web: ưu tiên camera sau, luôn có lối chọn ảnh có sẵn.
 * Luồng camera được tắt ngay sau khi chụp hoặc khi rời màn hình.
 */
export function ReceiptCamera({ onCapture, onError, onPickFile }: ReceiptCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callbacksRef = useRef({ onCapture, onError });
  callbacksRef.current = { onCapture, onError };

  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      callbacksRef.current.onError('camera_unsupported');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (!cancelled) callbacksRef.current.onError('camera_busy');
        });

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // iOS có thể từ chối autoplay khi chưa có thao tác; video vẫn hiện sau loadedmetadata
        }
      })
      .catch((error) => {
        if (!cancelled) callbacksRef.current.onError(classifyCameraError(error));
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !isReady || isCapturing || video.videoWidth === 0) return;
    setIsCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        stopStream();
        if (blob) callbacksRef.current.onCapture(blob);
        else callbacksRef.current.onError('camera_busy');
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-[3/4] max-h-[56vh] rounded-3xl overflow-hidden bg-[#0F1712] shadow-card">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => setIsReady(true)}
          className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-300', isReady ? 'opacity-100' : 'opacity-0')}
          aria-label="Khung camera"
        />

        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <LoaderCircle className="w-6 h-6 animate-spin" />
            <span className="text-xs font-semibold">Đang mở camera...</span>
          </div>
        )}

        {/* Khung căn hóa đơn */}
        <div className="pointer-events-none absolute inset-6" aria-hidden="true">
          {['top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl', 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl', 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl', 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl'].map((corner) => (
            <span key={corner} className={cn('absolute w-9 h-9 border-white/85', corner)} />
          ))}
        </div>

        <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center">
          <span className="px-3 py-1 rounded-full bg-black/45 text-white text-[11px] font-semibold backdrop-blur-sm">
            Căn hóa đơn vào khung, giữ máy thật chắc
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onPickFile}
          className="flex flex-col items-center gap-1 w-16 text-text-secondary hover:text-text-primary active:scale-95 transition-all"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-secondary border border-border">
            <ImagePlus className="w-5 h-5" />
          </span>
          <span className="text-[10px] font-bold">Ảnh có sẵn</span>
        </button>

        <button
          type="button"
          onClick={handleCapture}
          disabled={!isReady || isCapturing}
          aria-label="Chụp hóa đơn"
          className="flex items-center justify-center w-[72px] h-[72px] rounded-full border-4 border-primary/25 bg-surface dark:bg-surface-elevated shadow-floating active:scale-95 transition-all disabled:opacity-50"
        >
          <span className="w-14 h-14 rounded-full bg-primary" />
        </button>

        <span className="w-16" aria-hidden="true" />
      </div>
    </div>
  );
}
