# HỒ SƠ DỰ ÁN — NGOCLINH

> Nguồn sự thật của workspace này. Cập nhật 29/08/2026 (commit production `dc9880e`).
> **Đây là website độc lập.** Không phải Cửa Âu / webbetonglammau.

---

## 1. Nhận diện

| Hạng mục | Giá trị |
|---|---|
| **Tên dự án Cursor / GitHub / Vercel / Supabase** | `ngoclinh` |
| **Website LIVE** | https://ngoclinh.shopmartai.com |
| **Chủ** | Bùi Ngọc Linh — ShopMartAI |
| **Stack** | Next.js 15 (App Router) + Supabase (PostgreSQL + Storage) + Vercel |
| **Nhánh deploy** | `main` |
| **Commit production đang chạy** | `dc9880e` — *Gate Hoạt động: chỉ đăng nhập, bỏ mật khẩu nội dung* |

Khung code từng clone từ site bê tông, nhưng **hạ tầng đã tách hẳn**: repo riêng, Vercel riêng, Supabase riêng, domain riêng.

---

## 2. Máy local (Cursor mở ĐÚNG folder này)

| Hạng mục | Đường dẫn |
|---|---|
| Ổ đĩa | `D:\` (`DATA (D:)`) |
| Thư mục gốc công việc | `D:\SUPPER APP TRIEU DO` |
| **Folder code ngoclinh** | `D:\SUPPER APP TRIEU DO\Truong-Phong-Truyen-Thong-Pho-Phong-Dao-Tao` |
| Shortcut / junction (nếu có) | `D:\SUPPER APP TRIEU DO\ngoclinh` → cùng nội dung folder trên |

Cách mở trong Cursor: **File → New Window** → **File → Open Folder** → chọn một trong hai đường dẫn trên → **New Chat**. Không mở folder `webbetonglammau`.

---

## 3. GitHub (code)

| Hạng mục | Giá trị |
|---|---|
| **Repo** | https://github.com/shoppingstarvn-cloud/ngoclinh |
| Tổ chức | `shoppingstarvn-cloud` |
| Remote bắt buộc | `https://github.com/shoppingstarvn-cloud/ngoclinh.git` |
| Visibility | Public |
| Kiểm tra trước mọi lần push | `git remote -v` phải ra **đúng** URL trên |

```powershell
git remote -v
# origin  https://github.com/shoppingstarvn-cloud/ngoclinh.git (fetch)
# origin  https://github.com/shoppingstarvn-cloud/ngoclinh.git (push)
```

**CẤM** `git remote` / `git push` tới `shoppingstarvn-cloud/webbetonglammau`.

---

## 4. Vercel (hosting)

| Hạng mục | Giá trị |
|---|---|
| **Project** | `ngoclinh` |
| Dashboard | https://vercel.com/shoppingstarvn-8300s-projects/ngoclinh |
| Team | `shoppingstarvn-8300s-projects` |
| Project ID (nội bộ) | `prj_pyv7xfL7vOdMLvYrSUNUZJQV8xek` |
| Domain chính | **https://ngoclinh.shopmartai.com** |
| URL Vercel mặc định (tham chiếu) | `ngoclinh-three.vercel.app` |
| Nguồn deploy | GitHub `ngoclinh` / nhánh `main` / commit `dc9880e` |
| Trạng thái (29/08/2026) | Ready — production LIVE |

DNS `shopmartai.com` quản lý tại **Vinahost**. Subdomain `ngoclinh` trỏ Vercel.

**CẤM** Redeploy / đổi env / đổi domain của project Vercel **webbetonglammau**.

---

## 5. Supabase (database + storage)

| Hạng mục | Giá trị |
|---|---|
| **Tên project** | `ngoclinh` (FREE / PRODUCTION) |
| **Ref** | `pglbhoitmcflpvoasewr` |
| Dashboard | https://supabase.com/dashboard/project/pglbhoitmcflpvoasewr |
| SQL Editor | https://supabase.com/dashboard/project/pglbhoitmcflpvoasewr/sql |
| Project URL | https://pglbhoitmcflpvoasewr.supabase.co |
| Storage bucket | `uploads` (public) |

