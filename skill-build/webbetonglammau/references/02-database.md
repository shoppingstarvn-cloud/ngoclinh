# DATABASE SUPABASE — webbetonglammau

**Project ref:** `bfruxinvvvaqufghtigw`
**URL:** `https://bfruxinvvvaqufghtigw.supabase.co`
**Publishable (anon) key — CHỈ ĐỌC:** `sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml`
**Service role key:** KHÔNG hardcode — nằm ở biến môi trường `SUPABASE_SERVICE_KEY`

---

## 1. SCHEMA CÁC BẢNG CHÍNH

### posts — Bài viết (tab "Bài viết")
```sql
id            BIGSERIAL PRIMARY KEY
title         TEXT NOT NULL
slug          TEXT DEFAULT ''          -- UNIQUE INDEX posts_slug_uidx
category_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL
excerpt       TEXT DEFAULT ''
content       TEXT DEFAULT ''          -- HTML đầy đủ
thumbnail_url TEXT DEFAULT ''
tags          TEXT DEFAULT ''          -- dùng 'tin-tuc' để lọc feed
status        TEXT DEFAULT 'published' -- draft | published | archived
display_order INT  DEFAULT 0
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

### products — Sản phẩm (tab "Sản phẩm")
```sql
id            BIGSERIAL PRIMARY KEY
name          TEXT NOT NULL            -- ⚠️ là "name", KHÔNG phải "title"
slug          TEXT DEFAULT ''          -- UNIQUE INDEX products_slug_uidx
description   TEXT DEFAULT ''
price         TEXT DEFAULT ''
thumbnail_url TEXT DEFAULT ''
display_order INT  DEFAULT 0
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT NOW()
-- ĐÃ BỔ SUNG 21/07/2026:
excerpt       TEXT DEFAULT ''
content       TEXT DEFAULT ''
status        TEXT DEFAULT 'published'
link_url      TEXT DEFAULT ''
category_id   BIGINT
updated_at    TIMESTAMPTZ DEFAULT now()
```

### projects — Dự án (tab "Dự án")
```sql
id            SERIAL PRIMARY KEY
title         TEXT
slug          TEXT                     -- UNIQUE INDEX projects_slug_uidx
link_url      TEXT
excerpt       TEXT
content       TEXT
thumbnail_url TEXT
display_order INTEGER DEFAULT 0
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
status        TEXT DEFAULT 'published'  -- bổ sung 21/07/2026
```

### partners — Đối tác (tab "Đối tác")
```sql
id            BIGSERIAL PRIMARY KEY
name          TEXT NOT NULL            -- ⚠️ là "name"
logo_url      TEXT DEFAULT ''
website_url   TEXT DEFAULT '#'
display_order INT  DEFAULT 0
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT NOW()
-- ĐÃ BỔ SUNG 21/07/2026:
slug          TEXT DEFAULT ''          -- UNIQUE INDEX partners_slug_uidx
excerpt       TEXT DEFAULT ''
content       TEXT DEFAULT ''
thumbnail_url TEXT DEFAULT ''
kind          TEXT DEFAULT 'khach-hang' -- khach-hang | nha-cung-cap
updated_at    TIMESTAMPTZ DEFAULT now()
```

### categories — Danh mục
```sql
id, name, slug, link_url, description, thumbnail_url,
type          -- product | post | project | gallery
parent_id, display_order, is_active
```
`link_url`: link đích khi bấm vào. Để trống → tự dùng `/<slug>.html`

### menus — Menu (3 cấp)
```sql
id, label, url, parent_id, display_order, is_active
```
`parent_id = NULL` → menu cấp 1. Admin hiển thị cây thụt lề theo cấp.

### site_settings — Cấu hình site
```sql
id, key, value
```
Dạng key-value. `value` là `textarea` trong admin (an toàn với HTML/quote).

### photos — Thư viện ảnh
```sql
id, title, description, file_path, thumbnail_path, album_id,
tags, access_level, is_active, is_slider, uploaded_by, created_at, updated_at
```
⚠️ **`photos.is_active` là INTEGER (1/0), KHÔNG phải BOOLEAN.** Gửi `true` sẽ lỗi 400.
Đã bơm 376 ảnh từ `public/images/` (chỉ cần `title` + `file_path="/images/..."`).

### Các bảng còn lại
`slides`, `images`, `videos`, `testimonials`, `links`, `contact_submissions`, `admin_users`

---

## 2. ROW LEVEL SECURITY (RLS)

**File gốc:** `supabase_security_lockdown.sql` (có `supabase_security_ROLLBACK.sql` để hoàn tác)

| Nhóm bảng | anon / authenticated | service_role |
|---|---|---|
| Bảng nội dung (`posts`, `products`, `projects`, `partners`, `menus`, `categories`, `site_settings`, `slides`, `photos`, `images`, `videos`, `testimonials`, `links`) | **CHỈ SELECT** (policy `p_public_read`) | Toàn quyền (bypass RLS) |
| `admin_users`, `contact_submissions` | **CHẶN HOÀN TOÀN** (RLS bật, không có policy) | Toàn quyền |

→ Muốn ghi dữ liệu: **bắt buộc** qua server (service_role) hoặc hàm `SECURITY DEFINER`.

---

## 3. UNIQUE INDEX CHỐNG TRÙNG (tạo 21/07/2026)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_uidx    ON public.posts    (slug);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_uidx ON public.products (slug);
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_uidx ON public.projects (slug);
CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_uidx ON public.partners (slug);
```

→ Nhờ đó mọi lần đồng bộ đều dùng `ON CONFLICT (slug) DO UPDATE` — chạy lại bao nhiêu lần
cũng không sinh bản ghi trùng: có rồi thì cập nhật, chưa có thì thêm mới.

**Trước khi tạo index phải dọn slug rỗng/trùng:**
```sql
UPDATE public.posts SET slug = 'post-' || id WHERE slug IS NULL OR btrim(slug) = '';
UPDATE public.posts a SET slug = a.slug || '-' || a.id
  WHERE EXISTS (SELECT 1 FROM public.posts b WHERE b.slug = a.slug AND b.id < a.id);
```

---

## 4. SAU MỌI THAY ĐỔI SCHEMA — BẮT BUỘC

```sql
NOTIFY pgrst, 'reload schema';
```
Không chạy lệnh này → PostgREST vẫn dùng schema cũ → API báo "column does not exist".

---

## 5. FILE SQL TRONG REPO

| File | Nội dung |
|---|---|
| `public/schema_dynamic.sql` | Schema gốc 12 bảng |
| `supabase/schema.sql` | **Nguồn chuẩn DUY NHẤT hiện tại** — `db/schema.sql` (bản cũ) đã bị xóa để tránh nhầm lẫn |
| `supabase_projects_table.sql` | Tách `projects` khỏi `posts` |
| `supabase_security_lockdown.sql` | Siết RLS (anon chỉ đọc) |
| `supabase_security_ROLLBACK.sql` | Hoàn tác siết RLS |
| `supabase_storage_config.sql` | Cấu hình bucket `uploads` |
| `supabase_schema_fix.sql`, `supabase_link_url_fix.sql` | Các bản vá |
| `sql/01_SCHEMA_UPGRADE.sql` | **Nâng cấp 21/07/2026 — cột mới + UNIQUE INDEX** |
