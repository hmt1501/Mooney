export interface HeatmapThresholds {
  lowMax: number; // < 100.000
  mediumMax: number; // <= 500.000
}

/**
 * Ngưỡng chi tiêu tập trung cho Heatmap theo Design System V1
 * Tuyệt đối không hardcode các con số này trong components!
 */
export const DEFAULT_HEATMAP_THRESHOLDS: HeatmapThresholds = {
  lowMax: 100_000,
  mediumMax: 500_000,
};

export type HeatLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Xác định cấp độ nhiệt chi tiêu dựa trên tổng chi tiêu trong ngày
 */
export function getHeatLevel(
  dailyExpense: number,
  thresholds: HeatmapThresholds = DEFAULT_HEATMAP_THRESHOLDS
): HeatLevel {
  if (dailyExpense <= 0) {
    return 'none';
  }
  if (dailyExpense < thresholds.lowMax) {
    return 'low';
  }
  if (dailyExpense <= thresholds.mediumMax) {
    return 'medium';
  }
  return 'high';
}
