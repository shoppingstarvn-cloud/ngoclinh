-- =============================================================================
-- NGOCLINH — Nhân bản 3 khối danh mục trang chủ → thêm 1 HÀNG 3 khối phía dưới
-- (ngay trên "Hình ảnh hoạt động"). Giữ nguyên ảnh, chữ, link, menu con 2 cấp.
--
-- Chạy: https://supabase.com/dashboard/project/pglbhoitmcflpvoasewr/sql/new
--        SQL Editor → dán hết file này → Run. An toàn chạy lại (NOT EXISTS).
-- =============================================================================

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.category_submenus ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
ALTER TABLE public.category_submenus ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1) 3 khối gốc (không lấy bản -r2) → 3 khối mới slug + '-r2', display_order + 100
INSERT INTO public.categories
  (name, slug, description, thumbnail_url, image_url, type, link_url, parent_id, display_order, is_active, created_at, updated_at)
SELECT
  c.name,
  c.slug || '-r2',
  c.description,
  c.thumbnail_url,
  c.image_url,
  COALESCE(NULLIF(BTRIM(c.type), ''), 'product'),
  COALESCE(NULLIF(BTRIM(c.link_url), ''), '/' || c.slug || '.html'),
  NULL,
  COALESCE(c.display_order, 0) + 100,
  true,
  now(),
  now()
FROM (
  SELECT *
  FROM public.categories
  WHERE is_active = true
    AND (parent_id IS NULL OR parent_id = 0)
    AND slug NOT LIKE '%-r2'
  ORDER BY display_order NULLS LAST, id
  LIMIT 3
) c
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories x WHERE x.slug = c.slug || '-r2'
);

-- 2) Menu con CẤP 1 (parent_id rỗng) — gắn vào khối mới, khớp theo slug gốc
INSERT INTO public.category_submenus
  (category_id, parent_id, label, link_url, display_order, is_active, created_at, updated_at)
SELECT
  n.id,
  NULL,
  s.label,
  s.link_url,
  s.display_order,
  s.is_active,
  now(),
  now()
FROM public.category_submenus s
JOIN public.categories o ON o.id = s.category_id
JOIN public.categories n ON n.slug = o.slug || '-r2'
WHERE s.parent_id IS NULL
  AND n.slug LIKE '%-r2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.category_submenus x
    WHERE x.category_id = n.id
      AND x.parent_id IS NULL
      AND x.label = s.label
  );

-- 3) Menu con CẤP 2 — cha mới = menu cấp 1 cùng nhãn trên khối mới
INSERT INTO public.category_submenus
  (category_id, parent_id, label, link_url, display_order, is_active, created_at, updated_at)
SELECT
  n.id,
  np.id,
  s.label,
  s.link_url,
  s.display_order,
  s.is_active,
  now(),
  now()
FROM public.category_submenus s
JOIN public.category_submenus op ON op.id = s.parent_id
JOIN public.categories o ON o.id = s.category_id
JOIN public.categories n ON n.slug = o.slug || '-r2'
JOIN public.category_submenus np
  ON np.category_id = n.id
 AND np.parent_id IS NULL
 AND np.label = op.label
WHERE s.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.category_submenus x
    WHERE x.category_id = n.id
      AND x.parent_id = np.id
      AND x.label = s.label
  );

NOTIFY pgrst, 'reload schema';

-- Kiểm chứng: 6 khối gốc (3 hàng 1 + 3 hàng 2)
SELECT id, name, slug, display_order
FROM public.categories
WHERE is_active = true AND (parent_id IS NULL OR parent_id = 0)
ORDER BY display_order, id;
