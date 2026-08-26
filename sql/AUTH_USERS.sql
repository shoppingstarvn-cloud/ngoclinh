-- =============================================================================
-- MODULE ĐĂNG KÝ / ĐĂNG NHẬP THÀNH VIÊN (email+mật khẩu, Google, quên mật khẩu)
-- Chạy 1 lần trong Supabase → SQL Editor → Run. An toàn (IF NOT EXISTS).
-- Mọi truy cập đi qua service_role (bỏ qua RLS) ở API server — KHÔNG mở cho anon.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL,
  password_hash  TEXT DEFAULT '',           -- scrypt$salt$hash (rỗng nếu chỉ đăng nhập Google)
  full_name      TEXT DEFAULT '',
  avatar_url     TEXT DEFAULT '',
  provider       TEXT NOT NULL DEFAULT 'email',   -- 'email' | 'google'
  google_sub     TEXT DEFAULT '',           -- Google account id (sub) nếu đăng nhập Google
  email_verified BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email là DUY NHẤT (không phân biệt hoa/thường).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);

CREATE TABLE IF NOT EXISTS password_resets (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,               -- mã 6 số băm scrypt
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- Bật RLS + KHÔNG tạo policy nào -> anon/public bị chặn hoàn toàn.
-- API server dùng service_role (bỏ qua RLS) để đọc/ghi an toàn.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
