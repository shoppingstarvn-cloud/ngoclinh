-- ============================================================
-- supabase_projects_table.sql
-- Tách "Dự án" thành BẢNG RIÊNG (projects) + chuyển 7 dự án từ posts sang.
-- ============================================================

-- 1) Tạo bảng projects
CREATE TABLE IF NOT EXISTS projects (
  id            serial PRIMARY KEY,
  title         text,
  slug          text,
  link_url      text,
  excerpt       text,
  content       text,
  thumbnail_url text,
  display_order integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2) Chuyển 7 dự án (tags='du-an') từ posts sang projects
INSERT INTO projects (title, slug, thumbnail_url, excerpt, content, display_order, is_active, created_at, updated_at)
SELECT title, slug, thumbnail_url, excerpt, content, display_order, is_active, created_at, updated_at
FROM posts WHERE tags = 'du-an';

DELETE FROM posts WHERE tags = 'du-an';

-- 3) Phân quyền + RLS (anon CHỈ đọc, server service_role ghi)
GRANT SELECT ON projects TO anon, authenticated;
GRANT ALL ON projects TO service_role;
GRANT USAGE, SELECT ON SEQUENCE projects_id_seq TO anon, authenticated, service_role;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_public_read ON projects;
CREATE POLICY p_public_read ON projects FOR SELECT TO anon, authenticated USING (true);

-- 4) Nạp lại schema
NOTIFY pgrst, 'reload schema';
