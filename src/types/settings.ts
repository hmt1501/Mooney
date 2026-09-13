export type ThemeMode = 'light' | 'dark' | 'system';
export type HeatmapTheme = 'classic' | 'forest' | 'ocean';

export interface SpendingLevelConfig {
  lowMax: number;     // Mặc định: 100_000 đ
  mediumMax: number;  // Mặc định: 500_000 đ
}

export interface UserSettings {
  /**
   * Số dư ban đầu (Starting Balance).
   * LƯU Ý QUAN TRỌNG: Đây là giá trị cấu hình xuất phát, TUYỆT ĐỐI KHÔNG phải là một Transaction!
   */
  startingBalance: number;
  currency: string; // Mặc định 'VND'
  theme: ThemeMode;
  heatmapTheme: HeatmapTheme;
  spendingLevels?: SpendingLevelConfig;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  startingBalance?: number;
  currency?: string;
  theme?: ThemeMode;
  heatmapTheme?: HeatmapTheme;
  spendingLevels?: SpendingLevelConfig;
}
