-- ============================================================================
-- SUPABASE SCHEMA — SUPER ADMIN CMS (webbetonglammau / Cửa Âu)
-- ============================================================================
-- File này là NGUỒN SỰ THẬT DUY NHẤT (single source of truth) cho schema.
-- Toàn bộ script đều dùng IF NOT EXISTS / ADD COLUMN IF NOT EXISTS nên CÓ THỂ
-- CHẠY LẠI NHIỀU LẦN AN TOÀN trên database đã có dữ liệu (không mất dữ liệu).
--
-- QUAN TRỌNG — TẠI SAO KHÔNG TẠO BẢNG MỚI `global_settings` / `articles` / `media`:
-- Dự án đã có sẵn các bảng tương đương đang được Website + Admin + Middleware
-- (SEO slug, redirect legacy URL...) dùng trực tiếp. Tạo bảng song song sẽ làm
-- dữ liệu bị PHÂN MẢNH (2 nguồn sự thật) và có nguy cơ sập trang đang chạy:
--   global_settings  →  đã có bảng `site_settings`   (key/value, dùng cho Header/Footer/SEO)
--   articles         →  đã có bảng `posts`            (tags='tin-tuc' cho khối Tin tức)
--   media            →  đã có bảng `photos` + `images` (thư viện ảnh) + Storage bucket `uploads`
-- => Script này CHUẨN HOÁ và MỞ RỘNG đúng các bảng đó, không tạo bản sao.
--
-- CÁCH CHẠY: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================================

-- ============================================================================
-- 1. SITE_SETTINGS  (= "global_settings": logo, tên site, SĐT, email, SEO...)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('logo_url', '/images/contact/4174logo_bt.png'),
  ('favicon_url', '/logo/shopmartai-ai.png'),
  ('hotline', '0934640601'),
  ('email', 'congtycuaau8386@gmail.com'),
  ('address', 'Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng'),
  ('facebook_url', ''),
  ('website_url', 'https://congbetongcuaau.com'),
  ('footer_copyright', 'BẢN QUYỀN THUỘC VỀ CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('meta_keywords', 'cống bê tông, cống hộp, cống tròn, hố ga bê tông'),
  ('meta_description', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU - Sản xuất cống bê tông đúc sẵn chất lượng cao'),
  ('intro_text', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. MENUS (menu điều hướng đa cấp)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menus (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '#',
  parent_id INT REFERENCES public.menus(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CATEGORIES (danh mục sản phẩm/bài viết)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  link_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  type TEXT DEFAULT 'product' CHECK (type IN ('product', 'post', 'project', 'gallery')),
  parent_id INT REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';

-- ============================================================================
-- 4. POSTS  (= "articles": tin tức + bài viết chuyên ngành, tags='tin-tuc')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INT REFERENCES public.categories(id) ON DELETE SET NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  -- Cột scalar (KHÔNG phải mảng) — app lọc bằng .eq('tags','tin-tuc')
  tags TEXT DEFAULT 'tin-tuc',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PROJECTS (dự án tiêu biểu — tách riêng khỏi posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  link_url TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PRODUCTS (sản phẩm)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  link_url TEXT DEFAULT '',
  category_id INT REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  price TEXT DEFAULT 'Liên hệ',
  thumbnail_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '';

-- ============================================================================
-- 7. SLIDES (= banner trang chủ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.slides (
  id SERIAL PRIMARY KEY,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '#',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. PHOTOS  (= "media" chính — Thư viện ảnh dùng bởi Admin + trang chủ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.photos (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  album_id TEXT DEFAULT 'default',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8b. IMAGES — bảng cũ giữ lại để tương thích ngược (không dùng cho tính năng mới)
CREATE TABLE IF NOT EXISTS public.images (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  album_id TEXT DEFAULT 'default',
  caption TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. VIDEOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id SERIAL PRIMARY KEY,
  title TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  embed_url TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. PARTNERS (đối tác)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '#',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. TESTIMONIALS (đánh giá khách hàng)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.testimonials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  content TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11b. SERVICES (khối dịch vụ trang chủ — ảnh trên + thanh trắng tên)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id BIGSERIAL PRIMARY KEY,
  title_top TEXT NOT NULL DEFAULT '',
  title_bottom TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_top TEXT DEFAULT '',
  link_bottom TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. LINKS (social/footer/quick links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.links (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  link_group TEXT DEFAULT 'social' CHECK (link_group IN ('social', 'footer', 'quick')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. CONTACT_SUBMISSIONS (form liên hệ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. ADMIN_USERS (tài khoản Super Admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'editor')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_menus_parent ON public.menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts(tags);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_photos_album ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS idx_contact_read ON public.contact_submissions(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON
  public.site_settings, public.menus, public.categories, public.posts,
  public.projects, public.products, public.slides, public.photos,
  public.images, public.videos, public.partners, public.testimonials, public.services, public.links
TO anon, authenticated;
GRANT INSERT ON public.contact_submissions TO anon, authenticated;

DROP POLICY IF EXISTS "Public read" ON public.site_settings;
CREATE POLICY "Public read" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active" ON public.menus;
CREATE POLICY "Public read active" ON public.menus FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.categories;
CREATE POLICY "Public read active" ON public.categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.posts;
CREATE POLICY "Public read active" ON public.posts FOR SELECT USING (is_active = true AND status = 'published');

DROP POLICY IF EXISTS "Public read active" ON public.projects;
CREATE POLICY "Public read active" ON public.projects FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.products;
CREATE POLICY "Public read active" ON public.products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.slides;
CREATE POLICY "Public read active" ON public.slides FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.photos;
CREATE POLICY "Public read active" ON public.photos FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.images;
CREATE POLICY "Public read active" ON public.images FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.videos;
CREATE POLICY "Public read active" ON public.videos FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.partners;
CREATE POLICY "Public read active" ON public.partners FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.testimonials;
CREATE POLICY "Public read active" ON public.testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.services;
CREATE POLICY "Public read active" ON public.services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active" ON public.links;
CREATE POLICY "Public read active" ON public.links FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public insert" ON public.contact_submissions;
CREATE POLICY "Public insert" ON public.contact_submissions FOR INSERT WITH CHECK (true);

-- service_role (SUPABASE_SERVICE_KEY trên server / Vercel) luôn bypass RLS mặc
-- định, nhưng khai báo policy tường minh để không phụ thuộc hành vi ngầm.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_settings','menus','categories','posts','projects','products','slides',
    'photos','images','videos','partners','testimonials','services','links',
    'contact_submissions','admin_users'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Service full access" ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
      t
    );
  END LOOP;
END $$;

-- ============================================================================
-- STORAGE BUCKET (ảnh/video upload từ Super Admin)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Service write uploads" ON storage.objects;
CREATE POLICY "Service write uploads" ON storage.objects
  FOR ALL USING (bucket_id = 'uploads' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- GHI CHÚ VỀ "ĐỒNG BỘ REAL-TIME"
-- ============================================================================
-- Kiến trúc mới KHÔNG dùng Postgres Realtime (supabase.channel) như bản cũ
-- (client tự subscribe rồi vẽ lại DOM bằng jQuery). Thay vào đó:
--   Admin bấm Lưu → Server Action (lib/actions/admin-actions.ts) ghi Supabase
--   → gọi revalidatePath('/', 'layout') → Next.js xoá cache TOÀN BỘ site
--   → request kế tiếp (kể cả F5 ngay lập tức) trả về dữ liệu mới nhất.
-- Cách này nhanh hơn, không cần giữ kết nối WebSocket, và hoạt động ổn định
-- trên Vercel Serverless (nơi giữ realtime channel phía server không khả thi).
