-- ============================================================
-- supabase_schema_fix.sql
-- VÁ LỆCH SCHEMA: bổ sung các cột mà admin.html / realtime-data.js
-- cần dùng nhưng chưa tồn tại trên bảng thật (đã xác minh qua REST API).
-- Toàn bộ là ADD COLUMN IF NOT EXISTS + dọn rác dữ liệu -> AN TOÀN,
-- chạy lại nhiều lần không sao, không ảnh hưởng dữ liệu hiện có.
-- Cách chạy: Supabase Dashboard -> SQL Editor -> dán toàn bộ -> Run.
-- ============================================================

-- 1) categories: thiếu type, parent_id, display_order, thumbnail_url
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS parent_id integer,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2) posts: thiếu category_id, thumbnail_url, tags, status, display_order
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS category_id integer,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS tags text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- 3) videos: thiếu embed_url, thumbnail_url, display_order
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS embed_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- ============================================================
-- 4) Dọn rác site_settings: xoá các dòng lỗi/trùng đã phát hiện
--    (sai key hoa/thường, gõ nhầm ký tự, key rỗng)
-- ============================================================
DELETE FROM site_settings WHERE id IN (1, 2, 18, 19);
-- id 1 = "tên Website" (trùng site_name, sai case)
-- id 2 = "Hotline" (trùng hotline, sai case)
-- id 18 = "intro#text" (gõ nhầm, đúng phải là intro_text)
-- id 19 = key rỗng ""

-- 5) Bổ sung 2 key còn thiếu cho form Cài đặt Website mới
--    (không ghi đè nếu đã tồn tại)
INSERT INTO site_settings (key, value)
SELECT 'meta_description', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'meta_description');

INSERT INTO site_settings (key, value)
SELECT 'meta_keywords', 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'meta_keywords');

-- 6) Đồng nhất kiểu is_active: đổi posts/videos/photos từ INTEGER -> BOOLEAN
--    (các bảng khác đã là boolean). Không mất dữ liệu: 1->true, 0->false.
ALTER TABLE posts  ALTER COLUMN is_active DROP DEFAULT;
ALTER TABLE posts  ALTER COLUMN is_active TYPE boolean USING (is_active <> 0);
ALTER TABLE posts  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE videos ALTER COLUMN is_active DROP DEFAULT;
ALTER TABLE videos ALTER COLUMN is_active TYPE boolean USING (is_active <> 0);
ALTER TABLE videos ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE photos ALTER COLUMN is_active DROP DEFAULT;
ALTER TABLE photos ALTER COLUMN is_active TYPE boolean USING (is_active <> 0);
ALTER TABLE photos ALTER COLUMN is_active SET DEFAULT true;

-- 7) Bổ sung updated_at cho 2 bảng còn thiếu (server tự gán khi lưu -> tránh lỗi)
ALTER TABLE categories          ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 8) Bắt PostgREST nạp lại schema NGAY để nhận các cột vừa thêm (hết lỗi 400)
NOTIFY pgrst, 'reload schema';
