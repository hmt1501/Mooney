'use client';

import React, { useState, useRef } from 'react';
import { useMooneyData } from '@/hooks/useMooneyData';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/common/ToastContext';
import { StartingBalanceModal } from '@/components/profile/StartingBalanceModal';
import { HeatmapThemeSelector } from '@/components/profile/HeatmapThemeSelector';
import { CategoryManagerSheet } from '@/components/profile/CategoryManagerSheet';
import { Modal } from '@/components/common/Modal';
import { Mascot } from '@/components/common/Mascot';
import { formatCurrency } from '@/lib/utils/currency';
import { HeatmapTheme } from '@/types/settings';
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
  ShieldCheck,
  ChevronRight,
  Heart,
  Sparkles,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  } = useMooneyData();

  const { theme, setTheme } = useTheme();
  const { success, error, info } = useToast();

  // State modals
  const [isStartingBalanceOpen, setIsStartingBalanceOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Hidden file input cho Import JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      {/* 1. Header Trang */}
      <div className="px-1">
        <h2 className="text-xl font-black text-text-primary tracking-tight">
          Cá Nhân & Cài Đặt
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Quản lý số dư, chủ đề giao diện và dữ liệu ứng dụng
        </p>
      </div>

      {/* 2. Thẻ Tổng Quan Tài Chính: Available Balance & Starting Balance */}
      <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Số Dư Khả Dụng Hiện Tại
          </span>
          <Mascot mood={availableBalance >= 0 ? 'happy' : 'warning'} size={32} />
        </div>


        <div>
          <span className="text-2xl font-black text-text-primary tracking-tight tabular-nums">
            {formatCurrency(availableBalance)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-text-muted">
              Số dư ban đầu xuất phát:
            </span>
            <span className="text-xs font-black text-text-primary tabular-nums mt-0.5">
              {formatCurrency(settings.startingBalance)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsStartingBalanceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-soft text-primary text-xs font-bold hover:bg-primary hover:text-white active:scale-95 transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Sửa số dư</span>
          </button>
        </div>
      </div>

      {/* 3. Mục THIẾT LẬP TIỀN */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
          Thiết Lập Tiền
        </span>

        <div className="flex flex-col rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft overflow-hidden">
          {/* Hàng Số dư ban đầu */}
          <div
            onClick={() => setIsStartingBalanceOpen(true)}
            className="flex items-center justify-between p-3.5 hover:bg-surface-secondary/50 active:bg-surface-secondary cursor-pointer transition-colors border-b border-border/60"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">
                  Số Dư Ban Đầu
                </span>
                <span className="text-[11px] text-text-muted">
                  Mốc khởi điểm tính số dư khả dụng
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-text-primary tabular-nums">
                {formatCurrency(settings.startingBalance)}
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </div>

          {/* Hàng Tiền tệ */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-surface-secondary text-text-muted flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-text-primary">
                  Đơn Vị Tiền Tệ
                </span>
                <span className="text-[11px] text-text-muted">
                  Đồng Việt Nam (VND)
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-surface-secondary text-text-primary">
              ₫ (VND)
            </span>
          </div>
        </div>
      </div>

      {/* 4. Mục GIAO DIỆN & CHỦ ĐỀ */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
          Giao Diện & Hiển Thị
        </span>

        <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-4">
          {/* Chế độ Sáng / Tối / Hệ thống */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-text-primary">
              Chế độ màu giao diện
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleChangeTheme('light')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95',
                  theme === 'light'
                    ? 'bg-primary-soft text-primary border-primary/40 shadow-xs'
                    : 'bg-surface-secondary border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Sun className="w-5 h-5" />
                <span>Sáng</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeTheme('dark')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95',
                  theme === 'dark'
                    ? 'bg-primary-soft text-primary border-primary/40 shadow-xs'
                    : 'bg-surface-secondary border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Moon className="w-5 h-5" />
                <span>Tối</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeTheme('system')}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all active:scale-95',
                  theme === 'system'
                    ? 'bg-primary-soft text-primary border-primary/40 shadow-xs'
                    : 'bg-surface-secondary border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                <Monitor className="w-5 h-5" />
                <span>Hệ thống</span>
              </button>
            </div>
          </div>

          {/* Bảng màu Heatmap chi tiêu Lịch */}
          <div className="flex flex-col gap-2 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-text-primary">
                Bảng màu Heatmap Lịch
              </span>
            </div>

            <HeatmapThemeSelector
              currentTheme={settings.heatmapTheme || 'forest'}
              onSelectTheme={handleChangeHeatmapTheme}
            />
          </div>
        </div>
      </div>

      {/* 5. Mục QUẢN LÝ DỮ LIỆU */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
          Dữ Liệu & Danh Mục
        </span>

        <div className="flex flex-col rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft overflow-hidden">
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
                <span className="text-xs font-bold text-text-primary">
                  Quản Lý Danh Mục
                </span>
                <span className="text-[11px] text-text-muted">
                  {categories.length} danh mục (thêm, sửa, ẩn danh mục)
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-text-muted" />
          </div>

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
                <span className="text-xs font-bold text-text-primary">
                  Xuất Dữ Liệu Dự Phòng (JSON)
                </span>
                <span className="text-[11px] text-text-muted">
                  Tải về toàn bộ số liệu để lưu trữ
                </span>
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
                <span className="text-xs font-bold text-text-primary">
                  Nhập Dữ Liệu Từ Tệp (JSON)
                </span>
                <span className="text-[11px] text-text-muted">
                  Khôi phục dữ liệu từ tệp sao lưu
                </span>
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

      {/* 6. Mục HỆ THỐNG / ĐẶT LẠI DỮ LIỆU */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-status-danger px-1">
          Hệ Thống
        </span>

        <div className="p-3.5 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-status-danger-soft text-status-danger flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-primary truncate">
                Đặt Lại Dữ Liệu Mẫu
              </span>
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

      {/* 7. Thông Báo Phạm Vi Thiết Kế Phase 1 */}
      <div className="p-4 rounded-3xl bg-surface dark:bg-surface-elevated border border-border/80 shadow-soft flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Nguyên Tắc Thiết Kế Mooney V1
          </h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Mooney tôn trọng sự thanh thản trong tâm trí. Ứng dụng không phân tán tài khoản ngân hàng, không phức tạp hóa danh mục ví, và lưu trữ an toàn ngay trên trình duyệt của bạn (Local-first).
        </p>
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
    </div>
  );
}
