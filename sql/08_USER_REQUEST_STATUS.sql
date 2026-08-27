-- ============================================================
--  Đề nghị mở Website: trạng thái chờ duyệt / đã duyệt / từ chối
--  Chạy 1 lần trong Supabase SQL Editor (ngoclinh — pglbhoitmcflpvoasewr).
--  An toàn chạy lại (IF NOT EXISTS + backfill chỉ khi còn NULL).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS dob                 DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_type        TEXT;          -- website | admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_status      TEXT;          -- pending | approved | rejected
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_at          TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS request_reviewed_at TIMESTAMPTZ;

-- Hồ sơ đã gửi đề nghị nhưng chưa có trạng thái:
--   còn là thành viên  → chờ Super Admin phê duyệt
--   đã là admin1/super → coi như đã duyệt
UPDATE users
   SET request_status = 'pending',
       request_at = COALESCE(request_at, created_at, now())
 WHERE request_type IN ('website', 'admin')
   AND (request_status IS NULL OR request_status = '')
   AND COALESCE(role, 'member') = 'member';

UPDATE users
   SET request_status = 'approved',
       request_at = COALESCE(request_at, created_at, now()),
       request_reviewed_at = COALESCE(request_reviewed_at, now())
 WHERE request_type IN ('website', 'admin')
   AND (request_status IS NULL OR request_status = '')
   AND role IN ('admin1', 'superadmin');
