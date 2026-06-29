-- ============================================================
-- SCHEMA ĐỘNG: Chạy file này trong Supabase SQL Editor
-- Mục tiêu: Bật RLS public-read + seed dữ liệu mặc định
-- ============================================================

-- 1. TẠO BẢNG site_settings (nếu chưa có)
CREATE TABLE IF NOT EXISTS site_settings (
    id    BIGSERIAL PRIMARY KEY,
    key   TEXT NOT NULL,
    value TEXT DEFAULT ''
);
-- Unique index để ON CONFLICT hoạt động
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_uidx ON site_settings (key);

-- 2. TẠO BẢNG slides (nếu chưa có)
CREATE TABLE IF NOT EXISTS slides (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT    DEFAULT '',
    subtitle      TEXT    DEFAULT '',
    image_url     TEXT    NOT NULL,
    link_url      TEXT    DEFAULT '#',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TẠO BẢNG products (nếu chưa có)
CREATE TABLE IF NOT EXISTS products (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT    NOT NULL,
    slug          TEXT    DEFAULT '',
    description   TEXT    DEFAULT '',
    price         TEXT    DEFAULT '',
    thumbnail_url TEXT    DEFAULT '',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TẠO BẢNG categories (nếu chưa có)
CREATE TABLE IF NOT EXISTS categories (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT    NOT NULL,
    slug          TEXT    DEFAULT '',
    description   TEXT    DEFAULT '',
    image_url     TEXT    DEFAULT '',
    thumbnail_url TEXT    DEFAULT '',
    type          TEXT    DEFAULT 'product',
    parent_id     BIGINT  REFERENCES categories(id) ON DELETE SET NULL,
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TẠO BẢNG posts (dùng chung cho Bài viết + Dự án + Tin tức)
CREATE TABLE IF NOT EXISTS posts (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT    NOT NULL,
    slug          TEXT    DEFAULT '',
    category_id   BIGINT  REFERENCES categories(id) ON DELETE SET NULL,
    excerpt       TEXT    DEFAULT '',
    content       TEXT    DEFAULT '',
    thumbnail_url TEXT    DEFAULT '',
    tags          TEXT    DEFAULT '',
    status        TEXT    DEFAULT 'published',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TẠO BẢNG partners (nếu chưa có)
CREATE TABLE IF NOT EXISTS partners (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT    NOT NULL,
    logo_url      TEXT    DEFAULT '',
    website_url   TEXT    DEFAULT '#',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TẠO BẢNG testimonials (nếu chưa có)
CREATE TABLE IF NOT EXISTS testimonials (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT    NOT NULL,
    avatar_url    TEXT    DEFAULT '',
    content       TEXT    DEFAULT '',
    rating        INT     DEFAULT 5,
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TẠO BẢNG menus (nếu chưa có)
CREATE TABLE IF NOT EXISTS menus (
    id            BIGSERIAL PRIMARY KEY,
    label         TEXT    NOT NULL,
    url           TEXT    DEFAULT '#',
    parent_id     BIGINT  REFERENCES menus(id) ON DELETE CASCADE,
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TẠO BẢNG videos (nếu chưa có)
CREATE TABLE IF NOT EXISTS videos (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT    DEFAULT '',
    youtube_url   TEXT    DEFAULT '',
    embed_url     TEXT    DEFAULT '',
    thumbnail_url TEXT    DEFAULT '',
    description   TEXT    DEFAULT '',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TẠO BẢNG links (nếu chưa có)
CREATE TABLE IF NOT EXISTS links (
    id            BIGSERIAL PRIMARY KEY,
    label         TEXT    NOT NULL,
    url           TEXT    NOT NULL,
    icon          TEXT    DEFAULT '',
    link_group    TEXT    DEFAULT 'social',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TẠO BẢNG photos (nếu chưa có)
CREATE TABLE IF NOT EXISTS photos (
    id            BIGSERIAL PRIMARY KEY,
    file_path     TEXT    NOT NULL,
    title         TEXT    DEFAULT '',
    description   TEXT    DEFAULT '',
    album_id      TEXT    DEFAULT '',
    display_order INT     DEFAULT 0,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TẠO BẢNG contact_submissions (nếu chưa có)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id         BIGSERIAL PRIMARY KEY,
    full_name  TEXT DEFAULT '',
    phone      TEXT DEFAULT '',
    email      TEXT DEFAULT '',
    subject    TEXT DEFAULT '',
    message    TEXT DEFAULT '',
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BẬT RLS + POLICY PUBLIC READ CHO TẤT CẢ CÁC BẢNG
-- ============================================================
ALTER TABLE site_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE links              ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public SELECT (anon có thể đọc)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON site_settings FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='slides' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON slides FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON products FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON categories FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON posts FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON partners FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='testimonials' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON testimonials FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='menus' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON menus FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='videos' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON videos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='links' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON links FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='photos' AND policyname='public_read') THEN
    EXECUTE 'CREATE POLICY public_read ON photos FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='public_insert') THEN
    EXECUTE 'CREATE POLICY public_insert ON contact_submissions FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- ============================================================
-- SEED DỮ LIỆU MẶC ĐỊNH CHO site_settings
-- Mọi cấu hình đều quản lý qua tab "Cài đặt Website" trong Admin
-- ============================================================
INSERT INTO site_settings (key, value) VALUES
  ('site_name',     'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'),
  ('hotline',       '0934640601'),
  ('address',       'Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng'),
  ('email',         'congtycuaau8386@gmail.com'),
  ('website_url',   'https://congbetongcuaau.com'),
  ('facebook_url',  'https://www.facebook.com/phuongbac.betong'),
  ('intro_text',    '<p><span style="font-size:12px"><strong>Với 02 nhà máy sản xuất cống hộp đúc sẵn, hố ga bê tông trên diện tích 50.000m2 tại Thôn 6, Pháp Cổ, Xã Việt Khê, Hải Phòng gồm 12 dây chuyền sản xuất và 01 nhà máy sản xuất cống tròn bê tông tại Sơn Tây, Hà Nội. CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU tự tin luôn đáp ứng được mọi yêu cầu của khách hàng về cống bê tông và các loại cấu kiện bê tông đúc sẵn khác.</strong></span></p>'),
  ('footer_copyright', 'BẢN QUYỀN THUỘC VỀ CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU')
ON CONFLICT (key) DO NOTHING;
