export interface HeatmapThresholds {
  lowMax: number; // < 100.000 (mặc định)
  mediumMax: number; // <= 500.000 (mặc định)
}

/**
 * Ngưỡng chi tiêu mặc định cho Heatmap
 */
export const DEFAULT_HEATMAP_THRESHOLDS: HeatmapThresholds = {
  lowMax: 100_000,
  mediumMax: 500_000,
};

export type HeatLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Xác định cấp độ nhiệt chi tiêu dựa trên tổng chi tiêu trong ngày và cấu hình ngưỡng
 */
export function getHeatLevel(
  dailyExpense: number,
  thresholds?: HeatmapThresholds | { lowMax: number; mediumMax: number }
): HeatLevel {
  const current = thresholds || DEFAULT_HEATMAP_THRESHOLDS;
  if (dailyExpense <= 0) {
    return 'none';
  }
  if (dailyExpense < current.lowMax) {
    return 'low';
  }
  if (dailyExpense <= current.mediumMax) {
    return 'medium';
  }
  return 'high';
}
