import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/users → danh sách thành viên toàn website (super admin). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('users')
    .select('id, username, full_name, email, role, user_kind, unit_name, class_in_charge, zalo_phone, ward, dob, is_active, provider, request_type, created_at, last_login')
    .order('created_at', { ascending: false })
    .limit(1000);
  return NextResponse.json({ ok: true, users: data ?? [] });
}

/** POST /api/admin/users → cập nhật vai trò / trạng thái. Body {id, role?, is_active?}. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const b = (await request.json().catch(() => ({}))) as { id?: number; role?: string; is_active?: boolean };
  const id = Number(b.id || 0);
  if (!id) return NextResponse.json({ ok: false, error: 'Thiếu id' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.role !== undefined) {
    const r = ['member', 'admin1', 'superadmin'].includes(b.role) ? b.role : 'member';
    patch.role = r;
  }
  if (b.is_active !== undefined) patch.is_active = !!b.is_active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'Không có thay đổi' }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('users').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
