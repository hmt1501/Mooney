'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SelectedMonthContextType {
  year: number;
  month: number; // 1-12
  setMonth: (year: number, month: number) => void;
}

const SelectedMonthContext = createContext<SelectedMonthContextType | undefined>(undefined);

/** Tháng đang xem dùng chung cho tab Lịch và Thống kê (điều khiển từ TopHeader) */
export function SelectedMonthProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const setMonth = useCallback((year: number, month: number) => {
    setSelected({ year, month });
  }, []);

  const value = useMemo(
    () => ({ year: selected.year, month: selected.month, setMonth }),
    [selected, setMonth]
  );

  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>;
}

export function useSelectedMonth() {
  const context = useContext(SelectedMonthContext);
  if (!context) {
    throw new Error('useSelectedMonth must be used within a SelectedMonthProvider');
  }
  return context;
}
