import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user-session';
import { signMemberToken, MEMBER_COOKIE, memberCookieOptions } from '@/lib/auth/user-jwt';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
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
