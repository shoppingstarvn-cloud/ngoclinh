---
name: webbetonglammau
description: Bộ não tri thức TOÀN DIỆN của dự án website "webbetonglammau" — CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU (bê tông đúc sẵn) của anh Bùi Ngọc Linh. Dự án ĐÃ MIGRATE sang Next.js 15 App Router + React 19 + TypeScript + Supabase (không còn Express/HTML tĩnh). Đọc skill này là hiểu SÂU SẮC toàn bộ như một siêu chuyên gia — kiến trúc App Router, luồng dữ liệu Supabase, Server Actions, CMS Super Admin tại /admin, trang chi tiết động, deploy Vercel, và mọi lỗi đã gặp cùng cách sửa. Kích hoạt BẮT BUỘC khi anh Linh nói bất kỳ điều gì liên quan đến "webbetonglammau", "web bê tông", "bê tông Cửa Âu", "betongphuongbac", "cống bê tông", "trang chủ", "sản phẩm/bài viết/dự án", "sửa chữ/giao diện web", "admin/dashboard", "deploy web", hoặc khi làm việc trong thư mục D:\SUPPER APP TRIEU DO\webbetonglammau.
---

# 🏗️ DỰ ÁN WEBBETONGLAMMAU — HỒ SƠ SIÊU CHUYÊN GIA (Next.js)

> Khi anh Linh nhắc đến dự án này, em đọc skill để nắm trọn bối cảnh và **bắt tay làm ngay**.
> ⚠️ **QUAN TRỌNG:** Dự án đã chuyển từ web tĩnh + Express sang **Next.js 15 App Router**. Mọi kiến thức "server.js / index.html / realtime-data.js" là LỊCH SỬ — xem mục 12.

---

## 1. TỔNG QUAN NHANH

| Hạng mục | Thông tin |
|---|---|
| **Tên hiển thị** | CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU (thương hiệu cũ: Bê Tông Phương Bắc / PBC) |
| **Ngành** | Bê tông đúc sẵn: cống tròn, cống hộp, cống hộp đôi, hố ga, tấm tường ACOTEC, cọc ván cừ |
| **Bản chất** | **Next.js 15 App Router + React 19 + TypeScript**, dữ liệu từ **Supabase**, deploy **Vercel** |
| **Local** | `D:\SUPPER APP TRIEU DO\webbetonglammau` |
| **GitHub** | `shoppingstarvn-cloud/webbetonglammau` — nhánh `main` |
| **Deploy** | **Vercel** (framework `nextjs`, tự build khi push) — https://webbetonglammau.vercel.app |
| **Supabase ref** | `bfruxinvvvaqufghtigw` → `https://bfruxinvvvaqufghtigw.supabase.co` |
| **Trang quản trị** | `/admin` (React CMS). `/admin.html` cũ → redirect `/admin`. Mật khẩu: `admin` / `8386` / `cuaau@2026` |

**Tech stack (`package.json` v2.0.0):** `next@15.3`, `react@19`, `@supabase/ssr`, `@supabase/supabase-js`, `jose` (JWT HS256), `quill` (soạn thảo), `swiper`, `sweetalert2`. Theme cũ vẫn dùng **jQuery + Bootstrap 4 + Owl Carousel** nạp qua `app/layout.tsx` (`<Script>`), CSS legacy ở `public/css/`.

---

## 2. QUY TẮC VÀNG

1. **Sửa giao diện/chữ trang chủ = sửa `components/home/HomeSections.tsx`** (KHÔNG phải `public/index.html` — file đó không còn là nguồn). Trang chủ là `app/page.tsx`.
2. **Ghi database từ Admin = Server Actions** trong `lib/actions/admin-actions.ts` (không sửa DB tay từ client). Đây là lớp ghi DUY NHẤT UI dùng.
3. **Anh Linh chạy `git push origin main`** trên máy → Vercel tự build. Em chuẩn bị code + khối lệnh, không tự push.
4. **KHÔNG hardcode `SUPABASE_SERVICE_KEY`** — chỉ để trong biến môi trường Vercel/`.env.local`.
5. **Sandbox có thể bị chặn Supabase** — thao tác DB trực tiếp qua Chrome (Supabase SQL Editor / API). Xác minh trước khi khẳng định.
6. **KHÔNG tự đăng nhập admin thay anh Linh.** Mật khẩu là ranh giới.
7. Sau khi đổi schema Supabase: **luôn `NOTIFY pgrst, 'reload schema';`**.
8. Trước khi khẳng định "file X còn tồn tại" theo skill: **verify bằng `ls`/`grep`** — kiến trúc thay đổi nhanh.

