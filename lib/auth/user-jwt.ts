import { SignJWT, jwtVerify } from 'jose';

export const MEMBER_COOKIE = 'member_token';
// Phiên sống 1 NĂM (giống Facebook: luôn giữ đăng nhập). Tự gia hạn mỗi lần truy cập.
const TOKEN_TTL = '365d';

export interface MemberPayload {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

function getSecret() {
  // Tách biệt với admin: ưu tiên AUTH_JWT_SECRET, fallback JWT_SECRET.
  const secret =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'ngoclinh-member-secret-2026-change-me';
  return new TextEncoder().encode(secret);
}

export async function signMemberToken(user: MemberPayload): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    full_name: user.full_name || '',
    avatar_url: user.avatar_url || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyMemberToken(token: string): Promise<MemberPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: Number(payload.id),
      email: String(payload.email),
      full_name: payload.full_name ? String(payload.full_name) : undefined,
      avatar_url: payload.avatar_url ? String(payload.avatar_url) : undefined,
    };
  } catch {
    return null;
  }
}

/** Tuỳ chọn cookie phiên thành viên — 1 NĂM, httpOnly (luôn giữ đăng nhập như Facebook). */
export function memberCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  };
}
