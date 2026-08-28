import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { storeAdminUpload } from '@/lib/storage/upload';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Không có file! Kéo thả ảnh hoặc chọn file từ máy.' },
        { status: 400 },
      );
    }

    const stored = await storeAdminUpload(file);
    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload thất bại';
    const status = /chưa xác thực|hết hạn|token/i.test(message) ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
