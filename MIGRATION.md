# Migration Log — Express/jQuery → Next.js App Router

Tài liệu này ghi lại toàn bộ quá trình tái cấu trúc dự án `webbetonglammau` từ
kiến trúc **Hybrid static (Express + ~246 file HTML + jQuery script-inject)**
sang **Next.js 15 (App Router) + React + Supabase**.

**Trạng thái: hoàn tất & đã kiểm thử thực tế với dữ liệu Supabase production**
(build, lint, dev server, toàn bộ API, trang chủ, trang chi tiết, và dashboard
admin React đều đã chạy thử thành công — xem mục 6).

## 1. Vì sao refactor

| Vấn đề cũ | Giải pháp mới |
|---|---|
| Không có build step, không kiểm tra kiểu | `next build` + TypeScript strict |
| jQuery + `innerHTML` render dữ liệu (XSS, khó bảo trì) | React Server Components fetch trực tiếp từ Supabase, chỉ dùng `dangerouslySetInnerHTML` cho đúng 1 chỗ (nội dung rich-text CMS, không tránh được vì dữ liệu là HTML do Quill sinh ra) |
| Token admin tự chế `base64:timestamp` | JWT chuẩn HS256 (`jose`), vẫn tương thích ngược với token cũ và mật khẩu SHA-256 trong `admin_users` |
| `server.js` tự sinh route bằng vòng lặp `CMS_TABLES` | Next.js Route Handlers (`app/api/**/route.ts`) — cùng logic, tách file rõ ràng, chạy trên Vercel serverless functions |
| Redirect slug qua `_detail-map.json` đọc trong Express | `middleware.ts` đọc cùng file, giữ đúng cơ chế nhưng chạy ở Node.js Middleware |
| `admin.html` tĩnh (1070 dòng, jQuery + Bootstrap 5 CDN + Quill CDN) | Dashboard React đầy đủ tại `/admin` (xem mục 5) |
| Deploy: không rõ ràng, có `render.yaml` dự phòng | `vercel.json` tối giản (Next.js tự nhận diện), luồng **GitHub → Vercel** trực tiếp |

> **Về "Elmony":** đã rà soát toàn bộ repo (kể cả `.github/`, các file cấu hình
> CI/CD) — không tìm thấy bất kỳ tham chiếu nào tới nền tảng này. Luồng deploy
> hiện tại (`git push` → Vercel tự build) là trực tiếp, không qua trung gian.

## 2. Cấu trúc thư mục

```
webbetonglammau/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: fonts, CSS legacy, meta
│   ├── page.tsx                  # Trang chủ (Server Component)
│   ├── globals.css
│   ├── [slug]/page.tsx           # Dynamic route: /<slug>.html (SEO giữ nguyên)
│   ├── legacy/[...path]/page.tsx # Dynamic route: /index.php/**/*.html
│   ├── admin/                    # Dashboard CMS React (thay admin.html cũ)
│   │   ├── layout.tsx            # FontAwesome 6 riêng cho /admin, metadata noindex
│   │   ├── admin.css             # Style scope trong .admin-root, không rò ra site chính
│   │   ├── page.tsx
│   │   └── AdminApp.tsx          # Client Component: state, auth, CRUD orchestration
│   └── api/
│       ├── auth/{login,verify}/route.ts
│       ├── public/{[table],[table]/[id],config}/route.ts
│       ├── admin/{[table],[table]/[id],all-data}/route.ts
│       └── upload/route.ts
│
├── components/
│   ├── layout/{SiteHeader,SiteShell}.tsx
│   ├── home/HomeSections.tsx     # Slide/Product/News/Project/Partner/Category
│   └── admin/                    # Sidebar, Dashboard, DataTable, RecordFormModal,
│                                  # SiteSettingsPanel, ImageUploadField, RichTextEditor
│                                  # (Quill), Modal, LoginScreen
│
├── lib/
│   ├── supabase/{client,server,admin}.ts   # 3 client Supabase theo đúng ngữ cảnh
│   ├── auth/{jwt,session}.ts               # JWT + middleware xác thực admin
│   ├── cms/{tables,crud,admin-schema}.tsx  # Khai báo bảng CMS + schema form/cột admin
│   ├── data/{homepage,detail}.ts           # Data-fetching cho trang chủ & chi tiết
│   ├── slug.ts                             # slugify/itemHref/postHref
│   ├── detail-map.ts                       # Đọc public/_detail-map.json
│   └── legacy-html.ts                      # Đọc & trích xuất HTML tĩnh còn sót
│
├── middleware.ts                 # Redirect/rewrite slug legacy — chạy Node.js runtime
│                                  # (bắt buộc vì detail-map.ts dùng 'fs')
├── next.config.ts                # Redirect tĩnh, image domains Supabase
├── vercel.json                   # framework: nextjs, security headers
├── package.json                  # dev/build/start/lint chuẩn Next.js
│
├── public/                       # Asset tĩnh + trang HTML CHƯA migrate hết
│   ├── css/, images/, hpm/       # Giữ nguyên — Next.js serve như static asset
│   ├── index.php/                # 158 file HTML gốc — dùng làm fallback nội dung tĩnh
│   └── _detail-map.json          # Vẫn sinh bởi scripts/build-detail-map.js
│
└── scripts/                      # Không đổi — build-detail-map.js, sync tools
```

