import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { deleteFile } from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/album/media?blockId=&offset=&limit= → media của khối (quản trị). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const url = new URL(request.url);
  const blockId = Number(url.searchParams.get('blockId') || 0);
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get('limit') || 60)));
  if (!blockId) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { data, count } = await supabase
    .from('album_media')
    .select('id, kind, url, drive_file_id, name', { count: 'exact' })
    .eq('block_id', blockId)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);
  return NextResponse.json({ ok: true, media: data ?? [], total: count ?? 0 });
}

/** POST /api/admin/album/media → ghi nhận media đã upload lên Drive vào 1 khối.
 *  Body: { blockId, items: [{ kind, url, driveFileId, name }] } (ghi hàng loạt). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const b = (await request.json().catch(() => ({}))) as {
    blockId?: number;
    items?: Array<{ kind?: string; url?: string; driveFileId?: string; name?: string }>;
  };
  const blockId = Number(b.blockId || 0);
  const items = Array.isArray(b.items) ? b.items : [];
  if (!blockId || items.length === 0) {
    return NextResponse.json({ ok: false, error: 'Thiếu khối hoặc media' }, { status: 400 });
  }
  const { data: last } = await supabase
    .from('album_media')
    .select('display_order')
    .eq('block_id', blockId)
    .order('display_order', { ascending: false })
    .limit(1);
  let ord = Number(last?.[0]?.display_order || 0);

  const rows = items
    .filter((it) => it.url)
    .map((it) => ({
      block_id: blockId,
      kind: it.kind === 'video' ? 'video' : 'image',
      url: String(it.url),
      drive_file_id: String(it.driveFileId || ''),
      name: String(it.name || ''),
      display_order: ++ord,
    }));

  const { error } = await supabase.from('album_media').insert(rows);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
}

/** DELETE /api/admin/album/media?id= → xoá media (+ xoá file Drive). */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const id = Number(new URL(request.url).searchParams.get('id') || 0);
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { data } = await supabase.from('album_media').select('drive_file_id').eq('id', id).limit(1);
  const fid = data?.[0]?.drive_file_id;
  await supabase.from('album_media').delete().eq('id', id);
  if (fid) await deleteFile(String(fid)).catch(() => {});
  return NextResponse.json({ ok: true });
}