---

## 3. KIẾN TRÚC THƯ MỤC (Next.js App Router)

```
webbetonglammau/
├── app/                          ← ROUTES (App Router)
│   ├── layout.tsx                ← <head>: CSS/JS legacy (jQuery, Bootstrap, Owl), fonts
│   ├── page.tsx                  ← TRANG CHỦ (force-dynamic) → getHomepageData()
│   ├── [slug]/page.tsx           ← trang chi tiết theo slug (vd /cong-tron-...-d1000.html)
│   ├── legacy/[...path]/page.tsx ← trang legacy /index.php/... (rewrite từ middleware)
│   ├── admin/                    ← CMS Super Admin (page.tsx → AdminApp.tsx, admin.css)
│   └── api/                      ← Route Handlers: auth/login, auth/verify, upload,
│                                    admin/[table], admin/all-data, public/[table], public/config, health
├── components/
│   ├── home/HomeSections.tsx     ← 8 SECTION trang chủ (xem mục 5) ⭐ sửa chữ/giao diện ở đây
│   ├── layout/SiteShell.tsx      ← khung bọc: header + sidebar + footer
│   ├── layout/SiteHeader.tsx     ← menu, logo, hotline
│   ├── listings/ProjectsListing.tsx
│   ├── sync/LiveSiteSync.tsx     ← realtime: nghe postgres_changes → router.refresh()
│   └── admin/*                   ← LoginScreen, Sidebar, Dashboard, DataTable,
│                                    RecordFormModal, RichTextEditor(quill), ImageUploadField, SiteSettingsPanel
├── lib/
│   ├── data/homepage.ts          ← getHomepageData(): nạp mọi bảng cho trang chủ
│   ├── data/detail.ts            ← classifyContentByPath, fetchDetailBySlug/ByPath
│   ├── detail-map.ts             ← đọc public/_detail-map.json (slug → path legacy)
│   ├── legacy-html.ts            ← đọc/bóc HTML tĩnh trong public/index.php (fallback)
│   ├── slug.ts                   ← slugify, isTrustedMediaUrl, isValidAssetUrl
│   ├── supabase/{server,client,admin,env}.ts  ← 3 loại client (xem mục 4)
│   ├── auth/{jwt,session}.ts     ← JWT HS256 (jose), requireAdmin / requireAdminAction
│   ├── actions/admin-actions.ts  ← ⭐ SERVER ACTIONS ghi DB + revalidatePath
│   └── cms/{tables,crud,admin-schema.tsx,partner-logos}.ts
├── middleware.ts                 ← định tuyến .html / index.php / slug (runtime nodejs)
├── public/                       ← CHỈ tài nguyên tĩnh: css/, images/, hpm/, uploads/,
│                                    _detail-map.json, và index.php/*.html (fallback legacy)
├── next.config.ts, vercel.json, .env.example
└── scripts/                      ← build-detail-map.js, sync-cms-from-source.mjs, seed-*, ...
```

---

## 4. SUPABASE — 3 LOẠI CLIENT (nhớ kỹ, đừng dùng nhầm)

| File | Key | Dùng ở đâu |
|---|---|---|
| `lib/supabase/server.ts` | anon (SSR + cookie) | Server Components đọc công khai (getHomepageData, trang chi tiết) |
| `lib/supabase/client.ts` | anon (browser) | Client Components — realtime `LiveSiteSync` |
| `lib/supabase/admin.ts` | **service_role** | GHI dữ liệu: Server Actions + API routes. Có `BUCKET_NAME` |
| `lib/supabase/env.ts` | — | đọc env, fallback publishable key |

