import { IncomeItem, IncomeOccurrence } from '@/types/income';
import { MonthlyIncomeSummary } from '@/types/calculations';

/**
 * Trả về số ngày của một tháng cụ thể (hỗ trợ năm nhuận chính xác)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Định dạng ngày YYYY-MM-DD
 */
export function formatDateISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Helper trích xuất ngày bắt đầu/nhận và ngày chu kỳ
 */
function normalizeIncomeItem(item: IncomeItem) {
  const isRecurring =
    item.type === 'recurring' ||
    (item as any).recurrence?.frequency === 'monthly' ||
    item.recurrence === 'monthly' ||
    item.recurrence === 'yearly';

  // Ngày bắt đầu hoặc ngày nhận cụ thể
  let startDate = item.date || item.receivedDate;
  if (!startDate) {
    if (item.createdAt) {
      startDate = item.createdAt.split('T')[0];
    } else {
      startDate = new Date().toISOString().split('T')[0];
    }
  }

  // Ngày nhận trong tháng (1-31)
  let receiveDay = 1;
  if (item.receiveDay !== undefined) {
    receiveDay = item.receiveDay;
  } else if ((item as any).recurrence?.dayOfMonth !== undefined) {
    receiveDay = (item as any).recurrence.dayOfMonth;
  } else {
    const parts = startDate.split('-');
    receiveDay = parseInt(parts[2] || '1', 10);
  }

  return {
    isRecurring,
    startDate,
    receiveDay,
    isActive: item.isActive !== false,
  };
}

/**
 * Lấy tất cả các lần phát sinh thu nhập (occurrences) trong một tháng cụ thể.
 * Idempotent, không tạo duplicate.
 */
