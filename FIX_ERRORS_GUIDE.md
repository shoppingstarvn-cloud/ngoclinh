# 🚨 HƯỚNG DẪN SỬA LỖI KHẨN CẤP - BÊ TÔNG PHƯƠNG BẮC

## 📋 TÓM TẮT CÁC LỖI ĐÃ PHÁT HIỆN

### ✅ ĐÃ SỬA:
1. ✅ Lỗi cú pháp meta tag viewport (dấu `;` sai → đã sửa thành `,`)
2. ✅ Favicon đã có sẵn trong HTML (dòng 10: `<link rel="icon" href="images/favicon/8446logo_bt.png">`)
3. ✅ Đã tạo file SQL schema hoàn chỉnh: `SUPABASE_SETUP_COMPLETE.sql`

### ⚠️ CẦN SỬA NGAY:

---

## 🔥 LỖI 1: HTTP 400/406 KHI FRONTEND GỌI API SUPABASE

### Nguyên nhân:
- **Schema database chưa được tạo** hoặc thiếu bảng
- **RLS Policies chưa đúng** → Block request từ anon key
- **SUPABASE_SERVICE_KEY chưa được set** trên Vercel/Production

### Giải pháp (3 BƯỚC):

#### BƯỚC 1: Tạo Database Schema trên Supabase
1. Vào https://supabase.com/dashboard
2. Chọn project: `bfruxinvvvaqufghtigw`
3. Vào **SQL Editor** (biểu tượng ⚡)
4. Copy toàn bộ nội dung file `SUPABASE_SETUP_COMPLETE.sql`
5. Paste vào SQL Editor và click **RUN**
6. ✅ Đợi chạy xong (khoảng 10-20 giây)

#### BƯỚC 2: Kiểm tra RLS Policies
```sql
-- Chạy lệnh này để kiểm tra policies đã được tạo chưa
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Nếu không có policies nào hoặc thiếu → **Chạy lại file SQL**

#### BƯỚC 3: Cấu hình SUPABASE_SERVICE_KEY trên Vercel
1. Vào Supabase Dashboard → Settings → API
2. Copy **service_role key** (key bắt đầu bằng `eyJ...` dài ~200 ký tự)
3. Vào Vercel Dashboard → Project Settings → Environment Variables
4. Thêm biến:
   ```
   SUPABASE_SERVICE_KEY=eyJhbGc....[key dài của bạn]
   ```
5. ⚠️ **QUAN TRỌNG**: Chọn Environment = **Production** (không phải Preview)
6. Click **Save**
7. **Redeploy** project (Deployments → chọn deployment mới nhất → ... → Redeploy)

---

## 🔥 LỖI 2: Hiển thị `undefined` ở cột ID trong Admin "Cài đặt Website"

### Nguyên nhân:
- Admin render table dùng key `id` nhưng response từ API có thể trả về `key` field khác

### Giải pháp:
File `public/admin.html` dòng 520-523 đang render:
```javascript
const val = row[c.key];
if (c.key === 'id') return `<td class="text-muted">${val}</td>`;
```

**CÁCH SỬA**: Đã có key mapping trong TABLES config, đảm bảo `site_settings` có cột `id`:
```javascript
{ key: 'id', label: 'ID' },
{ key: 'key', label: 'Key' },
{ key: 'value', label: 'Value' }
```

✅ **Đã kiểm tra**: Schema SQL có `id SERIAL PRIMARY KEY` → OK
✅ **Kiểm tra API response**: API `/api/public/site_settings` phải trả về field `id`

**Test bằng cách:**
```bash
curl https://your-domain.vercel.app/api/public/site_settings
```

Nếu response không có `id` → **Chạy lại SQL schema** (Bước 1 ở trên)

---

## 🔥 LỖI 3: Supabase RLS Block Write từ Admin

### Triệu chứng:
- Admin đăng nhập thành công
- Nhấn "Thêm" hoặc "Sửa" → Lưu thất bại
- Lỗi: "Lưu thất bại - Server từ chối ghi"

### Nguyên nhân:
- Server đang dùng `SUPABASE_ANON_KEY` thay vì `SUPABASE_SERVICE_KEY`
- RLS chặn write từ anon role

### Giải pháp:
**Kiểm tra file `.env` hoặc Vercel Environment Variables:**
```env
SUPABASE_SERVICE_KEY=eyJhbGc... (phải là service_role key, >200 ký tự)
```

**Không phải:**
```env
SUPABASE_ANON_KEY=sb_publishable_... (chỉ dùng cho public read)
```

⚠️ **SAU KHI SỬA**: Phải **Restart server** (local) hoặc **Redeploy** (Vercel)

---

## 🔥 LỖI 4: Realtime Không Hoạt Động

### Triệu chứng:
- Thêm dữ liệu từ Admin
- Website không tự động cập nhật

### Giải pháp:

#### Option 1: Enable Realtime trên Supabase
1. Vào Supabase Dashboard → Database → Replication
2. Bật Realtime cho các bảng:
   - `site_settings`
   - `menus`
   - `slides`
   - `products`
   - `posts`
   - `partners`
   - `testimonials`
   - `videos`

#### Option 2: Reload thủ công
Website tự động reload sau 30s, hoặc nhấn F5

---

## 🎯 CHECKLIST HOÀN CHỈNH

### Database Setup:
- [ ] Chạy file `SUPABASE_SETUP_COMPLETE.sql` trên Supabase SQL Editor
- [ ] Kiểm tra tất cả bảng đã được tạo (14 bảng)
- [ ] Kiểm tra RLS policies đã được tạo
- [ ] Enable Realtime cho các bảng quan trọng

### Server Configuration:
- [ ] Copy `SUPABASE_SERVICE_KEY` từ Supabase Dashboard
- [ ] Set environment variable trên Vercel (Environment: Production)
- [ ] Redeploy application
- [ ] Test API endpoint: `/api/public/site_settings`

### Admin Dashboard:
- [ ] Đăng nhập thành công (password: admin / 8386 / cuaau@2026)
- [ ] Test thêm 1 bản ghi vào "Cài đặt Website"
- [ ] Kiểm tra cột ID hiển thị đúng (không còn undefined)
- [ ] Kiểm tra Thêm/Sửa/Xóa hoạt động

### Frontend (Website):
- [ ] Mở index.html, kiểm tra Console không có lỗi 400/406
- [ ] Slides hiển thị đúng
- [ ] Sản phẩm hiển thị đúng
- [ ] Đối tác hiển thị đúng
- [ ] Test Realtime: Thêm slide mới từ Admin → Website tự động cập nhật

---

## 🚀 CÁCH TEST TOÀN BỘ HỆ THỐNG

### Test Local:
```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file .env
cp .env.example .env
# Điền SUPABASE_SERVICE_KEY vào .env

