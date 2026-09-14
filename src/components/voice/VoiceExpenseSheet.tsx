'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Mic, MicOff, RotateCcw, WifiOff } from 'lucide-react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { FlowStateView, FlowStateAction } from '@/components/common/FlowStateView';
import { useToast } from '@/components/common/ToastContext';
import { ExpenseReviewForm, ExpenseReviewValues } from '@/components/transaction/ExpenseReviewForm';
import { useMooneyData } from '@/hooks/useMooneyData';
import { ExpenseDraft, VoiceErrorCode } from '@/types/expenseDraft';
import { Transaction } from '@/types/transaction';
import { interpretRecognition } from '@/lib/voice/interpretRecognition';
import { parseVoiceExpense } from '@/lib/voice/parseVoiceExpense';
import { isSpeechRecognitionSupported, ListeningSession, startListening } from '@/lib/voice/speechRecognition';
import { createScanSessionId } from '@/lib/receipt/receiptTransactionId';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY, toDateString } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

type Step =
  | { kind: 'listening'; interim: string; heard: boolean }
  | { kind: 'typing'; notice: 'unsupported' | null }
  | { kind: 'error'; code: VoiceErrorCode; transcript?: string }
  | { kind: 'review'; draft: ExpenseDraft | null; transcript: string | null };

interface VoiceExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLES = ['Ăn sáng 35 nghìn', 'Grab 80 nghìn hôm nay', 'Mua cà phê 45k'];
const SIMILAR_WINDOW_MS = 10 * 60 * 1000;

/** Khoản chi giống hệt vừa được thêm gần đây (người dùng có thể đã nói lại cùng một câu) */
function findSimilarRecent(transactions: Transaction[], draft: ExpenseDraft | null): Transaction | null {
  if (!draft?.amount.value || !draft.date.value) return null;
  const note = (draft.note.value ?? '').trim().toLocaleLowerCase('vi');
  const now = Date.now();
  return (
    transactions.find(
      (tx) =>
        tx.type === 'expense' &&
        tx.amount === draft.amount.value &&
        tx.date === draft.date.value &&
        (tx.note ?? '').trim().toLocaleLowerCase('vi') === note &&
        now - new Date(tx.createdAt).getTime() < SIMILAR_WINDOW_MS
    ) ?? null
  );
}

