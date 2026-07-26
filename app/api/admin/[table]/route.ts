import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyAdminFilters, stripSystemFields } from '@/lib/cms/crud';
import { isValidTable } from '@/lib/cms/tables';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

type RouteContext = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const supabase = createAdminClient();
    const query = applyAdminFilters(
      supabase.from(table),
      table,
      request.nextUrl.searchParams,
    );
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi đọc dữ liệu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const body = stripSystemFields((await request.json()) as Record<string, unknown>, 'create');
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(table).insert(body).select();
    if (error) throw error;
    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true, data: data?.[0] ?? data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Tạo thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
