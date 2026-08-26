-- =============================================================================
-- CỔNG MẬT KHẨU XEM NỘI DUNG — CHỈ cho menu con của khối "HOẠT ĐỘNG PHONG TRÀO"
-- Chạy 1 lần: Supabase → SQL Editor → Run. An toàn (IF NOT EXISTS).
-- =============================================================================

-- Bảng chứa 1 mật khẩu xem nội dung (admin cập nhật ở trang /admin/mat-khau-noi-dung)
CREATE TABLE IF NOT EXISTS content_gate (
  id         BIGSERIAL PRIMARY KEY,
  password   TEXT NOT NULL DEFAULT '',
  note       TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Tạo sẵn 1 dòng nếu bảng rỗng (mật khẩu mặc định 8386 — admin đổi lại sau)
INSERT INTO content_gate (password, note)
SELECT '8386', 'Mật khẩu xem nội dung khối Hoạt động phong trào'
WHERE NOT EXISTS (SELECT 1 FROM content_gate);

-- Nhớ mở khoá theo TÀI KHOẢN thành viên: nhập đúng 1 lần -> các lần sau miễn nhập
ALTER TABLE users ADD COLUMN IF NOT EXISTS content_unlocked BOOLEAN NOT NULL DEFAULT false;

-- Chặn anon: mọi truy cập đi qua service_role ở API server.
ALTER TABLE content_gate ENABLE ROW LEVEL SECURITY;
