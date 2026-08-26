import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail, emailConfigured, resetCodeHtml } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();
    // LUÔN trả generic — không lộ email có tồn tại hay không (chống dò tài khoản).
    const generic = NextResponse.json({
      success: true,
      message: 'Nếu email tồn tại, mã xác minh đã được gửi.',
    });
    if (!email) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập email' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from('users')
      .select('id, email, full_name, password_hash')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1);
    const user = rows?.[0];
    if (!user) return generic;

    if (!emailConfigured()) {
      return NextResponse.json({ success: false, error: 'Máy chủ chưa cấu hình gửi email.' }, { status: 503 });
    }

    // Chống spam: bỏ qua nếu vừa gửi < 60 giây.
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabase
      .from('password_resets')
      .select('id')
      .eq('user_id', user.id)
      .eq('used', 0)
      .gt('created_at', sixtySecAgo)
      .limit(1);
    if (recent && recent.length > 0) return generic;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await hashPassword(code);
    // Vô hiệu mã cũ chưa dùng, rồi phát hành mã mới (hết hạn 15').
    await supabase.from('password_resets').update({ used: 1 }).eq('user_id', user.id).eq('used', 0);
    await supabase.from('password_resets').insert({
      user_id: user.id,
      code_hash,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });

    try {
      await sendEmail(user.email, 'Mã đặt lại mật khẩu', resetCodeHtml(code, user.full_name));
    } catch (e) {
      console.error('send reset email:', e instanceof Error ? e.message : e);
      return NextResponse.json({ success: false, error: 'Không gửi được email. Thử lại sau.' }, { status: 502 });
    }
    return generic;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
