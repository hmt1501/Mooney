'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { formatCurrency } from '@/lib/utils/currency';
import { Wallet, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartingBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStartingBalance: number;
  onSave: (amount: number) => Promise<void>;
}

const QUICK_CHIPS = [
  { label: '1 triệu', value: 1000000 },
  { label: '2 triệu', value: 2000000 },
  { label: '5 triệu', value: 5000000 },
  { label: '10 triệu', value: 10000000 },
  { label: '20 triệu', value: 20000000 },
];

export function StartingBalanceModal({
  isOpen,
  onClose,
  currentStartingBalance,
  onSave,
}: StartingBalanceModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [amount, setAmount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(currentStartingBalance);
      setAmountStr(currentStartingBalance ? currentStartingBalance.toLocaleString('vi-VN') : '');
    }
  }, [isOpen, currentStartingBalance]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAmountStr('');
      setAmount(0);
      return;
    }
    const num = parseInt(raw, 10);
    setAmount(num);
    setAmountStr(num.toLocaleString('vi-VN'));
  };

  const handleSelectQuickChip = (val: number) => {
    setAmount(val);
    setAmountStr(val.toLocaleString('vi-VN'));
  };

  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      await onSave(amount);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thiết lập số dư ban đầu"
      confirmText={isSaving ? 'Đang lưu...' : 'Lưu số dư'}
      cancelText="Hủy"
      onConfirm={handleConfirm}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Hộp nhập số tiền lớn */}
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-surface-secondary/70 border border-border/70 text-center gap-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Số tiền ban đầu
          </span>

          <div className="flex items-center justify-center gap-1 w-full">
            <input
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              autoFocus
              className="w-full text-center text-3xl font-black bg-transparent border-none focus:outline-none text-text-primary tracking-tight placeholder:text-text-muted tabular-nums"
            />
            <span className="text-lg font-black text-text-muted shrink-0">đ</span>
          </div>

          {/* Chips chọn nhanh */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 mt-1">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => handleSelectQuickChip(chip.value)}
                className="px-2.5 py-1 rounded-xl bg-surface dark:bg-surface-elevated text-text-primary border border-border/80 text-[11px] font-bold hover:bg-primary-soft hover:text-primary active:scale-95 transition-all shadow-xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin giải thích */}
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-primary-soft text-primary text-xs leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">Quy tắc Số Dư Ban Đầu:</span>
            <span className="text-text-secondary text-[11px]">
              Số tiền bạn có khi bắt đầu sử dụng Mooney. Đây là giá trị thiết lập mốc khởi điểm, <strong>không phải là một giao dịch chi tiêu/thu nhập</strong> và dùng làm mốc tính Số Dư Khả Dụng.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
