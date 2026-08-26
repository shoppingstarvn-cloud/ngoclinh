import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/auth/password';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Nhập email và mật khẩu' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1);
    const user = rows?.[0];

    // Thông báo chung để không lộ email có tồn tại hay không.
    const badCreds = NextResponse.json(
      { success: false, error: 'Email hoặc mật khẩu không đúng' },
      { status: 401 },
    );
    if (!user) return badCreds;

    if (!user.password_hash) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản này đăng nhập bằng Google. Hãy bấm "Đăng nhập với Google".' },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return badCreds;

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

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
    const message = e instanceof Error ? e.message : 'Lỗi đăng nhập';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
