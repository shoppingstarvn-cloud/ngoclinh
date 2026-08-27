import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/auth/jwt';
import { absoluteUrl } from '@/lib/seo';
import { slugify } from '@/lib/slug';
import { ensureTeacherClassHomeMenu, isTeacherUserKind, specialSchoolKey } from '@/lib/album/school-menu';

export { ensureTeacherClassHomeMenu, isTeacherUserKind, specialSchoolKey } from '@/lib/album/school-menu';

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

/** Xoá website con của thành viên + gỡ menu header / menu cấp 2 khối trang chủ. Không xoá tài khoản. */
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
    const path = albumPublicPath(slug);
    const full = albumPublicUrl(slug);
    const urls = [path, `${path}/`, `${path}.html`, full, `${full}/`];
    const last = slug.split('/').pop();
    if (last && last !== slug) {
      const one = albumPublicPath(last);
      const oneFull = albumPublicUrl(last);
      urls.push(one, `${one}/`, `${one}.html`, oneFull, `${oneFull}/`);
    }
    await supabase.from('menus').delete().in('url', urls);
    // Chỉ gỡ menu cấp 2 (có parent) — không xoá tên trường cấp 1.
    await supabase.from('category_submenus').delete().in('link_url', urls).not('parent_id', 'is', null);
  }
  const { error } = await supabase.from('album_pages').delete().eq('id', pageId);
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true };
}

export type MemberAlbumOwner = {
  id: number;
  unit_name?: string | null;
  class_in_charge?: string | null;
  user_kind?: string | null;
};

async function rewriteMenuUrls(fromSlug: string, toSlug: string) {
  const supabase = createAdminClient();
  const oldPath = albumPublicPath(fromSlug);
  const oldFull = albumPublicUrl(fromSlug);
  const newPath = albumPublicPath(toSlug);
  const urls = [oldPath, `${oldPath}/`, `${oldPath}.html`, oldFull, `${oldFull}/`];
  await supabase.from('menus').update({ url: newPath }).in('url', urls);
  await supabase.from('category_submenus').update({ link_url: newPath }).in('link_url', urls);
}

/**
 * Lấy (hoặc tạo) website con theo trường/lớp khai báo, rồi gắn menu cấp 2
 * trong khối Hoạt động trọng tâm nếu đúng giáo viên 2 trường đặc biệt.
 */
export async function ensureMemberAlbumPage(me: MemberAlbumOwner) {
  const supabase = createAdminClient();
  const school = slugifyVi(me.unit_name || '') || `truong-${me.id}`;
  const klass = slugifyVi(me.class_in_charge || '') || 'lop';
  const wantedSlug = `${school}/${klass}`;
  const { data: mine } = await supabase.from('album_pages').select('*').eq('owner_user_id', me.id).order('id').limit(1);
  let page = mine?.[0];
  let previousSlug: string | undefined;

  if (!page) {
    const { data, error } = await supabase
      .from('album_pages')
      .insert({
        slug: wantedSlug,
        title: me.class_in_charge || 'Lớp của tôi',
        subtitle: `Nhật ký · Album ${me.unit_name || ''}`.trim(),
        submenu_label: String(me.class_in_charge || '').trim(),
        owner_user_id: me.id,
        school_slug: school,
        class_slug: klass,
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    page = data;
  } else if (isTeacherUserKind(me.user_kind) && specialSchoolKey(me.unit_name)) {
    const current = String(page.slug || '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    if (current && current !== wantedSlug) {
      const { data: clash } = await supabase
        .from('album_pages')
        .select('id')
        .eq('slug', wantedSlug)
        .neq('id', page.id)
        .maybeSingle();
      if (!clash) {
        const { error: upErr } = await supabase
          .from('album_pages')
          .update({
            slug: wantedSlug,
            school_slug: school,
            class_slug: klass,
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);
        if (!upErr) {
          previousSlug = current;
          await rewriteMenuUrls(current, wantedSlug).catch((e) =>
            console.warn('[ensureMemberAlbumPage menus]', e instanceof Error ? e.message : e),
          );
          page = { ...page, slug: wantedSlug, school_slug: school, class_slug: klass };
        } else {
          console.warn('[ensureMemberAlbumPage slug]', upErr.message);
        }
      }
    }
  }

  await ensureTeacherClassHomeMenu({
    userKind: me.user_kind,
    unitName: me.unit_name,
    className: me.class_in_charge || 'Lớp',
    slug: String(page.slug || ''),
    previousSlug,
  });
  try {
    revalidatePath('/');
  } catch {
    /* không phải request Next — bỏ qua */
  }
  return page;
}

/** Chuẩn hoá slug đẹp: bỏ dấu, thường, gạch nối. VD 'Lớp 1A3' -> 'lop-1a3'. */
export function slugifyVi(input: string): string {
  return slugify(input);
}
