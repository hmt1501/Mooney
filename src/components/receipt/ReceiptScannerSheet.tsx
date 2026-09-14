'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImagePlus, RotateCcw, ScanLine, ShieldCheck, WifiOff } from 'lucide-react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Mascot } from '@/components/common/Mascot';
import { useToast } from '@/components/common/ToastContext';
import { useMooneyData } from '@/hooks/useMooneyData';
import { ReceiptCamera } from './ReceiptCamera';
import { ExpenseReviewForm, ExpenseReviewValues } from '@/components/transaction/ExpenseReviewForm';
import { FlowStateView, FlowStateAction } from '@/components/common/FlowStateView';
import { ExtractedField, ReceiptErrorCode, ReceiptExtraction } from '@/types/receipt';
import { ExpenseDraft } from '@/types/expenseDraft';
import { ReceiptError } from '@/lib/receipt/receiptError';
import { prepareReceiptImage, PreparedReceiptImage } from '@/lib/receipt/imageProcessing';
import { OcrPhase, recognizeReceiptText, releaseOcrEngine, warmUpOcrEngine } from '@/lib/receipt/ocrEngine';
import { extractReceipt } from '@/lib/receipt/extractReceipt';
import { buildReceiptTransactionId, createScanSessionId } from '@/lib/receipt/receiptTransactionId';
import { getActiveStorageScope } from '@/lib/repository/localRepository';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateDMY, toDateString } from '@/lib/utils/date';

type Step =
  | { kind: 'intro' }
  | { kind: 'camera' }
  | { kind: 'processing'; phase: 'preparing' | OcrPhase; progress: number }
  | { kind: 'blurry'; reason: 'blurry' | 'small' }
  | { kind: 'error'; code: ReceiptErrorCode }
  | { kind: 'review'; extraction: ReceiptExtraction | null };

interface ReceiptScannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAMERA_ERRORS: ReceiptErrorCode[] = ['camera_denied', 'camera_not_found', 'camera_unsupported'];

/** Ảnh mờ: không tin bất kỳ trường nào, mọi giá trị đều cần xác nhận */
function downgradeConfidence(extraction: ReceiptExtraction): ReceiptExtraction {
  const soften = <T,>(field: ExtractedField<T>): ExtractedField<T> =>
    field.confidence === 'high' ? { ...field, confidence: 'low' } : field;
  return {
    ...extraction,
    amount: soften(extraction.amount),
    date: soften(extraction.date),
    merchant: soften(extraction.merchant),
  };
}

