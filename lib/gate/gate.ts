import { SignJWT, jwtVerify } from 'jose';
import { noAccent } from '@/lib/slug';

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

/**
 * Nhận diện khối/danh mục CẦN mật khẩu — CHỈ "Hoạt động phong trào".
 * So khớp không dấu, không phân biệt hoa thường.
 */
export function isGatedCategoryName(name: string): boolean {
  return noAccent(String(name || ''))
    .toLowerCase()
    .includes('hoat dong phong trao');
}
