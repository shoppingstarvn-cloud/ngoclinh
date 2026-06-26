-- ============================================================================
-- SUPABASE STORAGE CONFIGURATION
-- Mục tiêu: Tạo bucket 'uploads' + 4 RLS Policy (INSERT/SELECT/UPDATE/DELETE)
-- ============================================================================

-- ============ BƯỚC 1: TẠO BUCKET 'uploads' (PUBLIC) ============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];

-- ============ BƯỚC 2: BẬT RLS CHO storage.objects ============
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============ BƯỚC 3: TẠO 4 POLICY CHO BUCKET 'uploads' ============

-- 1. POLICY: Cho phép PUBLIC UPLOAD (INSERT)
DROP POLICY IF EXISTS "Allow public upload to uploads bucket" ON storage.objects;
CREATE POLICY "Allow public upload to uploads bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'uploads');

-- 2. POLICY: Cho phép PUBLIC READ (SELECT)
DROP POLICY IF EXISTS "Allow public read from uploads bucket" ON storage.objects;
CREATE POLICY "Allow public read from uploads bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- 3. POLICY: Cho phép PUBLIC UPDATE
DROP POLICY IF EXISTS "Allow public update in uploads bucket" ON storage.objects;
CREATE POLICY "Allow public update in uploads bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- 4. POLICY: Cho phép PUBLIC DELETE
DROP POLICY IF EXISTS "Allow public delete from uploads bucket" ON storage.objects;
CREATE POLICY "Allow public delete from uploads bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'uploads');

-- ============================================================================
-- ✅ HOÀN TẤT: Bucket 'uploads' + 4 Policies đã sẵn sàng
-- 
-- HƯỚNG DẪN THỰC THI:
-- 1. Vào Supabase Dashboard: https://supabase.com/dashboard
-- 2. Chọn project → SQL Editor (menu bên trái)
-- 3. Copy TOÀN BỘ nội dung file này
-- 4. Paste vào SQL Editor → Click "RUN" (hoặc Ctrl+Enter)
-- 5. Chờ 2-3 giây → Thành công!
-- 
-- KẾT QUẢ:
-- - Admin có thể upload/xem/sửa/xóa file trên bucket 'uploads'
-- - Website public có thể truy cập ảnh từ uploads (vì public = true)
-- - Giới hạn: 10MB/file, hỗ trợ JPG/PNG/GIF/WEBP/MP4
-- ============================================================================
