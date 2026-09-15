'use client';

import React, { useState, useRef } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useAuth } from '@/lib/auth/authContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/common/ToastContext';
import { StartingBalanceModal } from '@/components/profile/StartingBalanceModal';
import { HeatmapThemeSelector } from '@/components/profile/HeatmapThemeSelector';
import { CategoryManagerSheet } from '@/components/profile/CategoryManagerSheet';
import { AuthModal } from '@/components/auth/AuthModal';
import { SyncStatusBadge } from '@/components/auth/SyncStatusBadge';
import { Modal } from '@/components/common/Modal';
import { Mascot } from '@/components/common/Mascot';
import { formatCurrency } from '@/lib/utils/currency';
import { HeatmapTheme, ThemeMode } from '@/types/settings';
import {
  Wallet,
  Sun,
  Moon,
  Monitor,
  Palette,
  Tags,
  Download,
  Upload,
  RotateCcw,
  ChevronRight,
  Heart,
  Coins,
  Languages,
  Cloud,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Hệ thống', icon: Monitor },
];

export default function ProfilePage() {
  const {
    settings,
    availableBalance,
    categories,
    updateStartingBalance,
    updateSettings,
    addCategory,
    updateCategory,
    exportData,
    importData,
    resetToSeedData,
    syncStatus,
    syncError,
    lastSyncedAt,
    triggerSync,
  } = useMooneyData();

  const { user, signOut, isConfigured } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success, error, info } = useToast();

  // State modals
  const [isStartingBalanceOpen, setIsStartingBalanceOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Hidden file input cho Import JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ thủ công: chỉ báo thành công khi đồng bộ thực sự thành công
  const handleSyncNow = async () => {
    if (syncStatus === 'syncing') return;
    const result = await triggerSync();
    if (result.success) {
      success(
        result.syncedCount > 0
          ? `Đã đồng bộ ${result.syncedCount} thay đổi với máy chủ!`
          : 'Dữ liệu đã khớp với máy chủ.'
      );
    } else {
      error(`Đồng bộ thất bại: ${result.error || 'Lỗi không xác định'}`);
    }
  };

  // Xử lý lưu số dư ban đầu
  const handleSaveStartingBalance = async (amount: number) => {
    await updateStartingBalance(amount);
    success(`Đã cập nhật Số Dư Ban Đầu thành ${formatCurrency(amount)}`);
  };

  // Xử lý đổi theme giao diện
  const handleChangeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
    success(
      newTheme === 'light'
        ? 'Đã chuyển sang giao diện Sáng'
        : newTheme === 'dark'
        ? 'Đã chuyển sang giao diện Tối'
        : 'Đã áp dụng giao diện Hệ thống'
    );
  };

  // Xử lý đổi theme Heatmap
  const handleChangeHeatmapTheme = (heatmapTheme: HeatmapTheme) => {
    updateSettings({ heatmapTheme });
    success('Đã cập nhật bảng màu Heatmap Lịch');
  };

  // Xử lý Xuất JSON (Export)
  const handleExportJSON = async () => {
    try {
      const jsonStr = await exportData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `mooney_backup_${today}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success('Đã tải về tệp sao lưu dữ liệu JSON thành công!');
    } catch (err) {
      error('Không thể xuất dữ liệu: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
    }
  };

  // Xử lý Chọn tệp Nhập JSON (Import)
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      success('Đã nhập dữ liệu tệp sao lưu thành công!');
    } catch (err) {
      error('Nhập tệp thất bại: ' + (err instanceof Error ? err.message : 'Định dạng tệp không hợp lệ'));
    } finally {
      // Reset input để có thể chọn lại cùng 1 file nếu cần
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xử lý Đặt lại dữ liệu mẫu (Reset Data)
  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      await resetToSeedData();
      setIsResetConfirmOpen(false);
      success('Đã khôi phục dữ liệu mẫu ban đầu của Mooney!');
    } catch (err) {
      error('Không thể đặt lại dữ liệu: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-1 pb-8">
      {/* 1. SỐ DƯ KHẢ DỤNG HIỆN TẠI */}
      <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Số Dư Khả Dụng Hiện Tại
          </span>
          <Mascot mood={availableBalance >= 0 ? 'happy' : 'warning'} size={32} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-2xl font-black text-text-primary tracking-tight tabular-nums truncate">
            {formatCurrency(availableBalance)}
          </span>

          <button
            type="button"
            onClick={() => setIsStartingBalanceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-soft text-primary text-xs font-bold hover:bg-primary hover:text-white active:scale-95 transition-all shrink-0"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Sửa số dư</span>
          </button>
        </div>
      </div>

      {/* 2. TÀI KHOẢN & ĐỒNG BỘ ĐÁM MÂY (Cloud Sync) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Tài Khoản & Đồng Bộ
          </span>
          <SyncStatusBadge
            status={syncStatus}
            lastSyncedAt={lastSyncedAt}
            errorMessage={syncError}
            onTriggerSync={user ? handleSyncNow : undefined}
          />
        </div>

        <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-3">
          {user ? (
            // Đã đăng nhập
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-text-primary">
                      {user.user_metadata?.full_name || 'Người dùng Mooney'}
                    </span>
                    <span className="text-xs text-text-muted">{user.email}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    success('Đã đăng xuất tài khoản.');
                  }}
                  className="p-2 rounded-xl text-text-muted hover:text-status-danger hover:bg-status-danger/10 active:scale-95 transition-all"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                <span
                  className={cn(
                    'text-[11px] text-text-muted',
                    syncStatus === 'error' && 'text-status-danger'
                  )}
                >
                  {syncStatus === 'syncing'
                    ? 'Đang đồng bộ dữ liệu...'
                    : syncStatus === 'error'
                    ? `Đồng bộ thất bại: ${syncError}`
                    : lastSyncedAt
                    ? `Đồng bộ lúc: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')} ${new Date(lastSyncedAt).toLocaleDateString('vi-VN')}`
                    : 'Chưa có lịch sử đồng bộ'}
                </span>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncStatus === 'syncing'}
                  className="text-xs font-bold text-primary hover:underline disabled:opacity-60 disabled:no-underline disabled:cursor-wait whitespace-nowrap"
                >
                  {syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                </button>
              </div>
            </div>
          ) : (
            // Chưa đăng nhập (Khách / Local-only)
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-text-primary">
                    Đồng Bộ Đám Mây
                  </span>
                  <span className="text-xs text-text-muted">
                    Sao lưu và truy cập dữ liệu trên mọi thiết bị
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-content text-xs font-bold shadow-xs hover:bg-primary-hover active:scale-95 transition-all whitespace-nowrap"
              >
                Đăng Nhập
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. GIAO DIỆN & TÙY CHỌN */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
          Giao Diện & Tùy Chọn
        </span>

        <div className="flex flex-col rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft overflow-hidden">
          {/* Giao diện: Sáng / Tối / Hệ thống */}
          <div className="flex flex-col gap-2.5 p-3.5 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-text-primary">Giao Diện</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChangeTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95',
                    theme === value
                      ? 'bg-primary-soft text-primary border-primary/40 shadow-xs'
                      : 'bg-surface-secondary border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ngôn ngữ */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-secondary text-text-muted flex items-center justify-center">
                <Languages className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-text-primary">Ngôn Ngữ</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-surface-secondary text-text-primary">
              Tiếng Việt
            </span>
          </div>

          {/* Đơn vị tiền tệ */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-secondary text-text-muted flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-text-primary">Đơn Vị Tiền Tệ</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-surface-secondary text-text-primary">
              ₫ (VND)
            </span>
          </div>

          {/* Quản lý danh mục */}
          <div
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center justify-between p-3.5 hover:bg-surface-secondary/50 active:bg-surface-secondary cursor-pointer transition-colors border-b border-border/60"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                <Tags className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">Quản Lý Danh Mục</span>
                <span className="text-[11px] text-text-muted">
                  {categories.length} danh mục (thêm, sửa, ẩn danh mục)
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </div>

          {/* Heatmap chi tiêu */}
          <div className="flex flex-col gap-2.5 p-3.5 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-text-primary">Heatmap Chi Tiêu</span>
            </div>

            <HeatmapThemeSelector
              currentTheme={settings.heatmapTheme || 'forest'}
              onSelectTheme={handleChangeHeatmapTheme}
            />
          </div>

          {/* Đặt lại dữ liệu mẫu */}
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-status-danger-soft text-status-danger flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-text-primary truncate">Đặt Lại Dữ Liệu Mẫu</span>
                <span className="text-[11px] text-text-muted truncate">
                  Xóa dữ liệu hiện tại và nạp lại demo ban đầu
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-status-danger-soft text-status-danger text-xs font-bold hover:bg-status-danger hover:text-white active:scale-95 transition-all shrink-0"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* 4. DỮ LIỆU */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
          Dữ Liệu
        </span>

        <div className="flex flex-col rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft overflow-hidden">
          {/* Xuất dữ liệu JSON */}
          <div
            onClick={handleExportJSON}
            className="flex items-center justify-between p-3.5 hover:bg-surface-secondary/50 active:bg-surface-secondary cursor-pointer transition-colors border-b border-border/60"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-secondary text-text-primary flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">Xuất Dữ Liệu Dự Phòng (JSON)</span>
                <span className="text-[11px] text-text-muted">Tải về toàn bộ số liệu để lưu trữ</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </div>

          {/* Nhập dữ liệu JSON */}
          <div
            onClick={handleTriggerImport}
            className="flex items-center justify-between p-3.5 hover:bg-surface-secondary/50 active:bg-surface-secondary cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-secondary text-text-primary flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">Nhập Dữ Liệu Từ Tệp (JSON)</span>
                <span className="text-[11px] text-text-muted">Khôi phục dữ liệu từ tệp sao lưu</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </div>
        </div>

        {/* Input file ẩn phục vụ chọn file import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />
      </div>

      {/* 8. About Mooney & Footer */}
      <div className="flex flex-col items-center justify-center p-4 text-center text-text-muted">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary mb-1">
          <span>Mooney Personal Finance</span>
          <span>•</span>
          <span>Phiên bản 1.0.0</span>
        </div>
        <p className="text-[11px] flex items-center gap-1 text-text-muted">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-status-danger fill-status-danger" />
          <span>calm & simplicity</span>
        </p>
      </div>

      {/* Modals & Sheets */}
      <StartingBalanceModal
        isOpen={isStartingBalanceOpen}
        onClose={() => setIsStartingBalanceOpen(false)}
        currentStartingBalance={settings.startingBalance}
        onSave={handleSaveStartingBalance}
      />

      <CategoryManagerSheet
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAddCategory={async (input) => {
          const created = await addCategory(input);
          success(`Đã tạo danh mục "${created.name}"`);
          return created;
        }}
        onUpdateCategory={async (id, input) => {
          const updated = await updateCategory(id, input);
          success(`Đã cập nhật danh mục "${updated.name}"`);
          return updated;
        }}
      />

      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Xác nhận đặt lại dữ liệu"
        description="Thao tác này sẽ xóa toàn bộ giao dịch, hóa đơn và danh mục tùy chỉnh của bạn trên thiết bị này, và khôi phục lại dữ liệu mẫu gốc của Mooney. Bạn có chắc chắn muốn thực hiện không?"
        confirmText={isResetting ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
        cancelText="Hủy"
        isDestructive={true}
        onConfirm={handleConfirmReset}
      />

      {/* Auth Modal (Đăng nhập / Đăng ký) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={async () => {
          await triggerSync();
        }}
      />
    </div>
  );
}
