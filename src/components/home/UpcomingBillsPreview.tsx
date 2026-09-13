'use client';

import React from 'react';
import Link from 'next/link';
import { RecurringBill } from '@/types/bill';
import { Category } from '@/types/category';
import { getDueCountdown } from '@/lib/utils/date';
import { getBillStatus } from '@/lib/utils/bill';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptText, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpcomingBillsPreviewProps {
  bills: RecurringBill[];
  categories: Category[];
  onMarkPaid?: (billId: string) => void;
}

export function UpcomingBillsPreview({
  bills,
  categories,
  onMarkPaid,
}: UpcomingBillsPreviewProps) {
  // Lọc các hóa đơn active và chưa thanh toán cho kỳ này, sắp xếp theo ngày đến hạn
  const todayStr = new Date().toISOString().split('T')[0];
  const unpaidBills = bills
    .map((bill) => ({
      bill,
      statusInfo: getBillStatus(bill, todayStr),
    }))
    .filter(({ statusInfo }) => statusInfo.status !== 'paid' && statusInfo.status !== 'inactive')
    .sort((a, b) => new Date(a.bill.dueDate).getTime() - new Date(b.bill.dueDate).getTime());

  const topBills = unpaidBills.slice(0, 3);

  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  return (
    <div className="flex flex-col gap-2.5">
      {/* Tiêu đề mục */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/bills"
          className="group flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-text-primary hover:text-primary transition-colors"
        >
          <span className="text-sm">🧾</span>
          <span>Hóa Đơn Sắp Đến Hạn</span>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/bills"
          className="text-[11px] font-bold text-primary hover:underline"
        >
          Xem tất cả ({unpaidBills.length})
        </Link>
      </div>

      {/* Danh sách thẻ hóa đơn hoặc trạng thái rỗng */}
      {topBills.length === 0 ? (
        <div className="p-4 rounded-3xl bg-surface/80 dark:bg-surface-elevated/60 border border-border/70 text-center flex flex-col items-center justify-center gap-1.5 py-6">
          <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-1">
            <ReceiptText className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="text-xs font-bold text-text-primary">
            Không có hóa đơn cần thanh toán
          </span>
          <span className="text-[11px] text-text-muted max-w-[240px]">
            Tất cả hóa đơn định kỳ đã được thanh toán hoặc chưa có lịch hẹn mới.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {topBills.map(({ bill, statusInfo }) => {
            const cat = categoryMap.get(bill.categoryId);

            return (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
                    style={{
                      backgroundColor: `${cat?.color || '#1B4332'}18`,
                      color: cat?.color || '#1B4332',
                    }}
                  >
                    <ReceiptText className="w-5 h-5 stroke-[2]" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-text-primary truncate">
                      {bill.name}
                    </span>
                    <span className="text-xs font-bold text-text-primary">
                      {formatCurrency(bill.amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Badge đếm ngược hạn thanh toán */}
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] tracking-tight',
                      statusInfo.badgeClass
                    )}
                  >
                    {statusInfo.label}
                  </span>

                  {onMarkPaid && statusInfo.canMarkPaid && (
                    <button
                      type="button"
                      onClick={() => onMarkPaid(bill.id)}
                      title="Đánh dấu đã thanh toán"
                      aria-label={`Đánh dấu đã thanh toán hóa đơn ${bill.name}`}
                      className="p-1.5 rounded-xl text-text-muted hover:text-primary hover:bg-primary-soft active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
