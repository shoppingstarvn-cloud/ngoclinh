-- ============================================================
-- supabase_security_lockdown.sql
-- SIẾT BẢO MẬT cho webbetonglammau:
--  1) admin_users + contact_submissions: CHẶN hoàn toàn anon (chỉ server = service_role đọc/ghi)
--  2) Các bảng nội dung: anon CHỈ được ĐỌC (SELECT), KHÔNG ghi/xoá được nữa
--     -> ghi/xoá chỉ qua server (service_role bỏ qua RLS)
--  3) Băm (hash sha256) mật khẩu admin, bỏ plaintext trong DB
--
-- ĐIỀU KIỆN TIÊN QUYẾT: đã set SUPABASE_SERVICE_KEY (khoá secret/service_role)
--   trên Vercel (Production) + Redeploy. Nếu chưa, CMS sẽ KHÔNG lưu được.
-- Cách chạy: Supabase -> SQL Editor -> dán toàn bộ -> Run.
-- ============================================================

-- 0) Xoá SẠCH mọi policy cũ (kể cả p_rw đang mở) trên các bảng liên quan
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('site_settings','menus','categories','posts','products','slides',
                        'photos','images','videos','partners','testimonials','links',
                        'contact_submissions','admin_users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 1) Bảng NỘI DUNG: bật RLS + chỉ cho anon/authenticated ĐỌC (SELECT).
--    Không có policy ghi cho anon => anon KHÔNG insert/update/delete được.
--    Server dùng service_role -> tự bỏ qua RLS -> vẫn ghi/xoá bình thường.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings','menus','categories','posts','products','slides',
                           'photos','images','videos','partners','testimonials','links']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY p_public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;

-- 2) admin_users + contact_submissions: bật RLS, KHÔNG tạo policy nào cho anon
--    => anon bị chặn hoàn toàn (không đọc được mật khẩu, không đọc được liên hệ).
--    Server (service_role) vẫn đọc/ghi bình thường vì bỏ qua RLS.
ALTER TABLE public.admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- 3) Băm mật khẩu admin (bỏ plaintext). 'admin' -> sha256:
UPDATE admin_users
SET password_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
WHERE id = 1 AND password_hash = 'admin';

-- 4) Nạp lại schema
NOTIFY pgrst, 'reload schema';
