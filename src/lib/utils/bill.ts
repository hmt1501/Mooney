import { RecurringBill, BillFrequency } from '@/types/bill';

export type BillStatusType = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'paid' | 'inactive';

export interface BillStatusInfo {
  status: BillStatusType;
  label: string;
  badgeClass: string;
  canMarkPaid: boolean;
  daysDiff: number;
}

export const REPEAT_LABELS: Record<BillFrequency, string> = {
  never: 'Không lặp',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
};

/**
 * Kiểm tra xem 2 ngày có cùng tuần (bắt đầu từ Thứ Hai) hay không
 */
function isSameWeek(date1Str: string, date2Str: string): boolean {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 7;
}

/**
 * Tính toán trạng thái của hóa đơn dựa trên ngày hiện tại
 */
export function getBillStatus(
  bill: RecurringBill,
  referenceDateStr?: string
): BillStatusInfo {
  const todayStr = referenceDateStr || new Date().toISOString().split('T')[0];

  if (!bill.isActive) {
    return {
      status: 'inactive',
      label: 'Đã tạm dừng',
      badgeClass: 'bg-surface-secondary text-text-muted',
      canMarkPaid: false,
      daysDiff: 0,
    };
  }

  // 1. Kiểm tra hóa đơn một lần (never)
  if (bill.repeat === 'never') {
    if (bill.lastPaidDate) {
      return {
        status: 'paid',
        label: 'Đã thanh toán',
        badgeClass: 'bg-primary-soft text-primary font-bold',
        canMarkPaid: false,
        daysDiff: 0,
      };
    }
  } else {
    // 2. Kiểm tra hóa đơn định kỳ xem đã thanh toán cho kỳ hiện tại chưa
    const isPaidCurrentPeriod = (() => {
      if (!bill.lastPaidDate) return false;

      // Nếu có lưu danh sách paidOccurrences và dueDate cũ trùng khớp
      if (bill.lastPaidDueDate && bill.paidOccurrences?.includes(bill.lastPaidDueDate)) {
        // Nếu dueDate hiện tại đã sang kỳ mới (sau ngày thanh toán) nhưng chưa đến hạn thanh toán mới
        // hoặc nếu ngày trả cùng kỳ (tháng/tuần/năm)
      }

      if (bill.repeat === 'monthly') {
        return bill.lastPaidDate.slice(0, 7) === todayStr.slice(0, 7);
      }
      if (bill.repeat === 'yearly') {
        return bill.lastPaidDate.slice(0, 4) === todayStr.slice(0, 4);
      }
      if (bill.repeat === 'weekly') {
        return isSameWeek(bill.lastPaidDate, todayStr);
      }
      return false;
    })();

    if (isPaidCurrentPeriod) {
      const periodName =
        bill.repeat === 'monthly'
          ? 'tháng này'
          : bill.repeat === 'weekly'
          ? 'tuần này'
          : 'năm này';
      return {
        status: 'paid',
        label: `Đã trả ${periodName}`,
        badgeClass: 'bg-primary-soft text-primary font-bold',
        canMarkPaid: false,
        daysDiff: 0,
      };
    }
  }

  // 3. Tính toán chênh lệch ngày cho hóa đơn chưa thanh toán
  const today = new Date(todayStr);
  today.setHours(0, 0, 0, 0);

  const due = new Date(bill.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: `Quá hạn ${overdueDays} ngày`,
      badgeClass: 'bg-status-danger-soft text-status-danger font-extrabold',
      canMarkPaid: true,
      daysDiff: diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      status: 'due_today',
      label: 'Hôm nay',
      badgeClass: 'bg-status-danger text-white font-extrabold animate-pulse',
      canMarkPaid: true,
      daysDiff: 0,
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'due_soon',
      label: `${diffDays} ngày nữa`,
      badgeClass: 'bg-status-warning-soft text-status-warning font-bold',
      canMarkPaid: true,
      daysDiff: diffDays,
    };
  }

  return {
    status: 'upcoming',
    label: `${diffDays} ngày nữa`,
    badgeClass: 'bg-surface-secondary text-text-muted font-medium',
    canMarkPaid: true,
    daysDiff: diffDays,
  };
}

/**
 * Format ngày hiển thị dạng dd/MM/yyyy
 */
export function formatDueDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
