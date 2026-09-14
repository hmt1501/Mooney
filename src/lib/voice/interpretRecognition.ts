import { ParsedVoiceExpense, parseVoiceExpense } from './parseVoiceExpense';

export interface RecognitionAlternative {
  transcript: string;
  /** 0..1; một số trình duyệt luôn trả 0 (không có thông tin) */
  confidence: number;
}

export interface VoiceInterpretation {
  transcript: string;
  draft: ParsedVoiceExpense;
}

/** Dưới ngưỡng này trình duyệt tự báo là nghe chưa rõ */
const LOW_SPEECH_CONFIDENCE = 0.5;

/**
 * Chọn cách nghe tốt nhất và hạ độ chắc chắn khi việc nghe có dấu hiệu sai:
 * - trình duyệt báo độ tin cậy thấp
 * - các cách nghe khác nhau ra số tiền khác nhau ("35 nghìn" / "45 nghìn")
 */
export function interpretRecognition(alternatives: RecognitionAlternative[], today: string): VoiceInterpretation {
  const best = alternatives[0] ?? { transcript: '', confidence: 0 };
  const draft = parseVoiceExpense(best.transcript, { today });

  const unsure = best.confidence > 0 && best.confidence < LOW_SPEECH_CONFIDENCE;
  const otherAmounts = alternatives
    .slice(1)
    .map((alternative) => parseVoiceExpense(alternative.transcript, { today }).amount.value)
    .filter((value): value is number => value !== null);
  const amountDisputed = draft.amount.value !== null && otherAmounts.some((value) => value !== draft.amount.value);

  if ((unsure || amountDisputed) && draft.amount.confidence === 'high') {
    draft.amount = { ...draft.amount, confidence: 'low' };
    draft.amountHint = amountDisputed
      ? `Mooney nghe chưa rõ, có thể là ${[draft.amount.value!, ...otherAmounts]
          .filter((value, index, list) => list.indexOf(value) === index)
          .map((value) => value.toLocaleString('vi-VN'))
          .join(' hoặc ')}`
      : 'Mooney nghe chưa rõ số tiền, bạn xem lại nhé';
  }
  if (unsure && draft.date.confidence === 'high' && !draft.dateIsDefault) {
    draft.date = { ...draft.date, confidence: 'low' };
  }

  return { transcript: best.transcript, draft };
}
