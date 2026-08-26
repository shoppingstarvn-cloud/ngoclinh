import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      new_password?: string;
    };
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const newPw = String(body.new_password || '');

    if (!email || !code) {
      return NextResponse.json({ success: false, error: 'Thiếu email hoặc mã xác minh' }, { status: 400 });
    }
    if (newPw.length < 6) {
      return NextResponse.json({ success: false, error: 'Mật khẩu mới phải từ 6 ký tự' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1);
    const user = users?.[0];
    const badCode = NextResponse.json(
      { success: false, error: 'Mã xác minh không đúng hoặc đã hết hạn' },
      { status: 400 },
    );
    if (!user) return badCode;

    const nowIso = new Date().toISOString();
    const { data: prs } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', 0)
      .gt('expires_at', nowIso)
      .order('id', { ascending: false })
      .limit(1);
    const pr = prs?.[0];
    if (!pr) return badCode;

    if (pr.attempts >= 5) {
      await supabase.from('password_resets').update({ used: 1 }).eq('id', pr.id);
      return NextResponse.json(
        { success: false, error: 'Nhập sai quá nhiều lần. Xin mã mới.' },
        { status: 429 },
      );
    }

    const ok = await verifyPassword(code, pr.code_hash);
    if (!ok) {
      await supabase.from('password_resets').update({ attempts: (pr.attempts || 0) + 1 }).eq('id', pr.id);
      return badCode;
    }

    const password_hash = await hashPassword(newPw);
    await supabase.from('users').update({ password_hash }).eq('id', user.id);
    await supabase.from('password_resets').update({ used: 1 }).eq('id', pr.id);

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
