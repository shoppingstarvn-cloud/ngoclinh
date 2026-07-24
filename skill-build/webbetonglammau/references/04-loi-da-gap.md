# SỔ TAY LỖI ĐÃ GẶP — webbetonglammau

> Tra file này TRƯỚC khi tự dò lỗi. Mỗi mục là một buổi làm việc đã tốn công.

---

## A. LỖI NỘI DUNG / ĐỒNG BỘ

### A1. ⭐ Dashboard không thấy bài viết dù website có đầy đủ
**Triệu chứng:** `/admin.html` tab Bài viết chỉ hiện 1 dòng, trong khi website có hàng trăm bài.

**Nguyên nhân (3 tầng, phát hiện 21/07/2026):**
1. Database gần như trống: `posts=1, products=1, projects=0, partners=0`
2. `scripts/import-posts.js` **chưa từng chạy được** — thiếu `SUPABASE_SERVICE_KEY`
3. **Lỗi nặng nhất:** script chỉ tìm khối `.detail_product`. Website dùng **2 khuôn trang** —
   102 trang sản phẩm dùng `.detail_product`, còn **56 trang** tin tức/dự án/đối tác dùng
   `.content_news_page`. Nên kể cả chạy được vẫn bỏ sót 56 trang.

**Cách sửa:** parser phải thử `.detail_product` → không có thì `.content_news_page` → `.news_page`.
Xem `03-dong-bo-noi-dung.md` mục 5.

### A2. Ảnh vỡ sau khi đồng bộ vào admin
**Nguyên nhân:** ảnh trong HTML gốc dùng đường dẫn tương đối `../../hpm/images/...`
**Cách sửa:** chuẩn hoá về tuyệt đối `/hpm/images/...` bằng `new URL(src, base).pathname`

### A3. Thumbnail bị nối sai thành `/index.php/du-an/hpm/...`
**Nguyên nhân:** đọc `img.src` **SAU** khi vòng lặp đã rewrite → xử lý 2 lần.
**Cách sửa:** lấy thumbnail **TRƯỚC** vòng lặp rewrite.

### A4. URL ngoài bị hỏng thành `https:/host` (một dấu gạch)
**Nguyên nhân:** HTTrack làm hỏng khi mirror.
**Cách sửa:** `src.replace(/^(https?:)\/(?!\/)/i, '$1//')`

### A5. Đếm trang bị lệch: 158 file nhưng chỉ 140 trang
**Nguyên nhân:** 18 file là bản trùng tên của cùng một mã trang.
Riêng `-p7.html` có 3 file; các mã `p14 p15 p16 p18 p19 p36 p41 p42 p46 p49 p50 p55 p64 p67 p68 p80` mỗi mã 2 file.
**Cách xử lý:** dedupe theo `slug` sinh từ tiêu đề — trùng thì bỏ qua (upsert tự ghi đè).

---

### A6. ⭐ Bấm sản phẩm/bài trên trang chủ → "Not found" (trang trống)
**Triệu chứng:** Trang chủ hiện sản phẩm, bấm vào nhảy link nhưng ra trang trắng chữ "Not found".

**Nguyên nhân:** `realtime-data.js` sinh link `/<slug>.html` (qua `itemHref`/`postHref`), nhưng file chi tiết thật nằm ở `public/index.php/...-p<n>.html` — khác chỗ. Server không thấy file ở gốc → `res.status(404).send('Not found')`. Lúc đồng bộ chưa điền `link_url`; hơn nữa `posts`/`partners` KHÔNG có cột `link_url`.

**Cách sửa (đã làm 24/07/2026 — server tự chuyển hướng):**
1. Sinh `public/_detail-map.json` = `{ slug → /index.php/....html }` bằng `scripts/build-detail-map.js` (đọc `<h1>` từng file, slugify cùng thuật toán đồng bộ; thêm cả key `slug-p<n>`; có ánh xạ thủ công cho bản ghi cũ không có file).
2. `server.js` nạp map lúc khởi động; trong SPA fallback, trước khi trả 404 cho `.html`: lấy slug từ URL, nếu `DETAIL_MAP[slug]` tồn tại → `res.redirect(301, target)`.
3. Sau redirect, URL thành `/index.php/...` → assets đúng, `detail-sync.js` phân loại đúng (thấy `-p<n>`), nội dung động từ DB.
4. Khi THÊM trang chi tiết mới → chạy lại `node scripts/build-detail-map.js` rồi push.

**Lưu ý:** bản ghi cũ không có file (vd product `cong-be-tong-tron`) → thêm ánh xạ thủ công trong `MANUAL` của `build-detail-map.js` (đang trỏ về `/cong-tron-c53.html`).

### A7. Anon chỉ đọc được 2/7 dự án (trang chủ thiếu dự án)
**Nguyên nhân:** bảng `projects` thiếu policy đọc công khai đầy đủ cho `anon`.
**Cách sửa:** chạy `sql/02_FIX_PROJECTS_RLS.sql` (GRANT SELECT + policy `p_public_read USING(true)` + reload schema).

---

## B. LỖI HẠ TẦNG / MẠNG

