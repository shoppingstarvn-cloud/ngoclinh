import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { slugifyVi } from '@/lib/album/album';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/album → danh sách trang con + khối + số media mỗi khối. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from('album_pages')
    .select('*')
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  const { data: blocks } = await supabase
    .from('album_blocks')
    .select('id, page_id, title, cover_url, display_order, is_active')
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  const ids = (blocks ?? []).map((b) => b.id);
  const counts: Record<number, { photos: number; videos: number }> = {};
  if (ids.length) {
    const { data: media } = await supabase.from('album_media').select('block_id, kind').in('block_id', ids);
    for (const m of media ?? []) {
      const c = (counts[m.block_id] ||= { photos: 0, videos: 0 });
      if (m.kind === 'video') c.videos++;
      else c.photos++;
    }
  }
  const blocksOut = (blocks ?? []).map((b) => ({ ...b, ...(counts[b.id] || { photos: 0, videos: 0 }) }));
  return NextResponse.json({ ok: true, pages: pages ?? [], blocks: blocksOut });
}

/** POST /api/admin/album → tạo/sửa trang con. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const b = (await request.json().catch(() => ({}))) as {
    id?: number; slug?: string; title?: string; subtitle?: string;
    bg_image_url?: string; slide_urls?: string[]; submenu_label?: string;
    is_active?: boolean; display_order?: number;
  };
  const title = String(b.title || '').trim();
  if (!title) return NextResponse.json({ ok: false, error: 'Thiếu tên trang' }, { status: 400 });
  const slug = slugifyVi(b.slug || title) || `trang-${Date.now()}`;

  const row = {
    slug,
    title,
    subtitle: String(b.subtitle || ''),
    bg_image_url: String(b.bg_image_url || ''),
    slide_urls: Array.isArray(b.slide_urls) ? b.slide_urls : [],
    submenu_label: String(b.submenu_label || ''),
    is_active: b.is_active !== false,
    display_order: Number(b.display_order || 0),
    updated_at: new Date().toISOString(),
  };

  if (b.id) {
    const { error } = await supabase.from('album_pages').update(row).eq('id', b.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: b.id, slug });
  }
  const { data, error } = await supabase.from('album_pages').insert(row).select('id').limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.[0]?.id, slug });
}

/** DELETE /api/admin/album?id= → xoá trang con (cascade khối + media). */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const id = Number(new URL(request.url).searchParams.get('id') || 0);
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('album_pages').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
