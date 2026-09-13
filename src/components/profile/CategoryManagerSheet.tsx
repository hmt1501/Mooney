'use client';

import React, { useState } from 'react';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';
import { TransactionType } from '@/types/transaction';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Modal } from '@/components/common/Modal';
import {
  Utensils,
  Bus,
  ShoppingBag,
  Gamepad2,
  Receipt,
  HeartPulse,
  GraduationCap,
  Home,
  MoreHorizontal,
  Banknote,
  Award,
  Laptop,
  TrendingUp,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Check,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryManagerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (input: CreateCategoryInput) => Promise<Category>;
  onUpdateCategory: (id: string, input: UpdateCategoryInput) => Promise<Category>;
}

const AVAILABLE_ICONS: { name: string; component: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Utensils', component: Utensils },
  { name: 'Bus', component: Bus },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Receipt', component: Receipt },
  { name: 'HeartPulse', component: HeartPulse },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'Home', component: Home },
  { name: 'Banknote', component: Banknote },
  { name: 'Award', component: Award },
  { name: 'Laptop', component: Laptop },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'MoreHorizontal', component: MoreHorizontal },
];

const PRESET_COLORS = [
  '#E07A5F',
  '#3D5A80',
  '#EE6C4D',
  '#9B5DE5',
  '#F15BB5',
  '#00BBF9',
  '#00F5D4',
  '#2D6A4F',
  '#52B788',
  '#74C69D',
  '#E76F51',
  '#F4A261',
  '#7F8C8D',
];

export function CategoryManagerSheet({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
}: CategoryManagerSheetProps) {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');

  // State modal thêm / sửa danh mục
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState('#2D6A4F');
  const [type, setType] = useState<TransactionType>('expense');
  const [errorText, setErrorText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setIcon(activeTab === 'expense' ? 'Utensils' : 'Banknote');
    setColor(activeTab === 'expense' ? '#E07A5F' : '#2D6A4F');
    setType(activeTab);
    setErrorText('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setType(cat.type);
    setErrorText('');
    setIsFormModalOpen(true);
  };

  const handleToggleActive = async (cat: Category) => {
    const nextState = cat.isActive === false ? true : false;
    await onUpdateCategory(cat.id, { isActive: nextState });
  };

  const handleSaveForm = async () => {
    if (!name.trim()) {
      setErrorText('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        await onAddCategory({
          name: name.trim(),
          type,
          icon,
          color,
        });
      }
      setIsFormModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Quản Lý Danh Mục">
        <div className="flex flex-col gap-4 pb-4">
          {/* Tabs Chi tiêu / Thu nhập */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-secondary rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className={cn(
                'py-2 px-3 rounded-xl text-xs font-bold transition-all text-center',
                activeTab === 'expense'
                  ? 'bg-surface dark:bg-surface-elevated text-text-primary shadow-xs font-extrabold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Danh mục Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className={cn(
                'py-2 px-3 rounded-xl text-xs font-bold transition-all text-center',
                activeTab === 'income'
                  ? 'bg-surface dark:bg-surface-elevated text-text-primary shadow-xs font-extrabold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Danh mục Thu nhập
            </button>
          </div>

          {/* Nút Thêm Danh Mục Mới */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-primary/50 text-primary hover:bg-primary-soft/50 active:scale-[0.99] transition-all text-xs font-bold"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm danh mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'} mới</span>
          </button>

          {/* Danh sách danh mục */}
          <div className="flex flex-col gap-2">
            {filteredCategories.map((cat) => {
              const IconComp =
                AVAILABLE_ICONS.find((i) => i.name === cat.icon)?.component || MoreHorizontal;
              const isHidden = cat.isActive === false;

              return (
                <div
                  key={cat.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-2xl border transition-all',
                    isHidden
                      ? 'bg-surface-secondary/40 border-border/50 opacity-60'
                      : 'bg-surface dark:bg-surface-elevated border-border/80 shadow-xs'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0"
                      style={{
                        backgroundColor: `${cat.color}18`,
                        color: cat.color,
                      }}
                    >
                      <IconComp className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-text-primary truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-bold text-text-muted">
                        {isHidden ? 'Đã ẩn (không gợi ý nhập mới)' : 'Đang hoạt động'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Nút Sửa */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      title="Chỉnh sửa danh mục"
                      className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Nút Ẩn / Hiện */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      title={isHidden ? 'Hiện lại danh mục' : 'Ẩn danh mục (giữ lịch sử)'}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold active:scale-95 transition-all',
                        isHidden
                          ? 'bg-primary-soft text-primary hover:bg-primary hover:text-white'
                          : 'bg-surface-secondary text-text-muted hover:text-text-primary'
                      )}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Hiện</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ẩn</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lời khuyên an toàn dữ liệu */}
          <div className="p-3 rounded-2xl bg-surface-secondary/70 border border-border/70 text-[11px] text-text-muted leading-relaxed">
            💡 <strong>Bảo toàn dữ liệu lịch sử:</strong> Khi bạn ẩn một danh mục, danh mục đó sẽ không còn xuất hiện khi thêm giao dịch mới. Tất cả các giao dịch trong quá khứ gắn với danh mục này vẫn hiển thị nguyên vẹn trên Lịch và Thống Kê.
          </div>
        </div>
      </BottomSheet>

      {/* Modal Thêm / Chỉnh Sửa Danh Mục */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
        confirmText={isSaving ? 'Đang lưu...' : 'Lưu danh mục'}
        cancelText="Hủy"
        onConfirm={handleSaveForm}
      >
        <div className="flex flex-col gap-4 py-2">
          {/* Tên danh mục */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Tên danh mục <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorText) setErrorText('');
              }}
              placeholder="Ví dụ: Du lịch, Sách vở..."
              maxLength={40}
              className="w-full px-4 py-3 rounded-2xl bg-surface-secondary border border-border text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {errorText && (
              <span className="text-[11px] font-bold text-status-danger px-1">
                {errorText}
              </span>
            )}
          </div>

          {/* Chọn Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Biểu tượng đại diện
            </label>
            <div className="grid grid-cols-6 gap-2 p-2 rounded-2xl bg-surface-secondary border border-border">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.component;
                const isSelected = icon === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={cn(
                      'flex items-center justify-center h-10 rounded-xl transition-all',
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                    )}
                  >
                    <IconComp className="w-5 h-5 stroke-[2]" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Màu Sắc */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">
              Màu nhận diện
            </label>
            <div className="flex items-center flex-wrap gap-2 p-2 rounded-2xl bg-surface-secondary border border-border">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all relative shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
