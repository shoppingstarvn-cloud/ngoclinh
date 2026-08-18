import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { isConfigured, finalizeFile } from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sau khi trình duyệt PUT file xong (có file_id): đổi tên chuẩn + đặt công khai, trả URL dùng được.
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
      file_id?: string;
      original_name?: string;
      file_type?: string;
    };
    const fileId = String(body.file_id || '');
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu file đã tải lên Drive' },
        { status: 400 },
      );
    }

    const mimeType = String(body.file_type || '');
    const ext = mimeType.startsWith('image/')
      ? '.' + (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      : '';
    const stdName =
      (body.original_name && String(body.original_name)) ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const fin = await finalizeFile(fileId, stdName, mimeType);
    return NextResponse.json({ success: true, url: fin.url, fileId: fin.fileId, fileName: stdName });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ghi file Drive thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