### B1. ⭐ Vercel chặn 403 TOÀN SITE
**Triệu chứng:** mọi `fetch()` tới website trả 403, kể cả `/index.html`.
**Nguyên nhân:** rate limit — đã fetch ~290 trang liên tiếp không nghỉ.
**Cách sửa:** `await sleep(400)` trước mỗi fetch. Chờ vài phút để block tự gỡ.
**Kiểm tra đã hết chưa:** `(await fetch('/index.html',{cache:'reload'})).status === 200`

### B2. Sandbox không kết nối được Supabase
**Triệu chứng:** `curl` tới `*.supabase.co` trả `403` + header `X-Proxy-Error: blocked-by-allowlist`
**Ý nghĩa:** KHÔNG chạy được script Node từ sandbox để ghi database.
**Đường vòng:** làm mọi thứ qua trình duyệt (Claude in Chrome).

### B3. Sandbox không có credential git
**Triệu chứng:** `git ls-remote origin` → `could not read Username for 'https://github.com'`
**Ý nghĩa:** không push được, không dùng được raw.githubusercontent.com làm kênh truyền file.
**Đường vòng:** anh Linh tự chạy `git push origin main` trên máy.

---

## C. LỖI DEPLOY VERCEL

### C1. Giao diện "loạn" — mất Bootstrap/jQuery
**Nguyên nhân:** link CDN trong HTML bị viết `../host` thay vì `https://host`
(do `//` bị đổi nhầm thành `../` khi mirror) → 503.
**Host bị dính:** `stackpath.bootstrapcdn.com`, `ajax.googleapis.com`, `cdnjs.cloudflare.com`,
`www.googletagmanager.com`, `connect.facebook.net`, `lh3.ggpht.com`
**Cách sửa (regex an toàn, loại trừ `index.php/`):**
```
\.\./(?!index\.php/)(?=[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/)   →   https://
```
Áp dụng cho **mọi** `public/**/*.html`

### C2. Build FAIL: `statCache does not contain value for ...`
**Nguyên nhân:** `includeFiles` trong `vercel.json` trỏ thư mục không tồn tại.
**Cách sửa:** `"includeFiles": ["public/**"]`

### C3. PathError khi deploy
**Nguyên nhân:** Express 5 không chấp nhận `app.get('*')`
**Cách sửa:** đổi sang `app.use((req, res) => { ... })`

### C4. `supabase-sync.js` trả 503
**Nguyên nhân:** file nằm ở gốc repo, Vercel chỉ phục vụ `public/`
**Cách sửa:** copy vào `public/supabase-sync.js`, sửa tham chiếu `../supabase-sync.js` → `/supabase-sync.js`

### C5. Khuyến nghị khi bí
Vercel serverless rất "khó tính" với Express + nhiều file tĩnh.
Nếu vật lộn mãi → chuyển nguyên khối sang **Render** (đã có sẵn `render.yaml`).

---

## D. LỖI CMS / DATABASE

### D1. CMS "báo lưu thành công giả"
**Nguyên nhân:** `admin.html` có fallback ghi bằng anon key — RLS chặn nhưng UI vẫn báo OK.
**Cách sửa:** đã bỏ fallback. Ghi phải qua `/api/admin/*`.

### D2. Thêm bản ghi lỗi 400
**Nguyên nhân:** server tự gán `created_at` + `updated_at` nhưng bảng thiếu 2 cột đó.
**Cách sửa:**
```sql
ALTER TABLE <bảng> ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE <bảng> ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

### D3. `photos` lỗi 400 khi gửi `is_active: true`
**Nguyên nhân:** `photos.is_active` là **INTEGER (1/0)**, không phải BOOLEAN.
**Cách sửa:** gửi `1` hoặc `0`.

### D4. API báo "column does not exist" dù đã ALTER TABLE
**Nguyên nhân:** PostgREST cache schema cũ.
**Cách sửa:** chạy `NOTIFY pgrst, 'reload schema';` sau MỌI thay đổi schema.

### D5. Đồng bộ lại sinh bản ghi trùng
**Nguyên nhân:** chưa có UNIQUE INDEX trên `slug`.
**Cách sửa:** tạo index (xem `02-database.md` mục 3) rồi dùng `ON CONFLICT (slug) DO UPDATE`.

### D6. Cột ID hiển thị "undefined" ở bảng admin
**Trạng thái:** TỒN ĐỌNG, chưa sửa.
**Hướng kiểm tra:** tên khoá chính trong mảng `TABLES` của `admin.html` (`pk`) có khớp với DB không.

### D7. Sản phẩm/danh mục bấm vào bị 404
**Nguyên nhân:** thiếu `link_url`.
**Cách sửa:** điền `link_url` trong admin; để trống thì hệ thống tự dùng `/<slug>.html`.

---

## E. RANH GIỚI KHI LÀM VIỆC

### E1. Không tự đăng nhập thay anh Linh
Kể cả khi trình duyệt đã tự điền mật khẩu — **nhờ anh bấm nút ĐĂNG NHẬP**.
Việc xác thực tài khoản thuộc quyền anh.

### E2. Không hardcode khoá bí mật
`SUPABASE_SERVICE_KEY` chỉ nằm ở biến môi trường Vercel. Không commit vào repo.

### E3. Mở quyền ghi tạm thì phải đóng lại ngay
Nếu tạo hàm `SECURITY DEFINER` để đồng bộ → **DROP ngay sau khi xong** và xác minh trả 404.
