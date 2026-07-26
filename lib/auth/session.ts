import { NextRequest } from 'next/server';
import { verifyAdminToken, type AdminPayload } from '@/lib/auth/jwt';

export async function requireAdmin(request: NextRequest): Promise<AdminPayload | Response> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('admin_token')?.value;

  if (!token) {
    return Response.json({ success: false, error: 'Chưa xác thực!' }, { status: 401 });
  }

  const admin = await verifyAdminToken(token);
  if (!admin) {
    return Response.json({ success: false, error: 'Token không hợp lệ hoặc hết hạn!' }, { status: 401 });
  }

  return admin;
}

export function isAdminPayload(value: AdminPayload | Response): value is AdminPayload {
  return !(value instanceof Response);
}
