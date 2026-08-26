import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGoogleIdToken } from '@/lib/auth/google';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { credential?: string };
    const credential = String(body.credential || '');
    if (!credential) {
      return NextResponse.json({ success: false, error: 'Thiếu credential Google' }, { status: 400 });
    }

    const profile = await verifyGoogleIdToken(credential);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Xác thực Google thất bại' }, { status: 401 });
    }

    const email = profile.email.toLowerCase();
    const supabase = createAdminClient();

    // Tìm theo google_sub hoặc email đã có.
    const { data: rows } = await supabase
      .from('users')
      .select('*')
      .or(`google_sub.eq.${profile.sub},email.eq.${email}`)
      .limit(1);
    let user = rows?.[0];

    if (!user) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email,
          full_name: profile.name || '',
          avatar_url: profile.picture || '',
          provider: 'google',
          google_sub: profile.sub,
          email_verified: profile.email_verified,
          is_active: true,
          last_login: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw error;
      user = data;
    } else {
      // Liên kết google_sub + cập nhật avatar/tên nếu còn thiếu.
      const patch: Record<string, unknown> = { last_login: new Date().toISOString() };
      if (!user.google_sub) patch.google_sub = profile.sub;
      if (!user.avatar_url && profile.picture) patch.avatar_url = profile.picture;
      if (!user.full_name && profile.name) patch.full_name = profile.name;
      await supabase.from('users').update(patch).eq('id', user.id);
      user = { ...user, ...patch };
    }

    if (user.is_active === false) {
      return NextResponse.json({ success: false, error: 'Tài khoản đã bị khóa' }, { status: 403 });
    }

    const token = await signMemberToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    });
    const res = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, full_name: user.full_name, avatar_url: user.avatar_url },
    });
    res.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi đăng nhập Google';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
