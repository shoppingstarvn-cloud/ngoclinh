import { SignJWT, jwtVerify } from 'jose';

export { isGatedCategoryName } from '@/lib/gate/match';
export const GATE_COOKIE = 'content_unlock';

function secret() {
  const s =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'ngoclinh-gate-secret-2026';
  return new TextEncoder().encode(s);
}

/** Ký cookie mở khoá (1 năm) sau khi nhập đúng mật khẩu xem nội dung. */
export async function signGate(): Promise<string> {
  return new SignJWT({ gate: 'phongtrao' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret());
}

export async function verifyGate(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.gate === 'phongtrao';
  } catch {
    return false;
  }
}
