-- =============================================================================
-- PHẦN 3A — XÁC THỰC SUPABASE STORAGE bucket `uploads`
-- Chạy tại: https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/sql/new
-- Kỳ vọng: mọi CHECK = PASS
-- =============================================================================

-- 1) Bucket tồn tại + public = true
SELECT
  id,
  name,
  public,
  file_size_limit,
  CASE
    WHEN id = 'uploads' AND public IS TRUE THEN 'PASS'
    ELSE 'FAIL'
  END AS check_bucket
FROM storage.buckets
WHERE id = 'uploads';

-- 2) Liệt kê policy liên quan bucket uploads
SELECT
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE pol.polcmd::text
  END AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'storage'
  AND cls.relname = 'objects'
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%uploads%'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%uploads%'
    OR pol.polname ILIKE '%upload%'
  )
ORDER BY pol.polname;

-- 3) CHECK tổng hợp: có policy cho service_role ghi/xóa (ALL hoặc INSERT+UPDATE+DELETE)
WITH upload_policies AS (
  SELECT
    pol.polname,
    pol.polcmd,
    COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') AS using_expr,
    COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '') AS check_expr
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE nsp.nspname = 'storage'
    AND cls.relname = 'objects'
    AND (
      pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%uploads%'
      OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%uploads%'
      OR pol.polname ILIKE '%upload%'
    )
),
flags AS (
  SELECT
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'uploads' AND public IS TRUE) AS bucket_ok,
    EXISTS (
      SELECT 1 FROM upload_policies
      WHERE using_expr ILIKE '%service_role%' OR check_expr ILIKE '%service_role%'
    ) AS service_role_policy_ok,
    EXISTS (
      SELECT 1 FROM upload_policies
      WHERE polcmd IN ('*', 'a')  -- ALL hoặc INSERT
    ) AS write_ok,
    EXISTS (
      SELECT 1 FROM upload_policies
      WHERE polcmd IN ('*', 'd')  -- ALL hoặc DELETE
    ) AS delete_ok,
    EXISTS (
      SELECT 1 FROM upload_policies
      WHERE polcmd IN ('*', 'r')  -- ALL hoặc SELECT (public read)
    ) AS read_ok
)
SELECT
  CASE WHEN bucket_ok THEN 'PASS' ELSE 'FAIL' END AS check_bucket_public,
  CASE WHEN service_role_policy_ok THEN 'PASS' ELSE 'WARN_NO_SERVICE_ROLE_IN_POLICY' END AS check_service_role,
  CASE WHEN write_ok THEN 'PASS' ELSE 'FAIL' END AS check_write,
  CASE WHEN delete_ok THEN 'PASS' ELSE 'FAIL' END AS check_delete,
  CASE WHEN read_ok THEN 'PASS' ELSE 'FAIL' END AS check_public_read,
  CASE
    WHEN bucket_ok AND write_ok AND delete_ok AND read_ok THEN 'PASS — Storage sẵn sàng cho Super Admin upload'
    ELSE 'FAIL — chạy lại supabase/schema.sql (phần STORAGE) hoặc supabase_storage_config.sql'
  END AS overall
FROM flags;

-- 4) (Tuỳ chọn) Tự sửa nếu FAIL — an toàn, idempotent
-- Bỏ comment khối dưới nếu overall = FAIL:

/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
CREATE POLICY "Public read uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Service write uploads" ON storage.objects;
CREATE POLICY "Service write uploads" ON storage.objects
  FOR ALL
  USING (bucket_id = 'uploads' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'service_role');
*/
