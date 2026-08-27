-- ============================================================
--  MỞ RỘNG BẢNG users: HỒ SƠ ĐẦY ĐỦ + VAI TRÒ (member/admin1/superadmin)
--  Dùng cho: form "Đề nghị mở Website / Quản Trị", bảng Quản lý Users của
--  super admin, và bổ nhiệm Admin cấp 1 (được quản trị trang con riêng).
--  Chạy 1 lần trong Supabase SQL Editor của dự án ngoclinh.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS username        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob             DATE;                         -- ngày sinh
ALTER TABLE users ADD COLUMN IF NOT EXISTS zalo_phone      TEXT;                         -- SĐT Zalo
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_kind       TEXT NOT NULL DEFAULT 'teacher'; -- teacher | student
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_name       TEXT;                         -- Đơn vị công tác / học tập (TRƯỜNG)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ward            TEXT;                         -- Phường / Xã
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_in_charge TEXT;                         -- Phụ trách lớp (tên lớp)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'member'; -- member | admin1 | superadmin
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_type    TEXT;                         -- website | admin (nguồn đề nghị)
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_status  TEXT;                         -- pending | approved | rejected
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_at      TIMESTAMPTZ;                  -- lúc gửi đề nghị
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_reviewed_at TIMESTAMPTZ;              -- lúc Super Admin duyệt / từ chối
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Username duy nhất (không phân biệt hoa thường), chỉ khi có nhập
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (lower(username)) WHERE username IS NOT NULL AND username <> '';

-- Trang con thuộc về Admin cấp 1 nào + tách trường/lớp cho đường dẫn /{trường}/{lớp}
ALTER TABLE album_pages ADD COLUMN IF NOT EXISTS owner_user_id BIGINT;   -- NULL = trang của super admin
ALTER TABLE album_pages ADD COLUMN IF NOT EXISTS school_slug   TEXT;     -- vd 'tranvanon'
ALTER TABLE album_pages ADD COLUMN IF NOT EXISTS class_slug    TEXT;     -- vd '1a5'
CREATE INDEX IF NOT EXISTS idx_album_owner ON album_pages(owner_user_id);
