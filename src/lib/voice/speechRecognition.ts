import { VoiceErrorCode } from '@/types/expenseDraft';

/**
 * Lớp bọc mỏng cho Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Trình duyệt tự xin quyền micro và tự chuyển giọng nói thành chữ
 * (Chrome/Edge qua dịch vụ nhận dạng của Google/Microsoft, Safari qua Apple). Mooney không ghi âm.
 */

interface SpeechAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResultLike };
}

interface SpeechErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function classifySpeechError(error: string): VoiceErrorCode | null {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'mic_denied';
    case 'audio-capture':
      return 'mic_not_found';
    case 'network':
      return 'network';
    case 'no-speech':
      return 'no_speech';
    case 'language-not-supported':
    case 'bad-grammar':
      return 'unsupported';
    case 'aborted':
      return null; // do người dùng hủy
    default:
      return 'recognition_failed';
  }
}

export interface RecognitionOutcome {
  /** Các cách nghe khác nhau, tốt nhất đứng đầu */
  alternatives: SpeechAlternativeLike[];
}

export interface ListenCallbacks {
  onSpeechStart?: () => void;
  onInterim?: (text: string) => void;
  onResult: (outcome: RecognitionOutcome) => void;
  onError: (code: VoiceErrorCode) => void;
}

export interface ListeningSession {
  /** Dừng nghe và dùng những gì đã nghe được */
  stop(): void;
  /** Hủy, bỏ mọi kết quả */
  cancel(): void;
}

/** Tối đa thời gian nghe một câu, tránh micro bị treo mở */
const MAX_LISTEN_MS = 15_000;

export function startListening(callbacks: ListenCallbacks, lang = 'vi-VN'): ListeningSession {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    queueMicrotask(() => callbacks.onError('unsupported'));
    return { stop: () => undefined, cancel: () => undefined };
  }

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  let finished = false;
  let cancelled = false;
  let finalAlternatives: SpeechAlternativeLike[] | null = null;
  let lastInterim = '';

  const finish = (fn: () => void) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    fn();
  };

  const timer = setTimeout(() => {
    try {
      recognition.stop();
    } catch {
      // bỏ qua
    }
  }, MAX_LISTEN_MS);

  recognition.onspeechstart = () => callbacks.onSpeechStart?.();

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const alternatives: SpeechAlternativeLike[] = [];
        for (let j = 0; j < result.length; j++) {
          if (result[j]?.transcript?.trim()) alternatives.push({ transcript: result[j].transcript.trim(), confidence: result[j].confidence ?? 0 });
        }
        if (alternatives.length > 0) finalAlternatives = alternatives;
      } else {
        interim += result[0]?.transcript ?? '';
      }
    }
    if (interim.trim()) {
      lastInterim = interim.trim();
      callbacks.onInterim?.(lastInterim);
    } else if (finalAlternatives) {
      callbacks.onInterim?.(finalAlternatives[0].transcript);
    }
  };

  recognition.onerror = (event) => {
    const code = classifySpeechError(event.error);
    if (code === null || cancelled) return;
    // Đã nghe được chữ thì vẫn dùng, bỏ qua lỗi "không nghe thấy" phát sinh sau đó
    if (code === 'no_speech' && (finalAlternatives || lastInterim)) return;
    finish(() => callbacks.onError(code));
  };

  recognition.onend = () => {
    if (cancelled) return;
    finish(() => {
      if (finalAlternatives) callbacks.onResult({ alternatives: finalAlternatives });
      // Một số trình duyệt (Safari) kết thúc mà không đánh dấu kết quả cuối
      else if (lastInterim) callbacks.onResult({ alternatives: [{ transcript: lastInterim, confidence: 0 }] });
      else callbacks.onError('no_speech');
    });
  };

  try {
    recognition.start();
  } catch {
    queueMicrotask(() => finish(() => callbacks.onError('recognition_failed')));
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // bỏ qua
      }
    },
    cancel: () => {
      cancelled = true;
      finished = true;
      clearTimeout(timer);
      try {
        recognition.abort();
      } catch {
        // bỏ qua
      }
    },
  };
}
