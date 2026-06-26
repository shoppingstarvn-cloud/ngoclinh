-- ============================================================================
-- SUPABASE STORAGE CONFIG (PHIÊN BẢN AN TOÀN - KHÔNG LỖI 42501)
-- 
-- ⚠️ LƯU Ý: KHÔNG dùng "ALTER TABLE storage.objects" vì gây lỗi 42501
--    (RLS trên storage.objects đã được Supabase bật SẴN từ đầu)
-- ============================================================================

-- ============ BƯỚC 1: TẠO BUCKET 'uploads' (chạy được, không cần owner) ============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    true,
    10485760,
    ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','video/mp4'];

-- ============ BƯỚC 2: TẠO 4 POLICY (KHÔNG cần ALTER TABLE) ============
-- CREATE POLICY chạy được trong SQL Editor vì role hiện tại đã có quyền tạo policy

-- 1. INSERT - cho phép upload
DROP POLICY IF EXISTS "uploads_insert_policy" ON storage.objects;
CREATE POLICY "uploads_insert_policy"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'uploads');

-- 2. SELECT - cho phép xem/tải
DROP POLICY IF EXISTS "uploads_select_policy" ON storage.objects;
CREATE POLICY "uploads_select_policy"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'uploads');

-- 3. UPDATE - cho phép cập nhật
DROP POLICY IF EXISTS "uploads_update_policy" ON storage.objects;
CREATE POLICY "uploads_update_policy"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- 4. DELETE - cho phép xóa
DROP POLICY IF EXISTS "uploads_delete_policy" ON storage.objects;
CREATE POLICY "uploads_delete_policy"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'uploads');

-- ============================================================================
-- ✅ HOÀN TẤT - SQL này KHÔNG còn lỗi 42501
-- ============================================================================


-- ============================================================================
-- 🆘 NẾU VẪN LỖI "42501: must be owner of table objects" KHI TẠO POLICY:
--    → Dùng cách CLICK CHUỘT trên Dashboard UI (an toàn 100%) bên dưới
-- ============================================================================
--
-- 📌 CÁCH A: TẠO BUCKET BẰNG UI
-- 1. Vào Dashboard → Storage (menu trái)
-- 2. Click "New bucket"
-- 3. Name: uploads
-- 4. BẬT toggle "Public bucket" → ✅
-- 5. (Tùy chọn) File size limit: 10 MB
-- 6. Click "Create bucket"
--
-- 📌 CÁCH B: TẠO 4 POLICY BẰNG UI (nếu SQL bị chặn quyền)
-- 1. Vào Dashboard → Storage → click bucket "uploads"
-- 2. Chọn tab "Policies" (hoặc Storage → Policies)
-- 3. Click "New Policy" → chọn "For full customization" / "Custom"
--
--   ► POLICY 1 (INSERT - Upload):
--     - Policy name: uploads_insert
--     - Allowed operation: ☑ INSERT
--     - Target roles: public (hoặc anon, authenticated)
--     - WITH CHECK expression:  bucket_id = 'uploads'
--     - Save policy
--
--   ► POLICY 2 (SELECT - Read):
--     - Policy name: uploads_select
--     - Allowed operation: ☑ SELECT
--     - Target roles: public
--     - USING expression:  bucket_id = 'uploads'
--     - Save policy
--
--   ► POLICY 3 (UPDATE):
--     - Policy name: uploads_update
--     - Allowed operation: ☑ UPDATE
--     - Target roles: public
--     - USING expression:  bucket_id = 'uploads'
--     - WITH CHECK expression:  bucket_id = 'uploads'
--     - Save policy
--
--   ► POLICY 4 (DELETE):
--     - Policy name: uploads_delete
--     - Allowed operation: ☑ DELETE
--     - Target roles: public
--     - USING expression:  bucket_id = 'uploads'
--     - Save policy
--
-- 📌 CÁCH C (NHANH NHẤT): Dùng template có sẵn của Supabase
-- 1. Storage → Policies → New Policy
-- 2. Chọn template "Allow access to everyone" (hoặc "Enable read/write for all")
-- 3. Áp dụng cho cả 4 operations → Save
-- ============================================================================
