-- =============================================================================
-- BẢNG "VIDEO HOẠT ĐỘNG" (module video trang chủ + CRUD Super Admin)
-- Chạy 1 lần: Supabase → SQL Editor → New query → Run. An toàn (IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS videos (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT DEFAULT '',
  youtube_url   TEXT DEFAULT '',     -- dán link YouTube
  embed_url     TEXT DEFAULT '',     -- HOẶC video tải lên (Drive/Supabase)
  thumbnail_url TEXT DEFAULT '',     -- ảnh đại diện (tuỳ chọn)
  description   TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nếu bảng đã tồn tại từ trước mà thiếu cột thì bổ sung (an toàn).
ALTER TABLE videos ADD COLUMN IF NOT EXISTS title         TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS youtube_url   TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_url     TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description   TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

-- Cho phép trang public (anon) ĐỌC video (giống các bảng nội dung khác).
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "videos public read" ON videos;
CREATE POLICY "videos public read" ON videos
  FOR SELECT USING (true);

-- Super Admin ghi bằng service_role (bỏ qua RLS) nên không cần policy ghi.

-- Video mẫu (tuỳ chọn) — bỏ comment nếu muốn có 1 video demo ngay:
-- INSERT INTO videos (title, youtube_url, description, is_active)
-- SELECT 'Truyền cảm hứng', 'https://youtu.be/J3JfgYSKqUE', 'Ghi lại những khoảnh khắc ý nghĩa', true
-- WHERE NOT EXISTS (SELECT 1 FROM videos);
