'use client';

import React, { useState, useMemo } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useToast } from '@/components/common/ToastContext';
import { RecurringBill, CreateBillInput } from '@/types/bill';
import { BillCard } from '@/components/bills/BillCard';
import { BillFormSheet } from '@/components/bills/BillFormSheet';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { getBillStatus } from '@/lib/utils/bill';
import { formatCurrency } from '@/lib/utils/currency';
import { ReceiptText, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab = 'unpaid' | 'paid' | 'all';

export default function BillsPage() {
  const {
    bills,
    categories,
    createBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
  } = useMooneyData();

  const { success, error, warning } = useToast();

  // State quản lý tab lọc
  const [activeTab, setActiveTab] = useState<FilterTab>('unpaid');

  // State quản lý BottomSheet form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  // State quản lý Modal xác nhận thanh toán
  const [billToPay, setBillToPay] = useState<RecurringBill | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Phân loại và tính toán trạng thái của các hóa đơn
  const billWithStatusList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bills.map((bill) => ({
      bill,
      statusInfo: getBillStatus(bill, today),
    }));
  }, [bills]);

  // Thống kê tổng quan
  const summary = useMemo(() => {
    let totalUnpaidAmount = 0;
    let dueTodayCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    billWithStatusList.forEach(({ bill, statusInfo }) => {
      if (statusInfo.status !== 'paid' && statusInfo.status !== 'inactive') {
        totalUnpaidAmount += bill.amount;
        if (statusInfo.status === 'due_today') dueTodayCount++;
        else if (statusInfo.status === 'due_soon') dueSoonCount++;
        else if (statusInfo.status === 'overdue') overdueCount++;
      }
    });

    return {
      totalUnpaidAmount,
      dueTodayCount,
      dueSoonCount,
      overdueCount,
      totalCount: bills.length,
    };
  }, [billWithStatusList, bills.length]);

  // Lọc và sắp xếp hóa đơn theo tab
  const filteredBills = useMemo(() => {
    let list = [...billWithStatusList];

    if (activeTab === 'unpaid') {
      list = list.filter(
        ({ statusInfo }) => statusInfo.status !== 'paid' && statusInfo.status !== 'inactive'
      );
      // Sắp xếp ưu tiên: Quá hạn -> Hôm nay -> Sắp đến hạn -> Sắp tới
      list.sort((a, b) => {
        const orderMap = { overdue: 0, due_today: 1, due_soon: 2, upcoming: 3, paid: 4, inactive: 5 };
        return (orderMap[a.statusInfo.status] ?? 99) - (orderMap[b.statusInfo.status] ?? 99);
      });
    } else if (activeTab === 'paid') {
      list = list.filter(({ statusInfo }) => statusInfo.status === 'paid');
      // Sắp xếp theo ngày thanh toán mới nhất
      list.sort((a, b) => {
        const dateA = a.bill.lastPaidDate || '';
        const dateB = b.bill.lastPaidDate || '';
        return dateB.localeCompare(dateA);
      });
    } else {
      // Tất cả
      list.sort((a, b) => new Date(a.bill.dueDate).getTime() - new Date(b.bill.dueDate).getTime());
    }

    return list;
  }, [billWithStatusList, activeTab]);

  // Xử lý mở form thêm mới
  const handleOpenCreate = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  // Xử lý mở form chỉnh sửa
  const handleOpenEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  // Xử lý lưu hóa đơn (tạo mới hoặc cập nhật)
  const handleSaveBill = async (billData: CreateBillInput, billId?: string) => {
    if (billId) {
      await updateBill(billId, billData);
      success(`Đã cập nhật hóa đơn "${billData.name}"`);
    } else {
      await createBill(billData);
      success(`Đã tạo hóa đơn "${billData.name}" (chưa ghi nhận chi tiêu)`);
    }
  };

  // Xử lý xóa hóa đơn
  const handleDeleteBill = async (billId: string) => {
    const target = bills.find((b) => b.id === billId);
    const ok = await deleteBill(billId);
    if (ok) {
      success(`Đã xóa hóa đơn "${target?.name || ''}"`);
    }
  };

  // Xử lý bắt đầu thanh toán hóa đơn
  const handlePromptMarkPaid = (bill: RecurringBill) => {
    const status = getBillStatus(bill);
    if (!status.canMarkPaid) {
      warning(`Hóa đơn "${bill.name}" đã được thanh toán cho kỳ này.`);
      return;
    }
    setBillToPay(bill);
  };

  // Xác nhận thanh toán hóa đơn
  const handleConfirmPayment = async () => {
    if (!billToPay) return;
    try {
      setIsPaying(true);
      const today = new Date().toISOString().split('T')[0];
      const result = await markBillAsPaid(billToPay.id, today);
      success(
        `Đã thanh toán "${result.bill.name}" (${formatCurrency(result.createdTransaction.amount)}) và tự động trừ số dư!`
      );
      setBillToPay(null);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Không thể thực hiện thanh toán');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-1 pb-6">
      {/* 1. Header Trang & Nút Thêm Hóa Đơn */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-text-primary tracking-tight">
            Hóa Đơn Định Kỳ
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Quản lý các khoản chi lặp lại & kế hoạch sắp đến hạn
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-white text-xs font-black hover:bg-primary-hover active:scale-95 transition-all shadow-soft"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm HĐ</span>
        </button>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan Hóa Đơn */}
      <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Tổng cần thanh toán
          </span>
          <span className="text-xs font-bold text-text-muted">
            {bills.length} hóa đơn
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-black text-text-primary tracking-tight tabular-nums">
            {formatCurrency(summary.totalUnpaidAmount)}
          </span>

          {/* Cảnh báo gấp nếu có hóa đơn đến hạn hoặc quá hạn */}
          {(summary.dueTodayCount > 0 || summary.overdueCount > 0) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-danger-soft text-status-danger text-[11px] font-extrabold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {summary.overdueCount > 0
                  ? `${summary.overdueCount} quá hạn`
                  : `${summary.dueTodayCount} đến hạn hôm nay`}
              </span>
            </div>
          )}
        </div>

        {/* 3 chỉ số nhanh */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold">Hôm nay</span>
            <span className="text-xs font-black text-status-danger">
              {summary.dueTodayCount}
            </span>
          </div>
          <div className="flex flex-col border-x border-border/60">
            <span className="text-[10px] text-text-muted font-bold">Sắp đến hạn</span>
            <span className="text-xs font-black text-status-warning">
              {summary.dueSoonCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold">Quá hạn</span>
            <span className="text-xs font-black text-status-danger">
              {summary.overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Phân Đoạn Lọc Tabs (Segmented Control) */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-secondary rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('unpaid')}
          className={cn(
            'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'unpaid'
              ? 'bg-surface dark:bg-surface-elevated text-text-primary shadow-xs font-extrabold'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Cần trả</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paid')}
          className={cn(
            'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'paid'
              ? 'bg-surface dark:bg-surface-elevated text-text-primary shadow-xs font-extrabold'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Đã trả</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center',
            activeTab === 'all'
              ? 'bg-surface dark:bg-surface-elevated text-text-primary shadow-xs font-extrabold'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          Tất cả ({bills.length})
        </button>
      </div>

      {/* 4. Danh Sách Thẻ Hóa Đơn */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={
            activeTab === 'paid'
              ? 'Chưa có hóa đơn nào đã thanh toán'
              : activeTab === 'unpaid'
              ? 'Tuyệt vời! Không còn hóa đơn nào cần thanh toán'
              : 'Chưa có hóa đơn nào'
          }
          description={
            activeTab === 'paid'
              ? 'Khi bạn bấm "Trả" trên một hóa đơn, hóa đơn sẽ được ghi nhận đã thanh toán tại đây.'
              : 'Thêm hóa đơn định kỳ như tiền nhà, internet, netflix để Mooney luôn nhắc bạn đúng hạn.'
          }
          actionText="+ Thêm hóa đơn mới"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredBills.map(({ bill }) => (
            <BillCard
              key={bill.id}
              bill={bill}
              category={categoryMap.get(bill.categoryId)}
              onEdit={handleOpenEdit}
              onMarkPaid={handlePromptMarkPaid}
            />
          ))}
        </div>
      )}

      {/* 5. BottomSheet Thêm / Chỉnh Sửa Hóa Đơn */}
      <BillFormSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        categories={categories}
        initialBill={editingBill}
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
      />

      {/* 6. Modal Xác Nhận Thanh Toán Hóa Đơn */}
      <Modal
        isOpen={!!billToPay}
        onClose={() => setBillToPay(null)}
        title="Xác nhận thanh toán"
        description={`Bạn có muốn đánh dấu "${billToPay?.name}" (${billToPay ? formatCurrency(billToPay.amount) : ''}) là đã thanh toán hôm nay? Hệ thống sẽ tạo 1 giao dịch chi tiêu và tự động trừ số dư khả dụng.`}
        confirmText={isPaying ? 'Đang ghi nhận...' : 'Đã thanh toán'}
        cancelText="Để sau"
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
