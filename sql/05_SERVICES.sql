-- =============================================================================
-- BẢNG "CÁC DỊCH VỤ" — khối sandwich (thanh trên + ảnh + thanh dưới)
-- Chạy 1 lần: Supabase ngoclinh (pglbhoitmcflpvoasewr) → SQL Editor → Run.
-- An toàn chạy lại (IF NOT EXISTS / WHERE NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.services (
  id            BIGSERIAL PRIMARY KEY,
  title_top     TEXT NOT NULL DEFAULT '',
  title_bottom  TEXT DEFAULT '',
  image_url     TEXT DEFAULT '',
  link_top      TEXT DEFAULT '',
  link_bottom   TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Khối dịch vụ trang chủ (kiểu sandwich: tiêu đề trên + ảnh + tiêu đề dưới)';
COMMENT ON COLUMN public.services.title_top IS 'Tiêu đề thanh trên';
COMMENT ON COLUMN public.services.title_bottom IS 'Tiêu đề thanh dưới (để trống thì ẩn thanh dưới)';
COMMENT ON COLUMN public.services.link_top IS 'Link khi bấm thanh trên / ảnh';
COMMENT ON COLUMN public.services.link_bottom IS 'Link khi bấm thanh dưới';

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active" ON public.services;
CREATE POLICY "Public read active" ON public.services
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service full access" ON public.services;
CREATE POLICY "Service full access" ON public.services
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON TABLE public.services TO service_role;
DO $$
BEGIN
  GRANT USAGE, SELECT ON SEQUENCE public.services_id_seq TO service_role;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Sequence services_id_seq chưa có — bỏ qua GRANT SEQUENCE';
END $$;

-- Realtime: Super Admin CRUD → website tự refresh (LiveSiteSync)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime chưa có — bỏ qua realtime';
END $$;

-- Seed 11 dịch vụ (chỉ khi bảng đang trống)
INSERT INTO public.services (
  title_top, title_bottom, image_url, link_top, link_bottom, display_order, is_active
)
SELECT v.title_top, v.title_bottom, v.image_url, v.link_top, v.link_bottom, v.display_order, v.is_active
FROM (VALUES
  ('Làm Ảnh, Video, Voice AI', '', '/og/ngoclinh-og.jpg', '', '', 1, true),
  ('Các Siêu Trợ Lý AI', '', '/og/ngoclinh-og.jpg', '', '', 2, true),
  ('Các gói Đào Tạo AI', '', '/og/ngoclinh-og.jpg', '', '', 3, true),
  ('Dịch Vụ Cài Đặt AI', '', '/og/ngoclinh-og.jpg', '', '', 4, true),
  ('Dịch Vụ làm APP, Web, Landing Page, Xây Kênh', '', '/og/ngoclinh-og.jpg', '', '', 5, true),
  ('Dịch vụ tạo CHAT BOT AI', '', '/og/ngoclinh-og.jpg', '', '', 6, true),
  ('DỊCH VỤ TÍCH HỢP CHAT BOT – AUTOMATION', '', '/og/ngoclinh-og.jpg', '', '', 7, true),
  ('ĐÀO TẠO, CÀI ĐẶT, HƯỚNG DẪN OPENCLAW', '', '/og/ngoclinh-og.jpg', '', '', 8, true),
  ('Đào tạo, hướng dẫn, trực tiếp cài đặt các Bot Siêu Kế Toán Trưởng, Bot Trưởng Phòng, Bot Chuyên Gia cho các Tổ Chức và Doanh Nghiệp', '', '/og/ngoclinh-og.jpg', '', '', 9, true),
  ('Thiết lập Hệ Thống Bot Đa Tầng để tự động xử lý công việc cho các Tổ Chức, Doanh Nghiệp', '', '/og/ngoclinh-og.jpg', '', '', 10, true),
  ('Sáng tác bài hát cho Tổ Chức, Trường Học, Doanh Nghiệp', '', '/og/ngoclinh-og.jpg', '', '', 11, true)
) AS v(title_top, title_bottom, image_url, link_top, link_bottom, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.services);

NOTIFY pgrst, 'reload schema';
