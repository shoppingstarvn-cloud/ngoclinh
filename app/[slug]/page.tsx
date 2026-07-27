import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { ProjectsListing } from '@/components/listings/ProjectsListing';
import { fetchDetailBySlug } from '@/lib/data/detail';
import { getHomepageData } from '@/lib/data/homepage';
import { createClient } from '@/lib/supabase/server';
import { getLegacyPathForSlug } from '@/lib/detail-map';
import { extractBodyHtml, extractTitle, readLegacyHtml } from '@/lib/legacy-html';

const RESERVED = new Set(['legacy', 'api', 'admin', 'uploads']);

/** Trang listing lấy từ Supabase thay vì HTML tĩnh cũ */
const PROJECT_LISTING_SLUGS = new Set(['du-an-a3', 'du-an']);

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).replace(/\.html$/i, '');
  if (PROJECT_LISTING_SLUGS.has(decodedSlug)) {
    return { title: 'Dự án tiêu biểu', alternates: { canonical: `/${decodedSlug}.html` } };
  }
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
  const decodedSlug = decodeURIComponent(slug).replace(/\.html$/i, '');

  if (RESERVED.has(decodedSlug)) notFound();

  const supabase = await createClient();
  const home = await getHomepageData();
  const shellProps = {
    settings: home.settings,
    menus: home.menus,
    links: home.links,
    categories: home.categories,
  };

  if (PROJECT_LISTING_SLUGS.has(decodedSlug)) {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    return (
      <SiteShell {...shellProps}>
        <ProjectsListing title="Dự án tiêu biểu" projects={projects ?? []} />
      </SiteShell>
    );
  }

  const detail = await fetchDetailBySlug(supabase, decodedSlug);

  if (detail) {
    return (
      <SiteShell {...shellProps}>
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
