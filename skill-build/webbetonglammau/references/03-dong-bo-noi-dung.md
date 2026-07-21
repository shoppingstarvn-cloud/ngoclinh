# QUY TRÌNH ĐỒNG BỘ NỘI DUNG WEBSITE → DASHBOARD

> Đã kiểm chứng thành công ngày **21/07/2026**: 142/142 bản ghi, 0 lỗi.

---

## 1. KHI NÀO CẦN LÀM

- Anh Linh báo "bài viết trên website không thấy trong dashboard"
- Thêm trang HTML mới vào `public/index.php/` và muốn nó xuất hiện trong CMS
- Database bị mất dữ liệu, cần nạp lại từ file HTML gốc

---

## 2. BƯỚC 0 — CHẨN ĐOÁN TRƯỚC

Luôn kiểm tra thực trạng trước khi làm gì:

**a) Đếm trang thật trong repo:**
```bash
cd public
find . -name "*-p[0-9]*.html" -o -name "*-n[0-9]*.html" | wc -l          # tổng file (158)
find . -name "*-p[0-9]*.html" -o -name "*-n[0-9]*.html" \
  | grep -oE '\-(p|n)[0-9]+\.html$' | sort -u | wc -l                    # mã trang thật (140)
```

**b) Đếm bản ghi trong database** — chạy trên Supabase SQL Editor:
```sql
SELECT 'posts' AS bang, count(*) AS tong,
       count(*) FILTER (WHERE length(content) > 200) AS co_noi_dung,
       count(*) FILTER (WHERE thumbnail_url <> '')  AS co_anh FROM posts
UNION ALL SELECT 'products', count(*), count(*) FILTER (WHERE length(content) > 200), count(*) FILTER (WHERE thumbnail_url <> '') FROM products
UNION ALL SELECT 'projects', count(*), count(*) FILTER (WHERE length(content) > 200), count(*) FILTER (WHERE thumbnail_url <> '') FROM projects
UNION ALL SELECT 'partners', count(*), count(*) FILTER (WHERE length(content) > 200), count(*) FILTER (WHERE thumbnail_url <> '') FROM partners;
```

---

## 3. BƯỚC 1 — NÂNG CẤP SCHEMA (chỉ cần 1 lần)

Chạy `scripts/01_SCHEMA_UPGRADE.sql` trên **Supabase SQL Editor**.
File này an toàn khi chạy lại nhiều lần (`IF NOT EXISTS`). Nó làm 3 việc:
1. Bổ sung cột `content`/`excerpt`/`status`/`updated_at`... cho `products`, `partners`, `projects`
2. Dọn slug rỗng/trùng
3. Tạo UNIQUE INDEX trên `slug` cho cả 4 bảng

Kết thúc bằng `NOTIFY pgrst, 'reload schema';` — **bắt buộc**.

---

## 4. BƯỚC 2 — ĐỒNG BỘ (chọn 1 trong 2 cách)

### ✅ CÁCH A — Qua API admin (khuyến nghị, sạch nhất)

**Điều kiện:** anh Linh đăng nhập được `/admin.html`

1. Mở `https://webbetonglammau.vercel.app/admin.html`
2. **Nhờ anh Linh bấm "ĐĂNG NHẬP"** (em không tự nhập mật khẩu)
3. F12 → tab **Console** → dán toàn bộ `scripts/browser-sync.js` → Enter
4. Chờ chạy (~2 phút), xem bảng tổng kết trong Console
5. Bấm **Tải lại** trên dashboard

Script tự: dò trang → bóc nội dung → chuẩn hoá ảnh → so slug → `POST` (mới) hoặc `PUT` (đã có).

### 🔧 CÁCH B — Qua hàm SQL tạm (khi không đăng nhập được)

**Chỉ dùng khi cách A bất khả thi.** Mở lỗ hổng ghi trong thời gian ngắn — **phải đóng lại ngay**.

