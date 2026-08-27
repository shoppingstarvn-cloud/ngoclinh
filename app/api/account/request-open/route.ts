import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/auth/password';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';
import { getCurrentUser } from '@/lib/auth/user-session';
import {
  bodyToProfileForm,
  firstProfileError,
  normalizedProfile,
  validateProfileForm,
} from '@/lib/auth/profile-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function missingRequestStatus(message: string | undefined) {
  return /request_status|request_at|request_reviewed_at/i.test(message || '');
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

/** Hồ sơ khai báo trên form Đề nghị mở Website / Đăng ký thông tin. */
function profileFromNorm(
  n: ReturnType<typeof normalizedProfile>,
  requestType: string,
  existingRole?: string | null,
) {
  const now = new Date().toISOString();
  const alreadyAdmin = existingRole === 'admin1' || existingRole === 'superadmin';
  const row: Record<string, unknown> = {
    full_name: n.full_name,
    dob: n.dob || null,
    zalo_phone: n.zalo_phone,
    user_kind: n.user_kind,
    unit_name: n.unit_name,
    ward: n.ward,
    class_in_charge: n.class_in_charge,
    request_type: requestType,
    request_status: alreadyAdmin ? 'approved' : 'pending',
    request_at: now,
  };
  if (!alreadyAdmin) row.request_reviewed_at = null;
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
    const form = bodyToProfileForm(b);

    // ĐÃ ĐĂNG NHẬP -> cập nhật hồ sơ của chính người đó
    const current = await getCurrentUser();
    if (current) {
      const errors = validateProfileForm(form, { requireAccount: false });
      if (Object.keys(errors).length) return badRequest(firstProfileError(errors));
      const n = normalizedProfile(form);
      const supabase = createAdminClient();
      const { data: meRow } = await supabase.from('users').select('role').eq('id', current.id).maybeSingle();
      const profile = profileFromNorm(n, request_type0, meRow?.role);
      const email = n.email;
      const patch: Record<string, unknown> = { ...profile };
      if (email !== String(current.email || '').toLowerCase()) {
        const { data: dupE } = await supabase.from('users').select('id').eq('email', email).neq('id', current.id).limit(1);
        if (dupE && dupE.length) return NextResponse.json({ success: false, error: 'Email này đã được đăng ký' }, { status: 409 });
        patch.email = email;
      } else {
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
    const errors = validateProfileForm(form, { requireAccount: true });
    if (Object.keys(errors).length) return badRequest(firstProfileError(errors));
    const n = normalizedProfile(form);
    const username = n.username;
    const password = n.password;
    const email = n.email;
    const full_name = n.full_name;
    const request_type = request_type0;

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
      ...profileFromNorm(n, request_type),
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
