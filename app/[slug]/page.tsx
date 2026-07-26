import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { fetchDetailBySlug } from '@/lib/data/detail';
import { getHomepageData } from '@/lib/data/homepage';
import { createClient } from '@/lib/supabase/server';
import { getLegacyPathForSlug } from '@/lib/detail-map';
import { extractBodyHtml, extractTitle, readLegacyHtml } from '@/lib/legacy-html';

const RESERVED = new Set(['legacy', 'api', 'admin', 'uploads']);

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createClient();
  const detail = await fetchDetailBySlug(supabase, decodedSlug);
  if (detail) {
    return {
      title: detail.title,
      description: detail.excerpt,
      alternates: { canonical: `/${decodedSlug}.html` },
    };
  }
  const staticHtml = readLegacyHtml(`${decodedSlug}.html`);
  if (staticHtml) return { title: extractTitle(staticHtml) };
  return { title: decodedSlug };
}

/** Dynamic route thay thế /<slug>.html + _detail-map.json redirect */
export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  if (RESERVED.has(decodedSlug)) notFound();

  const supabase = await createClient();
  const detail = await fetchDetailBySlug(supabase, decodedSlug);

  const { settings, menus } = await getHomepageData();

  if (detail) {
    return (
      <SiteShell settings={settings} menus={menus}>
        <div className="container body_bg">
          <div className="row">
            <div className="col-12">
              <article className="news_page">
                <h1>{detail.title}</h1>
                <div
                  className={`detail-content ${detail.table === 'products' ? 'detail_product' : 'content_news_page'}`}
                  dangerouslySetInnerHTML={{ __html: detail.content }}
                />
              </article>
            </div>
          </div>
        </div>
      </SiteShell>
    );
  }

  // Fallback: trang listing/tĩnh chưa migrate sang React — giữ nguyên HTML gốc
  const staticHtml = readLegacyHtml(`${decodedSlug}.html`);
  if (staticHtml) {
    return (
      <div
        className="legacy-static-page"
        dangerouslySetInnerHTML={{ __html: extractBodyHtml(staticHtml) }}
      />
    );
  }

  const legacy = getLegacyPathForSlug(decodedSlug);
  if (legacy) {
    const legacyHtml = readLegacyHtml(legacy.replace(/^\//, ''));
    if (legacyHtml) {
      return (
        <div
          className="legacy-static-page"
          dangerouslySetInnerHTML={{ __html: extractBodyHtml(legacyHtml) }}
        />
      );
    }
  }

  notFound();
}

export const dynamic = 'force-dynamic';
