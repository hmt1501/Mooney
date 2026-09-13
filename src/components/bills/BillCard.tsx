'use client';

import React from 'react';
import { RecurringBill } from '@/types/bill';
import { Category } from '@/types/category';
import { getBillStatus, REPEAT_LABELS, formatDueDate } from '@/lib/utils/bill';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptText, CheckCircle2, Calendar, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillCardProps {
  bill: RecurringBill;
  category?: Category;
  onEdit: (bill: RecurringBill) => void;
  onMarkPaid: (bill: RecurringBill) => void;
}

export function BillCard({
  bill,
  category,
  onEdit,
  onMarkPaid,
}: BillCardProps) {
  const statusInfo = getBillStatus(bill);
  const color = category?.color || '#1B4332';

  return (
    <div
      onClick={() => onEdit(bill)}
      className="group flex flex-col p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft hover:shadow-card active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Thanh viền màu danh mục tinh tế phía trên */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-70"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between gap-3">
        {/* Phần thông tin chính: Icon + Tên + Hạn thanh toán */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 shadow-sm"
            style={{
              backgroundColor: `${color}18`,
              color: color,
            }}
          >
            <ReceiptText className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-text-primary truncate">
              {bill.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Calendar className="w-3 h-3" />
                <span>{formatDueDate(bill.dueDate)}</span>
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Repeat className="w-3 h-3" />
                <span>{REPEAT_LABELS[bill.repeat]}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Phần số tiền & nút thao tác */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-sm font-black text-text-primary tabular-nums tracking-tight">
            {formatCurrency(bill.amount)}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Badge trạng thái / đếm ngược */}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] tracking-tight',
                statusInfo.badgeClass
              )}
            >
              {statusInfo.label}
            </span>

            {/* Nút đánh dấu đã thanh toán */}
            {statusInfo.canMarkPaid ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPaid(bill);
                }}
                title="Đánh dấu đã thanh toán"
                aria-label={`Đánh dấu đã thanh toán ${bill.name}`}
                className="flex items-center gap-1 min-h-[32px] px-3 py-1.5 rounded-xl bg-primary-soft text-primary text-[11px] font-bold hover:bg-primary hover:text-white active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Trả</span>
              </button>
            ) : (
              <div
                title="Đã thanh toán cho kỳ này"
                className="flex items-center gap-1 min-h-[32px] px-2.5 py-1.5 text-primary text-[11px] font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã trả</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghi chú nếu có */}
      {bill.note && (
        <div className="mt-2 pt-2 border-t border-border/50 text-[11px] text-text-muted italic truncate">
          {bill.note}
        </div>
      )}
    </div>
  );
}
