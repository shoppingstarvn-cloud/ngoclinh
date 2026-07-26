import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripSystemFields } from '@/lib/cms/crud';
import { getTableConfig, isValidTable } from '@/lib/cms/tables';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';

type RouteContext = { params: Promise<{ table: string; id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const supabase = createAdminClient();
    const pk = getTableConfig(table)!.pk;
    const { data, error } = await supabase.from(table).select('*').eq(pk, id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Không tìm thấy';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const body = stripSystemFields((await request.json()) as Record<string, unknown>, 'update');
    const supabase = createAdminClient();
    const pk = getTableConfig(table)!.pk;
    const { data, error } = await supabase.from(table).update(body).eq(pk, id).select();
    if (error) throw error;
    return NextResponse.json({ success: true, data: data?.[0] ?? data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cập nhật thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  try {
    const supabase = createAdminClient();
    const pk = getTableConfig(table)!.pk;
    const { error } = await supabase.from(table).delete().eq(pk, id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Xóa thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
