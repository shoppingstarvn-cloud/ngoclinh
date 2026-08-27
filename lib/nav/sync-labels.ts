import { isGatedCategoryName } from '@/lib/gate/match';
import { itemHref, resolveHref } from '@/lib/slug';

/** Chữ hiển thị khớp header khi Super Admin đổi tên ở tab Menu. */
export type NavMenuLabel = {
  label?: string | null;
  url?: string | null;
};

export type NavCategoryLabel = {
  name?: string | null;
  slug?: string | null;
  link_url?: string | null;
};

function pathKey(url: string): string {
  const h = resolveHref(url || '');
  if (!h || h === '#') return '';
  const path = h.split(/[?#]/)[0].trim();
  if (!path || path === '/' || path.startsWith('/#')) return '';
  return path.replace(/\/+$/, '').toLowerCase();
}

function isPagePath(url: string): boolean {
  const key = pathKey(url);
  return Boolean(key) && /\.html?$/i.test(key);
}

function slugFromPath(url: string): string {
  const key = pathKey(url);
  const last = key.split('/').pop() || '';
  return last.replace(/\.html?$/i, '').replace(/-r2$/i, '').toLowerCase();
}

function categorySlugKey(slug: string | null | undefined): string {
  return String(slug || '')
    .trim()
    .replace(/-r2$/i, '')
    .toLowerCase();
}

/**
 * Sandwich + footer đọc `categories.name`, header đọc `menus.label`.
 * Khi cùng một trang .html (hoặc cùng họ slug, hoặc cùng khối HOẠT ĐỘNG…),
 * lấy chữ từ tab Menu — lần đổi tên mới nhất trên header tự khớp.
 * Không đụng hash (#form-dang-ky) để 11 dịch vụ không đè 6 khối năng lực.
 */
export function applyMenuLabelsToCategories<T extends NavCategoryLabel>(
  categories: T[],
  menus: NavMenuLabel[],
): T[] {
  const menuRows = (menus || []).filter((m) => String(m.label || '').trim());
  const byPath = new Map<string, { label: string; url: string }>();
  const bySlug = new Map<string, { label: string; url: string }>();
  let gatedMenu: { label: string; url: string } | null = null;

  for (const m of menuRows) {
    const label = String(m.label || '').trim();
    const url = String(m.url || '').trim();
    if (!label) continue;
    const row = { label, url };
    if (isGatedCategoryName(label) && !gatedMenu) gatedMenu = row;
    if (!isPagePath(url)) continue;
    const path = pathKey(url);
    const slug = slugFromPath(url);
    if (path && !byPath.has(path)) byPath.set(path, row);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, row);
  }

  return categories.map((c) => {
    const href = itemHref({ slug: c.slug, link_url: c.link_url });
    const path = pathKey(href);
    const slugKey = categorySlugKey(c.slug) || slugFromPath(href);
    let hit = (path && byPath.get(path)) || (slugKey && bySlug.get(slugKey)) || null;

    const gatedCat =
      isGatedCategoryName(String(c.name || '')) ||
      slugKey.startsWith('hoat-dong');
    if (!hit && gatedCat && gatedMenu) hit = gatedMenu;
    if (!hit) return c;

    const nextLink = hit.url && isPagePath(hit.url) ? hit.url : c.link_url;
    if (hit.label === c.name && nextLink === c.link_url) return c;
    return { ...c, name: hit.label, link_url: nextLink ?? c.link_url };
  });
}
