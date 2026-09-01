/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { assetUrl } from '@/lib/slug';
import { isVideoAsset } from '@/lib/media-url';
import { SITE_URL, shareOpenGraph, shareTwitter } from '@/lib/seo';
import ShareBar from '@/components/ui/ShareBar';

export const revalidate = 300;

type Resolved = {
  title: string;
  description: string;
  isVideo: boolean;
  imageUrl: string; // ảnh OG (xem trước)
  playSrc: string; // nguồn phát (ảnh gốc hoặc file video)
  youtubeUrl: string;
  ytId: string | null;
  back: string; // link quay về (album hoặc trang chủ)
};

function ytId(url?: string | null): string | null {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : null;
}

async function resolve(kind: string, id: string): Promise<Resolved | null> {
  const sb = createAdminClient();
  const nid = Number(id);
  if (!nid) return null;

  if (kind === 'am') {
    const { data } = await sb
      .from('album_media')
      .select('id,kind,url,name,block_id')
      .eq('id', nid)
      .maybeSingle();
    if (!data) return null;
    const isVid = data.kind === 'video' || isVideoAsset(data.url);
    let back = '/';
    const { data: blk } = await sb
      .from('album_blocks')
      .select('page_id')
      .eq('id', data.block_id)
      .maybeSingle();
    if (blk) {
      const { data: pg } = await sb
        .from('album_pages')
        .select('slug')
        .eq('id', blk.page_id)
        .maybeSingle();
      if (pg?.slug) back = '/' + pg.slug;
    }
    return {
      title: data.name || 'Ảnh · Ngọc Linh',
      description: 'Xem thêm ảnh & video tại Ngọc Linh · Hệ sinh thái AI.',
      isVideo: isVid,
      imageUrl: isVid ? '' : assetUrl(data.url),
      playSrc: data.url,
      youtubeUrl: '',
      ytId: null,
      back,
    };
  }

  if (kind === 'ai') {
    const { data } = await sb
      .from('activity_images')
      .select('id,title,image_url')
      .eq('id', nid)
      .maybeSingle();
    if (!data) return null;
    const isVid = isVideoAsset(data.image_url);
    return {
      title: data.title || 'Hình ảnh hoạt động · Ngọc Linh',
      description: 'Xem thêm hình ảnh hoạt động tại Ngọc Linh · Hệ sinh thái AI.',
      isVideo: isVid,
      imageUrl: isVid ? '' : assetUrl(data.image_url),
      playSrc: data.image_url,
      youtubeUrl: '',
      ytId: null,
      back: '/',
    };
  }

  if (kind === 'vd') {
    const { data } = await sb.from('videos').select('*').eq('id', nid).maybeSingle();
    if (!data) return null;
    const yid = ytId(data.youtube_url);
    const thumb = data.thumbnail_url
      ? assetUrl(data.thumbnail_url)
      : yid
        ? `https://img.youtube.com/vi/${yid}/hqdefault.jpg`
        : '';
    return {
      title: data.title || 'Video hoạt động · Ngọc Linh',
      description: data.description || 'Xem video tại Ngọc Linh · Hệ sinh thái AI.',
      isVideo: true,
      imageUrl: thumb,
      playSrc: data.embed_url || '',
      youtubeUrl: data.youtube_url || '',
      ytId: yid,
      back: '/',
    };
  }

  if (kind === 'ph') {
    const { data } = await sb.from('photos').select('*').eq('id', nid).maybeSingle();
    if (!data) return null;
    const url = data.image_url || data.url || '';
    const isVid = isVideoAsset(url);
    return {
      title: data.title || 'Ảnh · Ngọc Linh',
      description: 'Xem thêm ảnh tại Ngọc Linh · Hệ sinh thái AI.',
      isVideo: isVid,
      imageUrl: isVid ? '' : assetUrl(url),
      playSrc: url,
      youtubeUrl: '',
      ytId: null,
      back: '/',
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}): Promise<Metadata> {
  const { kind, id } = await params;
  const r = await resolve(kind, id);
  const url = `${SITE_URL}/s/${kind}/${id}`;
  if (!r) {
    return { title: 'Ngọc Linh · Hệ sinh thái AI', alternates: { canonical: url } };
  }
  return {
    title: r.title,
    description: r.description,
    alternates: { canonical: url },
    openGraph: shareOpenGraph({
      title: r.title,
      description: r.description,
      url,
      imageUrl: r.imageUrl || undefined,
    }),
    twitter: shareTwitter(),
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  const r = await resolve(kind, id);

  if (!r) {
    return (
      <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#334155', marginBottom: 12 }}>Nội dung không tồn tại hoặc đã bị xoá.</p>
          <Link href="/" style={homeBtn}>← Về ngoclinh.shopmartai.com</Link>
        </div>
      </main>
    );
  }

  const sharePath = `/s/${kind}/${id}`;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px 40px', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={homeBtn}>← Về ngoclinh.shopmartai.com</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0b2b53', margin: '6px 0 12px' }}>{r.title}</h1>

      <Link href={r.back} style={{ display: 'block', borderRadius: 14, overflow: 'hidden', background: '#0b2b53' }}>
        {r.isVideo ? (
          r.ytId ? (
            <img
              src={r.imageUrl || `https://img.youtube.com/vi/${r.ytId}/hqdefault.jpg`}
              alt={r.title}
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />
          ) : r.playSrc ? (
            <video src={assetUrl(r.playSrc)} controls playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
          ) : r.imageUrl ? (
            <img src={r.imageUrl} alt={r.title} style={{ width: '100%', display: 'block' }} />
          ) : null
        ) : (
          <img src={r.imageUrl || assetUrl(r.playSrc)} alt={r.title} style={{ width: '100%', display: 'block' }} />
        )}
      </Link>

      {r.isVideo && r.ytId && (
        <div style={{ marginTop: 12, position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${r.ytId}?rel=0`}
            title={r.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      )}

      {r.description && <p style={{ color: '#475569', marginTop: 12 }}>{r.description}</p>}

      <ShareBar sharePath={sharePath} title={r.title} isVideo={r.isVideo} youtubeUrl={r.youtubeUrl} />

      <div style={{ marginTop: 18 }}>
        <Link href={r.back} style={homeBtn}>Xem thêm ảnh &amp; video →</Link>
      </div>
    </main>
  );
}

const homeBtn = {
  display: 'inline-block',
  background: '#0b2b53',
  color: '#fff',
  textDecoration: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontWeight: 700,
  fontSize: 14,
} as const;
