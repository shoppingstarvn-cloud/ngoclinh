import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyPublicFilters } from '@/lib/cms/crud';
import { getTableConfig, isValidTable } from '@/lib/cms/tables';

type RouteContext = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table) || !getTableConfig(table)?.publicRead) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const query = applyPublicFilters(supabase.from(table), table);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi đọc dữ liệu';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
