import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
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

/**
 * Xác thực admin bên trong Server Actions ('use server'), nơi KHÔNG có đối
 * tượng NextRequest. Đăng nhập (`/api/auth/login`) đã set cookie httpOnly
 * `admin_token`, nên Server Action đọc thẳng qua next/headers.cookies().
 * Ném lỗi (throw) thay vì trả Response vì Server Actions dùng cơ chế
 * throw/catch để báo lỗi về client.
 */
export async function requireAdminAction(): Promise<AdminPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) {
    throw new Error('Chưa xác thực! Vui lòng đăng nhập lại.');
  }
  const admin = await verifyAdminToken(token);
  if (!admin) {
    throw new Error('Token không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại.');
  }
  return admin;
}
