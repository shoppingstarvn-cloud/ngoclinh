import { createAdminClient } from '@/lib/supabase/admin';
import { noAccent } from '@/lib/slug';

export type SpecialSchoolKey = 'tcd' | 'nct';

const SCHOOL_LABEL: Record<SpecialSchoolKey, string> = {
  tcd: 'Trường THCS Trương Công Định',
  nct: 'Trường Tiểu Học Nguyễn Công Trứ',
};

function fold(s: string): string {
  return noAccent(s).toLowerCase();
}

/** Giáo viên = mọi tài khoản không khai báo là học sinh (kể cả bản ghi cũ để trống). */
export function isTeacherUserKind(kind?: string | null): boolean {
  return String(kind || '').trim().toLowerCase() !== 'student';
}

/** Trường khai báo có chữ Trương Công Định hoặc Nguyễn Công Trứ. */
export function specialSchoolKey(unit?: string | null): SpecialSchoolKey | null {
  const key = fold(unit || '');
  if (key.includes('truong cong dinh')) return 'tcd';
  if (key.includes('nguyen cong tru')) return 'nct';
  return null;
}

function isTargetHomeBlock(name: string, slug: string): boolean {
  const n = fold(name);
  const s = String(slug || '').toLowerCase();
  if (n.includes('hoat dong') && n.includes('trong tam')) return true;
  if (n.includes('hoat dong') && n.includes('phong trao')) return true;
  return /^hoat-dong-(phong-trao|trong-tam)(-r2)?$/.test(s);
}

function isRootCategory(parentId: unknown): boolean {
  return parentId == null || Number(parentId) === 0;
}

function isLevel1(parentId: unknown): boolean {
  return parentId == null || Number(parentId) === 0;
}

function labelMatchesSchool(label: string, school: SpecialSchoolKey): boolean {
  const n = fold(label);
  if (school === 'tcd') return n.includes('truong cong dinh');
  return n.includes('nguyen cong tru');
}

function albumPath(slug: string): string {
  const s = String(slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
  return s ? `/${s}` : '/';
}

function compactToken(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '');
}

/** "Lớp 9A9" / "lop-9a9" / "9A9" → cùng mã lớp `9a9`. */
function classToken(s: string): string {
  return compactToken(s).replace(/^lop/, '');
}

function sameClassIdentity(a: string, b: string): boolean {
  const ta = classToken(a);
  const tb = classToken(b);
  return ta.length >= 3 && ta === tb;
}

function linkPathname(link: string | null | undefined): string {
  const raw = String(link || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, 'https://ngoclinh.shopmartai.com');
    return (u.pathname.replace(/\.html$/i, '').replace(/\/+$/, '') || '/') ;
  } catch {
    return raw.replace(/\.html$/i, '').replace(/\/+$/, '') || '';
  }
}

function sameAlbumLink(link: string | null | undefined, slug: string): boolean {
  const path = albumPath(slug);
  const raw = String(link || '').trim();
  if (!raw || !slug) return false;
  if (raw === path || raw === `${path}/` || raw === `${path}.html`) return true;
  const p = linkPathname(raw);
  return p === path || p === `${path}/`;
}

/** Link cũ 1 đoạn (/lop-9a9, /lop1a3) cùng lớp — chưa có slug trường. */
function isLegacyClassOnlyLink(
  link: string | null | undefined,
  slug: string,
  previousSlug?: string | null,
  classLabel?: string | null,
): boolean {
  const p = linkPathname(link);
  if (!p || p === '/') return false;
  const segs = p.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segs.length !== 1) return false;
  const tok = classToken(segs[0]);
  if (tok.length < 3) return false;
  const candidates = [slug, previousSlug, classLabel]
    .filter(Boolean)
    .map((s) => classToken(String(s).split('/').pop() || ''));
  return candidates.includes(tok);
}

type CatRow = { id: number; name: string; slug: string; parent_id: number | null; display_order: number };
type SubRow = {
  id: number;
  category_id: number;
  parent_id: number | null;
  label: string;
  link_url: string | null;
  display_order: number;
};

function findExistingClassItem(
  children: SubRow[],
  school: SpecialSchoolKey,
  classLabel: string,
  slug: string,
  previousSlug?: string | null,
): SubRow | undefined {
  const notSchoolName = (s: SubRow) => !labelMatchesSchool(s.label || '', school);
  return (
    children.find((s) => sameAlbumLink(s.link_url, slug)) ||
    (previousSlug ? children.find((s) => sameAlbumLink(s.link_url, previousSlug)) : undefined) ||
    children.find(
      (s) =>
        notSchoolName(s) &&
        classLabel.trim() &&
        (fold(s.label || '') === fold(classLabel) ||
          sameClassIdentity(s.label || '', classLabel) ||
          sameClassIdentity(s.label || '', String(slug).split('/').pop() || '') ||
          (!!previousSlug &&
            sameClassIdentity(s.label || '', String(previousSlug).split('/').pop() || ''))),
    ) ||
    children.find(
      (s) =>
        notSchoolName(s) && isLegacyClassOnlyLink(s.link_url, slug, previousSlug, classLabel),
    )
  );
}

/**
 * Gắn menu cấp 2 (tên lớp) vào khối HOẠT ĐỘNG TRỌNG TÂM / HOẠT ĐỘNG PHONG TRÀO,
 * dưới menu cấp 1 = tên trường THCS Trương Công Định hoặc Tiểu học Nguyễn Công Trứ.
 * Idempotent: đã có dòng (cùng URL, cùng tên lớp, hoặc link cũ 1 đoạn) thì UPDATE link.
 * Lỗi menu không làm hỏng tạo website con.
 */
