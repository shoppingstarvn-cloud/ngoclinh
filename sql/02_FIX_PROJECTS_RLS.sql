-- ============================================================
-- 02_FIX_PROJECTS_RLS.sql
-- Sửa lỗi: anon chỉ đọc được 2/7 dự án → trang chủ thiếu dự án.
-- Nguyên nhân: bảng projects thiếu policy đọc công khai đầy đủ cho anon.
-- Chạy: Supabase → SQL Editor → dán toàn bộ → Run. An toàn, chạy lại được.
-- ============================================================

GRANT SELECT ON public.projects TO anon, authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_public_read ON public.projects;
CREATE POLICY p_public_read ON public.projects
  FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';

-- Kiểm chứng (phải ra đúng tổng số dự án thật):
SELECT count(*) AS projects_tong FROM public.projects;
