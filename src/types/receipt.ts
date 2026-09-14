/**
 * Mức độ chắc chắn của một trường đọc từ ảnh hóa đơn.
 * - high: đọc rõ, có nhãn/đơn vị đi kèm -> điền sẵn
 * - low: có giá trị nhưng chưa chắc -> điền sẵn nhưng bắt buộc người dùng xác nhận
 * - none: không đọc được -> để trống, người dùng tự nhập
 */
export type FieldConfidence = 'high' | 'low' | 'none';

export interface ExtractedField<T> {
  value: T | null;
  confidence: FieldConfidence;
}

/** Một dòng chữ OCR cùng độ tin cậy 0-100 */
export interface OcrLine {
  text: string;
  confidence: number;
  /** Vị trí dọc của dòng trên ảnh (px), dùng để ghép các lượt đọc */
  bbox?: { y0: number; y1: number };
  /** Bản đọc của lượt thứ hai (model tiếng Anh), không dấu */
  alt?: string;
  /** Các cụm chữ số mà hai lượt đọc ra khác nhau -> không được coi là chắc chắn */
  uncertainTokens?: string[];
}

export interface ReceiptExtraction {
  amount: ExtractedField<number>;
  date: ExtractedField<string>; // 'YYYY-MM-DD'
  merchant: ExtractedField<string>;
  /** Mã giao dịch / số tham chiếu của ngân hàng, dùng để chống ghi trùng */
  reference: ExtractedField<string>;
  /** Ảnh có chữ đọc được hay không */
  hasText: boolean;
  /** Độ tin cậy trung bình của các dòng chữ (0-100) */
  averageConfidence: number;
}

export type ReceiptErrorCode =
  | 'camera_denied'
  | 'camera_not_found'
  | 'camera_busy'
  | 'camera_unsupported'
  | 'unreadable_image'
  | 'image_too_large'
  | 'network'
  | 'ocr_failed'
  | 'no_text'
  | 'low_quality';