Khoá `anon` / `service_role` chỉ nằm trong `.env.local` và Vercel Environment Variables. **Không ghi khoá vào hồ sơ, không commit.**

### SQL đã chạy trên kho ngoclinh (18/08/2026)

Anh đã Run thành công trên SQL Editor project **ngoclinh**:

```sql
INSERT INTO public.site_settings (key, value)
VALUES ('favicon_url', '/logo/shopmartai-ai.png')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();
```

Kết quả: *Success. No rows returned.*

> File `/logo/shopmartai-ai.png` phải có trên **repo ngoclinh** thì tab mới hiện đúng logo. Việc này làm trên repo/Vercel **ngoclinh**, không đụng webbetonglammau.

### Kho CỬA ÂU — chỉ đọc khi copy dữ liệu, KHÔNG ghi

| Hạng mục | Giá trị |
|---|---|
| Ref cũ | `bfruxinvvvaqufghtigw` |
| URL cũ | https://bfruxinvvvaqufghtigw.supabase.co |
| Dùng để | Migrate một chiều → kho ngoclinh |
| **CẤM** | SQL ghi, đổi RLS, đổi Storage, đổi site_settings trên kho này |

---

## 6. Biến môi trường (Vercel + `.env.local`)

Chỉ dùng kho **ngoclinh**:

```
NEXT_PUBLIC_SUPABASE_URL        = https://pglbhoitmcflpvoasewr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = <anon key kho ngoclinh>
SUPABASE_SERVICE_KEY            = <service_role kho ngoclinh>
SUPABASE_BUCKET                 = uploads
JWT_SECRET                      = <chuỗi riêng của ngoclinh, không dùng secret Cửa Âu>
NEXT_PUBLIC_SITE_URL            = https://ngoclinh.shopmartai.com
```

---

## 7. Ranh giới tuyệt đối — không đụng

| Thứ | Đường dẫn / link | Việc được phép |
|---|---|---|
| Folder Cửa Âu | `D:\SUPPER APP TRIEU DO\webbetonglammau` | Không mở, không sửa, không push |
| GitHub Cửa Âu | https://github.com/shoppingstarvn-cloud/webbetonglammau | Không push |
| Vercel Cửa Âu | https://webbetonglammau.vercel.app | Không redeploy, không đổi env |
| Supabase Cửa Âu | project `bfruxinvvvaqufghtigw` | Không chạy SQL ghi |

Push nhầm sang webbetonglammau ngày 18/08/2026 đã **revert** (`3039de7`). Không lặp lại.

---

## 8. Cổng nội dung menu **Hoạt động** (login-only, từ `dc9880e`)

Danh mục/menu tên **Hoạt động** (`lib/gate/match.ts` → `isGatedCategoryName`) yêu cầu **đăng nhập**, không còn mật khẩu nội dung site-wide.

| Thành phần | Vai trò |
|---|---|
| `GET /api/gate/context` | Trả `unlocked: true/false` theo session; kèm `targets` + `patterns` cho link gated |
| `components/gate/ContentGate.tsx` | Chặn click link gated → mở **AuthModal** (đăng nhập/đăng ký) |
| `lib/album/album.ts` | Album gated: chỉ xem khi `loggedIn` |
| Admin tab `content_gate` | Chỉ hướng dẫn — không quản lý mật khẩu |

**Đã gỡ (không tái tạo):** `POST /api/gate/verify`, `/api/admin/content-gate`, cột `users.content_unlocked` (legacy, không dùng). SQL `CONTENT_GATE.sql` = LEGACY.

**Kiểm tra LIVE (29/08/2026):** `/api/gate/context` → 200; `/api/gate/verify` → 404.

---

## 9. Việc Cursor / em phải làm mỗi phiên

1. Đọc file này trước khi sửa code.
2. `git remote -v` = `ngoclinh.git` thì mới được commit/push.
3. Chỉ deploy Vercel project **ngoclinh**.
4. SQL chỉ chạy trên project **pglbhoitmcflpvoasewr**.
5. Chat mới: **File → New Window** + Open Folder ngoclinh + **New Chat** — không tiếp thread Cửa Âu.
