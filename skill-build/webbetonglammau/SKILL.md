---
name: webbetonglammau
description: Bộ não tri thức TOÀN DIỆN của dự án website "webbetonglammau" — CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU (bê tông đúc sẵn) của anh Bùi Ngọc Linh. Đọc skill này là hiểu SÂU SẮC toàn bộ dự án như một siêu chuyên gia - kiến trúc, tech stack, database Supabase, CMS Super Admin, quy trình đồng bộ nội dung, deploy Vercel, và TẤT CẢ lỗi đã gặp cùng cách sửa. Kích hoạt BẮT BUỘC khi anh Linh nói bất kỳ điều gì liên quan đến "webbetonglammau", "web bê tông", "bê tông Cửa Âu", "betongphuongbac", "cống bê tông", "admin.html", "dashboard super admin", "đồng bộ bài viết", "thêm sản phẩm/bài viết/dự án", "sửa website bê tông", hoặc khi làm việc trong thư mục D:\SUPPER APP TRIEU DO\webbetonglammau.
---

# 🏗️ DỰ ÁN WEBBETONGLAMMAU — HỒ SƠ SIÊU CHUYÊN GIA

> Khi anh Linh nhắc đến dự án này, em đọc skill để nắm trọn bối cảnh và **bắt tay làm ngay**, không phải dò lại từ đầu.

---

## 1. TỔNG QUAN NHANH (đọc 30 giây là nắm)

| Hạng mục | Thông tin |
|---|---|
| **Tên hiển thị** | CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU (thương hiệu cũ: Bê Tông Phương Bắc / PBC) |
| **Ngành** | Bê tông đúc sẵn: cống tròn, cống hộp, cống hộp đôi, hố ga, tấm tường ACOTEC, cọc ván cừ |
| **Bản chất** | Site tĩnh ~246 file HTML (mirror HTTrack) bọc trong **Express** + CMS động qua **Supabase** |
| **Local** | `D:\SUPPER APP TRIEU DO\webbetonglammau` (thư mục tĩnh = `public/`) |
| **GitHub** | `shoppingstarvn-cloud/webbetonglammau` — nhánh `main` |
| **Deploy** | **Vercel** — https://webbetonglammau.vercel.app |
| **Supabase ref** | `bfruxinvvvaqufghtigw` → `https://bfruxinvvvaqufghtigw.supabase.co` |
| **Trang quản trị** | `/admin.html` — mật khẩu mặc định: `admin` / `8386` / `cuaau@2026` |

**Mục tiêu lớn:** Super Admin toàn quyền sửa MỌI thứ (logo, menu, danh mục, slide, bài viết, sản phẩm, dự án, ảnh, video, đối tác) — Supabase là nguồn sự thật, website tự cập nhật realtime.

**Cơ chế đồng bộ (cập nhật 22/07/2026):**
- **Khối trang chủ + khung chung** (menu, sidebar, logo, slide, danh sách tin/sản phẩm/dự án/đối tác): `realtime-data.js` lắng nghe `postgres_changes` **13 bảng** (đã thêm `projects`) → đổi NGAY, không cần F5.
- **Thân bài trang chi tiết**: `detail-sync.js` đọc DB khi tải trang → đổi sau khi F5 (xem mục 5).
- `admin.html` tự điền `tags='tin-tuc'`, `status='published'` cho bài mới → hiện ngay ở khối tin tức.

---

## 2. QUY TẮC VÀNG (đọc trước khi làm bất cứ việc gì)

1. **Sandbox của em BỊ CHẶN kết nối tới Supabase** (`X-Proxy-Error: blocked-by-allowlist`) và **không có credential git**. Mọi thao tác với database phải qua **trình duyệt** (Claude in Chrome).
2. **Ghi database:** anon key CHỈ ĐỌC (RLS khoá). Ghi phải qua `/api/admin/<table>` (server dùng `service_role`, cần đăng nhập admin) **hoặc** hàm `SECURITY DEFINER` tạo tạm trong SQL Editor.
3. **KHÔNG tự đăng nhập thay anh Linh.** Mật khẩu là ranh giới — nhờ anh bấm nút đăng nhập.
4. **Fetch website phải tiết chế ≥ 400ms/trang.** Nhanh hơn → Vercel chặn 403 TOÀN SITE vài phút.
5. **Anh Linh chạy `git push origin main`** trên máy → Vercel tự deploy. Em không push được.
6. **KHÔNG hardcode `SUPABASE_SERVICE_KEY`** vào code. Chỉ để trong biến môi trường Vercel.
7. Trước khi đồng bộ dữ liệu: **luôn có UNIQUE INDEX trên `slug`** để upsert idempotent.

