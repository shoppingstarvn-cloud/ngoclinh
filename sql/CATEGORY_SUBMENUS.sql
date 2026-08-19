-- =============================================================================
-- BẢNG "MENU CON" cho các khối danh mục ở trang chủ (sổ xuống khi rê chuột).
-- Admin thêm/sửa/xóa trong dashboard. category_id = ID của khối/danh mục cha.
-- Chạy 1 lần: Supabase → SQL Editor → New query → Run. An toàn (IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS category_submenus (
  id            BIGSERIAL PRIMARY KEY,
  category_id   BIGINT NOT NULL,               -- ID của danh mục cha (bảng categories)
  label         TEXT NOT NULL DEFAULT '',      -- Tên menu con hiển thị
  link_url      TEXT DEFAULT '',               -- Link đích khi bấm
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Truy vấn theo category_id + thứ tự cho nhanh.
CREATE INDEX IF NOT EXISTS idx_category_submenus_cat
  ON category_submenus (category_id, display_order);

-- Cho phép trang public (anon) ĐỌC menu con (giống các bảng nội dung khác).
ALTER TABLE category_submenus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "category_submenus public read" ON category_submenus;
CREATE POLICY "category_submenus public read" ON category_submenus
  FOR SELECT USING (true);

-- Super Admin ghi bằng service_role (bỏ qua RLS) nên không cần policy ghi.
