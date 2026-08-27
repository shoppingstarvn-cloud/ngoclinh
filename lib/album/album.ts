import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/auth/jwt';
import { absoluteUrl } from '@/lib/seo';

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
  const store = await cookies();
  const cmsToken = store.get(ADMIN_COOKIE)?.value;
  if (cmsToken) {
    const cms = await verifyAdminToken(cmsToken);
    if (cms && cms.role === 'superadmin') {
      const member = await getCurrentUser();
      return {
        loggedIn: true,
        unlocked: true,
        userId: member?.id ?? null,
        userName: cms.full_name || cms.username || 'Super Admin',
      };
    }
  }

  const user = await getCurrentUser();
  if (!user) return { loggedIn: false, unlocked: false, userId: null, userName: '' };
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('users')
    .select('content_unlocked, full_name, email, role')
    .eq('id', user.id)
    .limit(1);
  const row = data?.[0];
  const isSuperAdmin = String(row?.role || '') === 'superadmin';
  return {
    loggedIn: true,
    unlocked: isSuperAdmin || !!row?.content_unlocked,
    userId: user.id,
    userName: String(row?.full_name || row?.email || user.email || 'Thành viên'),
  };
}

/** Đường dẫn công khai của trang con, vd `thcs-truong-cong-dinh/9a11` → `/thcs-truong-cong-dinh/9a11`. */
export function albumPublicPath(slug: string): string {
  const s = String(slug || '')
    .replace(/^\/+/, '')
    .replace(/\.html$/i, '')
    .replace(/\/+$/, '');
  return s ? `/${s}` : '/';
}

/** Link đầy đủ trên website mẹ (LIVE). */
export function albumPublicUrl(slug: string): string {
  return absoluteUrl(albumPublicPath(slug));
}

export type MemberWebsite = {
  id: number;
  slug: string;
  title: string;
  url: string;
  is_active: boolean;
};

/** Xoá website con của thành viên + gỡ menu header trỏ tới đó. Không xoá tài khoản. */
export async function deleteMemberAlbumPage(pageId: number): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const supabase = createAdminClient();
  const { data: page, error: readErr } = await supabase
    .from('album_pages')
    .select('id, slug, owner_user_id')
    .eq('id', pageId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message, status: 500 };
  if (!page) return { ok: false, error: 'Không tìm thấy website con', status: 404 };
  if (page.owner_user_id == null) {
    return { ok: false, error: 'Đây không phải website con của thành viên', status: 400 };
  }
  const slug = String(page.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (slug) {
    const urls = [`/${slug}`, `/${slug}/`, `/${slug}.html`];
    await supabase.from('menus').delete().in('url', urls);
  }
  const { error } = await supabase.from('album_pages').delete().eq('id', pageId);
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
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
