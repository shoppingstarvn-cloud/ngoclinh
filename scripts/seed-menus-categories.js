/**
 * scripts/seed-menus-categories.js — NGOCLINH ONLY
 *
 * Seed header (public.menus) + khối trang chủ (public.categories) cho
 * https://ngoclinh.shopmartai.com  — kho pglbhoitmcflpvoasewr.
 *
 * KHÔNG mặc định URL/key Cửa Âu. Cấm chạy nếu URL chứa bfruxinvvvaqufghtigw.
 *
 * An toàn: nếu bảng đã có dữ liệu thì BỎ QUA.
 *   Tab Menu đang là cây Cửa Âu → chạy SQL:
 *   sql/07_THAY_MENU_HEADER_NGOCLINH.sql trên SQL Editor ngoclinh.
 *   9 khối sandwich → sql/04_DONG_BO_9_KHOI_MENU_TRANG_CHU.sql
 *
 * Cách chạy (PowerShell, từ thư mục repo):
 *   $env:SUPABASE_URL="https://pglbhoitmcflpvoasewr.supabase.co"
 *   $env:SUPABASE_SERVICE_KEY="<service_role>"
 *   node scripts/seed-menus-categories.js
 */
const { createClient } = require('@supabase/supabase-js');

const NGOCLINH_REF = 'pglbhoitmcflpvoasewr';
const CUA_AU_REF = 'bfruxinvvvaqufghtigw';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL và SUPABASE_SERVICE_KEY (hoặc SUPABASE_KEY). Không mặc định kho Cửa Âu.');
  process.exit(1);
}
if (SUPABASE_URL.includes(CUA_AU_REF) || /congbetongcuaau/i.test(SUPABASE_URL)) {
  console.error('❌ URL đang trỏ Cửa Âu. Script này chỉ chạy trên ngoclinh (' + NGOCLINH_REF + ').');
  process.exit(1);
}
if (!SUPABASE_URL.includes(NGOCLINH_REF)) {
  console.error('❌ URL không phải kho ngoclinh (' + NGOCLINH_REF + '):', SUPABASE_URL);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertMenu(label, url, parent_id, display_order) {
  const { data, error } = await supabase
    .from('menus')
    .insert({ label, url, parent_id: parent_id || null, display_order, is_active: true })
    .select()
    .single();
  if (error) {
    console.error('  ❌ menu', label, error.message);
    return null;
  }
  return data.id;
}

async function seedMenus() {
  const { count } = await supabase.from('menus').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('⏭  menus đã có ' + count + ' dòng — không chèn đè.');
    console.log('    Tab Menu còn cây Cửa Âu? Run sql/07_THAY_MENU_HEADER_NGOCLINH.sql trên kho ngoclinh.');
    return;
  }

  console.log('🌱 Seeding menus ngoclinh...');
  await insertMenu('Trang chủ', '/', null, 0);
  await insertMenu('Giới thiệu', '/#gioi-thieu', null, 1);

  const nangLuc = await insertMenu('Năng lực', '/#menu-trang-chu', null, 2);
  const daoTao = await insertMenu('ĐÀO TẠO AI', '/dao-tao-ai.html', nangLuc, 2);
  await insertMenu('TRUYỀN THÔNG', '/truyen-thong.html', nangLuc, 0);
  await insertMenu('TỔ CHỨC SỰ KIỆN', '/to-chuc-su-kien.html', nangLuc, 1);
  await insertMenu('THIẾT KẾ WEBSITE/APP', '/thiet-ke-app.html', nangLuc, 3);
  await insertMenu('LUYỆN THI TOÁN LÝ HÓA SINH', '/luyen-thi-toan-ly-hoa-sinh.html', nangLuc, 4);
  const phongTrao = await insertMenu('HOẠT ĐỘNG PHONG TRÀO', '/hoat-dong-phong-trao.html', nangLuc, 5);

  await insertMenu('Đào Tạo AI Khối Hành Chính', '/dao-tao-ai.html', daoTao, 0);
  await insertMenu('Đào Tạo AI Khối Doanh Nghiệp', '/dao-tao-ai.html', daoTao, 1);
  await insertMenu('Đào Tạo AI Giáo Viên Khối Trường Học', '/dao-tao-ai.html', daoTao, 2);
  await insertMenu('Đào Tạo AI for Kids (học sinh)', '/dao-tao-ai.html', daoTao, 3);

  await insertMenu('Viện Ứng Dụng Công Nghệ và Chuyển Đổi Số Quốc Gia', '/hoat-dong-phong-trao.html', phongTrao, 0);
  await insertMenu('Viện Nghiên Cứu Đào Tạo Công Nghệ và Chuyển Đổi Số AVG', '/hoat-dong-phong-trao.html', phongTrao, 1);
  await insertMenu('Trường Tiểu Học Nguyễn Công Trứ', '/hoat-dong-phong-trao.html', phongTrao, 2);
  await insertMenu('Lớp 1A3', '/hoat-dong-phong-trao.html', phongTrao, 3);

  const dichVu = await insertMenu('Dịch vụ', '/#cac-dich-vu', null, 3);
  const services = [
    'Làm Ảnh, Video, Voice AI',
    'Các Siêu Trợ Lý AI',
    'Các gói Đào Tạo AI',
    'Dịch Vụ Cài Đặt AI',
    'Dịch Vụ làm APP, Web, Landing Page, Xây Kênh',
    'Dịch vụ tạo CHAT BOT AI',
    'DỊCH VỤ TÍCH HỢP CHAT BOT – AUTOMATION',
    'ĐÀO TẠO, CÀI ĐẶT, HƯỚNG DẪN OPENCLAW',
    'Bot Siêu Kế Toán Trưởng, Bot Trưởng Phòng, Bot Chuyên Gia',
    'Hệ Thống Bot Đa Tầng cho Tổ Chức, Doanh Nghiệp',
    'Sáng tác bài hát cho Tổ Chức, Trường Học, Doanh Nghiệp',
  ];
  for (let i = 0; i < services.length; i++) {
    await insertMenu(services[i], '/#form-dang-ky', dichVu, i);
  }

  await insertMenu('Dự án', '/#du-an', null, 4);
  await insertMenu('Tin tức', '/#tin-tuc', null, 5);
  await insertMenu('Đăng ký', '/#form-dang-ky', null, 6);
  await insertMenu('Liên hệ', '/#form-dang-ky', null, 7);
  console.log('✅ menus ngoclinh seeded.');
}

