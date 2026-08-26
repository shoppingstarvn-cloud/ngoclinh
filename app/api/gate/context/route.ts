import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveHref } from '@/lib/slug';
import { getCurrentUser } from '@/lib/auth/user-session';
import { GATE_COOKIE, verifyGate, isGatedCategoryName } from '@/lib/gate/gate';

/**
 * Trả về:
 *  - targets: danh sách href (link đích) của các menu con thuộc khối
 *    "Hoạt động phong trào" — những link cần chặn mật khẩu.
 *  - unlocked: đã mở khoá chưa (cookie đã ký HOẶC thành viên đã mở 1 lần).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true);
    const gatedIds = (cats ?? [])
      .filter((c) => isGatedCategoryName(c.name))
      .map((c) => c.id);

    // Chẩn đoán tạm: /api/gate/context?debug=1 -> xem dữ liệu thật để tìm lỗi khớp.
    if (new URL(request.url).searchParams.get('debug') === '1') {
      const { data: allSubs } = await supabase
        .from('category_submenus')
        .select('id, category_id, parent_id, label, link_url, is_active');
      return NextResponse.json({
        categories: (cats ?? []).map((c) => ({ id: c.id, name: c.name })),
        gatedIds,
        submenus: allSubs ?? [],
      });
    }

    let targets: string[] = [];
    if (gatedIds.length) {
      const { data: subs } = await supabase
        .from('category_submenus')
        .select('link_url')
        .in('category_id', gatedIds)
        .eq('is_active', true);
      targets = Array.from(
        new Set(
          (subs ?? [])
            .map((s) => resolveHref(s.link_url || ''))
            .filter((h) => h && h !== '#'),
        ),
      );
    }

    let unlocked = await verifyGate(request.cookies.get(GATE_COOKIE)?.value);
    if (!unlocked) {
      const user = await getCurrentUser();
      if (user) {
        const { data: rows } = await supabase
          .from('users')
          .select('content_unlocked')
          .eq('id', user.id)
          .limit(1);
        if (rows?.[0]?.content_unlocked) unlocked = true;
      }
    }

    return NextResponse.json({ unlocked, targets });
  } catch {
    return NextResponse.json({ unlocked: false, targets: [] });
  }
}