export function ReceiptScannerSheet({ isOpen, onClose }: ReceiptScannerSheetProps) {
  const { categories, transactions, addTransaction } = useMooneyData();
  const { success } = useToast();

  const [step, setStep] = useState<Step>({ kind: 'intro' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reviewKey, setReviewKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const preparedRef = useRef<PreparedReceiptImage | null>(null);
  const sessionIdRef = useRef<string>('');
  const runIdRef = useRef(0);
  const submittingRef = useRef(false);
  const cameraErrorRef = useRef<ReceiptErrorCode>('camera_unsupported');

  const replacePreview = useCallback((blob: Blob | null) => {
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return blob ? URL.createObjectURL(blob) : null;
    });
  }, []);

  // Mở: phiên quét mới + chọn bước đầu tiên theo quyền camera hiện có
  useEffect(() => {
    if (!isOpen) return;
    sessionIdRef.current = createScanSessionId();
    setSaveError(null);

    const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
    if (!supported) {
      cameraErrorRef.current = 'camera_unsupported';
      setCameraAvailable(false);
      setStep({ kind: 'error', code: 'camera_unsupported' });
      return;
    }

    let cancelled = false;
    setCameraAvailable(true);
    setStep({ kind: 'intro' });
    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        if (status.state === 'granted') setStep({ kind: 'camera' });
        // 'denied' vẫn hiện màn giới thiệu: người dùng có thể đã bật lại quyền và muốn thử
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Đóng: dọn ảnh, bộ nhận dạng, trạng thái. Ảnh không được giữ lại ở bất kỳ đâu.
  const handleClose = useCallback(() => {
    runIdRef.current++;
    preparedRef.current = null;
    replacePreview(null);
    releaseOcrEngine();
    setStep({ kind: 'intro' });
    setIsSaving(false);
    onClose();
  }, [onClose, replacePreview]);

  useEffect(() => () => {
    preparedRef.current = null;
    releaseOcrEngine();
  }, []);

  const runOcr = useCallback(async (prepared: PreparedReceiptImage, treatAsBlurry: boolean) => {
    const runId = ++runIdRef.current;
    setStep({ kind: 'processing', phase: 'loading', progress: 0 });
    try {
      const lines = await recognizeReceiptText(prepared.canvas, (phase, progress) => {
        if (runIdRef.current === runId) setStep({ kind: 'processing', phase, progress });
      });
      if (runIdRef.current !== runId) return;

      const extraction = extractReceipt(lines, { today: toDateString(new Date()) });
      // Chữ đọc được quá ít và quá mờ: đừng đưa người dùng vào màn kiểm tra toàn ô trống
      if (extraction.amount.confidence === 'none' && extraction.averageConfidence < 50) {
        setStep({ kind: 'error', code: 'low_quality' });
        return;
      }
      if (!extraction.hasText) {
        setStep({ kind: 'error', code: 'no_text' });
        return;
      }
      setReviewKey((key) => key + 1);
      setStep({ kind: 'review', extraction: treatAsBlurry ? downgradeConfidence(extraction) : extraction });
    } catch (error) {
      if (runIdRef.current !== runId) return;
      const code = error instanceof ReceiptError ? error.code : 'ocr_failed';
      setStep({ kind: 'error', code });
    }
  }, []);

  const handleImage = useCallback(
    async (blob: Blob) => {
      const runId = ++runIdRef.current;
      replacePreview(blob);
      setSaveError(null);
      setStep({ kind: 'processing', phase: 'preparing', progress: 0 });
      try {
        const prepared = await prepareReceiptImage(blob);
        if (runIdRef.current !== runId) return;
        preparedRef.current = prepared;
        if (prepared.isBlurry || prepared.isLowResolution) {
          setStep({ kind: 'blurry', reason: prepared.isLowResolution ? 'small' : 'blurry' });
          return;
        }
        await runOcr(prepared, false);
      } catch (error) {
        if (runIdRef.current !== runId) return;
        setStep({ kind: 'error', code: error instanceof ReceiptError ? error.code : 'unreadable_image' });
      }
    },
    [replacePreview, runOcr]
  );

  const pickFile = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // cho phép chọn lại cùng một ảnh
    if (file) handleImage(file);
  };

  const openCamera = () => {
    warmUpOcrEngine();
    setStep({ kind: 'camera' });
  };

  const retake = () => {
    runIdRef.current++;
    preparedRef.current = null;
    if (cameraAvailable) {
      openCamera();
    } else {
      // Không có camera: về màn chọn ảnh (không kẹt ở bước cũ nếu người dùng hủy hộp chọn ảnh)
      setStep({ kind: 'error', code: cameraErrorRef.current });
      pickFile();
    }
  };

  const openManualEntry = () => {
    runIdRef.current++;
    preparedRef.current = null;
    replacePreview(null);
    setReviewKey((key) => key + 1);
    setStep({ kind: 'review', extraction: null });
  };

  const handleCameraError = (code: ReceiptErrorCode) => {
    if (CAMERA_ERRORS.includes(code)) {
      cameraErrorRef.current = code;
      setCameraAvailable(false);
    }
    setStep({ kind: 'error', code });
  };

  const extraction = step.kind === 'review' ? step.extraction : null;
  const transactionId = buildReceiptTransactionId({
    ownerScope: getActiveStorageScope(),
    reference: extraction?.reference.value ?? null,
    sessionId: sessionIdRef.current,
  });
  const existingTransaction = step.kind === 'review' ? transactions.find((tx) => tx.id === transactionId) ?? null : null;

  const handleSubmit = async (values: ExpenseReviewValues) => {
    // Chặn bấm liên tiếp; kể cả khi lọt qua, id cố định đảm bảo chỉ có một giao dịch
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
      console.error('[ReceiptScanner] Lưu khoản chi thất bại:', error);
      setSaveError('Chưa lưu được khoản chi. Bạn thử lại nhé, Mooney sẽ không ghi trùng.');
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  const retakeAction: FlowStateAction = cameraAvailable
    ? { label: 'Chụp lại', onClick: retake, icon: Camera }
    : { label: 'Chọn ảnh khác', onClick: pickFile, icon: ImagePlus };
  const pickAction: FlowStateAction = { label: 'Chọn ảnh có sẵn', onClick: pickFile, icon: ImagePlus };

  const renderError = (code: ReceiptErrorCode) => {
    const retryOcr: FlowStateAction | undefined = preparedRef.current
      ? { label: 'Thử đọc lại', onClick: () => preparedRef.current && runOcr(preparedRef.current, preparedRef.current.isBlurry || preparedRef.current.isLowResolution), icon: RotateCcw }
      : undefined;

    const views: Record<ReceiptErrorCode, React.ComponentProps<typeof FlowStateView>> = {
      camera_denied: {
        mood: 'warning',
        title: 'Mooney chưa được dùng camera',
        description: 'Bạn vẫn có thể chọn ảnh chụp màn hình biên lai có sẵn. Muốn chụp trực tiếp, hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.',
        primary: pickAction,
        secondary: { label: 'Thử lại quyền camera', onClick: () => { setCameraAvailable(true); openCamera(); }, icon: Camera },
      },
      camera_not_found: {
        mood: 'normal',
        title: 'Không tìm thấy camera',
        description: 'Thiết bị này không có camera dùng được. Bạn chọn ảnh biên lai có sẵn nhé.',
        primary: pickAction,
      },
      camera_unsupported: {
        mood: 'normal',
        title: 'Trình duyệt chưa mở được camera',
        description: 'Bạn có thể chọn ảnh chụp màn hình biên lai chuyển khoản từ thư viện ảnh.',
        primary: pickAction,
      },
      camera_busy: {
        mood: 'warning',
        title: 'Camera đang bận',
        description: 'Có thể một ứng dụng khác đang dùng camera. Bạn đóng ứng dụng đó rồi thử lại, hoặc chọn ảnh có sẵn.',
        primary: { label: 'Thử lại', onClick: openCamera, icon: RotateCcw },
        secondary: pickAction,
      },
      unreadable_image: {
        mood: 'warning',
        title: 'Không mở được ảnh này',
        description: 'Ảnh có thể bị hỏng hoặc định dạng chưa hỗ trợ. Bạn thử ảnh khác, hoặc chụp màn hình biên lai rồi chọn lại nhé.',
        primary: { label: 'Chọn ảnh khác', onClick: pickFile, icon: ImagePlus },
        secondary: cameraAvailable ? { label: 'Chụp bằng camera', onClick: openCamera, icon: Camera } : undefined,
      },
      image_too_large: {
        mood: 'warning',
        title: 'Ảnh quá lớn',
        description: 'Ảnh vượt quá 20 MB. Bạn chụp màn hình biên lai hoặc chọn ảnh nhỏ hơn nhé.',
        primary: { label: 'Chọn ảnh khác', onClick: pickFile, icon: ImagePlus },
      },
      network: {
        mood: 'warning',
        title: 'Chưa tải được bộ đọc hóa đơn',
        description: 'Lần đầu dùng, Mooney cần mạng để tải bộ đọc chữ tiếng Việt. Ảnh của bạn không được gửi đi đâu cả.',
        primary: retryOcr ?? retakeAction,
      },
      ocr_failed: {
        mood: 'warning',
        title: 'Chưa đọc được hóa đơn',
        description: 'Đã có trục trặc khi đọc ảnh. Bạn thử lại, hoặc chụp lại cho rõ hơn nhé.',
        primary: retryOcr ?? retakeAction,
        secondary: retryOcr ? retakeAction : undefined,
      },
      low_quality: {
        mood: 'warning',
        title: 'Ảnh chưa đủ rõ để đọc',
        description: 'Mooney chỉ đọc được vài chữ mờ. Bạn dùng ảnh chụp màn hình gốc (ảnh gửi qua chat thường bị nén), hoặc chụp gần và rõ hơn nhé.',
        primary: retakeAction,
        secondary: cameraAvailable ? pickAction : undefined,
      },
      no_text: {
        mood: 'normal',
        title: 'Không thấy chữ trong ảnh',
        description: 'Hãy chụp gần hơn, đủ sáng và để biên lai nằm thẳng trong khung.',
        primary: retakeAction,
        secondary: cameraAvailable ? pickAction : undefined,
      },
    };

    return (
      <FlowStateView {...views[code]} onManualEntry={openManualEntry}>
        {code === 'network' ? (
          <StateIcon icon={WifiOff} />
        ) : CAMERA_ERRORS.includes(code) || code === 'camera_busy' ? (
          <StateIcon icon={CameraOff} />
        ) : undefined}
      </FlowStateView>
    );
  };

  const titles: Record<Step['kind'], string> = {
    intro: 'Chụp hóa đơn',
    camera: 'Chụp hóa đơn',
    processing: 'Đang đọc hóa đơn',
    blurry: step.kind === 'blurry' && step.reason === 'small' ? 'Ảnh hơi nhỏ' : 'Ảnh hơi mờ',
    error: 'Chụp hóa đơn',
    review: extraction ? 'Kiểm tra khoản chi' : 'Ghi khoản chi',
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={titles[step.kind]} className="max-h-[92vh]">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="receipt-file-input" />

      {step.kind === 'intro' && (
        <FlowStateView
          title="Chụp biên lai chuyển khoản"
          description="Mooney sẽ đọc số tiền, ngày và người nhận để bạn kiểm tra rồi thêm khoản chi. Trình duyệt sẽ hỏi quyền dùng camera. Ảnh chỉ được đọc trên máy này và không được lưu."
          primary={{ label: 'Mở camera', onClick: openCamera, icon: Camera }}
          secondary={pickAction}
          onManualEntry={openManualEntry}
        >
          <StateIcon icon={ScanLine} />
        </FlowStateView>
      )}

      {step.kind === 'camera' && <ReceiptCamera onCapture={handleImage} onError={handleCameraError} onPickFile={pickFile} />}

      {step.kind === 'processing' && (
        <ProcessingView previewUrl={previewUrl} phase={step.phase} progress={step.progress} onCancel={retake} cancelLabel={cameraAvailable ? 'Chụp lại' : 'Chọn ảnh khác'} />
      )}

      {step.kind === 'blurry' && (
        <FlowStateView
          mood="warning"
          title={step.reason === 'small' ? 'Ảnh hơi nhỏ' : 'Ảnh hơi mờ'}
          description={
            step.reason === 'small'
              ? 'Ảnh có độ phân giải thấp nên chữ dễ bị đọc sai. Bạn dùng ảnh chụp màn hình gốc hoặc chụp lại gần hơn nhé.'
              : 'Chữ mờ dễ bị đọc sai số tiền. Bạn chụp lại gần hơn, giữ máy chắc tay nhé.'
          }
          primary={retakeAction}
          secondary={{ label: 'Vẫn đọc thử', onClick: () => preparedRef.current && runOcr(preparedRef.current, true), icon: ScanLine }}
          onManualEntry={openManualEntry}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Ảnh vừa chụp" className="w-28 h-36 object-cover rounded-2xl border border-border shadow-soft blur-[0.5px]" />
          ) : undefined}
        </FlowStateView>
      )}

      {step.kind === 'error' && renderError(step.code)}

      {step.kind === 'review' && (
        <ExpenseReviewForm
          key={reviewKey}
          draft={step.extraction ? receiptToDraft(step.extraction) : null}
          categories={categories}
          banner={<ReceiptBanner previewUrl={previewUrl} />}
          sourceBadge="Đọc từ ảnh"
          noteLabel="Người nhận / Cửa hàng"
          notePlaceholder="Ví dụ: Quán cơm Tấm, Nguyễn Văn A..."
          existingTransaction={existingTransaction}
          existingTitle="Hóa đơn này đã được thêm rồi"
          isSaving={isSaving}
          saveError={saveError}
          retakeLabel={step.extraction ? (cameraAvailable ? 'Chụp lại' : 'Ảnh khác') : 'Quét ảnh'}
          onRetake={retake}
          onSubmit={handleSubmit}
        />
      )}
    </BottomSheet>
  );
}

function StateIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-soft text-primary">
      <Icon className="w-7 h-7 stroke-[1.8]" />
    </div>
  );
}

function ProcessingView({
  previewUrl,
  phase,
  progress,
  onCancel,
  cancelLabel,
}: {
  previewUrl: string | null;
  phase: 'preparing' | OcrPhase;
  progress: number;
  onCancel: () => void;
  cancelLabel: string;
}) {
  const label =
    phase === 'preparing' ? 'Đang chuẩn bị ảnh...' : phase === 'loading' ? 'Đang chuẩn bị bộ đọc chữ...' : 'Đang đọc số tiền, ngày, người nhận...';
  const percent = phase === 'reading' ? Math.round(40 + progress * 60) : phase === 'loading' ? Math.round(5 + progress * 35) : 3;

  return (
    <div className="flex flex-col items-center gap-5 py-2" role="status" aria-live="polite">
      <div className="relative w-40 h-52 rounded-3xl overflow-hidden border border-border bg-surface-secondary shadow-soft">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Ảnh hóa đơn đang được đọc" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}
        <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-[receipt-scan_1.8s_ease-in-out_infinite]" />
      </div>

      <div className="flex items-center gap-3">
        <Mascot mood="normal" size={40} />
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-text-primary">{label}</span>
          <span className="text-[11px] text-text-muted">Ảnh chỉ được đọc trên máy này</span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden" aria-label={`Tiến độ ${percent}%`}>
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>

      <button type="button" onClick={onCancel} className="text-xs font-bold text-text-secondary hover:text-text-primary">
        {cancelLabel}
      </button>
    </div>
  );
}

function receiptToDraft(extraction: ReceiptExtraction): ExpenseDraft {
  return { amount: extraction.amount, date: extraction.date, note: extraction.merchant };
}

function ReceiptBanner({ previewUrl }: { previewUrl: string | null }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-3xl bg-primary-soft/60 border border-primary/10">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Ảnh hóa đơn vừa chụp" className="w-12 h-16 rounded-xl object-cover border border-border bg-surface" />
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-extrabold text-text-primary">Kiểm tra lại giúp Mooney nhé</span>
        <span className="text-[11px] text-text-secondary leading-snug">
          Mooney tự đọc nên có thể nhầm. Bạn sửa được từng mục trước khi thêm.
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
          <ShieldCheck className="w-3 h-3" />
          Ảnh chỉ đọc trên máy này và không được lưu
        </span>
      </div>
    </div>
  );
}