async function seedCategories() {
  const { data: existing } = await supabase.from('categories').select('*');
  if (existing && existing.length > 0) {
    console.log('⏭  categories đã có dữ liệu — bỏ qua seed.');
    console.log('    9 khối sandwich: Run sql/04_DONG_BO_9_KHOI_MENU_TRANG_CHU.sql nếu hàng 3 chưa có *-r2.');
    return;
  }

  console.log('🌱 Seeding 6 khối năng lực ngoclinh...');
  const cats = [
    { name: 'TRUYỀN THÔNG', slug: 'truyen-thong', type: 'product', display_order: 0, is_active: true, link_url: '/truyen-thong.html' },
    { name: 'TỔ CHỨC SỰ KIỆN', slug: 'to-chuc-su-kien', type: 'product', display_order: 1, is_active: true, link_url: '/to-chuc-su-kien.html' },
    { name: 'ĐÀO TẠO AI', slug: 'dao-tao-ai', type: 'product', display_order: 2, is_active: true, link_url: '/dao-tao-ai.html' },
    { name: 'THIẾT KẾ WEBSITE/APP', slug: 'thiet-ke-app', type: 'product', display_order: 3, is_active: true, link_url: '/thiet-ke-app.html' },
    { name: 'LUYỆN THI TOÁN LÝ HÓA SINH', slug: 'luyen-thi-toan-ly-hoa-sinh', type: 'product', display_order: 4, is_active: true, link_url: '/luyen-thi-toan-ly-hoa-sinh.html' },
    { name: 'HOẠT ĐỘNG PHONG TRÀO', slug: 'hoat-dong-phong-trao', type: 'product', display_order: 5, is_active: true, link_url: '/hoat-dong-phong-trao.html' },
  ];
  const { error } = await supabase.from('categories').insert(cats);
  if (error) console.error('  ❌ categories', error.message);
  else console.log('✅ categories seeded (' + cats.length + ' khối). Hàng 3: Run sql/04.');
}

(async () => {
  await seedMenus();
  await seedCategories();
  console.log('🎉 Xong seed ngoclinh menus + categories.');
})();