**Env (Vercel Project Settings + `.env.local`):**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (bí mật), `SUPABASE_BUCKET=uploads`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`.
Code còn đọc cả tên cũ `SUPABASE_URL`/`SUPABASE_ANON_KEY` để tương thích.

👉 Schema 14 bảng đầy đủ từng cột: đọc `references/02-database.md`

---

## 5. TRANG CHỦ — 8 SECTION (`components/home/HomeSections.tsx`)

`app/page.tsx` (khai báo `export const dynamic = 'force-dynamic'`) gọi `getHomepageData()` rồi render trong `SiteShell`:

| Thứ tự | Component | Nguồn dữ liệu (bảng Supabase) |
|---|---|---|
| 1 | `SlideCarousel` | slides |
| 2 | `AboutLink` | site_settings (intro_text) |
| 3 | `CategoryGrid` | categories |
| 4 | `ProductSection` | products (lọc `isTrustedMediaUrl`, tối đa 15) ⭐ tiêu đề "Sản phẩm chủ lực" |
| 5 | `ProjectSection` | projects |
| 6 | `PartnerSection` | partners (lọc logo hợp lệ) |
| 7 | `TestimonialSection` | testimonials |
| 8 | `NewsSection` | posts (`tags='tin-tuc'`, `status='published'`) |

**Muốn đổi CHỮ/BỐ CỤC một khối trang chủ → sửa function tương ứng trong file này.** Chữ trong JSX thường viết thường, CSS theme (`text-transform: uppercase`) tự in hoa khi hiển thị.

`getHomepageData()` (`lib/data/homepage.ts`) chạy song song `Promise.all` đọc: slides, products(≤50→lọc 15), partners, testimonials, posts(≤30), projects(≤12), menus, categories(≤12), links, site_settings.

---

## 6. TRANG CHI TIẾT — ĐỊNH TUYẾN & NỘI DUNG ĐỘNG

`middleware.ts` (runtime **nodejs**, vì đọc file `_detail-map.json`) xử lý:
- `/index.php/<...>` → **rewrite** nội bộ sang `/legacy/<...>` (URL người dùng giữ nguyên).
- `/index.html`, `/index-2.html` → **redirect 301** về `/`.
- `/<slug>.html`: nếu slug có trong `_detail-map.json` → **redirect 301** tới URL legacy canonical (SEO); nếu không → **rewrite** sang `/<slug>` (App Router).

`app/[slug]/page.tsx`: tra Supabase theo slug (`fetchDetailBySlug`) → render `<h1>` + nội dung (class `detail_product` cho products, `content_news_page` cho còn lại). Fallback: đọc HTML tĩnh legacy. Đặc biệt `du-an-a3`/`du-an` → `ProjectsListing`.

`app/legacy/[...path]/page.tsx`: đọc file HTML tĩnh `public/index.php/...`, lấy `<h1>` → slug → tra Supabase (`fetchDetailByPath`). **File tĩnh là fallback an toàn** nếu Supabase chưa có.

`lib/data/detail.ts` — `classifyContentByPath`: `/tin-tuc|tin-chuyen-nganh|tin-tuyen-dung/`→posts, `/du-an/`→projects, `/khach-hang|nha-cung-cap/`→partners, `-p<n>.html`→(có "bao gia"→posts, else products).

**Thêm trang chi tiết tĩnh mới** → chạy `node scripts/build-detail-map.js` để cập nhật `public/_detail-map.json`, rồi push.

---

## 7. SUPER ADMIN (`/admin`)

- `app/admin/page.tsx` → `app/admin/AdminApp.tsx` (client) → components/admin/*.
- **Đăng nhập:** `POST /api/auth/login` → JWT HS256 (jose) → cookie httpOnly `admin_token` (24h). Mật khẩu hardcode `8386`/`admin`/`cuaau@2026` HOẶC `admin_users.password_hash` (sha256).
- **Đọc dữ liệu dashboard:** `GET /api/admin/all-data` (cần Bearer token).
- **GHI dữ liệu:** **Server Actions** `lib/actions/admin-actions.ts` — `createRecordAction`, `updateRecordAction`, `deleteRecordAction`, `saveSiteSettingsAction`, `repairPartnersAndSyncAction`. Mỗi action gọi `requireAdminAction()` (đọc cookie) → ghi qua `createAdminClient()` (service_role) → `revalidatePath('/', 'layout')`.
- **Instant Sync 2 lớp:** (a) `revalidatePath` xoá cache → F5 thấy ngay; (b) `LiveSiteSync` nghe realtime 12 bảng → `router.refresh()` tự động không cần F5.
- Bảng CMS: `lib/cms/tables.ts` (14 bảng, có `photos`). Cấu hình field/form: `lib/cms/admin-schema.tsx` (`ADMIN_TABLES`, `FieldType` gồm `richtext`/`imageupload`..., `SITE_SETTINGS_FIXED_KEYS`, `IMAGE_FIELD_KEYS`).

---

## 8. DEPLOY (Vercel)

`vercel.json`: `framework: nextjs`, `buildCommand: npm run build`, có headers cache cho `/css` `/images`. `next.config.ts`: `images.unoptimized`, remotePatterns supabase, redirects tĩnh (index.html→/, admin.html→/admin).

**Quy trình (anh Linh chạy trên máy):**
```powershell
cd "D:\SUPPER APP TRIEU DO\webbetonglammau"
git add -A
git commit -m "<mô tả>"
git push origin main
```
→ Vercel tự build Next.js (~1-2 phút). Xong mở site, Ctrl+F5 để bỏ cache.

---

## 9. BACKUP ĐỊNH KỲ ("một bản trên trời, một bản dưới đất")

```powershell
# Cloud
cd "D:\SUPPER APP TRIEU DO\webbetonglammau"; git add -A; git commit -m "Backup"; git push origin main
# Local ZIP (bỏ node_modules + .next cho nhẹ)
$src="D:\SUPPER APP TRIEU DO\webbetonglammau"; $stamp=Get-Date -Format "yyyyMMdd_HHmm"; Get-ChildItem -Path $src -Force -Exclude 'node_modules','.next' | Compress-Archive -DestinationPath "D:\BACKUP_webbetonglammau_$stamp.zip" -Force
```

---

## 10. LỖI ĐÃ GẶP — ĐỪNG DÒ LẠI (tóm tắt)

| Lỗi | Cách sửa |
|---|---|
| Bấm sản phẩm/bài trang chủ → "Not found" | `middleware.ts` + `_detail-map.json` map slug → trang. Thêm trang: `node scripts/build-detail-map.js` |
| Anon chỉ thấy 2/7 dự án | chạy `sql/02_FIX_PROJECTS_RLS.sql` (policy `p_public_read`) |
| `photos.is_active` lỗi 400 | cột là INTEGER (1/0), không phải boolean |
| Ghi DB lỗi cột thiếu | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` rồi `NOTIFY pgrst,'reload schema'` |
| Ảnh nội dung vỡ | chuẩn hoá đường dẫn tương đối `../../hpm/...` → tuyệt đối `/hpm/...` |
| Font/spacing vỡ | thiếu Oswald+Roboto Condensed hoặc CSS legacy trong `app/layout.tsx` |

