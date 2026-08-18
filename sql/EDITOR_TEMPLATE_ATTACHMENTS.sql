-- =============================================================================
-- TEMPLATE SOẠN THẢO + KHU ĐÍNH KÈM TÁCH BIỆT (kiểu Gmail)
-- Chạy 1 lần trong Supabase → SQL Editor → New query → Run.
-- An toàn: dùng IF NOT EXISTS, không xoá/đụng dữ liệu cũ.
-- =============================================================================

-- 1) Bảng lưu MẪU nội dung (template) tái sử dụng khi soạn bài
CREATE TABLE IF NOT EXISTS content_templates (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Cột ĐÍNH KÈM tách biệt (mảng JSON: [{name,url,type,kind}]) cho các bảng nội dung
--    kind = 'image' (ảnh gửi kèm) hoặc 'file' (tài liệu đính kèm).
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Xong. Không cần cấp RLS: Super Admin ghi bằng service_role (bỏ qua RLS),
-- còn cột attachments trên các bảng nội dung dùng chung chính sách đọc sẵn có.
