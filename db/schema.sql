-- ============================================================
-- SUPABASE SCHEMA - BÊ TÔNG PHƯƠNG BẮC CMS
-- Phiên bản: 2.0 (Chuẩn CMS động, real-time)
-- ============================================================
-- CÁCH CHẠY: Mở Supabase SQL Editor -> Paste -> Run
-- ============================================================

-- 0. TẠO STORAGE BUCKET (Chạy riêng nếu chưa có)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. SITE SETTINGS (Cấu hình website)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dữ liệu mặc định
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('site_name_short', 'CỬA ÂU'),
  ('slogan', ''),
  ('logo_url', '/images/contact/4174logo_bt.png'),
  ('favicon_url', '/images/favicon/8446logo_bt.png'),
  ('hotline', '0934640601'),
  ('hotline_2', '0934640601'),
  ('email', 'congtycuaau8386@gmail.com'),
  ('address', 'Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng'),
  ('facebook_url', 'https://www.facebook.com/phuongbac.betong'),
  ('zalo_phone', '0934640601'),
  ('map_embed', ''),
  ('gtm_code', ''),
  ('footer_copyright', 'BẢN QUYỀN THUỘC VỀ CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('meta_keywords', 'cống bê tông, cống hộp, cống tròn, hố ga bê tông'),
  ('meta_description', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU - Sản xuất cống bê tông đúc sẵn chất lượng cao')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. MENUS (Menu điều hướng)
-- ============================================================
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '#',
  parent_id INT REFERENCES menus(id) ON DELETE CASCADE,
  icon TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CATEGORIES (Danh mục sản phẩm/bài viết)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'product' CHECK (type IN ('product', 'post', 'project', 'gallery')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. POSTS (Bài viết, tin tức)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PRODUCTS (Sản phẩm)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  price TEXT DEFAULT 'Liên hệ',
  images JSONB DEFAULT '[]'::jsonb,
  thumbnail_url TEXT DEFAULT '',
  specs JSONB DEFAULT '{}'::jsonb,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. SLIDES (Banner quảng cáo)
-- ============================================================
CREATE TABLE IF NOT EXISTS slides (
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

-- ============================================================
-- 7. IMAGES / ALBUMS (Thư viện ảnh)
-- ============================================================
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  album_id TEXT DEFAULT 'default',
  caption TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. VIDEOS (Thư viện video)
-- ============================================================
CREATE TABLE IF NOT EXISTS videos (
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

-- ============================================================
-- 9. PARTNERS (Đối tác)
-- ============================================================
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '#',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TESTIMONIALS (Khách hàng nói về chúng tôi)
-- ============================================================
CREATE TABLE IF NOT EXISTS testimonials (
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

-- ============================================================
-- 11. LINKS (Liên kết nhanh, social)
-- ============================================================
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  link_group TEXT DEFAULT 'social' CHECK (link_group IN ('social', 'footer', 'quick')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. CONTACT SUBMISSIONS (Khách hàng gửi liên hệ)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. ADMIN USERS (Người quản trị)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
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

-- Mật khẩu mặc định: admin (sẽ hash sau)
INSERT INTO admin_users (username, password_hash, full_name, role) VALUES
  ('admin', 'admin', 'Super Admin', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PUBLIC READ: anon/publishable key chỉ đọc được bản ghi is_active = true
CREATE POLICY "Public read active" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read active" ON menus FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON posts FOR SELECT USING (is_active = true AND status = 'published');
CREATE POLICY "Public read active" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON slides FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON images FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON videos FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON partners FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active" ON links FOR SELECT USING (is_active = true);
CREATE POLICY "Public insert" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read all" ON contact_submissions FOR SELECT USING (true);

-- SERVICE_ROLE: toàn quyền CRUD (chỉ dùng từ server với service key)
CREATE POLICY "Service full access" ON site_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON menus FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON slides FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON images FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON videos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON partners FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON testimonials FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON contact_submissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access" ON admin_users FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ENABLE REALTIME (cho phép subscribe)
-- ============================================================
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE menus;
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE slides;
  ALTER PUBLICATION supabase_realtime ADD TABLE images;
  ALTER PUBLICATION supabase_realtime ADD TABLE videos;
  ALTER PUBLICATION supabase_realtime ADD TABLE partners;
  ALTER PUBLICATION supabase_realtime ADD TABLE testimonials;
  ALTER PUBLICATION supabase_realtime ADD TABLE links;
  ALTER PUBLICATION supabase_realtime ADD TABLE contact_submissions;
COMMIT;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_images_album ON images(album_id);
CREATE INDEX IF NOT EXISTS idx_contact_read ON contact_submissions(is_read);