import { createAdminClient } from '@/lib/supabase/admin';
import { isNgoclinhSupabase } from '@/lib/supabase/env';

/** Đánh dấu đã seed hàng 3 — để Super Admin xóa hết clone thì không tự tạo lại. */
export const HOME_CATEGORY_ROW3_FLAG = 'home_category_row3_seeded';

type CatRow = {
  id: number;
  name?: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  type?: string | null;
  link_url?: string | null;
  parent_id?: number | null;
  display_order?: number | null;
  is_active?: boolean | null;
};

type SubRow = {
  id: number;
  category_id?: number | null;
  parent_id?: number | null;
  label?: string | null;
  link_url?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
};

function isRoot(c: CatRow) {
  return c.parent_id == null || Number(c.parent_id) === 0;
}

function isCloneSlug(slug: unknown) {
  return String(slug || '').endsWith('-r2');
}

export type EnsureHomeMenuResult = {
  created: number;
  cloneCount: number;
  skipped: boolean;
  reason?: string;
};

let inflight: Promise<EnsureHomeMenuResult> | null = null;

/**
 * Bổ sung 3 khối MENU hàng 3 (slug *-r2) nếu DB chưa có.
 * Idempotent. Không seed lại sau khi Super Admin đã xóa clone (cờ site_settings),
 * trừ khi `force: true` (bấm nút trong Admin).
 */
export async function ensureHomeMenuCategorySlots(
  opts?: { force?: boolean },
): Promise<EnsureHomeMenuResult> {
  if (inflight) {
    const first = await inflight;
    if (opts?.force && first.cloneCount < 3) {
      return runEnsure({ force: true });
    }
    return first;
  }
  inflight = runEnsure(opts).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function upsertFlag(
  supabase: ReturnType<typeof createAdminClient>,
  existingId?: number | null,
) {
  const now = new Date().toISOString();
  if (existingId != null) {
    await supabase
      .from('site_settings')
      .update({ value: '1', updated_at: now })
      .eq('id', existingId);
    return;
  }
  await supabase.from('site_settings').insert({
    key: HOME_CATEGORY_ROW3_FLAG,
    value: '1',
    created_at: now,
    updated_at: now,
  });
}

async function runEnsure(opts?: { force?: boolean }): Promise<EnsureHomeMenuResult> {
  const empty = (reason: string, cloneCount = 0): EnsureHomeMenuResult => ({
    created: 0,
    cloneCount,
    skipped: true,
    reason,
  });
  try {
    if (!isNgoclinhSupabase()) {
      console.error('[ensureHomeMenuCategorySlots] skip — không phải kho ngoclinh');
      return empty('not-ngoclinh');
    }
    const supabase = createAdminClient();

    // Không select image_url — LIVE schema ngoclinh chưa có cột này.
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select(
        'id,name,slug,description,thumbnail_url,type,link_url,parent_id,display_order,is_active',
      );
    if (catErr) {
      console.error('[ensureHomeMenuCategorySlots] categories', catErr.message);
      return empty(catErr.message);
    }

    const roots = ((cats ?? []) as CatRow[]).filter(isRoot);
    const clones = roots.filter((c) => isCloneSlug(c.slug));

    const { data: flagRow } = await supabase
      .from('site_settings')
      .select('id,value')
      .eq('key', HOME_CATEGORY_ROW3_FLAG)
      .maybeSingle();
    const flagged = String(flagRow?.value || '') === '1';
    const flagId = flagRow?.id as number | undefined;

    // Đủ 3 khối hàng 3 → khóa cờ, không seed thêm.
    if (clones.length >= 3) {
      if (!flagged) await upsertFlag(supabase, flagId);
      return { created: 0, cloneCount: clones.length, skipped: false };
    }
    // Super Admin đã xóa clone → không tự đắp lại, trừ khi bấm nút trong Admin.
    if (flagged && !opts?.force) return empty('flagged', clones.length);

    const preferredSlugs = ['truyen-thong', 'to-chuc-su-kien', 'dao-tao-ai'];
    const bySlug = preferredSlugs
      .map((slug) =>
        roots.find(
          (c) =>
            c.is_active !== false &&
            !isCloneSlug(c.slug) &&
            String(c.slug || '').trim() === slug,
        ),
      )
      .filter((c): c is CatRow => Boolean(c));

    const originals =
      bySlug.length === 3
        ? bySlug
        : roots
            .filter((c) => c.is_active !== false && !isCloneSlug(c.slug))
            .sort(
              (a, b) =>
                (Number(a.display_order) || 0) - (Number(b.display_order) || 0) ||
                Number(a.id) - Number(b.id),
            )
            .slice(0, 3);

    if (originals.length === 0) return empty('no-originals', clones.length);

    const { data: submenus } = await supabase.from('category_submenus').select('*');
    const allSubs = ((submenus ?? []) as SubRow[]) ?? [];
    const now = new Date().toISOString();

    let createdCount = 0;
    for (const c of originals) {
      const baseSlug = String(c.slug || '').trim();
      if (!baseSlug) continue;
      const newSlug = `${baseSlug}-r2`;

      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle();
      if (existing) continue;

      const { data: created, error: insErr } = await supabase
        .from('categories')
        .insert({
          name: c.name,
          slug: newSlug,
          description: c.description ?? '',
          thumbnail_url: c.thumbnail_url ?? '',
          type: String(c.type || '').trim() || 'product',
          link_url: String(c.link_url || '').trim() || `/${baseSlug}.html`,
          parent_id: null,
          display_order: (Number(c.display_order) || 0) + 100,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (insErr || !created) {
        console.error('[ensureHomeMenuCategorySlots] insert', insErr?.message);
        continue;
      }
      createdCount += 1;

      const newId = Number(created.id);
      const srcId = Number(c.id);
      const level1 = allSubs.filter(
        (s) =>
          Number(s.category_id) === srcId &&
          (s.parent_id == null || Number(s.parent_id) === 0),
      );
      const idMap = new Map<number, number>();

      for (const s of level1) {
        const { data: ns, error: sErr } = await supabase
          .from('category_submenus')
          .insert({
            category_id: newId,
            parent_id: null,
            label: s.label,
            link_url: s.link_url,
            display_order: s.display_order,
            is_active: s.is_active !== false,
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single();
        if (sErr || !ns) continue;
        idMap.set(Number(s.id), Number(ns.id));
      }

      const level2 = allSubs.filter(
        (s) => Number(s.category_id) === srcId && s.parent_id != null && Number(s.parent_id) !== 0,
      );
      for (const s of level2) {
        const newParent = idMap.get(Number(s.parent_id));
        if (!newParent) continue;
        await supabase.from('category_submenus').insert({
          category_id: newId,
          parent_id: newParent,
          label: s.label,
          link_url: s.link_url,
          display_order: s.display_order,
          is_active: s.is_active !== false,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const { data: after } = await supabase
      .from('categories')
      .select('id,slug,parent_id')
      .like('slug', '%-r2');
    const haveClones = ((after ?? []) as CatRow[]).some(
      (c) => isRoot(c) && isCloneSlug(c.slug),
    );
    const cloneCount = ((after ?? []) as CatRow[]).filter(
      (c) => isRoot(c) && isCloneSlug(c.slug),
    ).length;
    if (haveClones || createdCount > 0) {
      await upsertFlag(supabase, flagId);
    }
    return { created: createdCount, cloneCount, skipped: createdCount === 0 };
  } catch (e) {
    console.error('[ensureHomeMenuCategorySlots]', e);
    return {
      created: 0,
      cloneCount: 0,
      skipped: true,
      reason: e instanceof Error ? e.message : 'error',
    };
  }
}
