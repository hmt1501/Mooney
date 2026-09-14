import { ReceiptErrorCode } from '@/types/receipt';

export class ReceiptError extends Error {
  constructor(public readonly code: ReceiptErrorCode, message?: string) {
    super(message || code);
    this.name = 'ReceiptError';
  }
}

/** Phân loại lỗi getUserMedia thành trạng thái thân thiện cho người dùng */
export function classifyCameraError(error: unknown): ReceiptErrorCode {
  const name = error instanceof Error || (typeof DOMException !== 'undefined' && error instanceof DOMException)
    ? (error as Error).name
    : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'camera_denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'camera_not_found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'camera_busy';
    default:
      return 'camera_busy';
  }
}
