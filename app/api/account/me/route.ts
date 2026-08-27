import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user-session';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  // Lấy vai trò + hồ sơ khai báo để form đề nghị / dashboard Super Admin đồng bộ.
  let role = 'member';
  let profile: Record<string, unknown> = {};
  try {
    const supabase = createAdminClient();
    const full =
      'role, username, full_name, email, dob, zalo_phone, user_kind, unit_name, ward, class_in_charge, request_type, request_status';
    const basic =
      'role, username, full_name, email, dob, zalo_phone, user_kind, unit_name, ward, class_in_charge, request_type';
    let { data, error } = await supabase.from('users').select(full).eq('id', user.id).limit(1);
    if (error && /request_status/i.test(error.message)) {
      const retry = await supabase.from('users').select(basic).eq('id', user.id).limit(1);
      data = retry.data;
      error = retry.error;
    }
    if (!error) {
      const row = data?.[0];
      if (row?.role) role = String(row.role);
      if (row) profile = row;
    }
  } catch { /* giữ mặc định */ }

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: (profile.email as string) || user.email,
      full_name: (profile.full_name as string) || user.full_name || '',
      avatar_url: user.avatar_url || '',
      role,
      username: profile.username ?? null,
      dob: profile.dob ?? null,
      zalo_phone: profile.zalo_phone ?? null,
      user_kind: profile.user_kind ?? null,
      unit_name: profile.unit_name ?? null,
      ward: profile.ward ?? null,
      class_in_charge: profile.class_in_charge ?? null,
      request_type: profile.request_type ?? null,
      request_status: profile.request_status ?? null,
    },
  });

  // SLIDING SESSION (giống Facebook): mỗi lần truy cập web, làm mới phiên thêm 1 năm
  // kể từ lúc này. Người dùng còn ghé thăm trong vòng 1 năm là KHÔNG BAO GIỜ bị đăng xuất.
  try {
    const fresh = await signMemberToken(user);
    res.cookies.set(MEMBER_COOKIE, fresh, memberCookieOptions());
  } catch {
    /* giữ nguyên phiên cũ nếu ký lỗi */
  }

  return res;
}
