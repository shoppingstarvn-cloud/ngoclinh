-- ============================================================
-- supabase_security_ROLLBACK.sql  (CHỈ DÙNG KHI KHẨN CẤP)
-- Mở lại quyền ghi cho anon trên tất cả bảng nội dung + admin_users + contact,
-- đưa về trạng thái TRƯỚC khi siết bảo mật (phòng khi CMS ngừng lưu do
-- chưa set đúng SUPABASE_SERVICE_KEY).
-- Cách chạy: Supabase -> SQL Editor -> dán -> Run.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['site_settings','menus','categories','posts','products','slides',
                           'photos','images','videos','partners','testimonials','links',
                           'contact_submissions','admin_users']
  LOOP
    -- xoá policy siết
    EXECUTE format('DROP POLICY IF EXISTS p_public_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS p_rw ON public.%I', t);
    -- mở lại toàn quyền cho anon (trạng thái cũ)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY p_rw ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
