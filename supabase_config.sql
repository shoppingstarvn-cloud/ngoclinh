-- ============================================================================
-- SUPABASE REALTIME + RLS CONFIGURATION
-- Mục tiêu: Bật Realtime Replication + mở RLS cho 11 bảng để Frontend đọc
-- ============================================================================

-- ============ BƯỚC 1: BẬT REALTIME REPLICATION CHO 11 BẢNG ============
ALTER PUBLICATION supabase_realtime ADD TABLE slides;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE partners;
ALTER PUBLICATION supabase_realtime ADD TABLE testimonials;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE menus;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE videos;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE links;
ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;

-- ============ BƯỚC 2: BẬT RLS + TẠO POLICY PUBLIC READ CHO 11 BẢNG ============

-- 1. SLIDES
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON slides;
CREATE POLICY "Allow public read access" ON slides FOR SELECT USING (true);

-- 2. PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON products;
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);

-- 3. PARTNERS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON partners;
CREATE POLICY "Allow public read access" ON partners FOR SELECT USING (true);

-- 4. TESTIMONIALS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON testimonials;
CREATE POLICY "Allow public read access" ON testimonials FOR SELECT USING (true);

-- 5. POSTS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON posts;
CREATE POLICY "Allow public read access" ON posts FOR SELECT USING (true);

-- 6. MENUS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON menus;
CREATE POLICY "Allow public read access" ON menus FOR SELECT USING (true);

-- 7. CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON categories;
CREATE POLICY "Allow public read access" ON categories FOR SELECT USING (true);

-- 8. VIDEOS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON videos;
CREATE POLICY "Allow public read access" ON videos FOR SELECT USING (true);

-- 9. PHOTOS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON photos;
CREATE POLICY "Allow public read access" ON photos FOR SELECT USING (true);

-- 10. LINKS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON links;
CREATE POLICY "Allow public read access" ON links FOR SELECT USING (true);

-- 11. SITE_SETTINGS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
CREATE POLICY "Allow public read access" ON site_settings FOR SELECT USING (true);

-- ============================================================================
-- ✅ HOÀN TẤT: Realtime + RLS đã được cấu hình cho 11 bảng
-- 
-- HƯỚNG DẪN THỰC THI:
-- 1. Vào Supabase Dashboard: https://supabase.com/dashboard
-- 2. Chọn project → SQL Editor (menu bên trái)
-- 3. Copy TOÀN BỘ nội dung file này
-- 4. Paste vào SQL Editor → Click "RUN" (hoặc Ctrl+Enter)
-- 5. Chờ 2-3 giây → Thành công!
-- 
-- KẾT QUẢ: Website public có thể đọc dữ liệu + nhận Realtime updates
-- ============================================================================
