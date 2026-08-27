-- ============================================================
--  Hiện diện (đang online) — last_seen_at cho badge xanh tab Quản lý Users
--  Chạy 1 lần trong Supabase SQL Editor (ngoclinh — pglbhoitmcflpvoasewr).
--  An toàn chạy lại (IF NOT EXISTS).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at    TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_scope TEXT;  -- main | member

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users (last_seen_at DESC);

COMMENT ON COLUMN users.last_seen_at    IS 'Lần cuối user còn mở website (heartbeat ~30s). Online = last_seen_at trong 5 phút.';
COMMENT ON COLUMN users.last_seen_scope IS 'main = ngoclinh.shopmartai.com; member = trang con /quan-tri-trang-con hoặc album /truong/lop.';
