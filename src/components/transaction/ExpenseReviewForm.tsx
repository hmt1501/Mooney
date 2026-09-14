'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, CircleAlert, CopyCheck, FileText, RotateCcw, Sparkles, Tag } from 'lucide-react';
import { CategorySelector } from '@/components/transaction/CategorySelector';
import { Category } from '@/types/category';
import { Transaction } from '@/types/transaction';
import { ExpenseDraft } from '@/types/expenseDraft';
import { FieldConfidence } from '@/types/receipt';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY, toDateString } from '@/lib/utils/date';
import { validateTransactionInput } from '@/lib/validation/transaction';
import { cn } from '@/lib/utils';

export interface ExpenseReviewValues {
  amount: number;
  date: string;
  categoryId: string;
  note?: string;
}

/**
 * - ok: giá trị chắc chắn hoặc người dùng đã tự nhập/xác nhận
 * - check: Mooney hiểu được nhưng chưa chắc -> bắt buộc xác nhận
 * - missing: chưa có giá trị
 */
type FieldStatus = 'ok' | 'check' | 'missing';

const statusFromConfidence = (confidence: FieldConfidence): FieldStatus =>
  confidence === 'high' ? 'ok' : confidence === 'low' ? 'check' : 'missing';

interface ExpenseReviewFormProps {
  /** null = người dùng tự nhập, không có dữ liệu Mooney tự hiểu */
  draft: ExpenseDraft | null;
  categories: Category[];
  /** Khối giới thiệu nguồn dữ liệu (ảnh hóa đơn, câu nói) */
  banner?: React.ReactNode;
  /** Nhãn cho giá trị Mooney tự điền, vd. "Đọc từ ảnh", "Từ câu nói" */
  sourceBadge: string;
  noteLabel: string;
  notePlaceholder: string;
  /** Giao dịch có cùng khóa idempotency đã tồn tại -> chặn thêm */
  existingTransaction: Transaction | null;
  existingTitle: string;
  /** Giao dịch rất giống vừa được thêm -> chỉ nhắc, không chặn */
  similarRecent?: Transaction | null;
  isSaving: boolean;
  saveError: string | null;
  retakeLabel: string;
  retakeIcon?: React.ComponentType<{ className?: string }>;
  onRetake: () => void;
  onSubmit: (values: ExpenseReviewValues) => void;
}

function activeExpenseCategories(categories: Category[]) {
  return categories.filter((c) => c.type === 'expense' && (c.isActive ?? true));
}

function FieldHint({ status, checkText, missingText, onConfirm }: {
  status: FieldStatus;
  checkText: string;
  missingText: string;
  onConfirm?: () => void;
}) {
  if (status === 'ok') return null;
  return (
    <div className="flex items-center justify-between gap-2 mt-2">
      <span className="flex items-center gap-1 text-[11px] font-bold text-status-warning">
        <CircleAlert className="w-3.5 h-3.5 shrink-0" />
        {status === 'check' ? checkText : missingText}
      </span>
      {status === 'check' && onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface dark:bg-surface-elevated border border-status-warning/40 text-[11px] font-bold text-text-primary active:scale-95 transition-all"
        >
          <Check className="w-3 h-3" />
          Đúng rồi
        </button>
      )}
    </div>
  );
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
      <Sparkles className="w-3 h-3" />
      {label}
    </span>
  );
}

