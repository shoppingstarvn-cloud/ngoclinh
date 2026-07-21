# KIẾN TRÚC CHI TIẾT — webbetonglammau

## 1. TECH STACK

| Lớp | Công nghệ |
|---|---|
| Server | Node.js + **Express 5** (`server.js`) |
| Database | **Supabase** (PostgreSQL) — ref `bfruxinvvvaqufghtigw` |
| Upload ảnh | `multer` → Supabase Storage bucket `uploads` |
| Frontend | HTML tĩnh (mirror HTTrack) + Bootstrap + jQuery + OwlCarousel |
| Dữ liệu động | `public/realtime-data.js` gọi Supabase JS client |
| Auth | Token tự chế dạng `id:username:role:...` (KHÔNG phải JWT chuẩn) |
| Deploy | **Vercel** (`vercel.json`) — dự phòng: Render (`render.yaml`) |

`package.json` dependencies: `@supabase/supabase-js ^2.108.2`, `cors ^2.8.6`, `dotenv ^17.4.2`, `express ^5.2.1`, `multer ^2.2.0`

---

## 2. server.js — BẢN ĐỒ ROUTE

```
app.use(express.json({ limit: '100mb' }))          ← cho phép body lớn (nội dung HTML dài)
app.use(express.static(path.join(ROOT_DIR,'public')))
app.use('/uploads', express.static(...))

POST /api/auth/login                  ← đăng nhập, trả token
POST /api/auth/verify                 ← kiểm tra token (cần adminAuth)

// Sinh tự động cho MỖI bảng trong CMS_TABLES:
GET    /api/public/<table>            ← công khai (chỉ bảng publicRead: true)
GET    /api/public/<table>/:id
GET    /api/admin/<table>             ← cần token
GET    /api/admin/<table>/:id
POST   /api/admin/<table>             ← tạo mới
PUT    /api/admin/<table>/:id         ← cập nhật
DELETE /api/admin/<table>/:id         ← xoá

POST /api/upload                      ← upload ảnh lên Supabase Storage
GET  /api/public/config               ← cấu hình site công khai
POST /api/public/contact              ← form liên hệ
GET  /api/admin/all-data              ← nạp 1 phát toàn bộ bảng cho dashboard
POST /api/sync/files-to-supabase      ← đồng bộ file → Supabase

app.use((req,res)=>...)               ← fallback 404 / SPA
```

### CMS_TABLES (server.js ~dòng 125)

```js
[
  { table: 'site_settings',        publicRead: true  },
  { table: 'menus',                publicRead: true  },
  { table: 'categories',           publicRead: true  },
  { table: 'posts',                publicRead: true  },
  { table: 'projects',             publicRead: true  },
  { table: 'products',             publicRead: true  },
  { table: 'slides',               publicRead: true  },
  { table: 'images',               publicRead: true  },
  { table: 'videos',               publicRead: true  },
  { table: 'partners',             publicRead: true  },
  { table: 'testimonials',         publicRead: true  },
  { table: 'links',                publicRead: true  },
  { table: 'contact_submissions',  publicRead: false },
]
```

### ⚠️ Bẫy trong handler POST

```js
app.post(`/api/admin/${table}`, adminAuth, async (req, res) => {
  const body = { ...req.body };
  delete body.id;                                  // không cho set ID
  body.created_at = new Date().toISOString();      // ← TỰ GÁN
  body.updated_at = new Date().toISOString();      // ← TỰ GÁN
  const { data, error } = await supabase.from(table).insert(body).select();
  ...
});
```

→ **Bảng nào thiếu `created_at` hoặc `updated_at` sẽ lỗi 400 khi thêm mới.**
Luôn `ALTER TABLE ... ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();` trước.

### ⚠️ Handler GET không hỗ trợ `limit`

`GET /api/admin/<table>` trả **toàn bộ** bảng, không phân trang. Query params được hỗ trợ:
`is_active`, `category_id`, `album_id`, `status`.

---

## 3. AUTH — CÁCH HOẠT ĐỘNG

```
POST /api/auth/login  { password: "..." }
```