export async function ensureTeacherClassHomeMenu(opts: {
  userKind?: string | null;
  unitName?: string | null;
  className?: string | null;
  slug: string;
  /** Slug website con trước khi chuẩn hoá thành trường/lớp. */
  previousSlug?: string | null;
}): Promise<void> {
  try {
    if (!isTeacherUserKind(opts.userKind)) return;
    const school = specialSchoolKey(opts.unitName);
    if (!school) return;
    const slug = String(opts.slug || '').replace(/^\/+/, '').replace(/\/+$/, '');
    if (!slug) return;
    const classLabel = String(opts.className || '').trim() || 'Lớp';
    const linkUrl = albumPath(slug);

    const supabase = createAdminClient();
    const { data: cats, error: catErr } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, display_order')
      .eq('is_active', true);
    if (catErr || !cats?.length) return;

    const blocks = (cats as CatRow[]).filter(
      (c) => isRootCategory(c.parent_id) && isTargetHomeBlock(c.name || '', c.slug || ''),
    );
    if (!blocks.length) return;

    const catIds = blocks.map((c) => Number(c.id));
    const { data: subs } = await supabase
      .from('category_submenus')
      .select('id, category_id, parent_id, label, link_url, display_order')
      .in('category_id', catIds);
    const allSubs = (subs ?? []) as SubRow[];

    const preferOriginal = (a: CatRow, b: CatRow) => {
      const ar = String(a.slug || '').endsWith('-r2') ? 1 : 0;
      const br = String(b.slug || '').endsWith('-r2') ? 1 : 0;
      if (ar !== br) return ar - br;
      const at = fold(a.name).includes('trong tam') ? 0 : 1;
      const bt = fold(b.name).includes('trong tam') ? 0 : 1;
      if (at !== bt) return at - bt;
      return (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
    };
    const ordered = [...blocks].sort(preferOriginal);

    const now = new Date().toISOString();
    const schoolIdsByCat = new Map<number, number>();
    const existingSchoolLink =
      allSubs.find((s) => isLevel1(s.parent_id) && labelMatchesSchool(s.label || '', school))?.link_url ?? '';

    for (const cat of ordered) {
      const cid = Number(cat.id);
      const level1 = allSubs
        .filter(
          (s) =>
            Number(s.category_id) === cid &&
            isLevel1(s.parent_id) &&
            labelMatchesSchool(s.label || '', school),
        )
        .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
      if (level1[0]) {
        schoolIdsByCat.set(cid, Number(level1[0].id));
        continue;
      }
      const siblings = allSubs.filter((s) => Number(s.category_id) === cid && isLevel1(s.parent_id));
      const nextOrder = siblings.reduce((m, s) => Math.max(m, Number(s.display_order) || 0), 0) + 1;
      const { data: created, error: insSchoolErr } = await supabase
        .from('category_submenus')
        .insert({
          category_id: cid,
          parent_id: null,
          label: SCHOOL_LABEL[school],
          link_url: existingSchoolLink || '',
          display_order: nextOrder,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();
      if (insSchoolErr || !created) {
        console.warn('[ensureTeacherClassHomeMenu] insert L1', insSchoolErr?.message);
        continue;
      }
      schoolIdsByCat.set(cid, Number(created.id));
      allSubs.push({
        id: Number(created.id),
        category_id: cid,
        parent_id: null,
        label: SCHOOL_LABEL[school],
        link_url: existingSchoolLink || '',
        display_order: nextOrder,
      });
    }

    if (!schoolIdsByCat.size) return;

    for (const [cid, schoolId] of schoolIdsByCat) {
      const orphan = allSubs.find(
        (s) =>
          Number(s.category_id) === cid &&
          isLevel1(s.parent_id) &&
          Number(s.id) !== schoolId &&
          !labelMatchesSchool(s.label || '', school) &&
          !!findExistingClassItem([s], school, classLabel, slug, opts.previousSlug),
      );
      if (orphan) {
        await supabase
          .from('category_submenus')
          .update({
            parent_id: schoolId,
            link_url: linkUrl,
            ...(classLabel.trim() ? { label: classLabel } : {}),
            is_active: true,
            updated_at: now,
          })
          .eq('id', orphan.id);
        orphan.parent_id = schoolId;
        orphan.link_url = linkUrl;
        if (classLabel.trim()) orphan.label = classLabel;
      }

      const children = allSubs.filter((s) => Number(s.parent_id) === schoolId);
      const existing = findExistingClassItem(children, school, classLabel, slug, opts.previousSlug);
      if (existing) {
        const needsUrl = !sameAlbumLink(existing.link_url, slug);
        const needsLabel =
          fold(existing.label || '') !== fold(classLabel) &&
          !sameClassIdentity(existing.label || '', classLabel);
        if (needsUrl || needsLabel) {
          await supabase
            .from('category_submenus')
            .update({
              ...(needsUrl ? { link_url: linkUrl } : {}),
              ...(needsLabel && classLabel.trim() ? { label: classLabel } : {}),
              is_active: true,
              updated_at: now,
            })
            .eq('id', existing.id);
        }
        continue;
      }
      const nextOrder = children.reduce((m, s) => Math.max(m, Number(s.display_order) || 0), 0) + 1;
      const { data: inserted } = await supabase
        .from('category_submenus')
        .insert({
          category_id: cid,
          parent_id: schoolId,
          label: classLabel,
          link_url: linkUrl,
          display_order: nextOrder,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();
      if (inserted) {
        allSubs.push({
          id: Number(inserted.id),
          category_id: cid,
          parent_id: schoolId,
          label: classLabel,
          link_url: linkUrl,
          display_order: nextOrder,
        });
      }
    }
  } catch (e) {
    console.warn('[ensureTeacherClassHomeMenu]', e instanceof Error ? e.message : e);
  }
}
