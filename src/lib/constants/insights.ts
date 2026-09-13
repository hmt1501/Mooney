import { formatCurrency } from '@/lib/utils/currency';

export interface FinancialInsightResult {
  message: string;
  subMessage?: string;
  mood: 'happy' | 'normal' | 'good_spending' | 'warning' | 'high_spending' | 'empty';
}

/**
 * Sinh nhận xét tài chính dựa trên quy tắc chuẩn xác (Rule-based Insight).
 * TUYỆT ĐỐI KHÔNG DÙNG AI / LLM theo đúng yêu cầu đặc tả.
 */
export function getFinancialInsight(params: {
  availableBalance: number;
  totalIncome: number;
  totalExpense: number;
  daysRemaining: number;
}): FinancialInsightResult {
  const { availableBalance, totalIncome, totalExpense } = params;

  // 1. Số dư âm
  if (availableBalance < 0) {
    return {
      message: 'Cẩn thận! Bạn đã chi vượt số tiền khả dụng.',
      subMessage: 'Hãy cân đối lại chi tiêu hoặc bổ sung thêm thu nhập.',
      mood: 'warning',
    };
  }

  // 2. Có thu nhập trong tháng
  if (totalIncome > 0) {
    const spentPercent = Math.round((totalExpense / totalIncome) * 100);

    if (spentPercent === 0) {
      return {
        message: 'Tuyệt vời! Bạn chưa có khoản chi nào trong tháng.',
        subMessage: 'Số dư khả dụng đang được giữ trọn vẹn.',
        mood: 'happy',
      };
    }

    if (spentPercent <= 30) {
      return {
        message: 'Tốc độ chi tiêu tốt!',
        subMessage: `Bạn đã chi ${spentPercent}% thu nhập tháng này.`,
        mood: 'good_spending',
      };
    }

    if (spentPercent <= 65) {
      return {
        message: 'Bạn đang chi tiêu khá ổn.',
        subMessage: `Đã chi ${spentPercent}% thu nhập tháng này.`,
        mood: 'normal',
      };
    }

    if (spentPercent <= 90) {
      return {
        message: 'Chi tiêu tháng này đang tăng khá nhanh.',
        subMessage: `Đã chi ${spentPercent}% thu nhập tháng này.`,
        mood: 'warning',
      };
    }

    return {
      message: 'Bạn đã chi gần hết thu nhập tháng này.',
      subMessage: `Tỷ lệ chi tiêu đã đạt ${spentPercent}%. Hãy ưu tiên các khoản chi thiết yếu.`,
      mood: 'high_spending',
    };
  }

  // 3. Không có thu nhập trong tháng nhưng có chi tiêu từ số dư ban đầu
  if (totalExpense > 0) {
    return {
      message: 'Đang dùng từ số dư ban đầu.',
      subMessage: `Tổng chi tháng này là ${formatCurrency(totalExpense)}.`,
      mood: 'normal',
    };
  }

  // 4. Chưa có hoạt động thu chi nào
  return {
    message: 'Chào mừng bạn đến với Mooney!',
    subMessage: 'Chạm đúp vào một ngày trên lịch để ghi nhanh khoản chi đầu tiên.',
    mood: 'empty',
  };
}
