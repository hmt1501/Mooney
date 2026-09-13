'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { SpendingLevelConfig } from '@/types/settings';
import { DEFAULT_HEATMAP_THRESHOLDS } from '@/lib/constants/heatmap';
import { formatCompactCurrency } from '@/lib/utils/currency';
import { RotateCcw } from 'lucide-react';

interface SpendingLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: SpendingLevelConfig;
  onSave: (config: SpendingLevelConfig) => Promise<void>;
}

export function SpendingLevelModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: SpendingLevelModalProps) {
  const [lowMaxInput, setLowMaxInput] = useState<string>('100000');
  const [mediumMaxInput, setMediumMaxInput] = useState<string>('500000');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLowMaxInput(String(currentConfig?.lowMax || DEFAULT_HEATMAP_THRESHOLDS.lowMax));
      setMediumMaxInput(String(currentConfig?.mediumMax || DEFAULT_HEATMAP_THRESHOLDS.mediumMax));
      setErrorMsg('');
    }
  }, [isOpen, currentConfig]);

  const lowVal = parseInt(lowMaxInput.replace(/\D/g, '') || '0', 10);
  const medVal = parseInt(mediumMaxInput.replace(/\D/g, '') || '0', 10);

  const handleResetDefault = () => {
    setLowMaxInput(String(DEFAULT_HEATMAP_THRESHOLDS.lowMax));
    setMediumMaxInput(String(DEFAULT_HEATMAP_THRESHOLDS.mediumMax));
    setErrorMsg('');
  };

  const handleConfirm = async () => {
    if (lowVal <= 0) {
      setErrorMsg('Ngưỡng chi tiêu thấp phải lớn hơn 0.');
      return;
    }
    if (medVal <= lowVal) {
      setErrorMsg('Ngưỡng chi tiêu trung bình phải lớn hơn ngưỡng thấp.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        lowMax: lowVal,
        mediumMax: medVal,
      });
      onClose();
    } catch {
      setErrorMsg('Không thể lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tùy Chỉnh Ngưỡng Chi Tiêu (Heatmap)"
      description="Điều chỉnh các hạn mức màu sắc trên lịch tài chính để phù hợp với thói quen và ngân sách của riêng bạn."
      confirmText={isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
      cancelText="Hủy"
      onConfirm={handleConfirm}
    >
      <div className="flex flex-col gap-4 my-2 text-xs">
        {/* Lỗi cảnh báo */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-status-danger-soft text-status-danger font-bold text-[11px]">
            {errorMsg}
          </div>
        )}

        {/* 1. Ngưỡng thấp */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-text-secondary">
            1. Mức thấp (Xanh nhẹ) — Dưới mức:
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={lowVal > 0 ? lowVal.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                setLowMaxInput(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="100.000"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-secondary text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-4 font-bold text-text-muted">đ</span>
          </div>
        </div>

        {/* 2. Ngưỡng trung bình */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-text-secondary">
            2. Mức trung bình (Cam nhẹ) — Từ {formatCompactCurrency(lowVal)} đến:
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              value={medVal > 0 ? medVal.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                setMediumMaxInput(e.target.value.replace(/\D/g, ''));
                setErrorMsg('');
              }}
              placeholder="500.000"
              className="w-full px-4 py-2.5 rounded-2xl bg-surface-secondary text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-4 font-bold text-text-muted">đ</span>
          </div>
        </div>

        {/* 3. Mức cao */}
        <div className="p-2.5 rounded-xl bg-surface-secondary text-text-muted text-[11px]">
          🔥 <strong>Mức cao (Đậm):</strong> Bất kỳ ngày nào chi trên{' '}
          <strong>{formatCompactCurrency(medVal)}</strong> sẽ được đánh dấu mức nhiệt cao nhất.
        </div>

        {/* Preview trực tiếp */}
        <div className="flex items-center justify-around p-3 rounded-2xl bg-surface-secondary/70 border border-border/80">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-heat-low border border-heat-low-text/30" />
            <span className="font-bold text-[11px]">&lt; {formatCompactCurrency(lowVal)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-heat-medium border border-heat-medium-text/30" />
            <span className="font-bold text-[11px]">
              {formatCompactCurrency(lowVal)} - {formatCompactCurrency(medVal)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-heat-high border border-heat-high-text/30" />
            <span className="font-bold text-[11px]">&gt; {formatCompactCurrency(medVal)}</span>
          </div>
        </div>

        {/* Nút đặt lại mặc định */}
        <button
          type="button"
          onClick={handleResetDefault}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all font-semibold"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại về mặc định (100k - 500k)</span>
        </button>
      </div>
    </Modal>
  );
}
