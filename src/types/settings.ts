export type ThemeMode = 'light' | 'dark' | 'system';
export type HeatmapTheme = 'classic' | 'forest' | 'ocean';

export interface UserSettings {
  /**
   * Số dư ban đầu (Starting Balance).
   * LƯU Ý QUAN TRỌNG: Đây là giá trị cấu hình xuất phát, TUYỆT ĐỐI KHÔNG phải là một Transaction!
   */
  startingBalance: number;
  currency: string; // Mặc định 'VND'
  theme: ThemeMode;
  heatmapTheme: HeatmapTheme;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  startingBalance?: number;
  currency?: string;
  theme?: ThemeMode;
  heatmapTheme?: HeatmapTheme;
}
