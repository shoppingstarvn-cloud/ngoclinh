# KIẾN TRÚC CHI TIẾT — webbetonglammau (Next.js 15 App Router)

> Cập nhật sau migration sang Next.js. Nguồn sự thật: `app/`, `components/`, `lib/`, `middleware.ts`.

## 1. TECH STACK

| Lớp | Công nghệ |
|---|---|
| Framework | **Next.js 15.3** App Router + **React 19** + **TypeScript 5.8** |
| Dữ liệu | **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) |
| Auth | **jose** — JWT HS256, cookie httpOnly `admin_token` |
| Soạn thảo | **quill** (RichTextEditor) |
| UI phụ | **sweetalert2**, **swiper**; theme cũ: jQuery 1.9 + Bootstrap 4.1 + Owl Carousel 2.3 (nạp trong `app/layout.tsx`) |
| Deploy | **Vercel** (`framework: nextjs`) |

`package.json` scripts: `dev`, `build`, `start`, `lint`, `build:detail-map` (`node scripts/build-detail-map.js`), `sync:cms` (`node scripts/sync-cms-from-source.mjs`).

---

## 2. ROUTES (app/)

| Route | File | Vai trò |
|---|---|---|
| `/` | `app/page.tsx` | Trang chủ, `dynamic='force-dynamic'`, gọi `getHomepageData()` |
| `/<slug>` | `app/[slug]/page.tsx` | Trang chi tiết theo slug; `du-an-a3`/`du-an` → ProjectsListing |
| `/legacy/<...>` | `app/legacy/[...path]/page.tsx` | Nội dung legacy `/index.php/...` (rewrite từ middleware) |
| `/admin`, `/admin/*` | `app/admin/page.tsx` → `AdminApp.tsx` | CMS Super Admin (client) |
| `/api/auth/login` | route.ts | Đăng nhập, set cookie JWT |
| `/api/auth/verify` | route.ts | Kiểm tra token |
| `/api/admin/[table]` `[id]` | route.ts | CRUD (GET/POST/PUT/DELETE), cần Bearer token |
| `/api/admin/all-data` | route.ts | Nạp toàn bộ bảng cho dashboard |
| `/api/public/[table]` `[id]`, `/api/public/config` | route.ts | Đọc công khai |
| `/api/upload` | route.ts | Upload ảnh lên Supabase Storage |
| `/api/health` | route.ts | Health check |

`app/layout.tsx`: khai báo `<head>` (favicon, fonts Oswald+Roboto Condensed, Bootstrap CSS, các CSS legacy `/css/...`, Owl CSS) và nạp JS theo thứ tự jQuery(beforeInteractive) → Bootstrap → Owl(afterInteractive). **Thiếu các thứ này → vỡ typography/carousel.**

---

## 3. MIDDLEWARE (`middleware.ts`, runtime `nodejs`)

Thứ tự xử lý (bỏ qua prefix tĩnh `/css /images /hpm /uploads /_next /api /favicon.ico /admin`):
1. `/index.php/<rest>` → **rewrite** `/legacy/<rest>` (phải đứng trước nhánh `.html`).
2. `/index.html`, `/index-2.html` → **redirect 301** `/`.
3. `/<slug>.html` (trừ admin.html/superadmin.html):
   - slug có trong `_detail-map.json` → **redirect 301** tới path legacy canonical (SEO).
   - không → **rewrite** `/<slug>` (App Router `[slug]`).

Runtime phải là `nodejs` vì `lib/detail-map.ts` đọc file bằng `fs` (Edge không có `fs`).

---

## 4. LUỒNG DỮ LIỆU CÔNG KHAI

```
app/page.tsx (force-dynamic)
  └─ getHomepageData()  [lib/data/homepage.ts]
       └─ createClient() [lib/supabase/server.ts]  (anon key + cookie, RLS)
            └─ Promise.all: slides, products, partners, testimonials,
               posts, projects, menus, categories, links, site_settings
  └─ render <SiteShell> + 8 section [components/home/HomeSections.tsx]
  └─ <LiveSiteSync/> (client) nghe realtime → router.refresh()
```

Lọc dữ liệu (trong `homepage.ts`): products lấy ≤50 rồi `.filter(isTrustedMediaUrl).slice(0,15)`; partners `.filter(isValidAssetUrl(logo_url))`; posts chỉ `tags='tin-tuc'` + `status='published'`.

Trang chi tiết: `lib/data/detail.ts` — `fetchDetailBySlug` (tra theo slug qua nhiều bảng) và `fetchDetailByPath` (dùng `<h1>` của file tĩnh → slug candidates → tra đúng bảng). `content < 20 ký tự` bị bỏ qua (coi như rỗng, dùng fallback tĩnh).

