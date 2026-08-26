import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

/** GET: đọc mật khẩu hiện tại (chỉ admin). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  const supabase = createAdminClient();
  const { data } = await supabase.from('content_gate').select('*').order('id').limit(1);
  return NextResponse.json({
    password: data?.[0]?.password || '',
    note: data?.[0]?.note || '',
  });
}

/** POST: cập nhật mật khẩu (chỉ admin). */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;
  try {
    const { password } = (await request.json()) as { password?: string };
    const supabase = createAdminClient();
    const { data } = await supabase.from('content_gate').select('id').order('id').limit(1);
    if (data?.[0]?.id) {
      await supabase
        .from('content_gate')
        .update({ password: String(password || ''), updated_at: new Date().toISOString() })
        .eq('id', data[0].id);
    } else {
      await supabase.from('content_gate').insert({ password: String(password || '') });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
