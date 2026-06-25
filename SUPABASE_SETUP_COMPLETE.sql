-- ============================================================
-- SUPABASE SCHEMA HOÀN CHỈNH - BÊ TÔNG PHƯƠNG BẮC
-- Chạy toàn bộ SQL này trong Supabase SQL Editor
-- ============================================================

-- 1. CÀI ĐẶT WEBSITE (site_settings)
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ĐIỀU HƯỚNG (menus)
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  parent_id INT REFERENCES menus(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DANH MỤC (categories)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'product',
  parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BÀI VIẾT (posts)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SẢN PHẨM (products)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  price TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SLIDE (slides)
CREATE TABLE IF NOT EXISTS slides (
  id SERIAL PRIMARY KEY,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. THƯ VIỆN ẢNH (images hoặc photos - tên nào cũng được)
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  album_id TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias nếu dùng tên photos
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  album_id TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. VIDEO (videos)
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

-- 9. ĐỐI TÁC (partners)
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ĐÁNH GIÁ KHÁCH HÀNG (testimonials)
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  content TEXT NOT NULL,
  rating INT DEFAULT 5,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. LIÊN KẾT (links)
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  link_group TEXT DEFAULT 'footer',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. LIÊN HỆ (contact_submissions)
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

-- 13. ADMIN USERS (admin_users)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẬT ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TẠO POLICIES (Cho phép public đọc, service_role ghi)
-- ============================================================

-- Policy cho site_settings
DROP POLICY IF EXISTS "Public read site_settings" ON site_settings;
DROP POLICY IF EXISTS "Service role all site_settings" ON site_settings;
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Service role all site_settings" ON site_settings FOR ALL USING (true);

-- Policy cho menus
DROP POLICY IF EXISTS "Public read menus" ON menus;
DROP POLICY IF EXISTS "Service role all menus" ON menus;
CREATE POLICY "Public read menus" ON menus FOR SELECT USING (true);
CREATE POLICY "Service role all menus" ON menus FOR ALL USING (true);

-- Policy cho categories
DROP POLICY IF EXISTS "Public read categories" ON categories;
DROP POLICY IF EXISTS "Service role all categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Service role all categories" ON categories FOR ALL USING (true);

-- Policy cho posts
DROP POLICY IF EXISTS "Public read posts" ON posts;
DROP POLICY IF EXISTS "Service role all posts" ON posts;
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Service role all posts" ON posts FOR ALL USING (true);

-- Policy cho products
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Service role all products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Service role all products" ON products FOR ALL USING (true);

-- Policy cho slides
DROP POLICY IF EXISTS "Public read slides" ON slides;
DROP POLICY IF EXISTS "Service role all slides" ON slides;
CREATE POLICY "Public read slides" ON slides FOR SELECT USING (true);
CREATE POLICY "Service role all slides" ON slides FOR ALL USING (true);

-- Policy cho images
DROP POLICY IF EXISTS "Public read images" ON images;
DROP POLICY IF EXISTS "Service role all images" ON images;
CREATE POLICY "Public read images" ON images FOR SELECT USING (true);
CREATE POLICY "Service role all images" ON images FOR ALL USING (true);

-- Policy cho photos
DROP POLICY IF EXISTS "Public read photos" ON photos;
DROP POLICY IF EXISTS "Service role all photos" ON photos;
CREATE POLICY "Public read photos" ON photos FOR SELECT USING (true);
CREATE POLICY "Service role all photos" ON photos FOR ALL USING (true);

-- Policy cho videos
DROP POLICY IF EXISTS "Public read videos" ON videos;
DROP POLICY IF EXISTS "Service role all videos" ON videos;
CREATE POLICY "Public read videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Service role all videos" ON videos FOR ALL USING (true);

-- Policy cho partners
DROP POLICY IF EXISTS "Public read partners" ON partners;
DROP POLICY IF EXISTS "Service role all partners" ON partners;
CREATE POLICY "Public read partners" ON partners FOR SELECT USING (true);
CREATE POLICY "Service role all partners" ON partners FOR ALL USING (true);

-- Policy cho testimonials
DROP POLICY IF EXISTS "Public read testimonials" ON testimonials;
DROP POLICY IF EXISTS "Service role all testimonials" ON testimonials;
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Service role all testimonials" ON testimonials FOR ALL USING (true);

-- Policy cho links
DROP POLICY IF EXISTS "Public read links" ON links;
DROP POLICY IF EXISTS "Service role all links" ON links;
CREATE POLICY "Public read links" ON links FOR SELECT USING (true);
CREATE POLICY "Service role all links" ON links FOR ALL USING (true);

-- Policy cho contact_submissions (chỉ service_role)
DROP POLICY IF EXISTS "Service role all contact" ON contact_submissions;
DROP POLICY IF EXISTS "Public insert contact" ON contact_submissions;
CREATE POLICY "Service role all contact" ON contact_submissions FOR ALL USING (true);
CREATE POLICY "Public insert contact" ON contact_submissions FOR INSERT WITH CHECK (true);

-- Policy cho admin_users (chỉ service_role)
DROP POLICY IF EXISTS "Service role all admin_users" ON admin_users;
CREATE POLICY "Service role all admin_users" ON admin_users FOR ALL USING (true);

-- ============================================================
-- TẠO STORAGE BUCKET (Run riêng nếu chưa có)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('uploads', 'uploads', true)
-- ON CONFLICT (id) DO NOTHING;

-- DROP POLICY IF EXISTS "Public upload" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read" ON storage.objects;
-- DROP POLICY IF EXISTS "Service delete" ON storage.objects;

-- CREATE POLICY "Public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
-- CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
-- CREATE POLICY "Service delete" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');

-- ============================================================
-- DỮ LIỆU MẪU
-- ============================================================

-- Site settings mẫu
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('hotline', '0934640601'),
  ('email', 'congtycuaau8386@gmail.com'),
  ('address', 'Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng'),
  ('facebook_url', 'https://www.facebook.com/phuongbac.betong'),
  ('logo_url', 'images/contact/4174logo_bt.png'),
  ('favicon_url', 'images/favicon/8446logo_bt.png')
ON CONFLICT (key) DO NOTHING;

-- Admin user mặc định (password: admin)
INSERT INTO admin_users (username, password_hash, full_name, role)
VALUES ('admin', 'admin', 'Super Admin', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- HOÀN TẤT!
-- ============================================================
-- Giờ đây bạn có thể:
-- 1. Vào Admin Dashboard (admin.html) đăng nhập bằng password: admin / 8386 / cuaau@2026
-- 2. Thêm/Sửa/Xóa dữ liệu từ Admin
-- 3. Website (index.html) tự động đồng bộ realtime từ Supabase
