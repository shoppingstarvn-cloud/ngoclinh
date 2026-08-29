import type { Metadata } from 'next';
import { isVideoAsset } from '@/lib/media-url';
import { absoluteUrl, isShareCrawler, SEARCH_ENGINE_UA, shareOpenGraph, shareTwitter } from '@/lib/seo';
import { createAdminClient } from '@/lib/supabase/admin';

const RESERVED = new Set(['legacy', 'api', 'admin', 'uploads']);

export type AlbumShareMeta = {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  imageAlt: string;
};

type AlbumRow = {
  title: string | null;
  subtitle: string | null;
  slug: string;
  class_slug: string | null;
  bg_image_url: string | null;
  slide_urls: string[] | null;
  share_image_url: string | null;
  share_description: string | null;
};

function normalizePath(pathname: string): string {
  let p = pathname.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p.replace(/\.html$/i, '');
}

/** Đường dẫn album: 1 hoặc 2 segment, không phải slug hệ thống. */
export function parseAlbumPath(pathname: string): string[] | null {
  const p = normalizePath(pathname);
  const segs = p.split('/').filter(Boolean);
  if (segs.length < 1 || segs.length > 2) return null;
  if (RESERVED.has(segs[0].toLowerCase())) return null;
  for (const s of segs) {
    if (!/^[a-z0-9-]+$/i.test(s)) return null;
  }
  return segs;
}

function toAbsoluteImage(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  return absoluteUrl(v.startsWith('/') ? v : `/${v}`);
}

function firstImageSlide(slides: string[] | null | undefined): string {
  for (const u of slides ?? []) {
    const s = String(u || '').trim();
    if (s && !isVideoAsset(s)) return s;
  }
  return '';
}

function pickShareImage(row: AlbumRow): string {
  const custom = String(row.share_image_url || '').trim();
  if (custom) return toAbsoluteImage(custom);
  const bg = String(row.bg_image_url || '').trim();
  if (bg) return toAbsoluteImage(bg);
  const slide = firstImageSlide(row.slide_urls);
  if (slide) return toAbsoluteImage(slide);
  return '';
}

function pickDescription(row: AlbumRow): string {
  const custom = String(row.share_description || '').trim();
  if (custom) return custom;
  const sub = String(row.subtitle || '').trim();
  if (sub) return sub;
  return String(row.title || '').trim();
}

function rowToMeta(row: AlbumRow, pagePath: string): AlbumShareMeta {
  const title = String(row.title || 'Album').trim() || 'Album';
  const pageUrl = absoluteUrl(pagePath);
  const imageUrl = pickShareImage(row);
  return {
    title,
    description: pickDescription(row),
    imageUrl,
    pageUrl,
    imageAlt: title,
  };
}

async function findBySlug(slug: string): Promise<AlbumRow | null> {
  try {
    const { data } = await createAdminClient()
      .from('album_pages')
      .select(
        'title, subtitle, slug, class_slug, bg_image_url, slide_urls, share_image_url, share_description',
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1);
    return (data?.[0] as AlbumRow | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Link cũ 1 đoạn → slug đầy đủ trường/lớp trong DB. */
async function findMigratedSlug(oneSeg: string): Promise<string | null> {
  const safe = oneSeg.replace(/[^a-z0-9-]/gi, '');
  if (!safe || safe !== oneSeg) return null;
  const compact = safe.replace(/-/g, '').toLowerCase();
  try {
    const { data } = await createAdminClient()
      .from('album_pages')
      .select('slug, class_slug')
      .eq('is_active', true)
      .like('slug', '%/%')
      .limit(400);
    const hit = (data ?? []).find((p) => {
      const last = String(p.slug || '').split('/').pop() || '';
      const cs = String(p.class_slug || '');
      return (
        last === safe ||
        cs === safe ||
        last.replace(/-/g, '').toLowerCase() === compact ||
        cs.replace(/-/g, '').toLowerCase() === compact
      );
    });
    return hit ? String(hit.slug) : null;
  } catch {
    return null;
  }
}

/** OG cho album theo pathname (1 hoặc 2 segment). */
export async function resolveAlbumShareMeta(pathname: string): Promise<AlbumShareMeta | null> {
  const segs = parseAlbumPath(pathname);
  if (!segs) return null;

  if (segs.length === 2) {
    const slug = `${segs[0]}/${segs[1]}`;
    const row = await findBySlug(slug);
    if (!row) return null;
    return rowToMeta(row, `/${slug}`);
  }

  const one = segs[0];
  let row = await findBySlug(one);
  if (row) return rowToMeta(row, `/${one}`);

  const migrated = await findMigratedSlug(one);
  if (!migrated) return null;
  row = await findBySlug(migrated);
  if (!row) return null;
  return rowToMeta(row, `/${one}`);
}

/** Next.js metadata cho trang album — không dùng banner/marketing trang chủ. */
export function metadataFromAlbumShare(meta: AlbumShareMeta, canonicalPath: string): Metadata {
  const canonical = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const ogOpts = {
    title: meta.title,
    description: meta.description,
    url: meta.pageUrl,
    imageUrl: meta.imageUrl || undefined,
    imageAlt: meta.imageAlt,
    skipDefaultOg: true as const,
  };
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical },
    openGraph: shareOpenGraph(ogOpts),
    twitter: shareTwitter(ogOpts),
  };
}

export function shouldServeAlbumShareCard(opts: {
  method: string;
  pathname: string;
  userAgent: string;
  isRsc: boolean;
  isPrefetch: boolean;
  isSearchEngine: boolean;
}): boolean {
  const { method, pathname, userAgent, isRsc, isPrefetch, isSearchEngine } = opts;
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (isRsc || isPrefetch) return false;
  if (isSearchEngine || SEARCH_ENGINE_UA.test(userAgent)) return false;
  if (!parseAlbumPath(pathname)) return false;
  return isShareCrawler(userAgent);
}
