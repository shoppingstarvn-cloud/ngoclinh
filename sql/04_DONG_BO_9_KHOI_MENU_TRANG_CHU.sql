-- =============================================================================
-- NGOCLINH — Đồng bộ 9 khối MENU trang chủ với tab Danh mục (Admin)
-- Chạy 1 lần: https://supabase.com/dashboard/project/pglbhoitmcflpvoasewr/sql/new
-- An toàn chạy lại (NOT EXISTS / WHERE tên đang lệch).
-- =============================================================================

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE public.category_submenus ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
ALTER TABLE public.category_submenus ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 1) Vá 6 khối gốc nếu bị dính tên/slug bê tông Cửa Âu (giữ nguyên nếu đã đúng NGOCLINH)
UPDATE public.categories
SET name = 'TRUYỀN THÔNG',
    slug = 'truyen-thong',
    link_url = '/truyen-thong.html',
    updated_at = now()
WHERE id = 2
  AND (
    name ILIKE '%KINH NGHIỆM%'
    OR slug IN ('kinh-nghiem', 'kinh-nghiem-r2')
    OR coalesce(btrim(link_url), '') = ''
  );

UPDATE public.categories
SET name = 'TỔ CHỨC SỰ KIỆN',
    slug = 'to-chuc-su-kien',
    link_url = '/to-chuc-su-kien.html',
    updated_at = now()
WHERE id = 3
  AND (
    name ILIKE '%CÔNG NGHỆ%'
    OR slug IN ('cong-nghe-hien-dai', 'cong-nghe-hien-dai-r2')
    OR coalesce(btrim(link_url), '') = ''
  );

UPDATE public.categories
SET name = 'ĐÀO TẠO AI',
    slug = 'dao-tao-ai',
    link_url = '/dao-tao-ai.html',
    updated_at = now()
WHERE id = 4
  AND (
    name ILIKE '%KINH DOANH%'
    OR name ILIKE '%VLXD%'
    OR slug IN ('cong-tron-c53', 'cong-tron-c53-r2')
    OR coalesce(btrim(link_url), '') = ''
  );

UPDATE public.categories
SET name = 'THIẾT KẾ WEBSITE/APP',
    slug = 'thiet-ke-app',
    link_url = '/thiet-ke-app.html',
    updated_at = now()
WHERE id = 8
  AND (
    name ILIKE '%KINH NGHIỆM%'
    OR slug IN ('san-pham-chat-luong')
    OR coalesce(btrim(link_url), '') = ''
  );

UPDATE public.categories
SET name = 'HOẠT ĐỘNG PHONG TRÀO',
    slug = 'hoat-dong-phong-trao',
    link_url = '/hoat-dong-phong-trao.html',
    updated_at = now()
WHERE id = 9
  AND (
    name ILIKE '%KINH DOANH%'
    OR name ILIKE '%VLXD%'
    OR name ILIKE '%CỬA ÂU%'
    OR slug IN ('cong-tron-c53', 'cong-tron-c53-r2')
    OR coalesce(btrim(link_url), '') IN ('', '/cong-tron-c53.html')
    OR link_url ILIKE '%cong-tron%'
  );

-- Vá sót: khối đã đúng tên nhưng vẫn dính URL cống tròn Cửa Âu
UPDATE public.categories
SET link_url = '/hoat-dong-phong-trao.html',
    slug = CASE
      WHEN slug IN ('cong-tron-c53', 'cong-tron-c53-r2') THEN 'hoat-dong-phong-trao'
      ELSE slug
    END,
    updated_at = now()
WHERE (id = 9 OR slug IN ('hoat-dong-phong-trao', 'cong-tron-c53'))
  AND coalesce(link_url, '') ILIKE '%cong-tron%';

UPDATE public.categories
SET name = 'LUYỆN THI TOÁN LÝ HÓA SINH',
    slug = 'luyen-thi-toan-ly-hoa-sinh',
    link_url = '/luyen-thi-toan-ly-hoa-sinh.html',
    updated_at = now()
WHERE id = 10
  AND (
    name ILIKE '%CÔNG NGHỆ%'
    OR slug IN ('cong-nghe-hien-dai')
    OR coalesce(btrim(link_url), '') IN ('', '/tam-tuong-be-tong-acotec-c47.html')
  );

-- 2) Nhân bản 3 khối hàng 1 → hàng 3 (slug *-r2), copy ảnh + link + thứ tự +100
INSERT INTO public.categories
  (name, slug, description, thumbnail_url, type, link_url, parent_id, display_order, is_active, created_at, updated_at)
SELECT
  c.name,
  c.slug || '-r2',
  c.description,
  c.thumbnail_url,
  COALESCE(NULLIF(BTRIM(c.type), ''), 'product'),
  COALESCE(NULLIF(BTRIM(c.link_url), ''), '/' || c.slug || '.html'),
  NULL,
  COALESCE(c.display_order, 0) + 100,
  true,
  now(),
  now()
FROM public.categories c
WHERE (c.parent_id IS NULL OR c.parent_id = 0)
  AND c.is_active IS DISTINCT FROM false
  AND c.slug IN ('truyen-thong', 'to-chuc-su-kien', 'dao-tao-ai')
  AND NOT EXISTS (
    SELECT 1 FROM public.categories x WHERE x.slug = c.slug || '-r2'
  );

-- 3) Menu con cấp 1 của 3 khối mới
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
WHERE (s.parent_id IS NULL OR s.parent_id = 0)
  AND o.slug IN ('truyen-thong', 'to-chuc-su-kien', 'dao-tao-ai')
  AND NOT EXISTS (
    SELECT 1
    FROM public.category_submenus x
    WHERE x.category_id = n.id
      AND (x.parent_id IS NULL OR x.parent_id = 0)
      AND x.label = s.label
  );

-- 4) Menu con cấp 2
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
 AND (np.parent_id IS NULL OR np.parent_id = 0)
 AND np.label = op.label
WHERE s.parent_id IS NOT NULL
  AND o.slug IN ('truyen-thong', 'to-chuc-su-kien', 'dao-tao-ai')
  AND NOT EXISTS (
    SELECT 1
    FROM public.category_submenus x
    WHERE x.category_id = n.id
      AND x.parent_id = np.id
      AND x.label = s.label
  );

-- 5) Cờ seed — Super Admin xóa hết clone thì app không tự đắp lại
INSERT INTO public.site_settings (key, value, created_at, updated_at)
SELECT 'home_category_row3_seeded', '1', now(), now()
WHERE EXISTS (SELECT 1 FROM public.categories WHERE slug LIKE '%-r2')
  AND NOT EXISTS (
    SELECT 1 FROM public.site_settings WHERE key = 'home_category_row3_seeded'
  );

UPDATE public.site_settings
SET value = '1', updated_at = now()
WHERE key = 'home_category_row3_seeded'
  AND EXISTS (SELECT 1 FROM public.categories WHERE slug LIKE '%-r2');

NOTIFY pgrst, 'reload schema';

-- Kiểm chứng: phải ra 9 dòng gốc trang chủ (6 + 3 *-r2)
SELECT id, name, slug, link_url, display_order
FROM public.categories
WHERE is_active IS DISTINCT FROM false
  AND (parent_id IS NULL OR parent_id = 0)
ORDER BY display_order NULLS LAST, id;