export function getIncomeOccurrencesForMonth(
  incomes: IncomeItem[] | IncomeItem,
  year: number,
  month: number,
  targetDateStr?: string
): IncomeOccurrence[] {
  const list = Array.isArray(incomes) ? incomes : [incomes];
  const occurrences: IncomeOccurrence[] = [];
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = getDaysInMonth(year, month);
  const cutoffDate = targetDateStr || new Date().toISOString().split('T')[0];

  for (const item of list) {
    const norm = normalizeIncomeItem(item);

    if (!norm.isRecurring) {
      // 1. One-time Income: Chỉ sinh trong đúng tháng nhận
      if (norm.startDate.startsWith(monthPrefix)) {
        occurrences.push({
          incomeId: item.id,
          name: item.name,
          amount: item.amount,
          categoryId: item.categoryId || 'cat-income',
          date: norm.startDate,
          isReceived: norm.startDate <= cutoffDate,
          isRecurring: false,
        });
      }
    } else {
      // 2. Recurring Income
      if (!norm.isActive) continue;

      const lastDayOfMonthStr = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`;
      if (norm.startDate > lastDayOfMonthStr) {
        continue;
      }

      // Xử lý ngày nhận thực tế (nếu tháng có 30 ngày mà nhận ngày 31 -> chuyển thành ngày 30)
      const actualDay = Math.min(norm.receiveDay, daysInMonth);
      const occurrenceDate = formatDateISO(year, month, actualDay);

      if (occurrenceDate < norm.startDate) {
        continue;
      }

      occurrences.push({
        incomeId: item.id,
        name: item.name,
        amount: item.amount,
        categoryId: item.categoryId || 'cat-income',
        date: occurrenceDate,
        isReceived: occurrenceDate <= cutoffDate,
        isRecurring: true,
      });
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date));
  return occurrences;
}

/**
 * Tính tổng thu nhập thực tế ĐÃ NHẬN (Realized Income) từ trước đến thời điểm targetDateStr.
 *
 * NGUYÊN TẮC KẾ TOÁN BẮT BUỘC:
 * - Thu nhập tương lai (sau targetDateStr) TUYỆT ĐỐI KHÔNG ĐƯỢC CỘNG VÀO!
 * - One-time income: chỉ tính khi startDate <= targetDateStr.
 * - Recurring income: chỉ tính các occurrenceDate <= targetDateStr.
 * - Idempotency: Gọi hàm nhiều lần với cùng input luôn ra cùng 1 kết quả duy nhất.
 */
export function calculateRealizedIncome(
  incomes: IncomeItem[],
  targetDateStr?: string
): number {
  if (!incomes || incomes.length === 0) return 0;
  const cutoffDate = targetDateStr || new Date().toISOString().split('T')[0];

  const targetDate = new Date(cutoffDate);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1; // 1-12

  let total = 0;

  for (const item of incomes) {
    const norm = normalizeIncomeItem(item);

    if (!norm.isRecurring) {
      if (norm.startDate <= cutoffDate) {
        total += item.amount;
      }
    } else {
      if (!norm.isActive) continue;

      const [sYearStr, sMonthStr] = norm.startDate.split('-');
      let curYear = parseInt(sYearStr, 10);
      let curMonth = parseInt(sMonthStr, 10);

      while (
        curYear < targetYear ||
        (curYear === targetYear && curMonth <= targetMonth)
      ) {
        const daysInM = getDaysInMonth(curYear, curMonth);
        const actualDay = Math.min(norm.receiveDay, daysInM);
        const occDate = formatDateISO(curYear, curMonth, actualDay);

        if (occDate >= norm.startDate && occDate <= cutoffDate) {
          total += item.amount;
        }

        curMonth++;
        if (curMonth > 12) {
          curMonth = 1;
          curYear++;
        }
      }
    }
  }

  return total;
}

/**
 * Tính tổng quan thu nhập trong một tháng cụ thể (Đã nhận vs Sắp nhận, Định kỳ vs Một lần).
 */
export function calculateMonthlyIncomeSummary(
  incomes: IncomeItem[],
  year: number,
  month: number,
  targetDateOrDateStr?: Date | string
): MonthlyIncomeSummary {
  const targetDateStr =
    targetDateOrDateStr instanceof Date
      ? targetDateOrDateStr.toISOString().split('T')[0]
      : targetDateOrDateStr || new Date().toISOString().split('T')[0];

  const occurrences = getIncomeOccurrencesForMonth(incomes, year, month, targetDateStr);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  let totalReceived = 0;
  let totalUpcoming = 0;
  let recurringTotal = 0;
  let oneTimeTotal = 0;

  for (const occ of occurrences) {
    if (occ.isReceived) {
      totalReceived += occ.amount;
    } else {
      totalUpcoming += occ.amount;
    }

    if (occ.isRecurring) {
      recurringTotal += occ.amount;
    } else {
      oneTimeTotal += occ.amount;
    }
  }

  return {
    month: monthPrefix,
    total: totalReceived + totalUpcoming,
    realized: totalReceived,
    upcoming: totalUpcoming,
    totalReceived,
    totalUpcoming,
    recurringTotal,
    oneTimeTotal,
    count: occurrences.length,
  };
}

/**
 * Tìm các khoản thu nhập sắp nhận tiếp theo tính từ targetDateStr hoặc Date object.
 */
export function getUpcomingIncomes(
  incomes: IncomeItem[],
  targetDateOrDateStr?: Date | string,
  daysAhead = 30
): IncomeOccurrence[] {
  const targetDate =
    targetDateOrDateStr instanceof Date
      ? targetDateOrDateStr
      : new Date(targetDateOrDateStr || new Date().toISOString().split('T')[0]);

  const targetDateStr = targetDate.toISOString().split('T')[0];
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;

  // Lấy occurrences của tháng này và tháng tiếp theo
  const thisMonthOccs = getIncomeOccurrencesForMonth(incomes, year, month, targetDateStr);

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const nextMonthOccs = getIncomeOccurrencesForMonth(incomes, nextYear, nextMonth, targetDateStr);

  const allOccs = [...thisMonthOccs, ...nextMonthOccs];

  // Lọc các khoản chưa nhận trong tương lai
  const upcoming = allOccs
    .filter((occ) => !occ.isReceived && occ.date >= targetDateStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcoming;
}
