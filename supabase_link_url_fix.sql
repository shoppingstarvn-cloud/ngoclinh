-- ============================================================
-- supabase_link_url_fix.sql
-- Thêm cột link_url cho products & categories để admin tự đặt "Link đích"
-- khi bấm vào thẻ sản phẩm / danh mục trên trang chủ.
-- Loader (realtime-data.js) ưu tiên link_url, để trống thì fallback slug.html.
-- ============================================================
ALTER TABLE products   ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS link_url text;

-- Trỏ sản phẩm "cống bê tông tròn" tới trang THẬT (giống menu, hết 404)
UPDATE products
SET link_url = '/cong-tron-c53.html'
WHERE slug = 'cong-be-tong-tron' OR name ILIKE '%cống bê tông tròn%';

NOTIFY pgrst, 'reload schema';
