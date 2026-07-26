import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { classifyContentByPath, fetchDetailByPath } from '@/lib/data/detail';
import { getHomepageData } from '@/lib/data/homepage';
import { createClient } from '@/lib/supabase/server';
import { extractBodyHtml, extractH1, extractTitle, readLegacyHtml } from '@/lib/legacy-html';

type PageProps = { params: Promise<{ path: string[] }> };

/**
 * Legacy URLs: /index.php/tin-tuc/...-n32.html → /legacy/tin-tuc/...-n32.html
 * (rewrite nội bộ trong middleware.ts, URL hiển thị cho người dùng KHÔNG đổi).
 *
 * Khớp nội dung động CHÍNH XÁC như detail-sync.js cũ: đọc <h1> của file
 * HTML tĩnh gốc trong public/index.php/... → sinh slug → tra Supabase.
 * File tĩnh luôn là fallback an toàn nếu Supabase chưa có / lỗi mạng.
 */
function loadStaticSource(path: string[]) {
  const relativePath = `index.php/${path.join('/')}`;
  const html = readLegacyHtml(relativePath);
  if (!html) return null;
  return { html, title: extractH1(html) || extractTitle(html) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params;
  const pathname = `/index.php/${path.join('/')}`;
  const source = loadStaticSource(path);

  const supabase = await createClient();
  const detail = source?.title
    ? await fetchDetailByPath(supabase, pathname, source.title)
    : null;

  return {
    title: detail?.title || source?.title || path[path.length - 1]?.replace(/\.html$/i, ''),
    alternates: { canonical: pathname },
  };
}

export default async function LegacyDetailPage({ params }: PageProps) {
  const { path } = await params;
  const pathname = `/index.php/${path.join('/')}`;

  const source = loadStaticSource(path);
  if (!source) notFound(); // Không có file gốc lẫn bản ghi CMS nào tương ứng

  const supabase = await createClient();
  const detail = source.title
    ? await fetchDetailByPath(supabase, pathname, source.title)
    : null;

  const { settings, menus } = await getHomepageData();
  const isProduct = classifyContentByPath(pathname) === 'products';

  if (detail) {
    return (
      <SiteShell settings={settings} menus={menus}>
        <div className="container body_bg">
          <article className="news_page">
            <h1>{detail.title}</h1>
            <div
              className={isProduct ? 'detail_product detail-content' : 'content_news_page detail-content'}
              dangerouslySetInnerHTML={{ __html: detail.content }}
            />
          </article>
        </div>
      </SiteShell>
    );
  }

  // Không khớp bản ghi Supabase (hoặc nội dung rỗng) → giữ nguyên HTML tĩnh gốc
  return (
    <div
      className="legacy-static-page"
      dangerouslySetInnerHTML={{ __html: extractBodyHtml(source.html) }}
    />
  );
}

export const dynamic = 'force-dynamic';