**Đã xoá hoàn toàn** (không còn cần thiết, đã thay thế 100% chức năng):
`server.js`, `render.yaml`, `api/upload.js`, `supabase-sync.js` (root),
`public/{realtime-data,detail-sync,supabase-sync,upload-handler}.js`,
`public/admin.html`, `public/superadmin.html`.

## 3. Luồng dữ liệu

1. **Trang chủ** (`app/page.tsx`) — Server Component gọi thẳng
   `lib/data/homepage.ts` (Supabase server client), render HTML tại server,
   không còn `realtime-data.js` + jQuery + `innerHTML`.

2. **Trang chi tiết** — 2 route:
   - `app/[slug]/page.tsx`: khớp theo `slug` (cột DB) — dùng cho slug đẹp/bài
     mới tạo từ admin.
   - `app/legacy/[...path]/page.tsx`: khớp đúng thuật toán cũ của
     `detail-sync.js` — đọc `<h1>` của file HTML tĩnh gốc trong
     `public/index.php/...` → sinh slug → tra Supabase. Nếu không khớp/nội
     dung rỗng → fallback hiển thị nguyên HTML tĩnh (an toàn như bản cũ).
   - `middleware.ts` rewrite `/index.php/**` → `/legacy/**` và `/<slug>.html`
     → `/<slug>` (hoặc 301 sang URL chính tắc nếu `_detail-map.json` chỉ định
     một file khác) — **URL hiển thị cho người dùng và Google KHÔNG đổi**.
   - **Bug đã sửa:** thứ tự kiểm tra route trong middleware cũ khiến
     `/index.php/xxx-p12.html` không bao giờ tới được `/legacy/*` (nhánh xử lý
     `*.html` chung bắt nhầm trước). Đã đổi thứ tự ưu tiên — xác nhận bằng
     test thực tế (trang sản phẩm/tin tức trả về đúng nội dung Supabase).

3. **Admin CRUD** — `app/api/admin/[table]/**` dùng `service_role` (giống
   `server.js` cũ), bảo vệ bằng JWT (`lib/auth/session.ts`).

## 4. Bug có sẵn trong code gốc đã được sửa khi migrate

- **Bảng `photos` vs `images`:** `admin.html` cũ định nghĩa tab "Thư viện ảnh"
  dùng bảng `photos`, và `realtime-data.js` cũng query `supabase.from('photos')`,
  nhưng `CMS_TABLES` trong `server.js` chỉ khai báo `images` (không có `photos`)
  → mọi request `/api/admin/photos/*` trong bản gốc đều 404. Đã bổ sung `photos`
  vào `lib/cms/tables.ts` — xác nhận bằng test thực tế: dashboard hiển thị đúng
  **376** bản ghi thư viện ảnh thật từ Supabase.
- Sidebar admin.html trỏ `showTab('images')` trong khi field-config lại là
  `photos` → đã thống nhất dùng `photos` xuyên suốt.

## 5. Dashboard Admin React (`/admin`)

Thay thế hoàn toàn `admin.html` (1070 dòng jQuery/Bootstrap5-CDN/Quill-CDN),
giữ nguyên UX/luồng nghiệp vụ gốc, viết lại bằng React + TypeScript:

- Đăng nhập bằng mật khẩu → JWT thật (không còn hiển thị gợi ý mật khẩu mặc
  định trên UI như bản cũ — cải thiện bảo mật).
- Sidebar điều hướng 13 bảng CMS (Cài đặt, Slide, Menu, Danh mục, Bài viết,
  Dự án, Sản phẩm, Đối tác, Đánh giá, Video, Thư viện ảnh, Liên hệ, Liên kết).
- Dashboard: thống kê số bản ghi mỗi bảng + hành động nhanh.
- CRUD tổng quát (`DataTable` + `RecordFormModal`) sinh form/cột tự động từ
  `lib/cms/admin-schema.tsx`, hỗ trợ: text, textarea, richtext (Quill — dynamic
  import, không SSR), select, checkbox, number, ảnh (upload kéo-thả gọi thẳng
  `/api/upload`, không còn phụ thuộc `upload-handler.js`), menu cha phân cấp
  3 cấp (`parentselect`).
  Panel "Cài đặt Website" riêng cho `site_settings` (form cố định 12 trường).
- Tự sinh slug từ tên/tiêu đề (dùng chung `lib/slug.ts` với phần frontend).
- Toàn bộ style scope trong class `.admin-root` (file `app/admin/admin.css`)
  để không xung đột với CSS Bootstrap 4 / FontAwesome 4 của site chính.
