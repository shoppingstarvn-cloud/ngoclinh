-- Thêm cột chức vụ + SĐT cho khối slide liên hệ KD (comment_home)
-- Chạy trên Supabase → SQL Editor (idempotent)

ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

COMMENT ON COLUMN testimonials.title IS 'Chức vụ (VD: GĐ Phụ Trách KD)';
COMMENT ON COLUMN testimonials.phone IS 'Số điện thoại liên hệ';
