import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/user-session';

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

    // Đúng mật khẩu. CHỈ nhớ khi đang đăng nhập tài khoản (đánh dấu content_unlocked).
    // Khách chưa đăng nhập -> xem được lần này, nhưng lần sau vẫn phải nhập lại.
    const user = await getCurrentUser();
    if (user) {
      await supabase.from('users').update({ content_unlocked: true }).eq('id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
