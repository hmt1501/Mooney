import { ReceiptError } from './receiptError';

/**
 * Xử lý ảnh hóa đơn ngay trên thiết bị: đọc ảnh, đo độ nét, chuẩn hóa cho OCR.
 * Ảnh không bao giờ rời khỏi trình duyệt và không được lưu lại.
 */

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
/** Dưới ngưỡng này ảnh bị coi là mờ (đo trên phần có chữ của ảnh) */
export const BLUR_THRESHOLD = 60;

/** Cạnh dài dưới ngưỡng này thì chữ trên biên lai quá nhỏ để đọc chính xác */
export const LOW_RESOLUTION_LONG_SIDE = 900;
const OCR_MIN_WIDTH = 1000;
const OCR_MAX_WIDTH = 2000;
const OCR_MAX_PIXELS = 2000 * 3200;
const ANALYSIS_WIDTH = 640;
const TILE_SIZE = 48;

/**
 * Độ nét = phương sai Laplacian, tính theo từng ô rồi lấy phân vị 90%.
 * Lấy theo ô để vùng nền trống (rất phổ biến trên biên lai) không kéo điểm xuống.
 */
export function measureSharpness(gray: ArrayLike<number>, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  const tileScores: number[] = [];

  for (let tileY = 1; tileY < height - 1; tileY += TILE_SIZE) {
    for (let tileX = 1; tileX < width - 1; tileX += TILE_SIZE) {
      let sum = 0;
      let sumSquares = 0;
      let count = 0;
      const maxY = Math.min(tileY + TILE_SIZE, height - 1);
      const maxX = Math.min(tileX + TILE_SIZE, width - 1);
      for (let y = tileY; y < maxY; y++) {
        const row = y * width;
        for (let x = tileX; x < maxX; x++) {
          const i = row + x;
          const laplacian = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
          sum += laplacian;
          sumSquares += laplacian * laplacian;
          count++;
        }
      }
      if (count > 0) {
        const mean = sum / count;
        tileScores.push(sumSquares / count - mean * mean);
      }
    }
  }

  if (tileScores.length === 0) return 0;
  tileScores.sort((a, b) => a - b);
  return tileScores[Math.min(tileScores.length - 1, Math.floor(tileScores.length * 0.9))];
}

export function meanLuminance(gray: ArrayLike<number>): number {
  if (gray.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return sum / gray.length;
}

function toGray(data: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  return gray;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new ReceiptError('unreadable_image');
  return context;
}

async function decodeImage(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Thử lại bằng thẻ <img> (một số trình duyệt không hỗ trợ tùy chọn hoặc định dạng)
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('decode failed'));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PreparedReceiptImage {
  /** Ảnh xám đã chuẩn hóa cho OCR (nền sáng, chữ tối) */
  canvas: HTMLCanvasElement;
  sharpness: number;
  isBlurry: boolean;
  /** Ảnh quá nhỏ (ảnh thu nhỏ, ảnh gửi qua chat bị nén) -> chữ không đủ điểm ảnh để đọc */
  isLowResolution: boolean;
}

/**
 * Kiểm tra, giải mã và chuẩn hóa ảnh cho OCR.
 * Ảnh nền tối (chế độ tối của app ngân hàng) được đảo màu vì OCR đọc chữ tối trên nền sáng tốt hơn nhiều.
 */
export async function prepareReceiptImage(blob: Blob): Promise<PreparedReceiptImage> {
  if (blob.size === 0) throw new ReceiptError('unreadable_image');
  if (blob.size > MAX_IMAGE_BYTES) throw new ReceiptError('image_too_large');
  if (blob.type && !blob.type.startsWith('image/')) throw new ReceiptError('unreadable_image');

  let decoded: Awaited<ReturnType<typeof decodeImage>>;
  try {
    decoded = await decodeImage(blob);
  } catch {
    throw new ReceiptError('unreadable_image');
  }

  try {
    if (decoded.width < 50 || decoded.height < 50) throw new ReceiptError('unreadable_image');

    // 1. Đo độ nét trên bản thu nhỏ để nhanh và ổn định giữa các độ phân giải
    const analysisScale = Math.min(1, ANALYSIS_WIDTH / decoded.width);
    const analysis = createCanvas(decoded.width * analysisScale, decoded.height * analysisScale);
    const analysisContext = get2d(analysis);
    analysisContext.drawImage(decoded.source, 0, 0, analysis.width, analysis.height);
    const analysisGray = toGray(analysisContext.getImageData(0, 0, analysis.width, analysis.height).data);
    const sharpness = measureSharpness(analysisGray, analysis.width, analysis.height);
    const shouldInvert = meanLuminance(analysisGray) < 110;

    // 2. Chuẩn hóa kích thước cho OCR (chữ đủ lớn nhưng không quá nặng trên điện thoại)
    let scale = 1;
    if (decoded.width < OCR_MIN_WIDTH) scale = OCR_MIN_WIDTH / decoded.width;
    if (decoded.width > OCR_MAX_WIDTH) scale = OCR_MAX_WIDTH / decoded.width;
    const pixels = decoded.width * scale * decoded.height * scale;
    if (pixels > OCR_MAX_PIXELS) scale *= Math.sqrt(OCR_MAX_PIXELS / pixels);

    const canvas = createCanvas(decoded.width * scale, decoded.height * scale);
    const context = get2d(canvas);
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    // 3. Ảnh xám + (nếu cần) đảo màu + kéo giãn độ tương phản
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const gray = toGray(imageData.data);
    const histogram = new Uint32Array(256);
    for (let i = 0; i < gray.length; i++) {
      if (shouldInvert) gray[i] = 255 - gray[i];
      histogram[gray[i]]++;
    }
    const low = percentile(histogram, gray.length, 0.02);
    const high = percentile(histogram, gray.length, 0.98);
    const range = Math.max(1, high - low);
    for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
      const value = high - low < 40 ? gray[p] : ((gray[p] - low) * 255) / range;
      imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    const isLowResolution = Math.max(decoded.width, decoded.height) < LOW_RESOLUTION_LONG_SIDE;
    return { canvas, sharpness, isBlurry: sharpness < BLUR_THRESHOLD, isLowResolution };
  } finally {
    decoded.close();
  }
}

function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction;
  let seen = 0;
  for (let value = 0; value < 256; value++) {
    seen += histogram[value];
    if (seen >= target) return value;
  }
  return 255;
}
