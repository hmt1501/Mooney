import { ExtractedField } from './receipt';

/**
 * Bản nháp khoản chi do Mooney tự hiểu (từ ảnh hóa đơn hoặc câu nói),
 * luôn phải qua màn kiểm tra và được người dùng xác nhận trước khi thành giao dịch.
 */
export interface ExpenseDraft {
  amount: ExtractedField<number>;
  date: ExtractedField<string>; // 'YYYY-MM-DD'
  /** Người nhận / cửa hàng / mô tả ngắn */
  note: ExtractedField<string>;
  /** Danh mục gợi ý (id danh mục mặc định), chỉ là gợi ý */
  categoryId?: ExtractedField<string>;
  /** Giải thích vì sao số tiền chưa chắc, hiển thị ngay dưới ô số tiền */
  amountHint?: string;
  /** Các cách hiểu số tiền để người dùng chạm chọn khi câu nói mơ hồ (vd. "50" -> 50.000 hay 50.000.000) */
  amountSuggestions?: number[];
  /** Ngày không được nói ra, Mooney mặc định là hôm nay */
  dateIsDefault?: boolean;
}

export type VoiceErrorCode =
  | 'unsupported'
  | 'mic_denied'
  | 'mic_not_found'
  | 'network'
  | 'no_speech'
  | 'recognition_failed'
  | 'not_understood';
