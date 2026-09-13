'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useToast } from '@/components/common/ToastContext';
import { IncomeCard } from '@/components/income/IncomeCard';
import { IncomeFormSheet } from '@/components/income/IncomeFormSheet';
import { IncomeItem } from '@/types/income';
import { calculateMonthlyIncomeSummary, getUpcomingIncomes } from '@/lib/calculations/income';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/common/LoadingState';

type IncomeTab = 'all' | 'recurring' | 'one_time' | 'upcoming';

export default function IncomeManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const {
    incomes,
    isLoading,
    addIncome,
    updateIncome,
    deleteIncome,
    toggleIncomeActive,
  } = useMooneyData();

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [activeTab, setActiveTab] = useState<IncomeTab>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  // Tính tổng kết thu nhập tháng hiện tại
  const summary = useMemo(() => {
    return calculateMonthlyIncomeSummary(incomes, currentYear, currentMonth, now);
  }, [incomes, currentYear, currentMonth, now]);

  // Danh sách thu nhập sắp nhận trong 30 ngày tới
  const upcomingIncomes = useMemo(() => {
    return getUpcomingIncomes(incomes, now, 30);
  }, [incomes, now]);

  // Lọc theo tab
  const filteredIncomes = useMemo(() => {
    if (activeTab === 'recurring') {
      return incomes.filter(
        (inc) =>
          inc.type === 'recurring' ||
          inc.recurrence === 'monthly' ||
          (typeof inc.recurrence === 'object' && inc.recurrence !== null)
      );
    }
    if (activeTab === 'one_time') {
      return incomes.filter(
        (inc) =>
          inc.type === 'one_time' ||
          inc.recurrence === 'never' ||
          (!inc.type && inc.recurrence !== 'monthly')
      );
    }
    if (activeTab === 'upcoming') {
      const upcomingIds = new Set(upcomingIncomes.map((u) => u.incomeId));
      return incomes.filter((inc) => upcomingIds.has(inc.id));
    }
    return incomes;
  }, [incomes, activeTab, upcomingIncomes]);

  const handleOpenAdd = () => {
    setEditingIncome(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: IncomeItem) => {
    setEditingIncome(item);
    setIsFormOpen(true);
  };

  const handleSaveIncome = async (data: any) => {
    try {
      if (editingIncome) {
        await updateIncome(editingIncome.id, data);
        success(`Đã cập nhật nguồn thu "${data.name}"!`);
      } else {
        await addIncome(data);
        success(`Đã thêm nguồn thu mới "${data.name}"!`);
      }
    } catch {
      error('Có lỗi khi lưu nguồn thu nhập.');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      const ok = await deleteIncome(id);
      if (ok) {
        success('Đã xóa nguồn thu nhập thành công!');
      } else {
        error('Không tìm thấy nguồn thu để xóa.');
      }
    } catch {
      error('Đã xảy ra lỗi khi xóa nguồn thu.');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const item = await toggleIncomeActive(id);
      if (item) {
        success(item.isActive ? `Đã kích hoạt lại "${item.name}"` : `Đã tạm dừng "${item.name}"`);
      }
    } catch {
      error('Không thể thay đổi trạng thái nguồn thu.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        <LoadingState type="card" />
        <LoadingState type="card" />
      </div>
    );
  }

  const upcomingIds = new Set(upcomingIncomes.map((u) => u.incomeId));

  return (
    <div className="flex flex-col gap-5 pt-2 pb-24">
      {/* Header with back navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary p-2 -ml-2 rounded-2xl hover:bg-surface-secondary active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <h1 className="text-base font-black text-text-primary">
          Quản Lý Thu Nhập
        </h1>

        <div className="w-8" />
      </div>

      {/* Total Income Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-primary/15 via-surface to-surface-secondary border border-primary/20 shadow-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
            Thu nhập tháng {currentMonth}/{currentYear}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/20 text-primary">
            {incomes.filter((i) => i.isActive).length} nguồn thu
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-3xl font-black text-status-income tracking-tight tabular-nums">
            +{formatCurrency(summary.total)}
          </span>
          <span className="text-xs font-semibold text-text-muted mt-0.5">
            Dự tính trong tháng hiện tại
          </span>
        </div>

        {/* Realized vs Upcoming Breakdowns */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-muted uppercase">
              Đã nhận (Khả dụng)
            </span>
            <span className="text-sm font-extrabold text-status-income tabular-nums mt-0.5">
              +{formatCurrency(summary.realized)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-muted uppercase">
              Sắp nhận
            </span>
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
              +{formatCurrency(summary.upcoming)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex bg-surface-secondary p-1 rounded-2xl text-xs font-bold">
        {(
          [
            { key: 'all', label: 'Tất cả' },
            { key: 'recurring', label: 'Định kỳ' },
            { key: 'one_time', label: 'Một lần' },
            { key: 'upcoming', label: 'Sắp nhận' },
          ] as { key: IncomeTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2 rounded-xl transition-all',
              activeTab === tab.key
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Income List */}
      <div className="flex flex-col gap-3">
        {filteredIncomes.length === 0 ? (
          <div className="p-8 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-secondary flex items-center justify-center text-2xl">
              🌱
            </div>
            <p className="text-sm font-bold text-text-primary">
              Chưa có nguồn thu nhập nào
            </p>
            <p className="text-xs text-text-muted max-w-xs">
              Thêm lương, thưởng hoặc các khoản thu nhập khác để Mooney tính toán số tiền khả dụng chính xác.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-2 px-4 py-2 rounded-2xl bg-primary text-primary-content text-xs font-bold active:scale-95 transition-all"
            >
              + Thêm ngay
            </button>
          </div>
        ) : (
          filteredIncomes.map((item) => (
            <IncomeCard
              key={item.id}
              income={item}
              isUpcoming={upcomingIds.has(item.id)}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteIncome}
              onToggleActive={handleToggleActive}
            />
          ))
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none flex justify-end z-20">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3.5 rounded-full bg-primary text-primary-content font-extrabold text-sm shadow-card hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm thu nhập</span>
        </button>
      </div>

      {/* Bottom Sheet Form */}
      <IncomeFormSheet
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingIncome(null);
        }}
        editingIncome={editingIncome}
        onSave={handleSaveIncome}
        onDelete={handleDeleteIncome}
      />
    </div>
  );
}
