'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useToast } from '@/components/common/ToastContext';
import { Modal } from '@/components/common/Modal';
import { Mail, Lock, User, Cloud, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp, isConfigured } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignIn = mode === 'signin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!isConfigured) {
      error('Chưa thiết lập NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignIn) {
        const { error: authError } = await signIn(email.trim(), password);
        if (authError) {
          error(authError.message || 'Đăng nhập không thành công.');
        } else {
          success('Đăng nhập thành công! Dữ liệu đang được đồng bộ.');
          onClose();
          onSuccess?.();
        }
      } else {
        const { error: authError } = await signUp(email.trim(), password, fullName.trim());
        if (authError) {
          error(authError.message || 'Đăng ký tài khoản thất bại.');
        } else {
          success('Tạo tài khoản thành công! Dữ liệu cục bộ của bạn đã sẵn sàng đồng bộ.');
          onClose();
          onSuccess?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSignIn ? 'Đăng Nhập Mooney Cloud' : 'Tạo Tài Khoản Mooney'}
      description="Lưu trữ an toàn và đồng bộ dữ liệu tài chính của bạn trên mọi thiết bị."
    >
      <div className="flex flex-col gap-4 pt-1">
        {/* Tab Switcher */}
        <div className="flex bg-surface-secondary p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              isSignIn
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              !isSignIn
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            Tạo Tài Khoản
          </button>
        </div>

        {/* Notice nếu chưa config Supabase */}
        {!isConfigured && (
          <div className="p-3 rounded-2xl bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Chưa tìm thấy Supabase API Key. Vui lòng cấu hình biến môi trường trong file <code>.env.local</code> để kích hoạt Cloud Sync.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Full Name (chỉ khi Sign up) */}
          {!isSignIn && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">Tên của bạn</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-secondary text-sm font-semibold text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-secondary text-sm font-semibold text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted">Mật khẩu</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-text-muted" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface-secondary text-sm font-semibold text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-2xl bg-primary text-primary-content font-bold text-sm shadow-md hover:bg-primary-hover active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Cloud className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Đang xử lý...'
                : isSignIn
                ? 'Đăng Nhập & Bật Đồng Bộ'
                : 'Đăng Ký Tài Khoản'}
            </span>
          </button>
        </form>

        <p className="text-[11px] text-center text-text-muted">
          Dữ liệu của bạn được mã hóa và bảo mật bằng Row Level Security (RLS).
        </p>
      </div>
    </Modal>
  );
}
