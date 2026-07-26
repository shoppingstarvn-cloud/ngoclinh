import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createAdminClient, BUCKET_NAME } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('Không có file!');

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    const supabase = createAdminClient();
    let supabaseUrl: string | null = null;

    const { data: sbData, error: sbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (!sbError && sbData) {
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      supabaseUrl = urlData.publicUrl;
    }

    const localUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: supabaseUrl || localUrl,
      localUrl,
      supabaseUrl,
      fileName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
