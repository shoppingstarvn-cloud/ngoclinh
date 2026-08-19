-- =============================================================================
-- NÂNG CẤP MENU CON THÀNH 2 CẤP (menu lồng nhau)
-- Thêm cột parent_id: NULL = menu CẤP 1 (con trực tiếp của khối/danh mục gốc);
--                     có giá trị = menu CẤP 2 (con của 1 menu cấp 1).
-- Chạy 1 lần trong Supabase → SQL Editor → Run. An toàn (IF NOT EXISTS).
-- Yêu cầu: đã chạy CATEGORY_SUBMENUS.sql trước đó.
-- =============================================================================

ALTER TABLE category_submenus
  ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;

-- Truy vấn theo cha cho nhanh.
CREATE INDEX IF NOT EXISTS idx_category_submenus_parent
  ON category_submenus (parent_id);

-- (RLS public read đã bật từ CATEGORY_SUBMENUS.sql — không cần lặp lại.)
