import { TransactionType } from './transaction';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Tên icon hiển thị (Lucide icon name hoặc icon symbol)
  color: string; // Hex color hoặc token code
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}
