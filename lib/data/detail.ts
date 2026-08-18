import type { ContentTable } from '@/lib/cms/tables';
import { slugify } from '@/lib/slug';

/** Phân loại bảng nội dung theo URL legacy — logic từ detail-sync.js */
export function classifyContentByPath(pathname: string): ContentTable {
  const d = decodeURIComponent(pathname).toLowerCase();
  if (
    d.includes('/tin-tuc/') ||
    d.includes('/tin-chuyen-nganh/') ||
    d.includes('/tin-tuyen-dung')
  ) {
    return 'posts';
  }
  if (d.includes('/du-an/')) return 'projects';
  if (d.includes('/khach-hang/') || d.includes('/nha-cung-cap/')) return 'partners';
  if (/-p\d+\.html$/i.test(d)) {
    return /bao-?gia/.test(d) ? 'posts' : 'products';
  }
  return 'posts';
}

export function slugCandidatesFromTitle(
  title: string,
  pathname?: string,
): string[] {
  const base = slugify(title);
  const code = pathname?.match(/-((?:p|n)\d+)\.html$/i)?.[1];
  if (code) return [base, `${base}-${code.toLowerCase()}`];
  return [base];
}

export interface DetailAttachment {
  name: string;
  url: string;
  type?: string;
  kind?: string;
}

export interface DetailRecord {
  table: ContentTable;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  thumbnail_url?: string;
  attachments?: DetailAttachment[];
}

export async function fetchDetailBySlug(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  slug: string,
  pathnameHint?: string,
): Promise<DetailRecord | null> {
  const tables: ContentTable[] = pathnameHint
    ? [classifyContentByPath(pathnameHint)]
    : ['products', 'posts', 'projects', 'partners'];

  for (const table of [...new Set(tables)]) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      const content = String(data.content || '').trim();
      if (content.length < 20) continue;
      return {
        table,
        slug: data.slug,
        title: data.title || data.name || slug,
        content,
        excerpt: data.excerpt,
        thumbnail_url: data.thumbnail_url,
        attachments: Array.isArray(data.attachments) ? (data.attachments as DetailAttachment[]) : [],
      };
    }
  }
  return null;
}

export async function fetchDetailByPath(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  pathname: string,
  titleFromHtml?: string,
): Promise<DetailRecord | null> {
  const table = classifyContentByPath(pathname);
  const title = titleFromHtml || '';
  const candidates = title
    ? slugCandidatesFromTitle(title, pathname)
    : [];

  if (candidates.length) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .in('slug', candidates)
      .eq('is_active', true)
      .limit(1);

    const row = data?.[0];
    if (row && String(row.content || '').trim().length >= 20) {
      return {
        table,
        slug: row.slug,
        title: row.title || row.name,
        content: row.content,
        excerpt: row.excerpt,
        thumbnail_url: row.thumbnail_url,
        attachments: Array.isArray(row.attachments) ? (row.attachments as DetailAttachment[]) : [],
      };
    }
  }

  return null;
}
