import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTableConfig, isValidTable } from '@/lib/cms/tables';

type RouteContext = { params: Promise<{ table: string; id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;
  if (!isValidTable(table) || !getTableConfig(table)?.publicRead) {
    return NextResponse.json({ success: false, error: 'Bảng không hợp lệ' }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    const pk = getTableConfig(table)!.pk;
    const { data, error } = await supabase.from(table).select('*').eq(pk, id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Không tìm thấy';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}