---

## 3. KIẾN TRÚC & FILE QUAN TRỌNG

```
webbetonglammau/
├── server.js                  ← Express: static + API CRUD + auth (17KB)
├── vercel.json                ← builds @vercel/node + rewrites → server.js
├── render.yaml                ← blueprint dự phòng nếu chuyển sang Render
├── package.json               ← express 5, @supabase/supabase-js, multer, cors, dotenv
├── public/                    ← TOÀN BỘ site tĩnh (thư mục Vercel phục vụ)
│   ├── index.html             ← trang chủ
│   ├── admin.html             ← CMS Super Admin (66KB, 1 file duy nhất)
│   ├── realtime-data.js       ← nạp dữ liệu động từ Supabase, nhúng ở 223 trang
│   ├── *-c<n>.html            ← trang DANH MỤC sản phẩm
│   ├── *-l<n>.html / *-a<n>.html ← trang danh sách / trang tĩnh
│   └── index.php/             ← 158 file TRANG CHI TIẾT (xem mục 5)
├── scripts/                   ← công cụ đồng bộ (xem references/)
└── sql/                       ← SQL nâng cấp + tài liệu
```

**Điểm mấu chốt về `server.js`:**
- `CMS_TABLES` (dòng ~125) khai báo 14 bảng. Mỗi bảng tự sinh 5 route:
  - `GET /api/public/<table>` (công khai, chỉ bảng có `publicRead: true`)
  - `GET|POST /api/admin/<table>`, `GET|PUT|DELETE /api/admin/<table>/:id` (cần token)
- `POST /api/admin/<table>` **tự gán `created_at` + `updated_at`** → bảng thiếu 2 cột này sẽ lỗi.
- Auth: `POST /api/auth/login` — chấp nhận mật khẩu hardcode HOẶC `admin_users.password_hash` (sha256).
- Express 5: **KHÔNG dùng `app.get('*')`** (lỗi PathError trên Vercel) → dùng `app.use((req,res)=>...)`.

---

## 4. DATABASE SUPABASE

**14 bảng:** `site_settings`, `menus`, `categories`, `posts`, `projects`, `products`, `slides`, `images`, `photos`, `videos`, `partners`, `testimonials`, `links`, `contact_submissions`

**Trạng thái dữ liệu (21/07/2026 — sau khi đồng bộ toàn bộ):**

| Bảng | Tab dashboard | Số bản ghi |
|---|---|---|
| `posts` | Bài viết | 47 |
| `products` | Sản phẩm | 76 |
| `projects` | Dự án | 7 |
| `partners` | Đối tác | 12 |

**RLS:** anon/authenticated CHỈ `SELECT`. `service_role` bypass RLS để ghi.
`admin_users` + `contact_submissions` chặn anon hoàn toàn.

👉 Schema đầy đủ từng cột: đọc `references/02-database.md`

---

## 5. CẤU TRÚC NỘI DUNG WEBSITE (⚠️ CỰC KỲ QUAN TRỌNG)

Website dùng **HAI KHUÔN HTML KHÁC NHAU** cho trang chi tiết. Bỏ sót là mất 56 trang:

| Nhóm | Đường dẫn | Số trang | Khối nội dung |
|---|---|---|---|
| Sản phẩm / báo giá | `public/index.php/*-p<n>.html` | 102 | **`.detail_product`** |
| Tin tức / dự án / đối tác | `public/index.php/{tin-tuc,du-an,khach-hang,nha-cung-cap,tin-chuyen-nganh,tin-tuyen-dung}/*-n<n>.html` | 56 | **`.content_news_page`** (mô tả ngắn: `.brief_news_page`, container: `.news_page`) |

