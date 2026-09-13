'use client';

import React from 'react';
import { Transaction } from '@/types/transaction';
import { Category } from '@/types/category';
import { TransactionRow } from './TransactionRow';
import { Sparkles } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onSelectTransaction: (tx: Transaction) => void;
  onDeleteTransaction?: (txId: string) => void;
  emptyMessage?: string;
  showDate?: boolean;
}

export function TransactionList({
  transactions,
  categories,
  onSelectTransaction,
  onDeleteTransaction,
  emptyMessage = 'Chưa có giao dịch nào',
  showDate = false,
}: TransactionListProps) {
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  if (transactions.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-surface/60 dark:bg-surface-elevated/40 border border-dashed border-border/80 text-center flex flex-col items-center justify-center gap-1.5 select-none">
        <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-1">
          <Sparkles className="w-5 h-5 stroke-[2]" />
        </div>
        <span className="text-xs font-bold text-text-primary">
          {emptyMessage}
        </span>
        <span className="text-[11px] text-text-muted">
          Bấm nút bên dưới để ghi nhận giao dịch mới.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <TransactionRow
          key={tx.id}
          transaction={tx}
          category={categoryMap.get(tx.categoryId)}
          onClick={() => onSelectTransaction(tx)}
          onDelete={onDeleteTransaction ? () => onDeleteTransaction(tx.id) : undefined}
          showDate={showDate}
        />
      ))}
    </div>
  );
}
