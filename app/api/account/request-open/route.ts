import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/auth/password';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/account/request-open — tạo TÀI KHOẢN kèm hồ sơ đầy đủ (form "Đề nghị mở
 *  Website / Quản Trị"). Tạo xong đăng nhập luôn; hiện ngay ở bảng Quản lý Users. */
export async function POST(request: NextRequest) {
  try {
    const b = (await request.json()) as Record<string, string>;
    const username = String(b.username || '').trim();
    const password = String(b.password || '');
    const email = String(b.email || '').trim().toLowerCase();
    const full_name = String(b.full_name || '').trim();
    const user_kind = b.user_kind === 'student' ? 'student' : 'teacher';
    const request_type = b.request_type === 'admin' ? 'admin' : 'website';

    if (!full_name) return NextResponse.json({ success: false, error: 'Nhập họ và tên' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ success: false, error: 'Email không hợp lệ' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ success: false, error: 'Mật khẩu phải từ 6 ký tự' }, { status: 400 });
    if (username.length < 3) return NextResponse.json({ success: false, error: 'Tên đăng nhập từ 3 ký tự' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: dupE } = await supabase.from('users').select('id').eq('email', email).limit(1);
    if (dupE && dupE.length) return NextResponse.json({ success: false, error: 'Email này đã được đăng ký' }, { status: 409 });
    const { data: dupU } = await supabase.from('users').select('id').ilike('username', username).limit(1);
    if (dupU && dupU.length) return NextResponse.json({ success: false, error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });

    const password_hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash,
        full_name,
        provider: 'email',
        is_active: true,
        role: 'member',
        user_kind,
        request_type,
        dob: b.dob ? String(b.dob) : null,
        zalo_phone: String(b.zalo_phone || ''),
        unit_name: String(b.unit_name || ''),
        ward: String(b.ward || ''),
        class_in_charge: String(b.class_in_charge || ''),
        last_login: new Date().toISOString(),
      })
      .select('id, email, full_name, avatar_url')
      .single();
    if (error) throw error;

    const token = await signMemberToken({ id: data.id, email: data.email, full_name: data.full_name, avatar_url: data.avatar_url });
    const res = NextResponse.json({
      success: true,
      user: { id: data.id, email: data.email, full_name: data.full_name, avatar_url: data.avatar_url, role: 'member' },
    });
    res.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gửi đề nghị thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
