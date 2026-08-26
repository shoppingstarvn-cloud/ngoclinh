import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import AlbumView from '@/components/album/AlbumView';
import { absoluteUrl, shareOpenGraph, shareTwitter } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ school: string; klass: string }> };

async function findAlbum(slug: string): Promise<{ title: string } | null> {
  try {
    const { data } = await createAdminClient()
      .from('album_pages').select('title').eq('slug', slug).eq('is_active', true).limit(1);
    return data?.[0] ? { title: String(data[0].title) } : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { school, klass } = await params;
  const slug = `${decodeURIComponent(school)}/${decodeURIComponent(klass)}`;
  const a = await findAlbum(slug);
  if (!a) return { title: 'Trang con' };
  const url = absoluteUrl(`/${slug}`);
  return { title: a.title, alternates: { canonical: `/${slug}` }, openGraph: shareOpenGraph({ title: a.title, url }), twitter: shareTwitter({ title: a.title }) };
}

/** Trang con 2 tầng: /{trường}/{lớp} (vd /tranvanon/1a5). */
export default async function SchoolClassAlbum({ params }: PageProps) {
  const { school, klass } = await params;
  const slug = `${decodeURIComponent(school)}/${decodeURIComponent(klass)}`;
  const a = await findAlbum(slug);
  if (!a) notFound();
  return <AlbumView slug={slug} />;
}
