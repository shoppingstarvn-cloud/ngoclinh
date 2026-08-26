import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveHref, itemHref } from '@/lib/slug';
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
      .select('id, name, slug, link_url')
      .eq('is_active', true);
    const gatedCats = (cats ?? []).filter((c) => isGatedCategoryName(c.name));
    const gatedIds = gatedCats.map((c) => c.id);

    const set = new Set<string>();
    // (1) Link CHUNG của khối "Hoạt động phong trào" — nơi menu con trỏ về khi
    //     chưa điền Link đích riêng. Chặn cả link này để mọi menu con đều bị hỏi mật khẩu.
    for (const c of gatedCats) {
      const h = itemHref({ slug: c.slug, link_url: c.link_url });
      if (h && h !== '#') set.add(h);
    }
    // (2) Link đích RIÊNG của từng menu con (nếu admin đã điền).
    if (gatedIds.length) {
      const { data: subs } = await supabase
        .from('category_submenus')
        .select('link_url')
        .in('category_id', gatedIds)
        .eq('is_active', true);
      for (const s of subs ?? []) {
        const h = resolveHref(s.link_url || '');
        if (h && h !== '#') set.add(h);
      }
    }
    const targets = Array.from(set);

    // Chẩn đoán tạm: /api/gate/context?debug=1
    if (new URL(request.url).searchParams.get('debug') === '1') {
      const { data: allSubs } = await supabase
        .from('category_submenus')
        .select('id, category_id, parent_id, label, link_url, is_active');
      return NextResponse.json({
        categories: (cats ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, link_url: c.link_url })),
        gatedIds,
        targets,
        submenus: allSubs ?? [],
      });
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
