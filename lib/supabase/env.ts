/**
 * Đọc URL / anon key — hỗ trợ cả NEXT_PUBLIC_* (chuẩn Next) và SUPABASE_*
 * (đã set trên Vercel từ thời Express) để không lệch môi trường.
 *
 * Fallback cứng dùng publishable key (công khai, RLS bảo vệ) — browser
 * không đọc được SUPABASE_* server-only khi thiếu NEXT_PUBLIC_ lúc build.
 */
const FALLBACK_URL = 'https://bfruxinvvvaqufghtigw.supabase.co';
const FALLBACK_ANON = 'sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml';

export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    FALLBACK_URL;
  return url.replace(/\/$/, '');
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    FALLBACK_ANON
  );
}
