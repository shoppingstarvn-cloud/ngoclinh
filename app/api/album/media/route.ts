import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAlbumAccess } from '@/lib/album/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/album/media?blockId=&kind=image|video&offset=&limit=
 *  Trả media của 1 khối theo lô (kéo tới đâu tải tới đó). Yêu cầu đăng nhập. */
export async function GET(req: NextRequest) {
  const access = await getAlbumAccess();
  if (!access.loggedIn) {
    return NextResponse.json({ ok: false, locked: true }, { status: 403 });
  }
  const url = new URL(req.url);
  const blockId = Number(url.searchParams.get('blockId') || 0);
  const kind = url.searchParams.get('kind') || '';
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get('limit') || 48)));
  if (!blockId) return NextResponse.json({ ok: false, error: 'Thiếu blockId' }, { status: 400 });

  const supabase = createAdminClient();
  let q = supabase
    .from('album_media')
    .select('id, kind, url, drive_file_id, name', { count: 'exact' })
    .eq('block_id', blockId);
  if (kind === 'image' || kind === 'video') q = q.eq('kind', kind);

  const { data, count } = await q
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  return NextResponse.json({ ok: true, media: data ?? [], total: count ?? 0, offset, limit });
}
