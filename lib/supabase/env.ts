/**
 * Đọc URL / anon key — hỗ trợ cả NEXT_PUBLIC_* (chuẩn Next) và SUPABASE_*
 * (đã set trên Vercel). Workspace này chỉ được nói chuyện với kho ngoclinh.
 */
const NGOCLINH_URL = 'https://pglbhoitmcflpvoasewr.supabase.co';
const NGOCLINH_REF = 'pglbhoitmcflpvoasewr';
const CUAAU_REF = 'bfruxinvvvaqufghtigw';

function stripSlash(url: string) {
  return url.replace(/\/$/, '');
}

function isHttpUrl(url: string) {
  return /^https?:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(url);
}

export function getSupabaseUrl(): string {
  const raw = stripSlash(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      NGOCLINH_URL,
  );
  const url = isHttpUrl(raw) ? raw : NGOCLINH_URL;
  if (url.includes(CUAAU_REF)) {
    console.error(
      '[ngoclinh] Chặn URL Supabase Cửa Âu. Chuyển sang kho pglbhoitmcflpvoasewr.',
    );
    return NGOCLINH_URL;
  }
  return url || NGOCLINH_URL;
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}

export function isNgoclinhSupabase(): boolean {
  return getSupabaseUrl().includes(NGOCLINH_REF);
}
