import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { isConfigured, createResumableSession } from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Trình duyệt xin một "phiên upload resumable" — PHẢI truyền Origin để chống lỗi CORS.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  if (!isConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Google Drive chưa cấu hình', not_configured: true },
      { status: 501 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      filename?: string;
      mimeType?: string;
    };
    const filename = String(body.filename || 'file');
    const mimeType = String(body.mimeType || 'application/octet-stream');

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('host') ? `https://${request.headers.get('host')}` : '');

    const uploadUrl = await createResumableSession(filename, mimeType, origin);
    return NextResponse.json({ success: true, uploadUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Không tạo được phiên upload Drive';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
