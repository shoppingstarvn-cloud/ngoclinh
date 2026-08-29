/** Khóa khớp href menu ↔ album_pages (slug đầy đủ, đoạn cuối, class_slug, dạng compact). */

export type AlbumPageKeySource = { slug: string; class_slug?: string | null };

const RESERVED = new Set(['legacy', 'api', 'admin', 'uploads']);

function addKey(set: Set<string>, raw: string) {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return;
  set.add(s);
  const compact = s.replace(/-/g, '');
  if (compact) set.add(compact);
}

export function buildAlbumMatchKeys(rows: AlbumPageKeySource[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const slug = String(row.slug || '').toLowerCase();
    if (!slug) continue;
    addKey(set, slug);
    const last = slug.split('/').pop();
    if (last) addKey(set, last);
    const cs = String(row.class_slug || '').toLowerCase();
    if (cs) addKey(set, cs);
  }
  return Array.from(set);
}

/** Chuẩn hoá href nội bộ → slug path (vd /tranvanon/1a3 → tranvanon/1a3). */
export function albumPathFromHref(href: string): string | null {
  if (/^https?:\/\//i.test(href)) return null;
  const path = href.split(/[?#]/)[0].replace(/^\//, '').replace(/\.html$/i, '');
  if (!path || path.includes('.')) return null;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;
  if (parts.some((p) => RESERVED.has(p.toLowerCase()))) return null;
  return path.toLowerCase();
}

export function hrefMatchesAlbum(href: string, keys: Set<string>): boolean {
  const path = albumPathFromHref(href);
  if (!path) return false;
  if (keys.has(path)) return true;
  const compact = path.replace(/-/g, '');
  if (compact && keys.has(compact)) return true;
  const last = path.split('/').pop() || path;
  if (keys.has(last)) return true;
  const lastCompact = last.replace(/-/g, '');
  if (lastCompact && keys.has(lastCompact)) return true;
  return false;
}