---

## 5. GHI DỮ LIỆU — SERVER ACTIONS (`lib/actions/admin-actions.ts`)

**Đây là lớp ghi DUY NHẤT mà UI Admin dùng** (`'use server'`):

| Action | Việc |
|---|---|
| `createRecordAction(table, payload)` | insert |
| `updateRecordAction(table, id, payload)` | update theo pk |
| `deleteRecordAction(table, id)` | delete theo pk |
| `saveSiteSettingsAction(values)` | upsert site_settings theo `SITE_SETTINGS_FIXED_KEYS` |
| `repairPartnersAndSyncAction()` | sửa logo đối tác hỏng + bật/tắt is_active |

Mỗi action: `requireAdminAction()` (đọc cookie `admin_token`) → `createAdminClient()` (service_role, bypass RLS) → `stripSystemFields()` (bỏ id, tự gán created_at/updated_at) → ghi → `revalidatePath('/', 'layout')` + `revalidatePath('/admin','layout')`.

`lib/cms/crud.ts`: `applyPublicFilters`, `applyAdminFilters`, `stripSystemFields`.
`lib/cms/tables.ts`: `CMS_TABLES` (14 bảng gồm `photos`), `ORDERED_TABLES`, `isValidTable`, `getTableConfig`.

---

## 6. AUTH (`lib/auth/`)

- `jwt.ts`: `signAdminToken` (HS256, TTL 24h), `verifyAdminToken` (có fallback token base64 cũ), `hashPassword` (sha256), `ADMIN_COOKIE='admin_token'`.
- `session.ts`: `requireAdmin(request)` cho API routes (đọc Bearer/cookie, trả Response 401 nếu fail); `requireAdminAction()` cho Server Actions (đọc cookie, **throw** nếu fail).
- `getSecret()`: `process.env.JWT_SECRET` (có fallback — production nên set riêng).
- Mật khẩu: hardcode `['8386','admin','cuaau@2026']` HOẶC `admin_users.password_hash` khớp `sha256(password)` (hoặc plaintext cũ).

---

## 7. SUPABASE CLIENTS (`lib/supabase/`)

| File | Hàm | Key | Dùng |
|---|---|---|---|
| `server.ts` | `createClient()` | anon + cookie (SSR) | Server Components, đọc công khai |
| `client.ts` | `createClient()` | anon (browser) | Client Components, realtime |
| `admin.ts` | `createAdminClient()` | **service_role** | Server Actions, API routes (ghi) |
| `env.ts` | `getSupabaseUrl/AnonKey()` | — | fallback env |

`admin.ts` đọc key theo thứ tự: `SUPABASE_SERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` → anon (nếu thiếu). Có `BUCKET_NAME` (`SUPABASE_BUCKET` hoặc `uploads`).

---

## 8. INSTANT SYNC (2 lớp)

1. **Server-side:** mọi Server Action ghi xong gọi `revalidatePath('/', 'layout')` → xoá Next.js cache toàn site → F5 (kể cả ngay sau khi Lưu) thấy dữ liệu mới, không cần rebuild.
2. **Client-side realtime:** `components/sync/LiveSiteSync.tsx` (đặt trong SiteShell) nghe `postgres_changes` 12 bảng → debounce 250ms → `router.refresh()` → trang tự cập nhật, không cần F5.

---

## 9. DEPLOY

`vercel.json` (`framework:nextjs`, `buildCommand:npm run build`, headers cache `/css` `/images`). `next.config.ts`: `reactStrictMode`, `poweredByHeader:false`, `images.unoptimized` + remotePatterns supabase, `redirects()` (index.html→/, index-2.html→/, admin.html→/admin, superadmin.html→/admin).

Env cần set trên Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`. Push `main` → Vercel auto build.

---

## 10. SCRIPTS (`scripts/`)

| Script | Việc |
|---|---|
| `build-detail-map.js` | Sinh `public/_detail-map.json` (slug → path legacy) — chạy khi thêm trang tĩnh |
| `sync-cms-from-source.mjs` | Đồng bộ CMS từ nguồn (`npm run sync:cms`) |
| `seed-from-source.js`, `seed-menus-categories.js`, `seed-testimonials-sales.js` | Seed dữ liệu |
| `fix-product-thumbnails.js`, `sanitize-product-content-urls.js` | Vá ảnh/URL sản phẩm |
| `import-posts.js`, `sync-all-to-sql.js`, `browser-sync.js` | Công cụ đồng bộ (một số từ thời Express — kiểm tra trước khi dùng) |
