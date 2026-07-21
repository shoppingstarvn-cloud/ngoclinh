-- ============================================================
-- 01_SCHEMA_UPGRADE.sql
-- Nâng cấp bảng products / partners / projects để chứa được
-- nội dung đầy đủ của 158 trang chi tiết trên website.
-- Chạy: Supabase -> SQL Editor -> dán toàn bộ -> Run.
-- An toàn khi chạy lại nhiều lần (IF NOT EXISTS).
-- ============================================================

-- 1) products: bổ sung các cột nội dung còn thiếu
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS excerpt       text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS content       text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status        text        DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS link_url      text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id   bigint;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- 2) partners: bổ sung slug + nội dung (khách hàng / nhà cung cấp có bài mô tả)
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS slug          text        DEFAULT '';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS excerpt       text        DEFAULT '';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS content       text        DEFAULT '';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS thumbnail_url text        DEFAULT '';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS kind          text        DEFAULT 'khach-hang';
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- 3) projects: bổ sung trạng thái
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status        text        DEFAULT 'published';

-- 4) posts: đảm bảo có updated_at (API server luôn ghi cột này)
ALTER TABLE public.posts    ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- ============================================================
-- 5) DỌN SLUG RỖNG / TRÙNG rồi tạo UNIQUE INDEX
--    -> để việc đồng bộ về sau không bao giờ tạo bản ghi trùng
-- ============================================================
UPDATE public.posts    SET slug = 'post-'    || id WHERE slug IS NULL OR btrim(slug) = '';
UPDATE public.products SET slug = 'product-' || id WHERE slug IS NULL OR btrim(slug) = '';
UPDATE public.projects SET slug = 'project-' || id WHERE slug IS NULL OR btrim(slug) = '';
UPDATE public.partners SET slug = 'partner-' || id WHERE slug IS NULL OR btrim(slug) = '';

UPDATE public.posts    a SET slug = a.slug || '-' || a.id WHERE EXISTS (SELECT 1 FROM public.posts    b WHERE b.slug = a.slug AND b.id < a.id);
UPDATE public.products a SET slug = a.slug || '-' || a.id WHERE EXISTS (SELECT 1 FROM public.products b WHERE b.slug = a.slug AND b.id < a.id);
UPDATE public.projects a SET slug = a.slug || '-' || a.id WHERE EXISTS (SELECT 1 FROM public.projects b WHERE b.slug = a.slug AND b.id < a.id);
UPDATE public.partners a SET slug = a.slug || '-' || a.id WHERE EXISTS (SELECT 1 FROM public.partners b WHERE b.slug = a.slug AND b.id < a.id);

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_uidx    ON public.posts    (slug);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx ON public.products (slug);
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_uidx ON public.projects (slug);
CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_uidx ON public.partners (slug);

-- 6) Quyền đọc cho dashboard + website
GRANT SELECT ON public.posts, public.products, public.projects, public.partners TO anon, authenticated;

-- 7) Nạp lại schema cho PostgREST (BẮT BUỘC, nếu không API sẽ báo thiếu cột)
NOTIFY pgrst, 'reload schema';

-- ---------- KIỂM CHỨNG ----------
SELECT 'posts' AS bang, count(*) AS so_ban_ghi FROM public.posts
UNION ALL SELECT 'products', count(*) FROM public.products
UNION ALL SELECT 'projects', count(*) FROM public.projects
UNION ALL SELECT 'partners', count(*) FROM public.partners;
