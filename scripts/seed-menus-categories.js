/**
 * scripts/seed-menus-categories.js
 *
 * Kích hoạt CMS cho menu điều hướng + danh mục nổi bật trang chủ,
 * bằng cách chèn ĐÚNG dữ liệu đang hardcode trong public/index.html
 * (giữ nguyên href, kể cả các link index.php/...) -> KHÔNG đổi giao diện,
 * chỉ mở khoá khả năng sửa qua Super Admin từ nay về sau.
 *
 * An toàn: idempotent — nếu bảng đã có dữ liệu thì bỏ qua, không chèn trùng.
 * Cách chạy: node scripts/seed-menus-categories.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfruxinvvvaqufghtigw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertMenu(label, url, parent_id, display_order) {
  const { data, error } = await supabase
    .from('menus')
    .insert({ label, url, parent_id: parent_id || null, display_order, is_active: true })
    .select()
    .single();
  if (error) { console.error('  ❌ menu', label, error.message); return null; }
  return data.id;
}

async function seedMenus() {
  const { count } = await supabase.from('menus').select('*', { count: 'exact', head: true });
  if (count && count > 0) { console.log('⏭  menus đã có dữ liệu (' + count + ' dòng) — bỏ qua seed.'); return; }

  console.log('🌱 Seeding menus...');
  const trangChu = await insertMenu('Trang chủ', 'index.html', null, 0);

  const gioiThieu = await insertMenu('Giới thiệu', 'gioi-thieu-a1.html', null, 1);
  await insertMenu('Thông tin công ty', 'thong-tin-cong-ty-a6.html', gioiThieu, 0);
  await insertMenu('Chính sách chất lượng', 'chinh-sach-chat-luong--a5.html', gioiThieu, 1);
  await insertMenu('Năng lực công ty', 'nhan-luc-a4.html', gioiThieu, 2);

  await insertMenu('Chứng nhận tiêu chuẩn sản phẩm', 'index.php/chung-nhan-tieu-chuan-san-pham-a9.html', null, 2);
  await insertMenu('Dự án', 'du-an-a3.html', null, 3);

  const sanPham = await insertMenu('Sản phẩm', '#', null, 4);
  const congBeTong = await insertMenu('CỐNG BÊ TÔNG', 'cong-be-tong-c46.html', sanPham, 0);
  await insertMenu('ĐẾ CỐNG (GỐI ĐỠ CỐNG)', 'index.php/de-cong-(goi-do-cong)-c60.html', congBeTong, 0);
  await insertMenu('GIOĂNG CAO SU', 'index.php/gioang-cao-su-c58.html', congBeTong, 1);
  await insertMenu('CỐNG TRÒN', 'cong-tron-c53.html', congBeTong, 2);
  await insertMenu('CỐNG HỘP', 'cong-hop--c54.html', congBeTong, 3);
  await insertMenu('CỐNG HỘP ĐÔI', 'cong-hop-doi-c55.html', congBeTong, 4);
  await insertMenu('HỐ GA ĐÚC SẴN', 'ho-ga-duc-san-c48.html', sanPham, 1);
  await insertMenu('HÀO KỸ THUẬT, RÃNH BÊ TÔNG', 'index.php/cac-san-pham-khac-c51.html', sanPham, 2);
  await insertMenu('BÓ VỈA BÊ TÔNG, GẠCH BLOCK BÊ TÔNG', 'index.php/cac-san-pham-cau-kien-be-tong-duc-san-c50.html', sanPham, 3);
  await insertMenu('CỌC VÁN CỪ BÊ TÔNG DỰ ỨNG LỰC', 'index.php/coc-van-cu-be-tong-du-ung-luc-c59.html', sanPham, 4);
  await insertMenu('TẤM TƯỜNG BÊ TÔNG ACOTEC', 'tam-tuong-be-tong-acotec-c47.html', sanPham, 5);
  await insertMenu('CẦU THANG ĐÚC SẴN', 'cau-thang-duc-san-c49.html', sanPham, 6);

  const doiTac = await insertMenu('Đối tác', 'du-an-l7.html', null, 5);
  await insertMenu('Khách hàng', 'khach-hang-l10.html', doiTac, 0);
  await insertMenu('Nhà cung cấp', 'nha-cung-cap-l8.html', doiTac, 1);

  await insertMenu('Thư viện Video', 'index.php/vi-deo--a10.html', null, 6);

  const tinTuc = await insertMenu('Tin tức', 'tin-tuc-l2.html', null, 7);
  await insertMenu('Chính sách', 'index.php/tin-tuyen-dung--l5.html', tinTuc, 0);
  await insertMenu('Tin tức nội bộ', 'tin-tuc-l2.html', tinTuc, 1);
  await insertMenu('Tin tức chuyên ngành', 'tin-tuc-l2.html', tinTuc, 2);

  await insertMenu('Liên hệ', 'lien-he.html', null, 8);
  console.log('✅ menus seeded xong.');
}

async function seedCategories() {
  // Xoá row placeholder cũ không khớp trang thật nào (nếu có, và nếu là dòng duy nhất/rác)
  const { data: existing } = await supabase.from('categories').select('*');
  if (existing && existing.length > 0) {
    const isOnlyPlaceholder = existing.length === 1 && existing[0].slug === 'be-tong-cot-thep';
    if (!isOnlyPlaceholder) { console.log('⏭  categories đã có dữ liệu thật — bỏ qua seed.'); return; }
    await supabase.from('categories').delete().eq('id', existing[0].id);
    console.log('🗑  Đã xoá category placeholder "Bê tông cốt thép"');
  }

  console.log('🌱 Seeding categories...');
  const cats = [
    { name: 'CỐNG BÊ TÔNG', slug: 'cong-be-tong-c46', type: 'product', display_order: 0, is_active: true,
      thumbnail_url: 'images/link/612img_4659.jpg',
      description: 'Cống tròn, cống hộp, hào kỹ thuật, hộp cáp điện, hố ga đúc sẵn, rãnh thoát nước, cột điện, cọc bê tông và các cấu kiện bê tông khác…' },
    { name: 'TẤM TƯỜNG BÊ TÔNG ACOTEC', slug: 'tam-tuong-be-tong-acotec-c47', type: 'product', display_order: 1, is_active: true,
      thumbnail_url: 'images/link/2964acotec_3_large.jpg',
      description: 'Thi công các công trình hạ tầng, thi công thoát nước, xây dựng dân dụng, giao thông, các khu công nghiệp cũng như khu đô thị' },
    { name: 'KINH DOANH THƯƠNG MẠI, VLXD', slug: 'cong-tron-c53', type: 'product', display_order: 2, is_active: true,
      thumbnail_url: 'images/link/9297link3.png',
      description: 'Cung cấp các sản phẩm phụ trợ cho hệ thống thoát nước như nắp ga chắn rác, ghi chắn rác, lượn sóng, biển báo giao thông…' },
  ];
  const { error } = await supabase.from('categories').insert(cats);
  if (error) console.error('  ❌ categories', error.message);
  else console.log('✅ categories seeded xong (' + cats.length + ' dòng).');
}

(async () => {
  await seedMenus();
  await seedCategories();
  console.log('🎉 Hoàn tất seed menus + categories.');
})();
