/** Slugify — cùng thuật toán scripts/build-detail-map.js & detail-sync.js */

export function noAccent(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function slugify(s: string, maxLen = 120): string {
  return noAccent(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
}

export function itemHref(item: {
  slug?: string | null;
  link_url?: string | null;
}): string {
  const u = (item.link_url || '').trim();
  if (u) return /^(https?:|\/|#)/.test(u) ? u : `/${u}`;
  if (item.slug) return `/${item.slug}.html`;
  return '#';
}

export function postHref(slug?: string | null): string {
  if (!slug) return '#';
  if (/^(https?:|\/)/.test(slug)) {
    return /\.html?$/i.test(slug) ? slug : `${slug}.html`;
  }
  return `/${slug}.html`;
}
