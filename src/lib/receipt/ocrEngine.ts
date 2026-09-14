import type { Worker as TesseractWorker, LoggerMessage, Page } from 'tesseract.js';
import { OcrLine } from '@/types/receipt';
import { ReceiptError } from './receiptError';
import { fuseOcrPasses } from './fuseOcrPasses';

/**
 * Nhận dạng chữ ngay trên trình duyệt bằng Tesseract (không gửi ảnh lên máy chủ nào).
 * Đọc hai lượt song song rồi ghép:
 * - 'vie': nhãn tiếng Việt có dấu
 * - 'eng': chữ số và tên viết hoa không dấu (chính xác hơn rõ rệt trên font của nhiều app ngân hàng)
 * Lần đầu cần tải bộ nhận dạng (trình duyệt lưu đệm cho các lần sau).
 */

export type OcrPhase = 'loading' | 'reading';

type Lang = 'vie' | 'eng';

const ENGINE_LOAD_TIMEOUT_MS = 60_000;
const RECOGNIZE_TIMEOUT_MS = 60_000;

type ProgressListener = (phase: OcrPhase, progress: number) => void;

const workerPromises: Partial<Record<Lang, Promise<TesseractWorker>>> = {};
const progressByLang: Record<Lang, number> = { vie: 0, eng: 0 };
let activeListener: ProgressListener | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => ReceiptError): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function makeLogger(lang: Lang) {
  return (message: LoggerMessage) => {
    if (!activeListener) return;
    const reading = message.status === 'recognizing text';
    progressByLang[lang] = typeof message.progress === 'number' ? message.progress : 0;
    activeListener(reading ? 'reading' : 'loading', (progressByLang.vie + progressByLang.eng) / 2);
  };
}

function getWorker(lang: Lang): Promise<TesseractWorker> {
  const existing = workerPromises[lang];
  if (existing) return existing;

  const loading = (async () => {
    const { createWorker, OEM, PSM } = await import('tesseract.js');
    const worker = await createWorker(lang, OEM.LSTM_ONLY, { logger: makeLogger(lang), errorHandler: () => undefined });
    // Tự phân tích bố cục: chế độ mặc định (một khối) bỏ sót dòng số tiền cỡ chữ lớn đứng riêng
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    return worker;
  })();

  const guarded = withTimeout(loading, ENGINE_LOAD_TIMEOUT_MS, () => new ReceiptError('network')).catch((error) => {
    delete workerPromises[lang];
    loading.then((worker) => worker.terminate()).catch(() => undefined);
    throw error instanceof ReceiptError ? error : new ReceiptError('network', String(error));
  });
  workerPromises[lang] = guarded;
  return guarded;
}

/** Tải trước bộ nhận dạng khi người dùng mở camera, để bước đọc nhanh hơn */
export function warmUpOcrEngine(): void {
  getWorker('vie').catch(() => undefined);
  getWorker('eng').catch(() => undefined);
}

function toLines(page: Page): OcrLine[] {
  const lines: OcrLine[] = [];
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const text = line.text.trim();
        if (text) lines.push({ text, confidence: line.confidence, bbox: { y0: line.bbox.y0, y1: line.bbox.y1 } });
      }
    }
  }
  if (lines.length === 0 && page.text?.trim()) {
    for (const text of page.text.split('\n')) {
      if (text.trim()) lines.push({ text: text.trim(), confidence: page.confidence });
    }
  }
  return lines;
}

async function recognizeWith(lang: Lang, image: HTMLCanvasElement): Promise<OcrLine[]> {
  const worker = await getWorker(lang);
  try {
    const result = await withTimeout(
      worker.recognize(image, {}, { blocks: true, text: true }),
      RECOGNIZE_TIMEOUT_MS,
      () => new ReceiptError('ocr_failed', 'timeout')
    );
    return toLines(result.data);
  } catch (error) {
    // Worker có thể đã hỏng: tạo lại ở lần thử sau
    delete workerPromises[lang];
    worker.terminate().catch(() => undefined);
    throw error instanceof ReceiptError ? error : new ReceiptError('ocr_failed', String(error));
  }
}

export async function recognizeReceiptText(image: HTMLCanvasElement, onProgress?: ProgressListener): Promise<OcrLine[]> {
  activeListener = onProgress ?? null;
  progressByLang.vie = 0;
  progressByLang.eng = 0;
  try {
    onProgress?.('loading', 0);
    const [vie, eng] = await Promise.allSettled([recognizeWith('vie', image), recognizeWith('eng', image)]);

    // Lượt tiếng Việt là bắt buộc; thiếu lượt tiếng Anh vẫn đọc được, chỉ kém chính xác hơn
    if (vie.status === 'rejected') throw vie.reason;
    return eng.status === 'fulfilled' ? fuseOcrPasses(vie.value, eng.value) : vie.value;
  } finally {
    activeListener = null;
  }
}

/** Giải phóng bộ nhớ khi người dùng đóng màn hình quét */
export async function releaseOcrEngine(): Promise<void> {
  const pending = Object.values(workerPromises);
  delete workerPromises.vie;
  delete workerPromises.eng;
  await Promise.all(
    pending.map(async (promise) => {
      try {
        const worker = await promise;
        await worker.terminate();
      } catch {
        // bỏ qua
      }
    })
  );
}
