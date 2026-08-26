-- Bật Realtime (postgres_changes) cho toàn bộ bảng CMS
-- Chạy 1 lần trong Supabase → SQL Editor
-- Sau đó LiveSiteSync trên website sẽ tự refresh khi Super Admin CRUD.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_settings',
    'menus',
    'categories',
    'slides',
    'products',
    'posts',
    'projects',
    'partners',
    'testimonials',
    'services',
    'register_blocks',
    'registrations',
    'videos',
    'photos',
    'links',
    'contact_submissions'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE %I',
        t
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- đã có trong publication
      WHEN undefined_object THEN
        RAISE NOTICE 'Bảng % chưa tồn tại — bỏ qua', t;
    END;
  END LOOP;
END $$;
