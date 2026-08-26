import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';

export interface AlbumAccess {
  loggedIn: boolean;
  unlocked: boolean;
  userId: number | null;
  userName: string;
}

/**
 * Quyền vào trang con: phải ĐĂNG NHẬP tài khoản VÀ đã mở khoá (nhập mật khẩu 1 lần
 * -> users.content_unlocked = true). Dùng chung cơ chế với cổng mật khẩu khối Hoạt động.
 */
export async function getAlbumAccess(): Promise<AlbumAccess> {
  const user = await getCurrentUser();
  if (!user) return { loggedIn: false, unlocked: false, userId: null, userName: '' };
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('users')
    .select('content_unlocked, full_name, email')
    .eq('id', user.id)
    .limit(1);
  const row = data?.[0];
  return {
    loggedIn: true,
    unlocked: !!row?.content_unlocked,
    userId: user.id,
    userName: String(row?.full_name || row?.email || user.email || 'Thành viên'),
  };
}

/** Chuẩn hoá slug đẹp: bỏ dấu, thường, gạch nối. VD 'Lớp 1A3' -> 'lop-1a3'. */
export function slugifyVi(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
