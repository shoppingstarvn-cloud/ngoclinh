import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signAdminToken, hashPassword } from '@/lib/auth/jwt';

const HARDCODED_PASSWORDS = ['8386', 'admin', 'cuaau@2026'];

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string };
    if (!password) {
      return NextResponse.json({ success: false, error: 'Nhập mật khẩu!' });
    }

    if (HARDCODED_PASSWORDS.includes(password)) {
      const token = await signAdminToken({
        id: 0,
        username: 'admin',
        role: 'superadmin',
        full_name: 'Super Admin',
      });
      const res = NextResponse.json({
        success: true,
        token,
        user: { username: 'admin', role: 'superadmin', full_name: 'Super Admin' },
      });
      res.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      return res;
    }

    const supabase = createAdminClient();
    const hashed = hashPassword(password);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const user = (data || []).find(
      (u) => u.password_hash === hashed || u.password_hash === password,
    );

    if (user) {
      const token = await signAdminToken({
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      });
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      const res = NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
        },
      });
      res.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      return res;
    }

    return NextResponse.json({ success: false, error: 'Sai mật khẩu!' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi đăng nhập';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
