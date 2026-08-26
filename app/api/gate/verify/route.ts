import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';
import { GATE_COOKIE, signGate } from '@/lib/gate/gate';

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string };
    const pw = String(password || '');
    if (!pw) return NextResponse.json({ success: false, error: 'Nhập mật khẩu' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from('content_gate')
      .select('password')
      .order('id')
      .limit(1);
    const stored = String(rows?.[0]?.password || '');

    if (!stored || pw !== stored) {
      return NextResponse.json({ success: false, error: 'Mật khẩu không đúng' }, { status: 401 });
    }

    // Đúng mật khẩu: ký cookie mở khoá + (nếu là thành viên) nhớ theo tài khoản.
    const token = await signGate();
    const user = await getCurrentUser();
    if (user) {
      await supabase.from('users').update({ content_unlocked: true }).eq('id', user.id);
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(GATE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
