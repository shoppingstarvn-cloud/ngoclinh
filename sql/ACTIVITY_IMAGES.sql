-- =============================================================================
-- BẢNG "HÌNH ẢNH HOẠT ĐỘNG" (gallery riêng cho trang chủ, tách khỏi Sản phẩm)
-- Chạy 1 lần: Supabase → SQL Editor → New query → Run. An toàn (IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_images (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT DEFAULT '',
  image_url     TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cho phép trang public (anon) ĐỌC ảnh hoạt động (giống các bảng nội dung khác).
ALTER TABLE activity_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_images public read" ON activity_images;
CREATE POLICY "activity_images public read" ON activity_images
  FOR SELECT USING (true);

-- Super Admin ghi bằng service_role (bỏ qua RLS) nên không cần policy ghi.