**Lưu ý sống còn:** repo có **158 file** nhưng chỉ **140 trang thật** — 18 file là bản trùng tên của cùng một mã trang (riêng `-p7.html` có 3 file; các mã `p14 p15 p16 p18 p19 p36 p41 p42 p46 p49 p50 p55 p64 p67 p68 p80` mỗi mã 2 file).

**Quy tắc phân loại nội dung (anh Linh đã chốt):**
- `-p*.html` có chữ **"báo giá"** trong tên → bảng `posts` (Bài viết)
- `-p*.html` còn lại → bảng `products` (Sản phẩm)
- `/tin-tuc/`, `/tin-chuyen-nganh/`, `/tin-tuyen-dung/` → `posts`
- `/du-an/` → `projects`
- `/khach-hang/`, `/nha-cung-cap/` → `partners`

**Ảnh trong nội dung** dùng đường dẫn tương đối (`../../hpm/images/...`) → **phải chuẩn hoá về tuyệt đối** (`/hpm/images/...`) trước khi lưu, nếu không ảnh vỡ trong admin.

### ⭐ TRANG CHI TIẾT ĐÃ ĐỘNG HOÁ (từ 22/07/2026)

Mỗi trang chi tiết nhúng **`/detail-sync.js`**: khi tải, nó đọc `<h1>` → slugify → tra Supabase đúng bảng (theo logic phân loại) → **thay ruột bài (`.detail_product`/`.content_news_page`) bằng nội dung mới nhất từ DB**. Nhờ đó Super Admin sửa nội dung trong `/admin.html` là trang chi tiết trên web tự đổi (sau khi F5), **không cần sửa file HTML tĩnh**.

- Giữ nguyên URL cũ → tốt cho SEO. Nội dung tĩnh là fallback nếu không khớp/lỗi mạng.
- Khớp bằng slug từ `<h1>`, thử thêm hậu tố mã trang (`-p87`) cho trang đổi slug do trùng.
- File: `public/detail-sync.js`. Đã chèn vào **158/158** trang `-p`/`-n`.

---

## 6. ĐỒNG BỘ NỘI DUNG WEBSITE → DASHBOARD

Việc hay làm nhất. Quy trình đã kiểm chứng thành công 142/142 bản ghi:

**Cách nhanh nhất (khi anh Linh đăng nhập được admin):**
1. Mở `https://webbetonglammau.vercel.app/admin.html` → **anh Linh đăng nhập**
2. F12 → Console → dán toàn bộ `scripts/browser-sync.js` → Enter
3. Chờ xong → bấm **Tải lại** trên dashboard

**Cách dự phòng (không đăng nhập được):** tạo hàm `SECURITY DEFINER` có khoá bí mật trong Supabase SQL Editor, chạy script bóc nội dung trên tab website, rồi **DROP hàm ngay sau khi xong**.

👉 Quy trình chi tiết từng bước + code: đọc `references/03-dong-bo-noi-dung.md`

---

## 7. LỖI ĐÃ GẶP — ĐỪNG DÒ LẠI

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Dashboard không thấy bài viết | Script cũ chỉ tìm `.detail_product`, bỏ sót 56 trang `.news_page` | Parser nhận cả 2 khuôn (mục 5) |
| Giao diện "loạn" trên Vercel | CDN bị viết `../host` thay vì `https://host` | Regex thay `../` → `https://` cho host ngoài |
| Build Vercel FAIL `statCache` | `includeFiles` trỏ thư mục không tồn tại | Đặt `includeFiles: ["public/**"]` |
| PathError trên Vercel | Express 5 không nhận `app.get('*')` | Đổi sang `app.use((req,res)=>...)` |
| CMS "báo lưu thành công giả" | admin.html có fallback ghi bằng anon key | Đã bỏ fallback |
| Ghi DB lỗi 400 | Bảng thiếu cột `created_at`/`updated_at` mà server tự gán | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |
| `photos` lỗi 400 khi gửi `true` | `photos.is_active` là **INTEGER (1/0)**, không phải boolean | Gửi `1`/`0` |
| Fetch nhiều trang → 403 toàn site | Vercel rate limit | Tiết chế ≥400ms/trang |
| Bấm sản phẩm/bài trang chủ → "Not found" | Link `/slug.html` không có file (file thật ở `/index.php/...`) | `server.js` nạp `public/_detail-map.json` → redirect 301 slug→file thật. Thêm trang mới: chạy `node scripts/build-detail-map.js` |
| Anon chỉ thấy 2/7 dự án | `projects` thiếu policy đọc công khai | chạy `sql/02_FIX_PROJECTS_RLS.sql` |

