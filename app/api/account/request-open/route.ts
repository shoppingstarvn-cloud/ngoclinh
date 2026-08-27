import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/auth/password';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';
import { getCurrentUser } from '@/lib/auth/user-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function missingRequestStatus(message: string | undefined) {
  return /request_status|request_at|request_reviewed_at/i.test(message || '');
}

/** Hồ sơ khai báo trên form Đề nghị mở Website / Đăng ký thông tin. */
function profileFromBody(
  b: Record<string, string>,
  requestType: string,
  userKind: string,
  forInsert: boolean,
  existingRole?: string | null,
) {
  const now = new Date().toISOString();
  const full_name = String(b.full_name || '').trim();
  const dob = b.dob ? String(b.dob).slice(0, 10) : '';
  const zalo_phone = String(b.zalo_phone || '').trim();
  const unit_name = String(b.unit_name || '').trim();
  const ward = String(b.ward || '').trim();
  const class_in_charge = String(b.class_in_charge || '').trim();
  const alreadyAdmin = existingRole === 'admin1' || existingRole === 'superadmin';
  const row: Record<string, unknown> = {
    user_kind: userKind,
    request_type: requestType,
    request_status: alreadyAdmin ? 'approved' : 'pending',
    request_at: now,
  };
  if (!alreadyAdmin) row.request_reviewed_at = null;
  if (forInsert || full_name) row.full_name = full_name;
  if (forInsert || dob) row.dob = dob || null;
  if (forInsert || zalo_phone) row.zalo_phone = zalo_phone;
  if (forInsert || unit_name) row.unit_name = unit_name;
  if (forInsert || ward) row.ward = ward;
  if (forInsert || class_in_charge) row.class_in_charge = class_in_charge;
  return row;
}

function stripStatusCols(row: Record<string, unknown>) {
  const next = { ...row };
  delete next.request_status;
  delete next.request_at;
  delete next.request_reviewed_at;
  return next;
}

/** POST /api/account/request-open — form "Đề nghị mở Website / Quản Trị".
 *  - Nếu ĐANG đăng nhập: cập nhật hồ sơ + gắn nguồn đề nghị (không tạo tài khoản mới).
 *  - Nếu CHƯA đăng nhập: tạo tài khoản kèm hồ sơ rồi đăng nhập luôn. */
export async function POST(request: NextRequest) {
  try {
    const b = (await request.json()) as Record<string, string>;
    const request_type0 = b.request_type === 'admin' ? 'admin' : 'website';
    const user_kind0 = b.user_kind === 'student' ? 'student' : 'teacher';

    // ĐÃ ĐĂNG NHẬP -> cập nhật hồ sơ của chính người đó
    const current = await getCurrentUser();
    if (current) {
      if (!String(b.full_name || '').trim()) return NextResponse.json({ success: false, error: 'Nhập họ và tên' }, { status: 400 });
      if (!String(b.dob || '').slice(0, 10)) return NextResponse.json({ success: false, error: 'Chọn ngày tháng năm sinh' }, { status: 400 });
      const supabase = createAdminClient();
      const { data: meRow } = await supabase.from('users').select('role').eq('id', current.id).maybeSingle();
      const profile = profileFromBody(b, request_type0, user_kind0, false, meRow?.role);
      const email = String(b.email || '').trim().toLowerCase();
      const patch: Record<string, unknown> = { ...profile };
      if (EMAIL_RE.test(email) && email !== String(current.email || '').toLowerCase()) {
        const { data: dupE } = await supabase.from('users').select('id').eq('email', email).neq('id', current.id).limit(1);
        if (dupE && dupE.length) return NextResponse.json({ success: false, error: 'Email này đã được đăng ký' }, { status: 409 });
        patch.email = email;
      }

      let { error } = await supabase.from('users').update(patch).eq('id', current.id);
      if (error && missingRequestStatus(error.message)) {
        const retry = await supabase.from('users').update(stripStatusCols(patch)).eq('id', current.id);
        error = retry.error;
      }
      if (error) throw error;

      const { data: fresh } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', current.id)
        .maybeSingle();
      return NextResponse.json({
        success: true,
        user: {
          id: current.id,
          email: fresh?.email || current.email,
          full_name: fresh?.full_name || current.full_name,
          avatar_url: fresh?.avatar_url || current.avatar_url,
          role: fresh?.role || 'member',
        },
      });
    }
    const username = String(b.username || '').trim();
    const password = String(b.password || '');
    const email = String(b.email || '').trim().toLowerCase();
    const full_name = String(b.full_name || '').trim();
    const user_kind = user_kind0;
    const request_type = request_type0;

    if (!full_name) return NextResponse.json({ success: false, error: 'Nhập họ và tên' }, { status: 400 });
    if (!String(b.dob || '').slice(0, 10)) return NextResponse.json({ success: false, error: 'Chọn ngày tháng năm sinh' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ success: false, error: 'Email không hợp lệ' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ success: false, error: 'Mật khẩu phải từ 6 ký tự' }, { status: 400 });
    if (username.length < 3) return NextResponse.json({ success: false, error: 'Tên đăng nhập từ 3 ký tự' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: dupE } = await supabase.from('users').select('id').eq('email', email).limit(1);
    if (dupE && dupE.length) return NextResponse.json({ success: false, error: 'Email này đã được đăng ký' }, { status: 409 });
    const { data: dupU } = await supabase.from('users').select('id').ilike('username', username).limit(1);
    if (dupU && dupU.length) return NextResponse.json({ success: false, error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });

    const password_hash = await hashPassword(password);
    const row = {
      username,
      email,
      password_hash,
      provider: 'email',
      is_active: true,
      role: 'member',
      last_login: new Date().toISOString(),
      ...profileFromBody(b, request_type, user_kind, true),
      full_name,
    };

    let ins = await supabase.from('users').insert(row).select('id, email, full_name, avatar_url, role').single();
    if (ins.error && missingRequestStatus(ins.error.message)) {
      ins = await supabase.from('users').insert(stripStatusCols(row)).select('id, email, full_name, avatar_url, role').single();
    }
    if (ins.error) throw ins.error;
    const data = ins.data;
    if (!data) throw new Error('Không tạo được tài khoản');

    const token = await signMemberToken({ id: data.id, email: data.email, full_name: data.full_name, avatar_url: data.avatar_url });
    const res = NextResponse.json({
      success: true,
      user: { id: data.id, email: data.email, full_name: data.full_name, avatar_url: data.avatar_url, role: data.role || 'member' },
    });
    res.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gửi đề nghị thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
