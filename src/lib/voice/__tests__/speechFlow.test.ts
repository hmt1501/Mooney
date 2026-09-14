import { describe, it, expect, beforeEach, vi } from 'vitest';
import { interpretRecognition } from '../interpretRecognition';
import { classifySpeechError, startListening } from '../speechRecognition';

const TODAY = '2026-09-14';

describe('interpretRecognition', () => {
  it('nghe rõ -> giữ độ chắc chắn', () => {
    const { transcript, draft } = interpretRecognition([{ transcript: 'Ăn sáng 35 nghìn', confidence: 0.92 }], TODAY);
    expect(transcript).toBe('Ăn sáng 35 nghìn');
    expect(draft.amount).toEqual({ value: 35_000, confidence: 'high' });
  });

  it('trình duyệt báo nghe chưa rõ -> số tiền và ngày phải xác nhận', () => {
    const { draft } = interpretRecognition([{ transcript: 'hôm qua ăn phở 45 nghìn', confidence: 0.31 }], TODAY);
    expect(draft.amount.confidence).toBe('low');
    expect(draft.date.confidence).toBe('low');
    expect(draft.amountHint).toContain('nghe chưa rõ');
  });

  it('các cách nghe ra số tiền khác nhau -> hỏi lại, liệt kê các khả năng', () => {
    const { draft } = interpretRecognition(
      [
        { transcript: 'cà phê 35 nghìn', confidence: 0.8 },
        { transcript: 'cà phê 45 nghìn', confidence: 0.5 },
      ],
      TODAY
    );
    expect(draft.amount).toEqual({ value: 35_000, confidence: 'low' });
    expect(draft.amountHint).toBe('Mooney nghe chưa rõ, có thể là 35.000 hoặc 45.000');
  });

  it('độ tin cậy 0 (Safari không cung cấp) không bị coi là nghe kém', () => {
    const { draft } = interpretRecognition([{ transcript: 'Grab 80 nghìn', confidence: 0 }], TODAY);
    expect(draft.amount.confidence).toBe('high');
  });
});

describe('classifySpeechError', () => {
  it.each([
    ['not-allowed', 'mic_denied'],
    ['service-not-allowed', 'mic_denied'],
    ['audio-capture', 'mic_not_found'],
    ['network', 'network'],
    ['no-speech', 'no_speech'],
    ['language-not-supported', 'unsupported'],
    ['something-else', 'recognition_failed'],
  ])('%s -> %s', (error, code) => {
    expect(classifySpeechError(error)).toBe(code);
  });

  it('người dùng hủy không phải lỗi', () => {
    expect(classifySpeechError('aborted')).toBeNull();
  });
});

// --------------------------------------------------------------------------
// SpeechRecognition giả lập
// --------------------------------------------------------------------------
class FakeRecognition {
  static last: FakeRecognition;
  lang = '';
  continuous = true;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  started = false;
  aborted = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
    this.onerror?.({ error: 'aborted' });
    this.onend?.();
  }
  emit(transcript: string, isFinal: boolean, confidence = 0.9) {
    const alternative = { transcript, confidence };
    const result = Object.assign([alternative], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }
}

describe('startListening', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = { webkitSpeechRecognition: FakeRecognition };
  });

  it('cấu hình tiếng Việt, trả chữ tạm thời rồi kết quả cuối', () => {
    const onInterim = vi.fn();
    const onResult = vi.fn();
    const onError = vi.fn();
    startListening({ onInterim, onResult, onError });
    const rec = FakeRecognition.last;
    expect(rec.lang).toBe('vi-VN');
    expect(rec.interimResults).toBe(true);
    expect(rec.started).toBe(true);

    rec.emit('ăn sáng', false);
    rec.emit('ăn sáng 35 nghìn', true);
    rec.onend?.();

    expect(onInterim).toHaveBeenCalledWith('ăn sáng');
    expect(onResult).toHaveBeenCalledWith({ alternatives: [{ transcript: 'ăn sáng 35 nghìn', confidence: 0.9 }] });
    expect(onError).not.toHaveBeenCalled();
  });

  it('kết thúc mà không nghe gì -> no_speech', () => {
    const onError = vi.fn();
    startListening({ onResult: vi.fn(), onError });
    FakeRecognition.last.onend?.();
    expect(onError).toHaveBeenCalledWith('no_speech');
  });

  it('không có kết quả cuối nhưng có chữ tạm (Safari) -> vẫn dùng', () => {
    const onResult = vi.fn();
    startListening({ onResult, onError: vi.fn() });
    FakeRecognition.last.emit('grab 80 nghìn', false);
    FakeRecognition.last.onend?.();
    expect(onResult).toHaveBeenCalledWith({ alternatives: [{ transcript: 'grab 80 nghìn', confidence: 0 }] });
  });

  it('bị từ chối quyền micro -> mic_denied, chỉ báo một lần', () => {
    const onError = vi.fn();
    startListening({ onResult: vi.fn(), onError });
    FakeRecognition.last.onerror?.({ error: 'not-allowed' });
    FakeRecognition.last.onend?.();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('mic_denied');
  });

  it('hủy -> không báo kết quả hay lỗi', () => {
    const onResult = vi.fn();
    const onError = vi.fn();
    const session = startListening({ onResult, onError });
    FakeRecognition.last.emit('ăn sáng 35 nghìn', true);
    session.cancel();
    expect(FakeRecognition.last.aborted).toBe(true);
    expect(onResult).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('trình duyệt không hỗ trợ -> unsupported', async () => {
    (globalThis as unknown as { window: unknown }).window = {};
    const onError = vi.fn();
    startListening({ onResult: vi.fn(), onError });
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith('unsupported');
  });
});
