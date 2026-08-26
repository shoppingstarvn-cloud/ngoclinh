-- =============================================================================
-- FORM ĐĂNG KÝ + KHỐI SIDEBAR + BẢNG THÔNG TIN ĐĂNG KÝ (Admin)
-- Chạy 1 lần: Supabase ngoclinh (pglbhoitmcflpvoasewr) → SQL Editor → Run.
-- An toàn chạy lại (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================================

-- Nội dung các khối (form + 4 thẻ phải) — Super Admin CRUD, website đọc realtime
CREATE TABLE IF NOT EXISTS public.register_blocks (
  id            BIGSERIAL PRIMARY KEY,
  block_key     TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL DEFAULT '',
  subtitle      TEXT DEFAULT '',
  body          TEXT DEFAULT '',
  image_url     TEXT DEFAULT '',
  link_url      TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  zalo          TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.register_blocks IS 'Khối form đăng ký + sidebar (community/QR/liên hệ/cam kết) — CRUD từ Admin';
COMMENT ON COLUMN public.register_blocks.block_key IS 'form | community | qr | contact | commitment | hoặc mã khối mới';
COMMENT ON COLUMN public.register_blocks.subtitle IS 'Form: chữ nút Đăng Ký Ngay';
COMMENT ON COLUMN public.register_blocks.body IS 'Cam kết: mỗi dòng 1 ý';
COMMENT ON COLUMN public.register_blocks.image_url IS 'QR: ảnh mã QR';

ALTER TABLE public.register_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active" ON public.register_blocks;
CREATE POLICY "Public read active" ON public.register_blocks
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service full access" ON public.register_blocks;
CREATE POLICY "Service full access" ON public.register_blocks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.register_blocks TO anon, authenticated;
GRANT ALL ON TABLE public.register_blocks TO service_role;
DO $$
BEGIN
  GRANT USAGE, SELECT ON SEQUENCE public.register_blocks_id_seq TO service_role;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Sequence register_blocks_id_seq chưa có — bỏ qua GRANT SEQUENCE';
END $$;

INSERT INTO public.register_blocks (
  block_key, title, subtitle, body, image_url, link_url, phone, zalo, display_order, is_active
)
VALUES
  (
    'form',
    'Form đăng ký',
    'Đăng Ký Ngay',
    '',
    '',
    '',
    '',
    '',
    0,
    true
  ),
  (
    'community',
    'CỘNG ĐỒNG ZALO PHÁT TRIỂN HỆ SINH THÁI AI',
    '',
    '',
    '',
    'https://zalo.me/0827416886',
    '',
    '',
    1,
    true
  ),
  (
    'qr',
    'HỆ SINH THÁI AI',
    '',
    '',
    '/images/register/he-sinh-thai-ai-qr.jpg',
    'https://zalo.me/0827416886',
    '',
    '',
    2,
    true
  ),
  (
    'contact',
    'Liên hệ chốt Nhanh:',
    '',
    '',
    '',
    '',
    '0827416886',
    '0827416886',
    3,
    true
  ),
  (
    'commitment',
    'Cam kết',
    '',
    E'Cam kết nội dung và Sản phẩm thực chiến\nHỗ trợ sau khóa học\nHỗ trợ sản phẩm AI',
    '',
    '',
    '',
    '',
    4,
    true
  )
ON CONFLICT (block_key) DO NOTHING;

-- Đăng ký từ form công khai — Admin tab "Thông tin đăng ký" (KHÔNG public read)
CREATE TABLE IF NOT EXISTS public.registrations (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  occupation    TEXT NOT NULL DEFAULT '',
  service       TEXT NOT NULL DEFAULT '',
  service_id    BIGINT,
  needs         TEXT DEFAULT '',
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.registrations IS 'Người đăng ký từ Form đăng ký trang chủ — chỉ Super Admin xem';
COMMENT ON COLUMN public.registrations.service IS 'Tên dịch vụ đã chọn / gõ vào form';
COMMENT ON COLUMN public.registrations.service_id IS 'Khớp khối services nếu bấm ô dịch vụ';
COMMENT ON COLUMN public.registrations.needs IS 'Mô tả nhu cầu cụ thể';

CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON public.registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS registrations_is_read_idx ON public.registrations (is_read);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active" ON public.registrations;
DROP POLICY IF EXISTS "Anon no select" ON public.registrations;
-- Anon/authenticated KHÔNG đọc — insert qua API service_role

DROP POLICY IF EXISTS "Service full access" ON public.registrations;
CREATE POLICY "Service full access" ON public.registrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON TABLE public.registrations TO service_role;
DO $$
BEGIN
  GRANT USAGE, SELECT ON SEQUENCE public.registrations_id_seq TO service_role;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Sequence registrations_id_seq chưa có — bỏ qua GRANT SEQUENCE';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.register_blocks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime chưa có — bỏ qua realtime register_blocks';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    RAISE NOTICE 'Publication supabase_realtime chưa có — bỏ qua realtime registrations';
END $$;

NOTIFY pgrst, 'reload schema';
