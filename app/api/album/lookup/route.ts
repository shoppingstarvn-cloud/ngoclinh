import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAlbumAccess } from '@/lib/album/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/album/lookup?slug=...  (slug có thể 2 tầng: 'tranvanon/1a5').
 *  Trả page + blocks; chưa đăng nhập -> locked. */
export async function GET(req: NextRequest) {
  const slug = String(new URL(req.url).searchParams.get('slug') || '');
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { data: pages } = await supabase
    .from('album_pages').select('*').eq('slug', slug).eq('is_active', true).limit(1);
  const page = pages?.[0];
  if (!page) return NextResponse.json({ ok: false, notFound: true }, { status: 404 });

  const access = await getAlbumAccess();
  const base = {
    ok: true, loggedIn: access.loggedIn, unlocked: access.unlocked,
    page: {
      slug: page.slug, title: page.title, subtitle: page.subtitle || '',
      bg_image_url: page.bg_image_url || '',
      slide_urls: Array.isArray(page.slide_urls) ? page.slide_urls : [],
    },
  };
  if (!access.loggedIn) return NextResponse.json({ ...base, locked: true, blocks: [] });

  const { data: blocks } = await supabase
    .from('album_blocks').select('id, title, cover_url, display_order')
    .eq('page_id', page.id).eq('is_active', true)
    .order('display_order', { ascending: true }).order('id', { ascending: true });
  const ids = (blocks ?? []).map((b) => b.id);
  const counts: Record<number, { photos: number; videos: number }> = {};
  if (ids.length) {
    const { data: media } = await supabase.from('album_media').select('block_id, kind').in('block_id', ids);
    for (const m of media ?? []) {
      const c = (counts[m.block_id] ||= { photos: 0, videos: 0 });
      if (m.kind === 'video') c.videos++; else c.photos++;
    }
  }
  const outBlocks = (blocks ?? []).map((b) => ({
    id: b.id, title: b.title, cover_url: b.cover_url || '',
    photos: counts[b.id]?.photos || 0, videos: counts[b.id]?.videos || 0,
  }));
  return NextResponse.json({ ...base, locked: false, blocks: outBlocks });
}
