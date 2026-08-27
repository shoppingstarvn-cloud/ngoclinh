import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import AlbumView from '@/components/album/AlbumView';
import { absoluteUrl, shareOpenGraph, shareTwitter } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Cùng param [slug] với app/[slug]/page.tsx — Next.js không cho [slug] và [school] cạnh nhau. */
type PageProps = { params: Promise<{ slug: string; klass: string }> };

async function findAlbum(albumSlug: string): Promise<{ title: string } | null> {
  try {
    const { data } = await createAdminClient()
      .from('album_pages').select('title').eq('slug', albumSlug).eq('is_active', true).limit(1);
    return data?.[0] ? { title: String(data[0].title) } : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, klass } = await params;
  const albumSlug = `${decodeURIComponent(slug)}/${decodeURIComponent(klass)}`;
  const a = await findAlbum(albumSlug);
  if (!a) return { title: 'Trang con' };
  const url = absoluteUrl(`/${albumSlug}`);
  return { title: a.title, alternates: { canonical: `/${albumSlug}` }, openGraph: shareOpenGraph({ title: a.title, url }), twitter: shareTwitter({ title: a.title }) };
}

/** Trang con 2 tầng: /{trường}/{lớp} (vd /tranvanon/1a5). Giữ nguyên slug DB `truong/lop`. */
export default async function SchoolClassAlbum({ params }: PageProps) {
  const { slug, klass } = await params;
  const albumSlug = `${decodeURIComponent(slug)}/${decodeURIComponent(klass)}`;
  const a = await findAlbum(albumSlug);
  if (!a) notFound();
  return <AlbumView slug={albumSlug} />;
}
