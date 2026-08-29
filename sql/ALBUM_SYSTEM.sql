-- ============================================================
--  HỆ THỐNG TRANG CON "ALBUM / NHẬT KÝ" (vd ngoclinh.shopmartai.com/lop1a3)
--  Mỗi menu cấp 2 -> 1 trang con: nhiều KHỐI sự kiện, mỗi khối chứa
--  hàng trăm nghìn ẢNH/VIDEO lưu trên Google Drive. Thành viên đã đăng nhập
--  được xem nội dung, BÌNH LUẬN, THẢ CẢM XÚC, TẢI VỀ.
--  Chạy 1 lần trong Supabase SQL Editor của dự án ngoclinh.
-- ============================================================

-- 1) TRANG CON (mỗi menu cấp 2 = 1 trang)
CREATE TABLE IF NOT EXISTS album_pages (
  id             BIGSERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,        -- đường dẫn đẹp: 'lop1a3'
  title          TEXT NOT NULL,               -- 'Lớp 1A3'
  subtitle       TEXT DEFAULT '',
  bg_image_url   TEXT DEFAULT '',             -- ảnh nền website con
  slide_urls     JSONB DEFAULT '[]'::jsonb,   -- mảng URL ảnh slide đại diện
  submenu_label  TEXT DEFAULT '',             -- tên menu cấp 2 tương ứng (để tra)
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) KHỐI sự kiện trong 1 trang con
CREATE TABLE IF NOT EXISTS album_blocks (
  id             BIGSERIAL PRIMARY KEY,
  page_id        BIGINT NOT NULL REFERENCES album_pages(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,               -- 'Khai giảng năm học'
  cover_url      TEXT DEFAULT '',             -- ảnh bìa khối
  display_order  INT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_album_blocks_page ON album_blocks(page_id);

-- 3) MEDIA (ảnh/video) trong 1 khối — lưu Drive, không giới hạn số lượng
CREATE TABLE IF NOT EXISTS album_media (
  id             BIGSERIAL PRIMARY KEY,
  block_id       BIGINT NOT NULL REFERENCES album_blocks(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'image',  -- 'image' | 'video'
  url            TEXT NOT NULL,                  -- link hiển thị/tải (Drive)
  drive_file_id  TEXT DEFAULT '',
  name           TEXT DEFAULT '',
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_album_media_block ON album_media(block_id);

-- 4) BÌNH LUẬN dưới mỗi ảnh/video
CREATE TABLE IF NOT EXISTS album_comments (
  id          BIGSERIAL PRIMARY KEY,
  media_id    BIGINT NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  user_id     BIGINT,
  user_name   TEXT DEFAULT '',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_album_comments_media ON album_comments(media_id);

-- 5) CẢM XÚC (like/love/haha/wow/sad/angry) — mỗi user 1 cảm xúc / ảnh
CREATE TABLE IF NOT EXISTS album_reactions (
  id          BIGSERIAL PRIMARY KEY,
  media_id    BIGINT NOT NULL REFERENCES album_media(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'like',   -- like|love|haha|wow|sad|angry
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_album_reactions_media ON album_reactions(media_id);

-- Bảo mật: chỉ service_role (admin client của web) đọc/ghi, khớp kiến trúc dự án.
ALTER TABLE album_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_media    ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_reactions ENABLE ROW LEVEL SECURITY;

-- Trang mẫu Lớp 1A3 (đường dẫn ngoclinh.shopmartai.com/lop1a3)
INSERT INTO album_pages (slug, title, subtitle, submenu_label)
SELECT 'lop1a3', 'Lớp 1A3', 'Nhật ký · Album hoạt động của lớp', 'Lớp 1A3'
WHERE NOT EXISTS (SELECT 1 FROM album_pages WHERE slug = 'lop1a3');
