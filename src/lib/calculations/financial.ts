import { Transaction, TransactionType } from '@/types/transaction';
import { Category } from '@/types/category';
import {
  DailyTotals,
  CategoryTotal,
  SafeDailySpendingResult,
  MonthlyRecap,
} from '@/types/calculations';

/**
 * Tính Số Tiền Khả Dụng (Available Balance).
 *
 * CÔNG THỨC CHUẨN:
 * Available Balance = Starting Balance + Total Income - Total Expense
 *
 * LƯU Ý BẮT BUỘC:
 * - Starting Balance KHÔNG phải là một transaction.
 * - Income làm tăng số dư.
 * - Expense làm giảm số dư.
 */
export function calculateAvailableBalance(
  startingBalance: number,
  transactions: Transaction[]
): number {
  let balance = startingBalance;
  for (const tx of transactions) {
    if (tx.type === 'income') {
      balance += tx.amount;
    } else if (tx.type === 'expense') {
      balance -= tx.amount;
    }
  }
  return balance;
}

/**
 * Tính tổng chi tiêu, thu nhập và biến động ròng cho một ngày cụ thể ('YYYY-MM-DD').
 */
export function calculateDailyTotals(
  transactions: Transaction[],
  date: string
): DailyTotals {
  let totalExpense = 0;
  let totalIncome = 0;
  let transactionCount = 0;

  for (const tx of transactions) {
    if (tx.date === date) {
      transactionCount++;
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
      } else if (tx.type === 'income') {
        totalIncome += tx.amount;
      }
    }
  }

  return {
    date,
    totalExpense,
    totalIncome,
    netChange: totalIncome - totalExpense,
    transactionCount,
  };
}

/**
 * Tính hạn mức an toàn chi tiêu mỗi ngày (Safe Daily Spending).
 *
 * ĐỊNH NGHĨA:
 * Safe Daily Spending = Remaining Available Money / Remaining Days in Month.
 *
 * NGUYÊN TẮC:
 * - Đây là con số định hướng (guidance only), TUYỆT ĐỐI KHÔNG làm thay đổi kế toán hay số dư.
 *
 * XỬ LÝ EDGE CASES:
 * - Số dư âm: amount = 0, isNegative = true
 * - Số ngày còn lại <= 0: amount = 0
 * - Tháng 28, 29, 30, 31 ngày tự động tính chính xác theo lịch dương.
 */
export function calculateSafeDailySpending(
  availableBalance: number,
  targetDateStr: string,
  explicitTotalDays?: number
): SafeDailySpendingResult {
  const targetDate = new Date(targetDateStr);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-indexed
  const dayOfMonth = targetDate.getDate();

  // Số ngày trong tháng (ngày cuối tháng)
  const totalDays =
    explicitTotalDays ?? new Date(year, month + 1, 0).getDate();

  // Số ngày còn lại tính từ ngày hiện tại đến hết tháng (bao gồm cả ngày hôm nay)
  const remainingDays = Math.max(0, totalDays - dayOfMonth + 1);

  if (availableBalance <= 0) {
    return {
      amountPerDay: 0,
      remainingDays,
      remainingBalance: availableBalance,
      isNegative: true,
      explanation: 'Bạn đã chi vượt số tiền khả dụng hiện có.',
    };
  }

  if (remainingDays <= 0) {
    return {
      amountPerDay: availableBalance,
      remainingDays: 0,
      remainingBalance: availableBalance,
      isNegative: false,
      explanation: 'Hôm nay là ngày cuối cùng của chu kỳ tháng.',
    };
  }

  // Làm tròn số nguyên đồng (đơn vị VNĐ)
  const amountPerDay = Math.floor(availableBalance / remainingDays);

  return {
    amountPerDay,
    remainingDays,
    remainingBalance: availableBalance,
    isNegative: false,
    explanation: `Bạn có thể chi khoảng ${amountPerDay.toLocaleString('vi-VN')} đ/ngày trong ${remainingDays} ngày còn lại của tháng.`,
  };
}

