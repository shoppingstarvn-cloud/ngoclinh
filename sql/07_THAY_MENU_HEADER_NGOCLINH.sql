-- =============================================================================
-- NGOCLINH — Thay TOÀN BỘ tab Menu (thanh điều hướng header)
--
-- CHỈ chạy trên kho ngoclinh:
--   https://supabase.com/dashboard/project/pglbhoitmcflpvoasewr/sql/new
-- CẤM chạy trên webbetonglammau / Cửa Âu (bfruxinvvvaqufghtigw).
--
-- Đây KHÔNG phải 9 khối sandwich trang chủ (bảng categories).
-- Tab Super Admin: "Menu (thanh điều hướng)" = bảng public.menus.
--
-- Script XÓA hết menus cũ (cây Cửa Âu: Cống tròn, Chứng nhận tiêu chuẩn,
-- Đối tác, Thư viện Video, tin-tuc-l2.html…) rồi chèn cây ngoclinh khớp LIVE:
--   https://ngoclinh.shopmartai.com
--
-- Chạy lại = ghi đè toàn bộ menus (mất sửa tay trên tab Menu).
-- Sau khi Run: F5 Super Admin → tab Menu; header trang chủ đổi realtime.
-- =============================================================================

DO $$
DECLARE
  v_name text;
  v_url  text;
BEGIN
  SELECT value INTO v_name FROM public.site_settings WHERE key = 'site_name' LIMIT 1;
  SELECT value INTO v_url  FROM public.site_settings WHERE key = 'website_url' LIMIT 1;

  IF coalesce(v_url, '') ILIKE '%congbetongcuaau%' THEN
    RAISE EXCEPTION
      'SAI KHO: website_url=% — file 07 CHỈ chạy trên ngoclinh (pglbhoitmcflpvoasewr)',
      v_url;
  END IF;

  -- Tên Cửa Âu còn sót trên đúng kho ngoclinh thì vẫn cho chạy (đây đúng là việc
  -- cần làm). Chỉ chặn khi URL còn domain Cửa Âu.
  IF coalesce(v_name, '') ILIKE '%CỬA ÂU%'
     AND coalesce(v_name, '') NOT ILIKE '%NGỌC LINH%' THEN
    RAISE NOTICE
      'site_name vẫn giống Cửa Âu (%). website_url không phải congbetongcuaau nên tiếp tục thay menus. Nhớ sửa tab Cài đặt.',
      v_name;
  END IF;
END $$;

-- Gỡ FK con rồi xóa hết (SERIAL id sẽ reset)
UPDATE public.menus SET parent_id = NULL;
DELETE FROM public.menus;

SELECT setval(
  coalesce(pg_get_serial_sequence('public.menus', 'id'), 'public.menus_id_seq'),
  1,
  false
);

-- 1) Cấp 1 (gốc) — khớp header LIVE, không nhồi 11 dịch vụ lên ngang
INSERT INTO public.menus (label, url, parent_id, display_order, is_active)
VALUES
  ('Trang chủ',   '/',                 NULL, 0, true),
  ('Giới thiệu',  '/#gioi-thieu',      NULL, 1, true),
  ('Năng lực',    '/#menu-trang-chu',  NULL, 2, true),
  ('Dịch vụ',     '/#cac-dich-vu',     NULL, 3, true),
  ('Dự án',       '/#du-an',           NULL, 4, true),
  ('Tin tức',     '/#tin-tuc',         NULL, 5, true),
  ('Đăng ký',     '/#form-dang-ky',    NULL, 6, true),
  ('Liên hệ',     '/#form-dang-ky',    NULL, 7, true);

