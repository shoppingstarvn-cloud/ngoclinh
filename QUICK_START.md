# ⚡ HƯỚNG DẪN KHỞI CHẠY NHANH - 5 PHÚT

## ✅ XÁC NHẬN MÃ NGUỒN

### 1. API ENDPOINTS (server.js)
**✅ CÓ ĐẦY ĐỦ:**
- CRUD cho 12 bảng (dòng 124-273)
- SUPABASE_SERVICE_KEY config (dòng 17, 22-24)
- Admin Auth middleware (dòng 55-73)

**⚠️ VẤN ĐỀ:** Chưa có file .env → Dùng fallback ANON_KEY → Bị RLS chặn

### 2. REALTIME SYNC (supabase-sync.js)
**✅ CÓ ĐẦY ĐỦ:**
- subscribeRealtime() (dòng 382-413)
- Lắng nghe 11 bảng realtime
- Auto re-sync khi có thay đổi

### 3. LỖI UNDEFINED
**✅ ĐÃ SỬA:** admin.html dòng 521

---

## 🚀 THỰC THI NGAY (3 BƯỚC)

### BƯỚC 1: Tạo file .env tại gốc dự án

**Tạo file:** `d:\SUPPER APP TRIEU DO\webbetonglammau\.env`

**Nội dung:**
```env
SUPABASE_URL=https://bfruxinvvvaqufghtigw.supabase.co
SUPABASE_ANON_KEY=sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml
SUPABASE_SERVICE_KEY=CHÈN_SERVICE_ROLE_KEY_VÀO_ĐÂY
PORT=3000
```

**Lấy SUPABASE_SERVICE_KEY:**
1. Vào: https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/settings/api
2. Copy key ở mục **service_role** (secret) - Bắt đầu bằng `eyJ...`, dài ~200 ký tự
3. Thay thế `CHÈN_SERVICE_ROLE_KEY_VÀO_ĐÂY` bằng key đó

### BƯỚC 2: Chạy SQL trên Supabase

**URL:** https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/sql

**Hành động:**
1. Click **New Query**
2. Copy toàn bộ file `SUPABASE_SETUP_COMPLETE.sql` (368 dòng)
3. Paste vào SQL Editor
4. Click **RUN** (Ctrl+Enter)
5. Đợi ~10 giây → Thấy "Success. No rows returned"

### BƯỚC 3: Chạy server local

**Terminal (chạy tại thư mục gốc):**
```bash
# Cài dependencies (chỉ cần chạy 1 lần đầu)
npm install

# Chạy server
node server.js
```

**Kết quả mong đợi:**
```
🚀 SUPER ADMIN ENGINE đang chạy tại cổng: 3000
🔗 Supabase: https://bfruxinvvvaqufghtigw.supabase.co
🌐 Admin: http://localhost:3000/admin.html
🌐 Website: http://localhost:3000/
```

---

## 🧪 TEST HỆ THỐNG

### Test 1: Admin Dashboard
1. Mở: http://localhost:3000/admin.html
2. Login: `admin` (hoặc `8386` hoặc `cuaau@2026`)
3. Kiểm tra Dashboard hiển thị 12 stats cards
4. Click "Cài đặt Website"
5. Click "Thêm cấu hình"
6. Nhập: 
   - Key: `test_key`
   - Value: `test_value`
7. Click "Lưu"
8. **✅ KIỂM TRA:** Cột ID hiển thị số (không còn undefined)

### Test 2: Website Frontend
1. Mở tab mới: http://localhost:3000/
2. Mở Console (F12)
3. **✅ KIỂM TRA:** Không có lỗi 400/406
4. **✅ KIỂM TRA:** Slides hiển thị (hoặc cấu trúc HTML đúng)

### Test 3: Realtime Sync
1. Giữ 2 tabs: Admin + Website
2. Trong Admin: Thêm 1 slide mới
   - Title: `Test Slide`
   - Image URL: `https://via.placeholder.com/1200x600`
   - Click "Lưu"
3. **✅ KIỂM TRA:** Tab Website tự động cập nhật (hoặc F5 thấy slide mới)

---

## 🔧 NẾU GẶP LỖI

### Lỗi: "Cannot find module"
```bash
npm install
```

### Lỗi: "EADDRINUSE port 3000"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Hoặc đổi port trong .env
PORT=3001
```

### Lỗi: "Lưu thất bại - Server từ chối ghi"
→ SUPABASE_SERVICE_KEY chưa đúng hoặc chưa được set
→ Kiểm tra lại file .env
→ Restart server (Ctrl+C rồi `node server.js` lại)

### Lỗi 400/406 trên Website
→ Database chưa có bảng
→ Chạy lại SQL từ BƯỚC 2

### Realtime không hoạt động
1. Vào: https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/database/replication
2. Enable Realtime cho các bảng:
   - site_settings
   - slides
   - products
   - posts
   - partners
   - menus
   - categories
   - videos
   - testimonials

---

## 📊 CHECKLIST HOÀN TẤT

**Database:**
- [ ] Chạy SUPABASE_SETUP_COMPLETE.sql
- [ ] Kiểm tra 14 bảng đã tạo (Table Editor)
- [ ] Enable Realtime cho 9 bảng

**Server Local:**
- [ ] Tạo file .env với SERVICE_KEY đúng
- [ ] npm install thành công
- [ ] node server.js chạy OK (port 3000)

**Admin:**
- [ ] Login thành công
- [ ] Stats cards hiển thị
- [ ] Thêm được config (không lỗi undefined)
- [ ] Sửa/Xóa hoạt động

**Website:**
- [ ] Mở được index.html
- [ ] Console không lỗi 400/406
- [ ] Dữ liệu hiển thị từ Supabase

**Realtime:**
- [ ] Thêm slide từ Admin
- [ ] Website tự động cập nhật (hoặc F5 thấy mới)

---

## 🎯 KẾT QUẢ MONG ĐỢI

Sau khi hoàn tất:
✅ Admin CRUD 100% hoạt động
✅ Website hiển thị dữ liệu từ Supabase
✅ Realtime đồng bộ tức thì
✅ Không còn lỗi undefined, 400, 406

**Thời gian:** 5-10 phút
**Độ khó:** ⭐⭐ (Dễ - chỉ cần copy/paste)
