import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CMS_TABLES, ORDERED_TABLES } from '@/lib/cms/tables';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const supabase = createAdminClient();
    const result: Record<string, unknown[]> = {};

    for (const { table } of CMS_TABLES) {
      let q = supabase.from(table).select('*').limit(500);
      if ((ORDERED_TABLES as readonly string[]).includes(table)) {
        q = q.order('display_order', { ascending: true }).order('created_at', { ascending: false });
      } else {
        q = q.order('created_at', { ascending: false });
      }
      const { data } = await q;
      result[table] = data ?? [];
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi tải dữ liệu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