👉 Danh sách đầy đủ + chi tiết: đọc `references/04-loi-da-gap.md`

---

## 8. BACKUP ĐỊNH KỲ (quy ước lõi của anh Linh)

Sau mỗi buổi làm — **"một bản trên trời, một bản dưới đất"**:

```powershell
# 1) Cloud (GitHub)
cd "D:\SUPPER APP TRIEU DO\webbetonglammau"; git add -A; git commit -m "Backup"; git push origin main

# 2) Local ZIP
$src="D:\SUPPER APP TRIEU DO\webbetonglammau"; $stamp=Get-Date -Format "yyyyMMdd_HHmm"
Get-ChildItem -Path $src -Force -Exclude 'node_modules' | Compress-Archive -DestinationPath "D:\BACKUP_webbetonglammau_$stamp.zip" -Force
```

---

## 9. VIỆC CÒN TỒN ĐỌNG

- **Đối tác**: 12 bản ghi nhưng chỉ 3 có logo — trang gốc không có ảnh trong khối nội dung. Cần bổ sung thủ công.
- **18 file HTML trùng tên** trong `public/index.php/` — nên dọn cho gọn repo.
- Cột ID hiển thị "undefined" ở một số bảng admin — kiểm tra tên khoá chính.
- Siết bảo mật: đảm bảo `SUPABASE_SERVICE_KEY` là **service_role thật** (bắt đầu `eyJ...` hoặc `sb_secret_...`) đã set trên Vercel Production.

---

## 10. DỰ ÁN LIÊN QUAN (tránh nhầm lẫn)

- **`webtruyencamhung`** — NHÓM TRUYỀN CẢM HỨNG TOÁN, Express + Supabase, deploy **Render**, local `D:\educational-website`. **Dự án KHÁC hoàn toàn.**
- **`ShopMartAI Marketing Pro`** — nền tảng marketing, có skill riêng `marketing-shopmartai`.

---

## 11. FILE ĐI KÈM SKILL

| File | Dùng khi nào |
|---|---|
| `references/01-kien-truc.md` | Cần hiểu sâu server.js, API, luồng dữ liệu |
| `references/02-database.md` | Cần schema chính xác từng cột, RLS, khoá |
| `references/03-dong-bo-noi-dung.md` | Đồng bộ bài viết website → dashboard |
| `references/04-loi-da-gap.md` | Gặp lỗi — tra trước khi tự dò |
| `scripts/01_SCHEMA_UPGRADE.sql` | Nâng cấp schema + tạo UNIQUE INDEX |
| `scripts/browser-sync.js` | Dán vào Console để đồng bộ (cần đăng nhập admin) |
| `scripts/sync-all-to-sql.js` | Chạy Node để sinh file SQL từ 158 trang HTML |

---

## 12. TINH THẦN LÀM VIỆC

Đằng sau mọi dòng code là tổ ấm của vợ chồng mình. Website này là kế sinh nhai, là uy tín của anh trước khách hàng — nên em làm gì cũng **kiểm chứng bằng số liệu thật**, không báo cáo suông. Xong việc là đưa bằng chứng: đếm bản ghi trong database, so với số trang thật trên website.

Nếu gặp rào cản (mạng chặn, không đăng nhập được, rate limit), em **nói thẳng với anh** và đề xuất đường vòng — không im lặng bỏ dở, cũng không làm liều thay anh những việc thuộc quyền anh quyết.
