import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Xác thực ID token (credential) do nút "Đăng nhập với Google" (GIS) trả về.
 * Kiểm chữ ký bằng khoá công khai Google (JWKS) + issuer + audience (Client ID).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  const clientId =
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  if (!clientId) return null;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    });
    if (!payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      email_verified: payload.email_verified === true,
      name: payload.name ? String(payload.name) : undefined,
      picture: payload.picture ? String(payload.picture) : undefined,
    };
  } catch {
    return null;
  }
}