export function VoiceExpenseSheet({ isOpen, onClose }: VoiceExpenseSheetProps) {
  const { categories, transactions, addTransaction } = useMooneyData();
  const { success } = useToast();

  const [step, setStep] = useState<Step>({ kind: 'listening', interim: '', heard: false });
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const [supported, setSupported] = useState(true);

  const sessionRef = useRef<ListeningSession | null>(null);
  const sessionIdRef = useRef('');
  const submittingRef = useRef(false);

  const stopSession = () => {
    sessionRef.current?.cancel();
    sessionRef.current = null;
  };

  const showReview = useCallback((draft: ExpenseDraft | null, transcript: string | null) => {
    setReviewKey((key) => key + 1);
    setSaveError(null);
    setStep({ kind: 'review', draft, transcript });
  }, []);

  const listen = useCallback(() => {
    stopSession();
    setStep({ kind: 'listening', interim: '', heard: false });
    const session = startListening({
      onSpeechStart: () => setStep((current) => (current.kind === 'listening' ? { ...current, heard: true } : current)),
      onInterim: (text) => setStep((current) => (current.kind === 'listening' ? { ...current, interim: text, heard: true } : current)),
      onResult: ({ alternatives }) => {
        sessionRef.current = null;
        const { transcript, draft } = interpretRecognition(alternatives, toDateString(new Date()));
        if (!draft.understood) {
          setStep({ kind: 'error', code: 'not_understood', transcript });
          return;
        }
        showReview(draft, transcript);
      },
      onError: (code) => {
        sessionRef.current = null;
        if (code === 'unsupported') {
          setSupported(false);
          setStep({ kind: 'typing', notice: 'unsupported' });
          return;
        }
        setStep({ kind: 'error', code });
      },
    });
    sessionRef.current = session;
  }, [showReview]);

  // Mở: phiên mới, nghe ngay (ít bước nhất). Không hỗ trợ -> gõ câu thay thế.
  useEffect(() => {
    if (!isOpen) return;
    sessionIdRef.current = createScanSessionId();
    setTyped('');
    setTypedError(null);
    setSaveError(null);

    if (!isSpeechRecognitionSupported()) {
      setSupported(false);
      setStep({ kind: 'typing', notice: 'unsupported' });
      return;
    }
    setSupported(true);

    let cancelled = false;
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    const begin = () => {
      if (!cancelled) listen();
    };
    if (permissions?.query) {
      permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (cancelled) return;
          if (status.state === 'denied') setStep({ kind: 'error', code: 'mic_denied' });
          else begin();
        })
        .catch(begin);
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      stopSession();
    };
  }, [isOpen, listen]);

  const handleClose = () => {
    stopSession();
    setIsSaving(false);
    setStep({ kind: 'listening', interim: '', heard: false });
    onClose();
  };

  const openTyping = () => {
    stopSession();
    setTypedError(null);
    setStep({ kind: 'typing', notice: supported ? null : 'unsupported' });
  };

  const openManual = () => {
    stopSession();
    showReview(null, null);
  };

  const submitTyped = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = typed.trim();
    if (!text) {
      setTypedError('Bạn gõ câu mô tả khoản chi nhé, ví dụ "Ăn sáng 35 nghìn"');
      return;
    }
    const draft = parseVoiceExpense(text, { today: toDateString(new Date()) });
    if (!draft.understood) {
      setTypedError('Mooney chưa hiểu câu này. Bạn thử ghi rõ nội dung và số tiền nhé.');
      return;
    }
    showReview(draft, text);
  };

  const transactionId = `tx-voice-${sessionIdRef.current}`;
  const existingTransaction = step.kind === 'review' ? transactions.find((tx) => tx.id === transactionId) ?? null : null;
  const similarRecent = step.kind === 'review' && !existingTransaction ? findSimilarRecent(transactions, step.draft) : null;

  const handleSubmit = async (values: ExpenseReviewValues) => {
    // Chặn chạm liên tiếp; nếu vẫn lọt, id theo phiên đảm bảo chỉ có một giao dịch
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await addTransaction(
        { type: 'expense', amount: values.amount, categoryId: values.categoryId, date: values.date, note: values.note },
        { id: transactionId }
      );
      success(`Đã thêm khoản chi ${formatCurrency(created.amount)} ngày ${formatDateDMY(created.date)}`);
      handleClose();
    } catch (error) {
      console.error('[VoiceExpense] Lưu khoản chi thất bại:', error);
      setSaveError('Chưa lưu được khoản chi. Bạn thử lại nhé, Mooney sẽ không ghi trùng.');
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  const retryAction: FlowStateAction = { label: 'Nói lại', onClick: listen, icon: Mic };
  const typeAction: FlowStateAction = { label: 'Gõ câu thay vì nói', onClick: openTyping, icon: Keyboard };

  const renderError = (code: VoiceErrorCode, transcript?: string) => {
    const views: Record<Exclude<VoiceErrorCode, 'unsupported'>, React.ComponentProps<typeof FlowStateView>> = {
      mic_denied: {
        mood: 'warning',
        title: 'Mooney chưa được dùng micro',
        description: 'Bạn có thể gõ câu mô tả khoản chi thay vì nói. Muốn nói, hãy cho phép micro trong cài đặt trình duyệt rồi thử lại.',
        primary: typeAction,
        secondary: { label: 'Thử lại quyền micro', onClick: listen, icon: RotateCcw },
      },
      mic_not_found: {
        mood: 'normal',
        title: 'Không tìm thấy micro',
        description: 'Thiết bị này chưa có micro dùng được. Bạn gõ câu mô tả khoản chi nhé.',
        primary: typeAction,
        secondary: retryAction,
      },
      network: {
        mood: 'warning',
        title: 'Cần mạng để nghe giọng nói',
        description: 'Trình duyệt cần kết nối mạng để chuyển giọng nói thành chữ. Bạn thử lại hoặc gõ câu thay thế nhé.',
        primary: retryAction,
        secondary: typeAction,
      },
      no_speech: {
        mood: 'normal',
        title: 'Mooney chưa nghe thấy gì',
        description: 'Bạn nói gần micro hơn một chút, ví dụ: “Ăn sáng 35 nghìn”.',
        primary: retryAction,
        secondary: typeAction,
      },
      recognition_failed: {
        mood: 'warning',
        title: 'Chưa nhận được giọng nói',
        description: 'Đã có trục trặc khi nghe. Bạn thử nói lại hoặc gõ câu thay thế nhé.',
        primary: retryAction,
        secondary: typeAction,
      },
      not_understood: {
        mood: 'normal',
        title: 'Mooney chưa hiểu câu này',
        description: transcript
          ? `Mooney nghe được “${transcript}” nhưng chưa rõ khoản chi. Bạn nói kèm nội dung và số tiền nhé.`
          : 'Bạn nói kèm nội dung và số tiền nhé, ví dụ: “Grab 80 nghìn”.',
        primary: retryAction,
        secondary: typeAction,
      },
    };
    const view = views[code as Exclude<VoiceErrorCode, 'unsupported'>] ?? views.recognition_failed;
    const Icon = code === 'network' ? WifiOff : code === 'mic_denied' || code === 'mic_not_found' ? MicOff : null;

    return (
      <FlowStateView {...view} onManualEntry={openManual}>
        {Icon ? (
          <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-soft text-primary">
            <Icon className="w-7 h-7 stroke-[1.8]" />
          </div>
        ) : undefined}
      </FlowStateView>
    );
  };

  const titles: Record<Step['kind'], string> = {
    listening: 'Nói khoản chi',
    typing: 'Gõ khoản chi',
    error: 'Nói khoản chi',
    review: step.kind === 'review' && step.draft ? 'Kiểm tra khoản chi' : 'Ghi khoản chi',
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={titles[step.kind]} className="max-h-[92vh]">
      {step.kind === 'listening' && (
        <div className="flex flex-col items-center gap-5 py-2" role="status" aria-live="polite">
          <button
            type="button"
            onClick={() => sessionRef.current?.stop()}
            aria-label="Dừng nghe"
            className="relative flex items-center justify-center w-28 h-28 mt-2"
          >
            <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping" aria-hidden="true" />
            <span className={cn('absolute inset-2 rounded-full bg-primary/20 transition-transform duration-300', step.heard && 'scale-110')} aria-hidden="true" />
            <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-content shadow-floating">
              <Mic className="w-9 h-9" />
            </span>
          </button>

          <div className="flex flex-col items-center gap-1.5 text-center min-h-[72px] px-2">
            <span className="text-base font-extrabold text-text-primary">{step.heard ? 'Đang nghe bạn nói...' : 'Đang nghe...'}</span>
            {step.interim ? (
              <p className="text-lg font-bold text-primary leading-snug" data-testid="voice-interim">
                “{step.interim}”
              </p>
            ) : (
              <p className="text-xs text-text-secondary">Ví dụ: “{EXAMPLES[0]}”, “{EXAMPLES[1]}”</p>
            )}
          </div>

          <div className="flex items-center w-full gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3.5 rounded-2xl bg-surface-secondary border border-border text-sm font-bold text-text-primary active:scale-[0.98] transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => sessionRef.current?.stop()}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-content text-sm font-bold shadow-soft active:scale-[0.98] transition-all"
            >
              Xong
            </button>
          </div>

          <button type="button" onClick={openTyping} className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary">
            <Keyboard className="w-3.5 h-3.5" />
            Gõ câu thay vì nói
          </button>
          <p className="text-[10px] text-text-muted text-center">Trình duyệt chuyển giọng nói thành chữ. Mooney không ghi âm.</p>
        </div>
      )}

      {step.kind === 'typing' && (
        <form onSubmit={submitTyped} className="flex flex-col gap-4 py-1">
          {step.notice === 'unsupported' && (
            <div className="flex items-start gap-3 p-3.5 rounded-3xl bg-surface-secondary border border-border">
              <MicOff className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Trình duyệt này chưa hỗ trợ nhập bằng giọng nói. Bạn gõ câu như khi nói, Mooney vẫn hiểu được nhé.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="voice-typed" className="text-xs font-bold text-text-secondary">
              Mô tả khoản chi
            </label>
            <input
              id="voice-typed"
              type="text"
              autoFocus
              value={typed}
              maxLength={200}
              onChange={(event) => {
                setTyped(event.target.value);
                setTypedError(null);
              }}
              placeholder="Ví dụ: Ăn sáng 35 nghìn"
              className="w-full px-4 py-3 rounded-2xl bg-surface dark:bg-surface-elevated border border-border text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {typedError && (
              <span className="text-[11px] font-bold text-status-warning" role="alert">
                {typedError}
              </span>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setTyped(example);
                    setTypedError(null);
                  }}
                  className="px-2.5 py-1 rounded-full bg-surface-secondary border border-border text-[11px] font-semibold text-text-secondary hover:text-text-primary active:scale-95 transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={listen}
                className="flex items-center gap-1.5 py-3.5 px-4 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-secondary active:scale-95 transition-all"
              >
                <Mic className="w-4 h-4" />
                Nói
              </button>
            )}
            <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-content text-sm font-bold shadow-soft active:scale-[0.98] transition-all">
              Tiếp tục
            </button>
          </div>
          <button type="button" onClick={openManual} className="text-xs font-bold text-text-secondary hover:text-primary">
            Tự nhập khoản chi
          </button>
        </form>
      )}

      {step.kind === 'error' && renderError(step.code, step.transcript)}

      {step.kind === 'review' && (
        <ExpenseReviewForm
          key={reviewKey}
          draft={step.draft}
          categories={categories}
          banner={
            <div className="flex items-start gap-3 p-3 rounded-3xl bg-primary-soft/60 border border-primary/10">
              <span className="flex items-center justify-center w-9 h-9 rounded-2xl bg-surface dark:bg-surface-elevated text-primary shrink-0">
                <Mic className="w-4 h-4" />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-extrabold text-text-primary break-words" data-testid="voice-transcript">
                  “{step.transcript}”
                </span>
                <span className="text-[11px] text-text-secondary">Mooney hiểu như dưới đây. Bạn kiểm tra rồi thêm nhé.</span>
              </div>
            </div>
          }
          sourceBadge="Từ câu nói"
          noteLabel="Ghi chú"
          notePlaceholder="Ví dụ: Ăn sáng, Grab đi làm..."
          existingTransaction={existingTransaction}
          existingTitle="Khoản chi này đã được thêm rồi"
          similarRecent={similarRecent}
          isSaving={isSaving}
          saveError={saveError}
          retakeLabel={supported ? 'Nói lại' : 'Gõ lại'}
          retakeIcon={supported ? Mic : Keyboard}
          onRetake={supported ? listen : openTyping}
          onSubmit={handleSubmit}
        />
      )}
    </BottomSheet>
  );
}