export function ExpenseReviewForm({
  draft,
  categories,
  banner,
  sourceBadge,
  noteLabel,
  notePlaceholder,
  existingTransaction,
  existingTitle,
  similarRecent,
  isSaving,
  saveError,
  retakeLabel,
  retakeIcon: RetakeIcon = RotateCcw,
  onRetake,
  onSubmit,
}: ExpenseReviewFormProps) {
  const isManual = draft === null;
  const expenseCategories = activeExpenseCategories(categories);
  const suggestedCategory =
    draft?.categoryId?.confidence === 'high' ? expenseCategories.find((c) => c.id === draft.categoryId?.value) ?? null : null;

  const [amountStr, setAmountStr] = useState(() => (draft?.amount.value ? String(draft.amount.value) : ''));
  const [amountStatus, setAmountStatus] = useState<FieldStatus>(() => statusFromConfidence(draft?.amount.confidence ?? 'none'));
  const [date, setDate] = useState(() => draft?.date.value ?? '');
  const [dateStatus, setDateStatus] = useState<FieldStatus>(() => statusFromConfidence(draft?.date.confidence ?? 'none'));
  // Ghi chú chưa chắc chắn: chỉ gợi ý, không điền sẵn
  const [note, setNote] = useState(() => (draft?.note.confidence === 'high' ? draft.note.value ?? '' : ''));
  const noteSuggestion = draft?.note.confidence === 'low' ? draft.note.value : null;
  const [categoryId, setCategoryId] = useState(
    () => suggestedCategory?.id ?? (expenseCategories.find((c) => c.id === 'cat-exp-other') ?? expenseCategories[0])?.id ?? ''
  );

  const amount = parseInt(amountStr.replace(/\D/g, '') || '0', 10);
  const todayStr = toDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  const validation = useMemo(
    () => validateTransactionInput({ type: 'expense', amount, categoryId, date, note: note.trim() || undefined }),
    [amount, categoryId, date, note]
  );

  const blockers: string[] = [];
  if (amountStatus === 'missing' || amount <= 0) blockers.push('nhập số tiền');
  else if (amountStatus === 'check') blockers.push('xác nhận số tiền');
  if (dateStatus === 'missing' || !date) blockers.push('chọn ngày');
  else if (dateStatus === 'check') blockers.push('xác nhận ngày');

  const canSubmit = !existingTransaction && !isSaving && blockers.length === 0 && validation.isValid;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ amount, date, categoryId, note: note.trim() || undefined });
  };

  const setAmountDigits = (digits: string) => {
    setAmountStr(digits);
    setAmountStatus(digits ? 'ok' : 'missing');
  };

  const fieldBox = (status: FieldStatus) =>
    cn(
      'rounded-3xl border p-4 transition-colors',
      status === 'ok'
        ? 'bg-surface-secondary border-border/70'
        : 'bg-status-warning-soft/60 border-status-warning/40 dark:bg-status-warning/10'
    );

  const amountSuggestions = amountStatus === 'missing' ? draft?.amountSuggestions ?? [] : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1 select-none" noValidate>
      {!isManual && banner}

      {existingTransaction && (
        <div className="flex items-start gap-3 p-3.5 rounded-3xl bg-surface-secondary border border-border" role="alert">
          <CopyCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-extrabold text-text-primary">{existingTitle}</span>
            <span className="text-[11px] text-text-secondary">
              {formatCurrency(existingTransaction.amount)} • ngày {formatDateDMY(existingTransaction.date)}. Mooney không ghi trùng để số dư luôn đúng.
            </span>
          </div>
        </div>
      )}

      {!existingTransaction && similarRecent && (
        <div className="flex items-start gap-3 p-3.5 rounded-3xl bg-status-warning-soft/50 border border-status-warning/30" role="status">
          <CopyCheck className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-extrabold text-text-primary">Bạn vừa thêm một khoản giống vậy</span>
            <span className="text-[11px] text-text-secondary">
              {formatCurrency(similarRecent.amount)}
              {similarRecent.note ? ` • ${similarRecent.note}` : ''} lúc{' '}
              {new Date(similarRecent.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Nếu đây là khoản khác, bạn cứ thêm nhé.
            </span>
          </div>
        </div>
      )}

      {/* Số tiền */}
      <div className={fieldBox(amountStatus)} aria-invalid={amountStatus !== 'ok'}>
        <div className="flex items-center justify-between">
          <label htmlFor="expense-amount" className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Số tiền
          </label>
          {!isManual && draft?.amount.confidence === 'high' && amountStatus === 'ok' && <SourceBadge label={sourceBadge} />}
        </div>
        <div className="relative flex items-center justify-center mt-1">
          <input
            id="expense-amount"
            type="text"
            inputMode="numeric"
            autoFocus={isManual}
            value={amount > 0 ? amount.toLocaleString('vi-VN') : ''}
            onChange={(event) => setAmountDigits(event.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full text-center text-3xl font-black bg-transparent tracking-tight text-text-primary focus:outline-none placeholder:text-text-muted/30 tabular-nums"
          />
          <span className="absolute right-3 text-base font-bold text-text-muted pointer-events-none">đ</span>
        </div>
        <FieldHint
          status={amountStatus}
          checkText={draft?.amountHint ?? 'Số tiền chưa chắc, bạn xem lại nhé'}
          missingText={isManual ? 'Nhập số tiền đã chi' : draft?.amountHint ?? 'Mooney chưa rõ số tiền, bạn nhập giúp nhé'}
          onConfirm={() => setAmountStatus('ok')}
        />
        {amountSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] text-text-secondary">Ý bạn là:</span>
            {amountSuggestions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmountDigits(String(value))}
                className="px-2.5 py-1 rounded-full bg-surface dark:bg-surface-elevated border border-border text-[11px] font-bold text-text-primary active:scale-95 transition-all tabular-nums"
              >
                {formatCurrency(value)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ngày */}
      <div className={fieldBox(dateStatus)} aria-invalid={dateStatus !== 'ok'}>
        <div className="flex items-center justify-between">
          <label htmlFor="expense-date" className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-text-muted" />
            Ngày
            {date && <span className="font-extrabold text-text-primary tabular-nums">{formatDateDMY(date)}</span>}
          </label>
          <div className="flex items-center gap-1">
            {[{ label: 'Hôm nay', value: todayStr }, { label: 'Hôm qua', value: yesterdayStr }].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setDate(chip.value);
                  setDateStatus('ok');
                }}
                className={cn(
                  'px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all',
                  date === chip.value && dateStatus === 'ok' ? 'bg-primary-soft text-primary' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
        <input
          id="expense-date"
          type="date"
          value={date}
          max={todayStr}
          onChange={(event) => {
            setDate(event.target.value);
            setDateStatus(event.target.value ? 'ok' : 'missing');
          }}
          className="mt-2 w-full px-4 py-2.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {draft?.dateIsDefault && dateStatus === 'ok' && date === todayStr && (
          <p className="mt-1.5 text-[11px] text-text-muted">Bạn không nói ngày nên Mooney để hôm nay.</p>
        )}
        <FieldHint
          status={dateStatus}
          checkText={date ? `Có phải ngày ${formatDateDMY(date)}?` : 'Ngày chưa chắc'}
          missingText="Mooney chưa rõ ngày, bạn chọn giúp nhé"
          onConfirm={() => setDateStatus('ok')}
        />
      </div>

      {/* Ghi chú / người nhận */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="expense-note" className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-text-muted" />
          {noteLabel}
          <span className="font-semibold text-text-muted">(tùy chọn)</span>
        </label>
        <input
          id="expense-note"
          type="text"
          value={note}
          maxLength={200}
          onChange={(event) => setNote(event.target.value)}
          placeholder={notePlaceholder}
          className="w-full px-4 py-2.5 rounded-2xl bg-surface dark:bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {noteSuggestion && !note && (
          <button
            type="button"
            onClick={() => setNote(noteSuggestion)}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-warning-soft/70 border border-status-warning/30 text-[11px] font-bold text-text-primary active:scale-95 transition-all"
          >
            <CircleAlert className="w-3.5 h-3.5 text-status-warning" />
            Có phải &quot;{noteSuggestion}&quot;? Chạm để dùng
          </button>
        )}
      </div>

      {/* Danh mục */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-text-muted" />
            Danh mục
          </span>
          {suggestedCategory && categoryId === suggestedCategory.id && <SourceBadge label="Gợi ý" />}
        </div>
        <CategorySelector categories={categories} selectedCategoryId={categoryId} onSelectCategory={setCategoryId} type="expense" />
      </div>

      {saveError && (
        <p className="text-xs font-bold text-status-danger text-center" role="alert">
          {saveError}
        </p>
      )}

      {/* Hành động: luôn nằm trong tầm tay, không phải cuộn */}
      <div className="sticky bottom-0 -mx-6 -mb-4 px-6 pt-3 pb-4 flex flex-col gap-2 bg-surface dark:bg-surface-elevated border-t border-border/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center gap-1.5 py-3.5 px-4 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
          >
            <RetakeIcon className="w-4 h-4" />
            {retakeLabel}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm shadow-soft bg-primary text-primary-content hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            {existingTransaction ? 'Đã thêm trước đó' : isSaving ? 'Đang thêm...' : `Thêm khoản chi${amount > 0 ? ` ${formatCurrency(amount)}` : ''}`}
          </button>
        </div>
        {!existingTransaction && blockers.length > 0 && (
          <p className="text-[11px] text-text-muted text-center">Bạn {blockers.join(' và ')} để tiếp tục</p>
        )}
      </div>
    </form>
  );
}