- CSS/FontAwesome 6 chỉ nạp cho route `/admin` qua `app/admin/layout.tsx`.
- `/admin.html` và `/superadmin.html` cũ → 308 redirect sang `/admin`
  (`next.config.ts`).

## 6. Đã kiểm thử thực tế (dữ liệu Supabase production, không phải mock)

- `npm run build` và `npm run lint`: **0 lỗi** (chỉ còn warning `<img>`/`<link>`
  có chủ đích, không ảnh hưởng build).
- `npm run dev` + gọi trực tiếp qua HTTP:
  - `GET /` → 200, dữ liệu Supabase thật.
  - `GET /index.php/cong-tron-be-tong-p12.html` → 200, khớp đúng bản ghi
    `products` (không rơi vào fallback tĩnh).
  - `GET /index.php/tin-chuyen-nganh/...-n12.html` → 200, khớp đúng bản ghi
    `posts`.
  - `GET /cong-tron-be-tong-duc-san.html` → 301 → URL legacy chính tắc → 200.
  - `GET /gioi-thieu-a1.html` (chưa có bản ghi Supabase) → 200, fallback đúng
    HTML tĩnh gốc.
  - `POST /api/auth/login` (mật khẩu `8386`) → JWT HS256 hợp lệ.
  - `POST /api/auth/verify` → xác thực JWT thành công.
  - `GET /api/public/products`, `GET /api/admin/products` (kèm Bearer token)
    → trả đúng 66 sản phẩm thật.
- Kiểm thử UI bằng trình duyệt thật (Cursor browser tool):
  - Đăng nhập → Dashboard hiển thị đúng số liệu tất cả 13 bảng.
  - Mở/sửa bản ghi Đối tác, lưu thành công (round-trip API thật).
  - Panel Cài đặt Website hiển thị đúng toàn bộ dữ liệu công ty thật (logo,
    favicon, hotline, địa chỉ, meta SEO...).
  - Form "Thêm Bài viết": Quill toolbar hoạt động, gõ tiêu đề tự sinh đúng
    slug không dấu.

> **Lưu ý bảo mật quan trọng:** trong lúc test, việc lưu bản ghi Đối tác
> thành công dù `SUPABASE_SERVICE_KEY` trong `.env.local` để trống (API admin
> tự rơi về dùng anon key). Điều này cho thấy **RLS (Row Level Security) trên
> bảng `partners` hiện đang cho phép ghi bằng anon key** — cùng rủi ro đã tồn
> tại từ trước ở bản gốc (đường ghi trực tiếp client → Supabase trong
> `admin.html` cũ cũng dùng anon key). Khuyến nghị: (1) luôn khai báo
> `SUPABASE_SERVICE_KEY` thật trên Vercel Production, và (2) rà soát/thắt chặt
> RLS policies cho toàn bộ bảng CMS để chỉ `service_role` mới được `INSERT` /
> `UPDATE` / `DELETE`, anon key chỉ được `SELECT`.

## 7. Việc còn lại (không chặn deploy, có thể làm dần)

- [ ] Khai báo biến môi trường thật trên Vercel (Project Settings →
      Environment Variables): `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (service_role
      thật), `SUPABASE_BUCKET`, `JWT_SECRET` (chuỗi ngẫu nhiên dài, khác giá
      trị dev), `NEXT_PUBLIC_SITE_URL`.
- [ ] Rà soát & thắt chặt RLS trên Supabase (xem cảnh báo mục 6).
- [ ] Migrate dần các trang tĩnh còn lại (danh mục/listing `-c*.html`,
      `-l*.html`, trang giới thiệu/liên hệ) sang React thay vì fallback
      `dangerouslySetInnerHTML` — hiện các trang này vẫn hiển thị đúng nội
      dung nhưng không chạy lại được jQuery/carousel gốc (đã inert theo đúng
      hành vi trình duyệt khi chèn qua `innerHTML`, không phải lỗi mới).
- [ ] Cân nhắc sinh Supabase TypeScript types
      (`supabase gen types typescript`) để có type-safety đầy đủ.
- [ ] Đổi mật khẩu admin hardcode (`8386`, `cuaau@2026`...) trong
      `app/api/auth/login/route.ts` sang lưu hoàn toàn trong `admin_users`
      (đã có sẵn cơ chế SHA-256, chỉ cần tắt fallback hardcode).

## 8. Deploy — GitHub → Vercel (duy nhất)

```powershell
git add -A
git commit -m "refactor: migrate to Next.js App Router"
git push origin main
```

Vercel đã liên kết repo GitHub sẽ tự nhận diện `next.config.ts` +
`package.json` (`framework: nextjs` trong `vercel.json`) và build bằng
`npm run build` → `next start`. Không cần bước thủ công nào khác, không đi
qua bất kỳ nền tảng trung gian nào.
