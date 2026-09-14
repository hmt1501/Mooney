import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Kiểm tra xem cấu hình Supabase đã được điền đủ hay chưa
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('your-project-id') &&
      !supabaseAnonKey.includes('your-anon-key')
  );
}

let clientInstance: SupabaseClient | null = null;

/**
 * Lấy singleton client Supabase
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}

// Dùng chung singleton: hai GoTrue client song song có thể tranh nhau làm mới phiên đăng nhập
export const supabase = getSupabaseClient();
