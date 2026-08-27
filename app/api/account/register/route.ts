import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/auth/password';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';
import { markUserOnline } from '@/lib/auth/presence';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.full_name || '').trim();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'Email không hợp lệ' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Mật khẩu phải từ 6 ký tự' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, error: 'Email này đã được đăng ký' }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        full_name: fullName,
        provider: 'email',
        is_active: true,
        last_login: new Date().toISOString(),
      })
      .select('id, email, full_name, avatar_url')
      .single();
    if (error) throw error;
    await markUserOnline(data.id, 'main', true);

    const token = await signMemberToken({
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
    });
    const res = NextResponse.json({
      success: true,
      user: { id: data.id, email: data.email, full_name: data.full_name, avatar_url: data.avatar_url },
    });
    res.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi đăng ký';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
