import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAlbumAccess } from '@/lib/album/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

async function countByType(supabase: ReturnType<typeof createAdminClient>, mediaId: number) {
  const { data } = await supabase.from('album_reactions').select('type').eq('media_id', mediaId);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[r.type] = (counts[r.type] || 0) + 1;
  return counts;
}

/** GET /api/album/react?mediaId= → đếm từng loại cảm xúc + cảm xúc của tôi. */
export async function GET(req: NextRequest) {
  const mediaId = Number(new URL(req.url).searchParams.get('mediaId') || 0);
  if (!mediaId) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const counts = await countByType(supabase, mediaId);
  const access = await getAlbumAccess();
  let mine: string | null = null;
  if (access.userId) {
    const { data } = await supabase
      .from('album_reactions')
      .select('type')
      .eq('media_id', mediaId)
      .eq('user_id', access.userId)
      .limit(1);
    mine = data?.[0]?.type ?? null;
  }
  return NextResponse.json({ ok: true, counts, mine });
}

/** POST /api/album/react {mediaId, type} — bấm lại cùng loại = bỏ; khác loại = đổi. */
export async function POST(req: NextRequest) {
  const access = await getAlbumAccess();
  if (!access.loggedIn || !access.unlocked || !access.userId) {
    return NextResponse.json({ ok: false, locked: true }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { mediaId?: number; type?: string };
  const mediaId = Number(body.mediaId || 0);
  const type = String(body.type || 'like');
  if (!mediaId || !TYPES.includes(type)) {
    return NextResponse.json({ ok: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data: cur } = await supabase
    .from('album_reactions')
    .select('id, type')
    .eq('media_id', mediaId)
    .eq('user_id', access.userId)
    .limit(1);
  const existing = cur?.[0];
  let mine: string | null = type;
  if (!existing) {
    await supabase.from('album_reactions').insert({ media_id: mediaId, user_id: access.userId, type });
  } else if (existing.type === type) {
    await supabase.from('album_reactions').delete().eq('id', existing.id);
    mine = null;
  } else {
    await supabase.from('album_reactions').update({ type }).eq('id', existing.id);
  }
  const counts = await countByType(supabase, mediaId);
  return NextResponse.json({ ok: true, counts, mine });
}