-- 2) Cấp 2 — 6 năng lực (khối sandwich) + 11 dịch vụ
INSERT INTO public.menus (label, url, parent_id, display_order, is_active)
SELECT v.label, v.url, p.id, v.ord, true
FROM (VALUES
  -- Năng lực (khớp 6 khối trang chủ)
  ('TRUYỀN THÔNG',                 '/truyen-thong.html',              'Năng lực', 0),
  ('TỔ CHỨC SỰ KIỆN',              '/to-chuc-su-kien.html',           'Năng lực', 1),
  ('ĐÀO TẠO AI',                   '/dao-tao-ai.html',                'Năng lực', 2),
  ('THIẾT KẾ WEBSITE/APP',         '/thiet-ke-app.html',              'Năng lực', 3),
  ('LUYỆN THI TOÁN LÝ HÓA SINH',   '/luyen-thi-toan-ly-hoa-sinh.html','Năng lực', 4),
  ('HOẠT ĐỘNG PHONG TRÀO',         '/hoat-dong-phong-trao.html',      'Năng lực', 5),
  -- Dịch vụ (khớp DEFAULT_SERVICES / sql/05_SERVICES.sql) → form đăng ký
  ('Làm Ảnh, Video, Voice AI',     '/#form-dang-ky',                  'Dịch vụ',  0),
  ('Các Siêu Trợ Lý AI',           '/#form-dang-ky',                  'Dịch vụ',  1),
  ('Các gói Đào Tạo AI',           '/#form-dang-ky',                  'Dịch vụ',  2),
  ('Dịch Vụ Cài Đặt AI',           '/#form-dang-ky',                  'Dịch vụ',  3),
  ('Dịch Vụ làm APP, Web, Landing Page, Xây Kênh', '/#form-dang-ky', 'Dịch vụ',  4),
  ('Dịch vụ tạo CHAT BOT AI',      '/#form-dang-ky',                  'Dịch vụ',  5),
  ('DỊCH VỤ TÍCH HỢP CHAT BOT – AUTOMATION', '/#form-dang-ky',        'Dịch vụ',  6),
  ('ĐÀO TẠO, CÀI ĐẶT, HƯỚNG DẪN OPENCLAW', '/#form-dang-ky',          'Dịch vụ',  7),
  ('Bot Siêu Kế Toán Trưởng, Bot Trưởng Phòng, Bot Chuyên Gia', '/#form-dang-ky', 'Dịch vụ', 8),
  ('Hệ Thống Bot Đa Tầng cho Tổ Chức, Doanh Nghiệp', '/#form-dang-ky','Dịch vụ',  9),
  ('Sáng tác bài hát cho Tổ Chức, Trường Học, Doanh Nghiệp', '/#form-dang-ky', 'Dịch vụ', 10)
) AS v(label, url, parent_label, ord)
JOIN public.menus p ON p.label = v.parent_label AND p.parent_id IS NULL;

-- 3) Cấp 3 — menu con Đào tạo AI + Hoạt động phong trào (đúng LIVE)
INSERT INTO public.menus (label, url, parent_id, display_order, is_active)
SELECT v.label, v.url, p.id, v.ord, true
FROM (VALUES
  ('Đào Tạo AI Khối Hành Chính',              '/dao-tao-ai.html',           'ĐÀO TẠO AI',           0),
  ('Đào Tạo AI Khối Doanh Nghiệp',            '/dao-tao-ai.html',           'ĐÀO TẠO AI',           1),
  ('Đào Tạo AI Giáo Viên Khối Trường Học',    '/dao-tao-ai.html',           'ĐÀO TẠO AI',           2),
  ('Đào Tạo AI for Kids (học sinh)',          '/dao-tao-ai.html',           'ĐÀO TẠO AI',           3),
  ('Viện Ứng Dụng Công Nghệ và Chuyển Đổi Số Quốc Gia', '/hoat-dong-phong-trao.html', 'HOẠT ĐỘNG PHONG TRÀO', 0),
  ('Viện Nghiên Cứu Đào Tạo Công Nghệ và Chuyển Đổi Số AVG', '/hoat-dong-phong-trao.html', 'HOẠT ĐỘNG PHONG TRÀO', 1),
  ('Trường Tiểu Học Nguyễn Công Trứ',         '/hoat-dong-phong-trao.html', 'HOẠT ĐỘNG PHONG TRÀO', 2),
  ('Lớp 1A3',                                 '/hoat-dong-phong-trao.html', 'HOẠT ĐỘNG PHONG TRÀO', 3)
) AS v(label, url, parent_label, ord)
JOIN public.menus p ON p.label = v.parent_label AND p.parent_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- Kiểm chứng: không còn URL Cửa Âu; cây ngoclinh 3 cấp
SELECT m.id, m.label, p.label AS parent, m.url, m.display_order, m.is_active
FROM public.menus m
LEFT JOIN public.menus p ON p.id = m.parent_id
ORDER BY
  coalesce(p.display_order, m.display_order),
  CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END,
  m.display_order, m.id;
