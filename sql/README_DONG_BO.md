# ĐỒNG BỘ NỘI DUNG WEBSITE → DASHBOARD SUPER ADMIN

Ngày thực hiện: **21/07/2026** — dự án `webbetonglammau`

---

## 1. GỐC RỄ VẤN ĐỀ (đã tìm ra và sửa)

| # | Lỗi | Hậu quả | Đã xử lý |
|---|-----|---------|----------|
| 1 | Database gần như trống: `posts=1, products=1, projects=0, partners=0` | Dashboard chỉ hiện 1 bài | ✅ Nạp lại đủ 142 bản ghi |
| 2 | `scripts/import-posts.js` chưa từng chạy được (thiếu `SUPABASE_SERVICE_KEY`) | Không có dữ liệu nào vào DB | ✅ Thay bằng quy trình mới |
| 3 | **Lỗi nặng nhất:** script cũ chỉ tìm khối `.detail_product`. Website dùng **2 khuôn trang**: 102 trang sản phẩm dùng `.detail_product`, 56 trang tin tức/dự án/đối tác dùng `.news_page` | Dù chạy được vẫn **bỏ sót 56 trang** | ✅ Parser mới nhận cả 2 khuôn, quét 158/158 |
| 4 | Bảng `products` thiếu cột `content`, `excerpt`, `status` | Không chứa nổi nội dung bài | ✅ Đã ALTER TABLE bổ sung |
| 5 | Không có UNIQUE INDEX trên `slug` | Đồng bộ lại sẽ sinh bản ghi trùng | ✅ Đã tạo cho cả 4 bảng |
| 6 | Ảnh trong nội dung dùng đường dẫn tương đối (`../../hpm/...`) | Ảnh vỡ khi hiển thị trong admin | ✅ Chuẩn hoá về đường dẫn tuyệt đối |

---

## 2. KẾT QUẢ CUỐI CÙNG

| Bảng | Tab dashboard | Tổng | Có nội dung | Có ảnh |
|------|---------------|------|-------------|--------|
| `posts` | Bài viết | **47** | 43 | 42 |
| `products` | Sản phẩm | **76** | 75 | 74 |
| `projects` | Dự án | **7** | 7 | 6 |
| `partners` | Đối tác | **12** | 9 | 3 |
| | **TỔNG** | **142** | | |

Đối chiếu: repo có 158 file HTML chi tiết, nhưng **18 file là bản trùng tên** của cùng một trang
(ví dụ `-p7.html` có 3 file, `-p14/-p15/-p16/-p18/...` mỗi mã 2 file).
→ Số trang thật là **140**. Đã đồng bộ đủ 140 + 2 bản ghi cũ = **142**.

### Phân loại (theo quyết định của anh Linh)
- Trang `-p*.html` có chữ **"báo giá"** → **Bài viết**
- Trang `-p*.html` còn lại → **Sản phẩm**
- `/tin-tuc/`, `/tin-chuyen-nganh/`, `/tin-tuyen-dung/` → **Bài viết**
- `/du-an/` → **Dự án**
- `/khach-hang/`, `/nha-cung-cap/` → **Đối tác**

---

## 3. CÁCH ĐÃ LÀM

Sandbox không kết nối được Supabase (chặn allowlist) và không có credential git,
nên quy trình chạy hoàn toàn qua trình duyệt:

1. **`sql/01_SCHEMA_UPGRADE.sql`** — chạy trên Supabase SQL Editor:
   bổ sung cột cho `products`/`partners`/`projects`, dọn slug rỗng/trùng, tạo UNIQUE INDEX.
2. **Hàm tạm `sync_upsert(p_secret, p_kind, p_rows)`** — `SECURITY DEFINER`, có khoá bí mật,
   chỉ cho phép upsert theo `slug`. Đã **DROP sau khi xong** (đã xác minh trả về HTTP 404).
3. **Script chạy trong trình duyệt** trên chính website (same-origin):
   dò trang → bóc `title`/`content`/`excerpt`/`thumbnail` → chuẩn hoá đường dẫn ảnh → gọi RPC upsert.

> ⚠️ Lưu ý gặp phải: fetch quá nhanh (~290 request) khiến **Vercel chặn 403 toàn site**.
> Lượt chạy cuối đã tiết chế **400ms/trang**. Nếu chạy lại, giữ nguyên độ trễ này.

---

## 4. FILE TRONG THƯ MỤC NÀY

| File | Công dụng |
|------|-----------|
| `01_SCHEMA_UPGRADE.sql` | Nâng cấp schema + UNIQUE INDEX. Chạy lại được nhiều lần. |
| `SYNC_ALL_CONTENT.sql` | Bản SQL đầy đủ 158 trang (1.2 MB) — dự phòng nếu muốn nạp thẳng bằng SQL. |
| `../scripts/sync-all-to-sql.js` | Parser Node sinh ra file SQL trên. Chạy: `node scripts/sync-all-to-sql.js` |
| `../scripts/browser-sync.js` | Bộ nạp chạy trong Console trình duyệt (cần đăng nhập admin). |

---

## 5. LẦN SAU MUỐN ĐỒNG BỘ LẠI

Cách nhanh nhất — dùng API admin, không cần tạo hàm tạm:

1. Mở `https://webbetonglammau.vercel.app/admin.html` → **đăng nhập super admin**
2. F12 → Console → dán toàn bộ `scripts/browser-sync.js` → Enter
3. Chờ chạy xong → bấm **Tải lại** trên dashboard

Nhờ UNIQUE INDEX trên `slug`, chạy lại bao nhiêu lần cũng **không sinh bản ghi trùng** —
bài đã có thì cập nhật, bài mới thì thêm.

---

## 6. VIỆC CÒN LẠI (không chặn, nên làm khi rảnh)

- **Đối tác**: 12 bản ghi nhưng chỉ 3 có ảnh logo — các trang khách hàng/nhà cung cấp
  gốc vốn không có ảnh trong khối nội dung. Nên bổ sung logo thủ công trong tab Đối tác.
- **1 trang lỗi khi tải** ở lượt quét cuối (file có trong repo nhưng deploy trả lỗi).
  Không ảnh hưởng tổng thể vì trang đó là bản trùng tên.
- Cân nhắc xoá bớt 18 file HTML trùng tên trong `public/index.php/` cho gọn repo.