Thứ tự kiểm tra:
1. So với danh sách mật khẩu **hardcode** trong `server.js` (`admin`, `8386`, `cuaau@2026`)
   → nếu khớp, trả token role `superadmin`
2. Nếu không khớp → băm `sha256(password)` rồi so với `admin_users.password_hash`
   → khớp thì cập nhật `last_login` và trả token

Token có dạng chuỗi ghép `id:username:role:...`, gửi kèm header:
```
Authorization: Bearer <token>
```

Trong `admin.html`, token lưu ở biến toàn cục `authToken` (đã có sẵn tiền tố `Bearer `).
→ Script chạy trong Console có thể dùng trực tiếp `authToken`.

---

## 4. public/admin.html — CMS SUPER ADMIN

File **duy nhất 66KB**, không build tool. Cấu trúc:

- **CONFIG** (~dòng 242): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, khởi tạo `_supabase`
- **`TABLES`** (~dòng 251): mảng mô tả từng bảng — `name`, `label`, `icon`, `pk`, `fields[]`, `cols[]`
  - `fields[].type`: `text` | `textarea` | `number` | `checkbox` | `select` | `richtext` | `parentselect`
  - `cols[].render`: hàm tuỳ biến hiển thị (ảnh thumbnail, cây menu 3 cấp, badge...)
- **Ghi dữ liệu**: qua `fetch('/api/admin/<table>', { headers: { Authorization: authToken } })`
- **Xoá**: gọi API, có fallback `_supabase.from(table).delete()`

Muốn **thêm cột mới vào form admin** → sửa mảng `TABLES`, thêm object vào `fields[]` và `cols[]`.

---

## 5. public/realtime-data.js — DỮ LIỆU ĐỘNG TRÊN WEBSITE

Nhúng ở **223 trang HTML**. Các hàm chính:

| Hàm | Nạp gì |
|---|---|
| `loadSlides()` | Slider trang chủ |
| `loadProducts()` | Khối sản phẩm |
| `loadPartners()` | Logo đối tác |
| `loadTestimonials()` | Đánh giá khách hàng |
| `loadNews()` | Cột "Tin tức & Sự kiện" |
| `loadProjects()` | Khối dự án |
| `loadMenus()` | Menu 3 cấp |
| `loadCategories()` | Cột "Danh mục" bên trái |
| `loadVideos()` / `loadPhotos()` / `loadLinks()` | Thư viện |
| `loadSiteSettings()` | Logo, tên site, hotline, địa chỉ |
| `subscribeRealtime()` | Lắng nghe `postgres_changes` → admin sửa là web đổi ngay |

Hàm `itemHref(item)` / `postHref(slug)` quyết định link đích khi bấm vào item.
Nếu bản ghi có `link_url` thì dùng, không thì suy ra từ `slug`.

---

## 6. TRIỂN KHAI

### vercel.json
```json
{
  "version": 2,
  "builds": [{
    "src": "server.js",
    "use": "@vercel/node",
    "config": { "includeFiles": ["public/**", "uploads/**"] }
  }],
  "rewrites": [{ "source": "/(.*)", "destination": "/server.js" }]
}
```

⚠️ `includeFiles` **chỉ được trỏ thư mục CÓ THẬT**. Trỏ sai → build fail `statCache does not contain value for ...`

### Biến môi trường cần set trên Vercel (Production)
```
SUPABASE_URL=https://bfruxinvvvaqufghtigw.supabase.co
SUPABASE_ANON_KEY=sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml
SUPABASE_SERVICE_KEY=<service_role thật — anh Linh tự dán>
SUPABASE_BUCKET=uploads
JWT_SECRET=<chuỗi bí mật>
```

**Không có `SUPABASE_SERVICE_KEY` → CMS không lưu được gì.**

### Quy trình deploy
Anh Linh chạy trên máy:
```powershell
cd "D:\SUPPER APP TRIEU DO\webbetonglammau"
git add -A; git commit -m "..."; git push origin main
```
→ Vercel tự build. Lỗi thì đọc build log (Vercel MCP: `get_deployment_build_logs`).
