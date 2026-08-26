import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/album/block → tạo/sửa khối (title, cover_url, thứ tự...). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const b = (await request.json().catch(() => ({}))) as {
    id?: number; page_id?: number; title?: string; cover_url?: string;
    display_order?: number; is_active?: boolean;
  };
  const title = String(b.title || '').trim();
  if (b.id) {
    const patch: Record<string, unknown> = {};
    if (b.title !== undefined) patch.title = title;
    if (b.cover_url !== undefined) patch.cover_url = String(b.cover_url || '');
    if (b.display_order !== undefined) patch.display_order = Number(b.display_order || 0);
    if (b.is_active !== undefined) patch.is_active = !!b.is_active;
    const { error } = await supabase.from('album_blocks').update(patch).eq('id', b.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: b.id });
  }
  if (!b.page_id || !title) {
    return NextResponse.json({ ok: false, error: 'Thiếu trang hoặc tên khối' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('album_blocks')
    .insert({
      page_id: Number(b.page_id),
      title,
      cover_url: String(b.cover_url || ''),
      display_order: Number(b.display_order || 0),
      is_active: b.is_active !== false,
    })
    .select('id')
    .limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.[0]?.id });
}

/** DELETE /api/admin/album/block?id= → xoá khối (cascade media). */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const id = Number(new URL(request.url).searchParams.get('id') || 0);
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('album_blocks').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
