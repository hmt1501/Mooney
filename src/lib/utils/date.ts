export interface CalendarDayInfo {
  dateStr: string; // 'YYYY-MM-DD'
  dayNumber: number;
  month: number; // 1-12
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

/**
 * Format ngày thành 'YYYY-MM-DD'
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Định dạng tháng năm hiển thị tiếng Việt (ví dụ: "Tháng 9, 2026")
 */
export function formatMonthYear(year: number, month: number): string {
  return `Tháng ${month}, ${year}`;
}

/**
 * Định dạng ngày kiểu "13/09/2026"
 */
export function formatDateDMY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Tính số ngày còn lại đến hạn và sinh chuỗi đếm ngược thân thiện
 */
export function getDueCountdown(dueDateStr: string): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
  isSoon: boolean;
} {
  const todayStr = toDateString(new Date());
  if (dueDateStr === todayStr) {
    return { text: 'Hôm nay', isOverdue: false, isToday: true, isSoon: true };
  }

  const today = new Date(todayStr + 'T00:00:00');
  const due = new Date(dueDateStr + 'T00:00:00');
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Quá hạn ${Math.abs(diffDays)} ngày`,
      isOverdue: true,
      isToday: false,
      isSoon: false,
    };
  }

  if (diffDays === 1) {
    return { text: 'Ngày mai', isOverdue: false, isToday: false, isSoon: true };
  }

  if (diffDays <= 7) {
    return {
      text: `${diffDays} ngày nữa`,
      isOverdue: false,
      isToday: false,
      isSoon: true,
    };
  }

  return {
    text: formatDateDMY(dueDateStr),
    isOverdue: false,
    isToday: false,
    isSoon: false,
  };
}

/**
 * Tạo ma trận lưới lịch từ Thứ 2 đến Chủ Nhật cho một tháng cụ thể
 */
export function getCalendarMonthMatrix(
  year: number,
  month: number // 1-12
): CalendarDayInfo[] {
  const todayStr = toDateString(new Date());
  const today = new Date(todayStr + 'T00:00:00');

  // Ngày đầu tiên của tháng (tháng trong JS Date là 0-indexed)
  const firstDayOfMonth = new Date(year, month - 1, 1);
  // Ngày cuối cùng của tháng
  const lastDayOfMonth = new Date(year, month, 0);

  // Thứ của ngày đầu tháng: 0 là CN, 1 là T2, ..., 6 là T7
  // Ta quy đổi Thứ 2 làm ngày bắt đầu (T2: 0, T3: 1, ..., CN: 6)
  const jsDay = firstDayOfMonth.getDay();
  const startDayIndex = jsDay === 0 ? 6 : jsDay - 1;

  const days: CalendarDayInfo[] = [];

  // 1. Các ngày đệm từ tháng trước
  if (startDayIndex > 0) {
    const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevDate = new Date(year, month - 2, dayNum);
      const dateStr = toDateString(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        month: prevDate.getMonth() + 1,
        year: prevDate.getFullYear(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isFuture: prevDate > today,
      });
    }
  }

  // 2. Các ngày trong tháng hiện tại
  const totalDaysInMonth = lastDayOfMonth.getDate();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currDate = new Date(year, month - 1, d);
    const dateStr = toDateString(currDate);
    days.push({
      dateStr,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: currDate > today,
    });
  }

  // 3. Các ngày đệm sang tháng sau để lấp đầy hàng cuối cùng (bội số của 7)
  const remainder = days.length % 7;
  if (remainder > 0) {
    const daysToAdd = 7 - remainder;
    for (let nextD = 1; nextD <= daysToAdd; nextD++) {
      const nextDate = new Date(year, month, nextD);
      const dateStr = toDateString(nextDate);
      days.push({
        dateStr,
        dayNumber: nextD,
        month: nextDate.getMonth() + 1,
        year: nextDate.getFullYear(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isFuture: nextDate > today,
      });
    }
  }

  return days;
}
