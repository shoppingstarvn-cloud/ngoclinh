import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { ProjectsListing } from '@/components/listings/ProjectsListing';
import { fetchDetailBySlug } from '@/lib/data/detail';
import { getHomepageData } from '@/lib/data/homepage';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AlbumView from '@/components/album/AlbumView';
import { getLegacyPathForSlug } from '@/lib/detail-map';
import { extractBodyHtml, extractTitle, readLegacyHtml } from '@/lib/legacy-html';
import { SHARE_DESCRIPTION, absoluteUrl, shareOpenGraph, shareTwitter } from '@/lib/seo';
import { resolveHref } from '@/lib/slug';
import { isImageAttachment, isVideoAttachment } from '@/lib/media-url';
import MediaAsset from '@/components/ui/MediaAsset';

const RESERVED = new Set(['legacy', 'api', 'admin', 'uploads']);

/** Trang con Album (vd /lop1a3): trả tiêu đề nếu slug là 1 trang con đang bật. */
async function getAlbumTitle(slug: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient()
      .from('album_pages')
      .select('title')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1);
    return data?.[0] ? String(data[0].title) : null;
  } catch {
    return null;
  }
}

/**
 * Tìm "Link đích" (link_url) TRỎ RA NGOÀI của bản ghi khớp slug (dự án/sản phẩm/
 * danh mục). Nếu có -> trang chi tiết sẽ redirect thẳng, KHÔNG mở trang nội bộ.
 * Fix triệt để: link đích đã nhập nhưng vẫn kẹt ở slug nội bộ / 404.
 */
async function findExternalLinkForSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
): Promise<string | null> {
  const tables = ['projects', 'products', 'categories'] as const;
  const results = await Promise.all(
    tables.map((t) =>
      supabase.from(t).select('link_url').eq('slug', slug).eq('is_active', true).limit(1),
    ),
  );
  for (const r of results) {
    const raw = String(r.data?.[0]?.link_url || '').trim();
    if (!raw) continue;
    const href = resolveHref(raw);
    // Chỉ chuyển hướng khi là link tuyệt đối ra ngoài và không tự trỏ lại slug này (tránh lặp).
    if (/^https?:\/\//i.test(href) && !href.includes(`/${slug}.html`)) return href;
  }
  return null;
}

/** Trang listing lấy từ Supabase thay vì HTML tĩnh cũ */
const PROJECT_LISTING_SLUGS = new Set(['du-an-a3', 'du-an']);

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).replace(/\.html$/i, '');
  const canonical = `/${decodedSlug}.html`;
  const url = absoluteUrl(canonical);

  const albumTitle = await getAlbumTitle(decodedSlug);
  if (albumTitle) {
    const cleanUrl = absoluteUrl(`/${decodedSlug}`);
    return {
      title: albumTitle,
      alternates: { canonical: `/${decodedSlug}` },
      openGraph: shareOpenGraph({ title: albumTitle, url: cleanUrl }),
      twitter: shareTwitter({ title: albumTitle }),
    };
  }

  if (PROJECT_LISTING_SLUGS.has(decodedSlug)) {
    const title = 'Dự án tiêu biểu';
    return {
      title,
      alternates: { canonical },
      openGraph: shareOpenGraph({ title, url }),
      twitter: shareTwitter({ title }),
    };
  }
  const supabase = await createClient();
  const detail = await fetchDetailBySlug(supabase, decodedSlug);
  if (detail) {
    const title = detail.title;
    const description = detail.excerpt || SHARE_DESCRIPTION;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: shareOpenGraph({ title, description, url }),
      twitter: shareTwitter({ title, description }),
    };
  }
  const staticHtml = readLegacyHtml(`${decodedSlug}.html`);
  if (staticHtml) {
    const title = extractTitle(staticHtml);
    return {
      title,
      openGraph: shareOpenGraph({ title, url }),
      twitter: shareTwitter({ title }),
    };
  }
  return {
    title: decodedSlug,
    openGraph: shareOpenGraph({ title: decodedSlug, url }),
  };
}

/** Dynamic route thay thế /<slug>.html + _detail-map.json redirect */
export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).replace(/\.html$/i, '');

  if (decodedSlug === 'ai' || decodedSlug === 'share-card' || decodedSlug === 'hsai') {
    redirect('/');
  }

  if (RESERVED.has(decodedSlug)) notFound();

  // Trang con Album (vd /lop1a3) — ưu tiên trước mọi thứ, giao diện riêng toàn màn hình.
  if (await getAlbumTitle(decodedSlug)) {
    return <AlbumView slug={decodedSlug} />;
  }

  const supabase = await createClient();

  // Ưu tiên "Link đích" ra ngoài (nếu có) -> chuyển hướng thẳng, không mở trang nội bộ.
  const externalTarget = await findExternalLinkForSlug(supabase, decodedSlug);
  if (externalTarget) redirect(externalTarget);

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
                {detail.attachments && detail.attachments.length > 0 && (
                  <div className="post-attachments" style={{ marginTop: 28 }}>
                    {detail.attachments.some((a) => isImageAttachment(a)) && (
                      <>
                        <h3>Ảnh kèm theo</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                          {detail.attachments
                            .filter((a) => isImageAttachment(a))
                            .map((a) => (
                              <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={a.url}
                                  alt={a.name}
                                  style={{ width: 200, height: 145, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                                />
                              </a>
                            ))}
                        </div>
                      </>
                    )}
                    {detail.attachments.some((a) => isVideoAttachment(a)) && (
                      <>
                        <h3>Video kèm theo</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                          {detail.attachments
                            .filter((a) => isVideoAttachment(a))
                            .map((a) => (
                              <div key={a.url} style={{ width: 280, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                                <MediaAsset src={a.url} alt={a.name} variant="gallery" />
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                    {detail.attachments.some((a) => !isImageAttachment(a) && !isVideoAttachment(a)) && (
                      <>
                        <h3>Tài liệu đính kèm</h3>
                        <ul>
                          {detail.attachments
                            .filter((a) => !isImageAttachment(a) && !isVideoAttachment(a))
                            .map((a) => (
                              <li key={a.url}>
                                <a href={a.url} target="_blank" rel="noreferrer">
                                  📎 {a.name}
                                </a>
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
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
