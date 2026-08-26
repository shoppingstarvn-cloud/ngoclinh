import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAlbumAccess } from '@/lib/album/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/album/comment?mediaId= → danh sách bình luận của 1 ảnh/video. */
export async function GET(req: NextRequest) {
  const mediaId = Number(new URL(req.url).searchParams.get('mediaId') || 0);
  if (!mediaId) return NextResponse.json({ ok: false, error: 'Thiếu mediaId' }, { status: 400 });
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('album_comments')
    .select('id, user_name, content, created_at')
    .eq('media_id', mediaId)
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json({ ok: true, comments: data ?? [] });
}

/** POST /api/album/comment {mediaId, content} — chỉ thành viên đã mở khoá. */
export async function POST(req: NextRequest) {
  const access = await getAlbumAccess();
  if (!access.loggedIn || !access.unlocked) {
    return NextResponse.json({ ok: false, locked: true, error: 'Cần đăng nhập & mở khoá' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { mediaId?: number; content?: string };
  const mediaId = Number(body.mediaId || 0);
  const content = String(body.content || '').trim().slice(0, 2000);
  if (!mediaId || !content) {
    return NextResponse.json({ ok: false, error: 'Thiếu nội dung' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('album_comments')
    .insert({ media_id: mediaId, user_id: access.userId, user_name: access.userName, content })
    .select('id, user_name, content, created_at')
    .limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, comment: data?.[0] });
}