# 3. Chạy server
npm start

# 4. Mở browser
# Admin: http://localhost:3000/admin.html
# Website: http://localhost:3000/
```

### Test Production (Vercel):
```bash
# 1. Push code lên GitHub
git add .
git commit -m "Fix all errors"
git push origin main

# 2. Vercel tự động deploy
# Hoặc deploy thủ công: vercel --prod

# 3. Kiểm tra:
# https://your-domain.vercel.app/admin.html
# https://your-domain.vercel.app/
```

---

## 📞 HỖ TRỢ KHẨN CẤP

### Nếu vẫn lỗi sau khi làm theo hướng dẫn:

**1. Kiểm tra Supabase Logs:**
   - Dashboard → Logs → Real-time logs
   - Xem có lỗi gì khi gọi API

**2. Kiểm tra Browser Console:**
   - F12 → Console → Xem lỗi JavaScript
   - Network → Xem response của API calls

**3. Kiểm tra Vercel Logs:**
   - Dashboard → Deployment → View Function Logs
   - Xem server có nhận được request không

**4. Test API trực tiếp:**
```bash
# Test public read (phải OK)
curl https://your-domain.vercel.app/api/public/site_settings

# Test admin write (cần token)
curl -X POST https://your-domain.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}'
```

---

## ✅ KẾT QUẢ MONG ĐỢI

Sau khi hoàn tất tất cả các bước:
1. ✅ Admin Dashboard hoạt động 100%
2. ✅ CRUD (Thêm/Sửa/Xóa) hoạt động mượt mà
3. ✅ Website hiển thị dữ liệu từ Supabase
4. ✅ Realtime đồng bộ tức thì
5. ✅ Không còn lỗi 400, 406, undefined

---

**Cập nhật lần cuối: 2026-06-25**
