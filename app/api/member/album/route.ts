import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';
import { slugifyVi } from '@/lib/album/album';
import { noAccent } from '@/lib/slug';
import { createResumableSession, finalizeFile, deleteFile } from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Me = { id: number; role: string; unit_name: string; class_in_charge: string };

async function getMe(): Promise<Me | null> {
  const u = await getCurrentUser();
  if (!u) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('users').select('role, unit_name, class_in_charge').eq('id', u.id).limit(1);
  const row = data?.[0];
  if (!row || (row.role !== 'admin1' && row.role !== 'superadmin')) return null;
  return { id: u.id, role: String(row.role), unit_name: String(row.unit_name || ''), class_in_charge: String(row.class_in_charge || '') };
}

/** Tự thêm menu cấp 2 (tên lớp) cho 2 trường đặc biệt, dưới menu cấp 1 = tên trường. */
async function maybeAddSchoolMenu(supabase: ReturnType<typeof createAdminClient>, unit: string, className: string, slug: string) {
  const key = noAccent(unit).toLowerCase();
  const isSpecial = key.includes('truong cong dinh') || key.includes('nguyen cong tru');
  if (!isSpecial) return;
  const like = key.includes('truong cong dinh') ? '%Trương Công Định%' : '%Nguyễn Công Trứ%';
  const { data: parents } = await supabase.from('menus').select('id').ilike('label', like).is('parent_id', null).limit(1);
  let parentId = parents?.[0]?.id as number | undefined;
  if (!parentId) {
    const { data: anyP } = await supabase.from('menus').select('id').ilike('label', like).limit(1);
    parentId = anyP?.[0]?.id as number | undefined;
  }
  if (!parentId) return;
  const url = `/${slug}`;
  const { data: existed } = await supabase.from('menus').select('id').eq('parent_id', parentId).eq('url', url).limit(1);
  if (existed?.[0]) return;
  await supabase.from('menus').insert({ label: className, url, parent_id: parentId, is_active: true, display_order: 0 });
}

/** Lấy (hoặc tạo) trang con của chính Admin cấp 1 này. */
async function ensurePage(me: Me) {
  const supabase = createAdminClient();
  const { data: mine } = await supabase.from('album_pages').select('*').eq('owner_user_id', me.id).order('id').limit(1);
  if (mine?.[0]) return mine[0];
  const school = slugifyVi(me.unit_name) || `truong-${me.id}`;
  const klass = slugifyVi(me.class_in_charge) || 'lop';
  const slug = `${school}/${klass}`;
  const { data, error } = await supabase.from('album_pages').insert({
    slug, title: me.class_in_charge || 'Lớp của tôi',
    subtitle: `Nhật ký · Album ${me.unit_name}`,
    owner_user_id: me.id, school_slug: school, class_slug: klass, is_active: true,
  }).select('*').single();
  if (error) throw error;
  await maybeAddSchoolMenu(supabase, me.unit_name, me.class_in_charge || 'Lớp', slug);
  return data;
}

export async function GET() {
  const me = await getMe();
  if (!me) return NextResponse.json({ ok: false, forbidden: true }, { status: 403 });
  const supabase = createAdminClient();
  const page = await ensurePage(me);
  const { data: blocks } = await supabase.from('album_blocks')
    .select('id, title, cover_url, display_order').eq('page_id', page.id)
    .order('display_order', { ascending: true }).order('id', { ascending: true });
  const ids = (blocks ?? []).map((b) => b.id);
  const counts: Record<number, { photos: number; videos: number }> = {};
  if (ids.length) {
    const { data: media } = await supabase.from('album_media').select('block_id, kind').in('block_id', ids);
    for (const m of media ?? []) { const c = (counts[m.block_id] ||= { photos: 0, videos: 0 }); if (m.kind === 'video') c.videos++; else c.photos++; }
  }
  return NextResponse.json({
    ok: true,
    page: { id: page.id, slug: page.slug, title: page.title, subtitle: page.subtitle || '', bg_image_url: page.bg_image_url || '', slide_urls: page.slide_urls || [] },
    blocks: (blocks ?? []).map((b) => ({ ...b, ...(counts[b.id] || { photos: 0, videos: 0 }) })),
  });
}