👉 Chi tiết đầy đủ: `references/04-loi-da-gap.md` · Kiến trúc sâu: `references/01-kien-truc.md`

---

## 11. FILE ĐI KÈM SKILL

| File | Dùng khi nào |
|---|---|
| `references/01-kien-truc.md` | Hiểu sâu App Router, Server Actions, luồng dữ liệu, auth |
| `references/02-database.md` | Schema 14 bảng, RLS, UNIQUE INDEX |
| `references/03-dong-bo-noi-dung.md` | Đồng bộ nội dung website → Supabase |
| `references/04-loi-da-gap.md` | Sổ tay lỗi |
| `scripts/*` | build-detail-map, SQL nâng cấp, fix RLS dự án |

---

## 12. LỊCH SỬ MIGRATION (bối cảnh — ĐỪNG dùng làm hiện trạng)

Trước ~26/07/2026 dự án là **site tĩnh HTML (mirror HTTrack) + Express (`server.js`)**: trang chủ `public/index.html`, dữ liệu động qua `public/realtime-data.js`, admin `public/admin.html`, trang chi tiết động qua `public/detail-sync.js`, redirect slug trong `server.js`. **Tất cả những cái đó ĐÃ ĐƯỢC THAY** bằng Next.js App Router (xem MIGRATION.md trong repo). Nếu thấy tham chiếu tới `server.js`/`realtime-data.js`/`detail-sync.js`/`admin.html` trong tài liệu cũ → đó là kiến trúc CŨ. Nguồn sự thật hiện tại: `app/`, `components/`, `lib/`.

---

## 13. DỰ ÁN LIÊN QUAN (tránh nhầm)
- **`webtruyencamhung`** — Nhóm Truyền Cảm Hứng Toán, deploy Render, local `D:\educational-website`. Khác hoàn toàn.
- **`ShopMartAI Marketing Pro`** — có skill riêng `marketing-shopmartai`.

---

## 14. TINH THẦN LÀM VIỆC
Đằng sau mỗi dòng code là tổ ấm của vợ chồng mình. Website là kế sinh nhai, uy tín của anh trước khách hàng — nên em làm gì cũng **kiểm chứng bằng bằng chứng thật** (grep file, đếm bản ghi, xem trên web LIVE), không báo cáo suông. Gặp rào cản thì nói thẳng và đề xuất đường vòng, không im lặng bỏ dở, không làm liều việc thuộc quyền anh quyết.
