import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLS_FULL =
  'id, username, full_name, email, role, user_kind, unit_name, class_in_charge, zalo_phone, ward, dob, is_active, provider, request_type, request_status, request_at, request_reviewed_at, created_at, last_login';
const COLS_FALLBACK =
  'id, username, full_name, email, role, user_kind, unit_name, class_in_charge, zalo_phone, ward, dob, is_active, provider, request_type, created_at, last_login';

function missingRequestStatus(message: string | undefined) {
  return /request_status|request_at|request_reviewed_at/i.test(message || '');
}

/** GET /api/admin/users → danh sách thành viên toàn website (super admin). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const first = await supabase
    .from('users')
    .select(COLS_FULL)
    .order('created_at', { ascending: false })
    .limit(1000);
  const q =
    first.error && missingRequestStatus(first.error.message)
      ? await supabase
          .from('users')
          .select(COLS_FALLBACK)
          .order('created_at', { ascending: false })
          .limit(1000)
      : first;
  if (q.error) return NextResponse.json({ ok: false, error: q.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: q.data ?? [] });
}

/** POST /api/admin/users → vai trò / khoá / phê duyệt đề nghị.
 *  Body { id, role?, is_active?, request_status? }.
 *  request_status=approved → bổ nhiệm Admin cấp 1 (giữ Super Admin nếu đã là SA). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const b = (await request.json().catch(() => ({}))) as {
    id?: number;
    role?: string;
    is_active?: boolean;
    request_status?: string;
  };
  const id = Number(b.id || 0);
  if (!id) return NextResponse.json({ ok: false, error: 'Thiếu id' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: existing, error: readErr } = await supabase
    .from('users')
    .select('id, role, request_type')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (b.role !== undefined) {
    patch.role = ['member', 'admin1', 'superadmin'].includes(b.role) ? b.role : 'member';
  }
  if (b.is_active !== undefined) patch.is_active = !!b.is_active;

  if (b.request_status !== undefined) {
    const s = ['pending', 'approved', 'rejected'].includes(b.request_status) ? b.request_status : '';
    if (!s) return NextResponse.json({ ok: false, error: 'Trạng thái đề nghị không hợp lệ' }, { status: 400 });
    patch.request_status = s;
    patch.request_reviewed_at = new Date().toISOString();
    if (s === 'approved' && b.role === undefined && existing.role !== 'superadmin') {
      patch.role = 'admin1';
    }
  } else if (b.role === 'admin1' && existing.role !== 'admin1') {
    patch.request_status = 'approved';
    patch.request_reviewed_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'Không có thay đổi' }, { status: 400 });

  let { error } = await supabase.from('users').update(patch).eq('id', id);
  if (error && missingRequestStatus(error.message)) {
    const slim = { ...patch };
    delete slim.request_status;
    delete slim.request_at;
    delete slim.request_reviewed_at;
    if (Object.keys(slim).length === 0) {
      return NextResponse.json({ ok: true, warning: 'Chưa có cột request_status — hãy chạy sql/08_USER_REQUEST_STATUS.sql' });
    }
    const retry = await supabase.from('users').update(slim).eq('id', id);
    error = retry.error;
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