**B1.** Trong Supabase SQL Editor, tạo hàm có khoá bí mật:
```sql
CREATE OR REPLACE FUNCTION public.sync_upsert(p_secret text, p_kind text, p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r jsonb; n integer := 0;
BEGIN
  IF p_secret IS DISTINCT FROM '<ĐỔI-CHUỖI-BÍ-MẬT-MỖI-LẦN>' THEN RAISE EXCEPTION 'unauthorized'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    IF p_kind = 'posts' THEN
      INSERT INTO posts (title, slug, excerpt, content, thumbnail_url, tags, status, display_order, is_active, updated_at)
      VALUES (r->>'title', r->>'slug', r->>'excerpt', r->>'content', r->>'thumb', 'tin-tuc', 'published', (r->>'ord')::int, true, now())
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content,
        thumbnail_url=EXCLUDED.thumbnail_url, status='published', is_active=true, updated_at=now();
    ELSIF p_kind = 'products' THEN
      INSERT INTO products (name, slug, description, excerpt, content, thumbnail_url, status, display_order, is_active, updated_at)
      VALUES (r->>'title', r->>'slug', r->>'excerpt', r->>'excerpt', r->>'content', r->>'thumb', 'published', (r->>'ord')::int, true, now())
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, excerpt=EXCLUDED.excerpt,
        content=EXCLUDED.content, thumbnail_url=EXCLUDED.thumbnail_url, is_active=true, updated_at=now();
    ELSIF p_kind = 'projects' THEN
      INSERT INTO projects (title, slug, excerpt, content, thumbnail_url, status, display_order, is_active, updated_at)
      VALUES (r->>'title', r->>'slug', r->>'excerpt', r->>'content', r->>'thumb', 'published', (r->>'ord')::int, true, now())
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content,
        thumbnail_url=EXCLUDED.thumbnail_url, is_active=true, updated_at=now();
    ELSIF p_kind = 'partners' THEN
      INSERT INTO partners (name, slug, excerpt, content, logo_url, thumbnail_url, kind, display_order, is_active, updated_at)
      VALUES (r->>'title', r->>'slug', r->>'excerpt', r->>'content', r->>'thumb', r->>'thumb',
              COALESCE(r->>'pkind','khach-hang'), (r->>'ord')::int, true, now())
      ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content,
        logo_url=EXCLUDED.logo_url, thumbnail_url=EXCLUDED.thumbnail_url, is_active=true;
    ELSE RAISE EXCEPTION 'unknown kind %', p_kind; END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $fn$;

REVOKE ALL ON FUNCTION public.sync_upsert(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_upsert(text, text, jsonb) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

**B2.** Mở tab website (`https://webbetonglammau.vercel.app/index.html`) → Console →
chạy script bóc nội dung, gọi RPC:
```
POST https://bfruxinvvvaqufghtigw.supabase.co/rest/v1/rpc/sync_upsert
headers: apikey + Authorization = anon key
body: { p_secret, p_kind, p_rows: [...] }     // gửi theo lô 5 bản ghi
```

**B3. ⚠️ BẮT BUỘC — đóng lỗ hổng ngay:**
```sql
DROP FUNCTION IF EXISTS public.sync_upsert(text, text, jsonb);
NOTIFY pgrst, 'reload schema';
```
Xác minh: gọi lại endpoint phải trả **HTTP 404**.

---

## 5. LOGIC BÓC NỘI DUNG (cốt lõi — nhớ kỹ)

```js
// 1) Nhận CẢ HAI khuôn trang
let box = doc.querySelector('.detail_product');          // trang sản phẩm (-p)
let brief = '';
if (!box) {
  box = doc.querySelector('.content_news_page');         // trang tin tức (-n)
  brief = doc.querySelector('.brief_news_page')?.textContent || '';
  if (!box) box = doc.querySelector('.news_page');
}

// 2) Lấy thumbnail TRƯỚC khi rewrite (tránh xử lý 2 lần)
const thumb = abs(box.querySelector('img')?.getAttribute('src'), pagePath);

// 3) Chuẩn hoá ảnh về đường dẫn tuyệt đối
box.querySelectorAll('img').forEach(i => {
  const a = abs(i.getAttribute('src'), pagePath);
  if (a) i.setAttribute('src', a);
  i.removeAttribute('width'); i.removeAttribute('height');
});

// 4) Sinh slug từ TIÊU ĐỀ (bỏ dấu), trùng thì thêm mã trang (p87/n32)
```

Hàm `abs()` cần xử lý cả URL ngoài bị HTTrack làm hỏng: `https:/host` → `https://host`

---

## 6. TIẾT CHẾ TỐC ĐỘ — CỰC KỲ QUAN TRỌNG

```js
await sleep(400);   // TRƯỚC MỖI fetch
```

Fetch ~290 trang liên tiếp không nghỉ → **Vercel chặn 403 TOÀN SITE** vài phút,
kể cả trang chủ. Đã dính lỗi này ngày 21/07/2026.

Kiểm tra đã hết chặn chưa:
```js
const r = await fetch('/index.html', {cache:'reload'}); r.status   // 200 = OK
```

---

## 7. KIỂM CHỨNG SAU KHI XONG

1. **Đếm trong database** (SQL ở mục 2b) — đối chiếu với số trang thật
2. **Kiểm tra API công khai** từ tab website:
```js
for (const t of ['posts','products','projects','partners']) {
  const j = await (await fetch('/api/public/'+t)).json();
  console.log(t, (j.data||j).length);
}
```
3. **Mở dashboard** → đăng nhập → bấm Tải lại → xem từng tab
4. Nếu dùng CÁCH B: **xác minh hàm tạm đã bị xoá** (trả HTTP 404)

---

## 8. KẾT QUẢ THAM CHIẾU (21/07/2026)

| Bảng | Tổng | Có nội dung | Có ảnh |
|---|---|---|---|
| posts | 47 | 43 | 42 |
| products | 76 | 75 | 74 |
| projects | 7 | 7 | 6 |
| partners | 12 | 9 | 3 |
| **TỔNG** | **142** | | |

140 trang thật + 2 bản ghi cũ = 142. Khớp hoàn toàn.
