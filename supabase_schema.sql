-- ============================================================
-- SUPABASE SCHEMA - BÊ TÔNG PHƯƠNG BẮC WEBSITE
-- ============================================================

-- 0. CREATE STORAGE BUCKET for file uploads
-- Run this in Supabase SQL Editor (Service Role Required)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('website-images', 'website-images', true)
-- ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'website-images');
-- CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT USING (bucket_id = 'website-images');
-- CREATE POLICY "Allow public deletes" ON storage.objects FOR DELETE USING (bucket_id = 'website-images');

-- 1. WEBSITE CONFIG (Cấu hình gốc website)
CREATE TABLE IF NOT EXISTS website_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Khởi tạo dữ liệu mặc định
INSERT INTO website_config (key, value) VALUES
  ('site_name', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('site_name_short', 'CỬA ÂU'),
  ('logo_url', 'images/contact/4174logo_bt.png'),
  ('favicon_url', 'images/favicon/8446logo_bt.png'),
  ('hotline', '0947881181'),
  ('hotline_2', '0934640601'),
  ('email', 'congtycuaau8386@gmail.com'),
  ('email_2', ''),
  ('address', 'Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng'),
  ('address_short', 'Thôn 6, Pháp Cổ, Việt Khê, Hải Phòng'),
  ('website_url', 'https://betongphuongbac.com'),
  ('facebook_url', 'https://www.facebook.com/phuongbac.betong'),
  ('twitter_url', '#'),
  ('youtube_url', '#'),
  ('zalo_phone', '0947881181'),
  ('footer_copyright', 'BẢN QUYỀN THUỘC VỀ CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('primary_color', '#004d00'),
  ('secondary_color', '#dc3545'),
  ('meta_keywords', 'cống bê tông, cống hộp, cống tròn, hố ga bê tông'),
  ('meta_description', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU - Sản xuất cống bê tông đúc sẵn chất lượng cao')
ON CONFLICT (key) DO NOTHING;

-- 2. PAGES CONTENT (Nội dung từng trang)
CREATE TABLE IF NOT EXISTS pages_content (
  id SERIAL PRIMARY KEY,
  page_slug TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  meta_keywords TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO pages_content (page_slug, title, content, image_url) VALUES
  ('index', 'Trang Chủ', '<p>Chào mừng đến với CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU</p>', ''),
  ('gioi-thieu', 'Giới Thiệu', '<p>Giới thiệu về công ty</p>', ''),
  ('lien-he', 'Liên Hệ', '<p>Thông tin liên hệ</p>', ''),
  ('du-an', 'Dự Án', '<p>Dự án tiêu biểu</p>', ''),
  ('tin-tuc', 'Tin Tức', '<p>Tin tức mới nhất</p>', '')
ON CONFLICT (page_slug) DO NOTHING;

-- 3. CATEGORIES (Danh mục sản phẩm/dự án)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  menu_label TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATEGORIES AND POSTS (Bài viết, slide, dự án, sản phẩm)
CREATE TABLE IF NOT EXISTS categories_and_posts (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  post_title TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  post_content TEXT DEFAULT '',
  url_link TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MENU / NAVIGATION
CREATE TABLE IF NOT EXISTS navigation (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES navigation(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SITE MEDIA (Ảnh, video, file)
CREATE TABLE IF NOT EXISTS site_media (
  id SERIAL PRIMARY KEY,
  media_type TEXT NOT NULL DEFAULT 'image', -- image, video, file, logo
  title TEXT DEFAULT '',
  url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  alt_text TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SOCIAL LINKS
CREATE TABLE IF NOT EXISTS social_links (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_class TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 8. CONTACT SUBMISSIONS (Liên hệ từ khách hàng)
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

-- 9. STAFF / NHÂN SỰ
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TESTIMONIALS (Khách hàng nói về chúng tôi)
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  position TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  content TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS (Row Level Security)
ALTER TABLE website_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_and_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Cho phép public read và authenticated write (tùy chỉnh theo nhu cầu)
CREATE POLICY "Allow public read" ON website_config FOR SELECT USING (true);
CREATE POLICY "Allow authenticated upsert" ON website_config FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow public read" ON pages_content FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all" ON pages_content FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all" ON categories FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow public read" ON categories_and_posts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all" ON categories_and_posts FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow public read" ON navigation FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all" ON navigation FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');