export async function POST(request: NextRequest) {
  const me = await getMe();
  if (!me) return NextResponse.json({ ok: false, forbidden: true }, { status: 403 });
  const supabase = createAdminClient();
  const page = await ensurePage(me);
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action || '');

  async function ownsBlock(blockId: number): Promise<boolean> {
    const { data } = await supabase.from('album_blocks').select('id').eq('id', blockId).eq('page_id', page.id).limit(1);
    return !!data?.[0];
  }

  try {
    if (action === 'savePage') {
      await supabase.from('album_pages').update({
        subtitle: String(b.subtitle || ''), bg_image_url: String(b.bg_image_url || ''),
        slide_urls: Array.isArray(b.slide_urls) ? b.slide_urls : [], updated_at: new Date().toISOString(),
      }).eq('id', page.id);
      return NextResponse.json({ ok: true });
    }
    if (action === 'addBlock') {
      const title = String(b.title || '').trim();
      if (!title) return NextResponse.json({ ok: false, error: 'Thiếu tên khối' }, { status: 400 });
      await supabase.from('album_blocks').insert({ page_id: page.id, title, cover_url: String(b.cover_url || ''), is_active: true });
      return NextResponse.json({ ok: true });
    }
    if (action === 'delBlock') {
      const id = Number(b.id || 0);
      if (!(await ownsBlock(id))) return NextResponse.json({ ok: false }, { status: 403 });
      await supabase.from('album_blocks').delete().eq('id', id);
      return NextResponse.json({ ok: true });
    }
    if (action === 'addMedia') {
      const blockId = Number(b.blockId || 0);
      if (!(await ownsBlock(blockId))) return NextResponse.json({ ok: false }, { status: 403 });
      const items = Array.isArray(b.items) ? (b.items as Array<{ kind?: string; url?: string; driveFileId?: string; name?: string }>) : [];
      const { data: last } = await supabase.from('album_media').select('display_order').eq('block_id', blockId).order('display_order', { ascending: false }).limit(1);
      let ord = Number(last?.[0]?.display_order || 0);
      const rows = items.filter((it) => it.url).map((it) => ({
        block_id: blockId, kind: it.kind === 'video' ? 'video' : 'image',
        url: String(it.url), drive_file_id: String(it.driveFileId || ''), name: String(it.name || ''), display_order: ++ord,
      }));
      if (rows.length) await supabase.from('album_media').insert(rows);
      return NextResponse.json({ ok: true, added: rows.length });
    }
    if (action === 'delMedia') {
      const id = Number(b.id || 0);
      const { data: m } = await supabase.from('album_media').select('drive_file_id, block_id').eq('id', id).limit(1);
      const row = m?.[0];
      if (!row || !(await ownsBlock(Number(row.block_id)))) return NextResponse.json({ ok: false }, { status: 403 });
      await supabase.from('album_media').delete().eq('id', id);
      if (row.drive_file_id) await deleteFile(String(row.drive_file_id)).catch(() => {});
      return NextResponse.json({ ok: true });
    }
    if (action === 'driveSession') {
      const origin = request.headers.get('origin') || (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');
      const uploadUrl = await createResumableSession(String(b.filename || 'file'), String(b.mimeType || 'application/octet-stream'), origin);
      return NextResponse.json({ ok: true, uploadUrl });
    }
    if (action === 'driveRegister') {
      const fin = await finalizeFile(String(b.file_id || ''), String(b.original_name || ''), String(b.file_type || ''));
      return NextResponse.json({ ok: true, url: fin.url, fileId: fin.fileId });
    }
    return NextResponse.json({ ok: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Lỗi' }, { status: 500 });
  }
}