/**
 * Tính cơ cấu chi tiêu / thu nhập theo từng danh mục trong một tháng cụ thể.
 *
 * NGUYÊN TẮC:
 * - Đồng nhất 100% với số liệu của Lịch và Thống kê.
 * - Sắp xếp giảm dần theo số tiền để người dùng thấy rõ nhất danh mục nào tốn tiền nhất.
 */
export function calculateCategoryTotals(
  transactions: Transaction[],
  categories: Category[],
  monthPrefix?: string, // 'YYYY-MM'
  filterType: TransactionType = 'expense'
): CategoryTotal[] {
  // Lọc theo tháng và loại giao dịch
  const filtered = transactions.filter((tx) => {
    if (tx.type !== filterType) return false;
    if (monthPrefix && !tx.date.startsWith(monthPrefix)) return false;
    return true;
  });

  const totalAmountSum = filtered.reduce((acc, tx) => acc + tx.amount, 0);

  // Tạo map tra cứu category
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Gom nhóm theo categoryId
  const groups = new Map<string, { total: number; count: number }>();

  for (const tx of filtered) {
    const current = groups.get(tx.categoryId) || { total: 0, count: 0 };
    groups.set(tx.categoryId, {
      total: current.total + tx.amount,
      count: current.count + 1,
    });
  }

  const result: CategoryTotal[] = [];

  for (const [catId, stat] of groups.entries()) {
    const cat = categoryMap.get(catId);
    const percentage =
      totalAmountSum > 0
        ? Math.round((stat.total / totalAmountSum) * 1000) / 10 // làm tròn 1 chữ số thập phân (ví dụ: 35.4%)
        : 0;

    result.push({
      categoryId: catId,
      categoryName: cat?.name || 'Khác',
      categoryIcon: cat?.icon || 'MoreHorizontal',
      categoryColor: cat?.color || '#7F8C8D',
      totalAmount: stat.total,
      transactionCount: stat.count,
      percentage,
    });
  }

  // Sắp xếp giảm dần theo số tiền
  result.sort((a, b) => b.totalAmount - a.totalAmount);

  return result;
}

/**
 * Tính tổng kết tháng (Monthly Recap) phục vụ màn hình Thống kê.
 *
 * BAO GỒM:
 * - Tổng thu, tổng chi, biến động ròng (netChange)
 * - Tỷ lệ tiết kiệm (savingsRate %)
 * - Tiền giữ lại (cashKept)
 * - Ngày chi tiêu nhiều nhất (topSpendingDay)
 */
export function calculateMonthlyRecap(
  startingBalance: number,
  transactions: Transaction[],
  monthPrefix: string // 'YYYY-MM'
): MonthlyRecap {
  let totalIncome = 0;
  let totalExpense = 0;
  let transactionCount = 0;
  const dayExpenseMap = new Map<string, number>();

  // Duyệt toàn bộ transactions để tính ending balance tích lũy đến hết tháng đó
  let endingAvailableBalance = startingBalance;

  for (const tx of transactions) {
    if (tx.date <= `${monthPrefix}-31`) {
      if (tx.type === 'income') {
        endingAvailableBalance += tx.amount;
      } else {
        endingAvailableBalance -= tx.amount;
      }
    }

    // Riêng trong tháng khảo sát:
    if (tx.date.startsWith(monthPrefix)) {
      transactionCount++;
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
        const currentDayExp = dayExpenseMap.get(tx.date) || 0;
        dayExpenseMap.set(tx.date, currentDayExp + tx.amount);
      }
    }
  }

  const netChange = totalIncome - totalExpense;
  const cashKept = Math.max(0, netChange);

  // Tỷ lệ tiết kiệm %: Chỉ tính khi có thu nhập > 0
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))
      : 0;

  // Tìm ngày chi nhiều nhất trong tháng
  let topSpendingDay: { date: string; amount: number } | null = null;
  for (const [date, amount] of dayExpenseMap.entries()) {
    if (!topSpendingDay || amount > topSpendingDay.amount) {
      topSpendingDay = { date, amount };
    }
  }

  return {
    month: monthPrefix,
    totalIncome,
    totalExpense,
    netChange,
    endingAvailableBalance,
    savingsRate,
    cashKept,
    topSpendingDay,
    transactionCount,
  };
}
