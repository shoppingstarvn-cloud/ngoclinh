import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const COOKIE_NAME = 'admin_token';
const TOKEN_TTL = '24h';

export interface AdminPayload {
  id: number;
  username: string;
  role: string;
  full_name?: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET chưa được cấu hình');
  return new TextEncoder().encode(secret);
}

/** JWT chuẩn HS256 — thay thế token base64 tự chế cũ */
export async function signAdminToken(admin: AdminPayload): Promise<string> {
  return new SignJWT({
    id: admin.id,
    username: admin.username,
    role: admin.role,
    full_name: admin.full_name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: Number(payload.id),
      username: String(payload.username),
      role: String(payload.role),
      full_name: payload.full_name ? String(payload.full_name) : undefined,
    };
  } catch {
    // Tương thích ngược token cũ (base64url:timestamp)
    try {
      const parts = token.split(':');
      const decoded = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      ) as AdminPayload & { exp?: number };
      if (decoded.exp && decoded.exp < Date.now()) return null;
      return decoded;
    } catch {
      return null;
    }
  }
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export const ADMIN_COOKIE = COOKIE_NAME;

export async function getTokenFromHeader(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
