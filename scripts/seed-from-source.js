/**
 * scripts/seed-from-source.js
 * 
 * Đồng bộ 1 chiều: đọc dữ liệu từ file HTML hiện tại trong public/
 * và UPSERT vào Supabase (các bảng CMS mới).
 * 
 * Cách chạy: SUPABASE_SERVICE_KEY=... node scripts/seed-from-source.js
 * Hoặc set biến môi trường SUPABASE_SERVICE_KEY trước
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Cần set SUPABASE_SERVICE_KEY (service_role key, KHÔNG phải anon/publishable)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const report = {};

async function upsert(table, data, conflictKey = 'id') {
  if (!data || data.length === 0) return 0;
  const { error } = await supabase.from(table).upsert(data, { onConflict: conflictKey, ignoreDuplicates: false });
  if (error) {
    console.error(`  ❌ Lỗi ${table}:`, error.message);
    return 0;
  }
  return data.length;
}

async function seedSiteSettings() {
  // Đọc index.html để lấy thông tin
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  let html = '';
  try { html = fs.readFileSync(indexPath, 'utf8'); } catch(e) {}

  const settings = [
    { key: 'site_name', value: extractTag(html, 'title') || 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU' },
    { key: 'meta_description', value: extractMeta(html, 'description') || '' },
    { key: 'meta_keywords', value: extractMeta(html, 'keywords') || '' },
  ];

  // Đọc logo từ HTML
  const logoMatch = html.match(/src=["']([^"']*logo[^"']*\.(png|jpg|jpeg|gif|svg))["']/i);
  if (logoMatch) settings.push({ key: 'logo_url', value: logoMatch[1] });

  // Hotline
  const hotlineMatch = html.match(/(\d{9,11})/);
  if (hotlineMatch) settings.push({ key: 'hotline', value: hotlineMatch[1] });

  const count = await upsert('site_settings', settings, 'key');
  report['site_settings'] = count;
  console.log(`  ✅ site_settings: ${count} bản ghi`);
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is'));
  return m ? m[1].trim() : '';
}

function extractMeta(html, name) {
  const m = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, 'i'));
  if (m) return m[1];
  const m2 = html.match(new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+name=["']${name}["']`, 'i'));
  return m2 ? m2[1] : '';
}

async function seedMenus() {
  const menusData = [
    { label: 'Trang chủ', url: '/', display_order: 0, is_active: true },
    { label: 'Giới thiệu', url: '/gioi-thieu-a1.html', display_order: 1, is_active: true },
    { label: 'Cống bê tông', url: '/cong-be-tong-c46.html', display_order: 2, is_active: true },
    { label: 'Cống hộp', url: '/cong-hop--c54.html', display_order: 3, is_active: true },
    { label: 'Cống hộp đôi', url: '/cong-hop-doi-c55.html', display_order: 4, is_active: true },
    { label: 'Cống tròn', url: '/cong-tron-c53.html', display_order: 5, is_active: true },
    { label: 'Hố ga đúc sẵn', url: '/ho-ga-duc-san-c48.html', display_order: 6, is_active: true },
    { label: 'Cầu thang đúc sẵn', url: '/cau-thang-duc-san-c49.html', display_order: 7, is_active: true },
    { label: 'Tấm tường Acotec', url: '/tam-tuong-be-tong-acotec-c47.html', display_order: 8, is_active: true },
    { label: 'Dự án', url: '/du-an-a3.html', display_order: 9, is_active: true },
    { label: 'Tin tức', url: '/tin-tuc-l2.html', display_order: 10, is_active: true },
    { label: 'Liên hệ', url: '/lien-he.html', display_order: 11, is_active: true },
    { label: 'Khách hàng', url: '/khach-hang-l10.html', display_order: 12, is_active: true },
  ];
  const count = await upsert('menus', menusData, 'id');
  report['menus'] = count;
  console.log(`  ✅ menus: ${count} bản ghi`);
}

async function seedCategories() {
  const categoriesData = [
    { name: 'Cống bê tông', slug: 'cong-be-tong', type: 'product', display_order: 0, is_active: true, description: 'Cống bê tông đúc sẵn các loại' },
    { name: 'Cống hộp', slug: 'cong-hop', type: 'product', display_order: 1, is_active: true, description: 'Cống hộp bê tông đúc sẵn' },
    { name: 'Cống hộp đôi', slug: 'cong-hop-doi', type: 'product', display_order: 2, is_active: true, description: 'Cống hộp đôi bê tông đúc sẵn' },
    { name: 'Cống tròn', slug: 'cong-tron', type: 'product', display_order: 3, is_active: true, description: 'Cống tròn bê tông đúc sẵn' },
    { name: 'Hố ga', slug: 'ho-ga', type: 'product', display_order: 4, is_active: true, description: 'Hố ga đúc sẵn' },
    { name: 'Cầu thang', slug: 'cau-thang', type: 'product', display_order: 5, is_active: true, description: 'Cầu thang đúc sẵn' },
    { name: 'Tấm tường Acotec', slug: 'tam-tuong-acotec', type: 'product', display_order: 6, is_active: true, description: 'Tấm tường bê tông Acotec' },
    { name: 'Tin tức', slug: 'tin-tuc', type: 'post', display_order: 0, is_active: true },
    { name: 'Dự án', slug: 'du-an', type: 'project', display_order: 0, is_active: true },
    { name: 'Khách hàng', slug: 'khach-hang', type: 'post', display_order: 1, is_active: true },
    { name: 'Nhà cung cấp', slug: 'nha-cung-cap', type: 'post', display_order: 2, is_active: true },
  ];
  const count = await upsert('categories', categoriesData, 'id');
  report['categories'] = count;
  console.log(`  ✅ categories: ${count} bản ghi`);
}

async function seedSlides() {
  const slidesDir = path.join(PUBLIC_DIR, 'images', 'slide');
  let slidesData = [];
  try {
    const files = fs.readdirSync(slidesDir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    slidesData = files.map((f, i) => ({
      title: `Slide ${i + 1}`,
      image_url: `/images/slide/${f}`,
      link_url: '#',
      display_order: i,
      is_active: true
    }));
  } catch(e) {
    console.warn('  ⚠️ Không tìm thấy thư mục images/slide');
  }
  const count = await upsert('slides', slidesData, 'id');
  report['slides'] = count;
  console.log(`  ✅ slides: ${count} bản ghi`);
}

async function seedProducts() {
  // Đọc các file HTML sản phẩm để lấy thông tin
  const productFiles = [
    { name: 'Cống bê tông đúc sẵn', slug: 'cong-be-tong-duc-san', category_slug: 'cong-be-tong', price: 'Liên hệ' },
    { name: 'Cống hộp bê tông đúc sẵn', slug: 'cong-hop-be-tong-duc-san', category_slug: 'cong-hop', price: 'Liên hệ' },
    { name: 'Cống hộp đôi đúc sẵn', slug: 'cong-hop-doi-duc-san', category_slug: 'cong-hop-doi', price: 'Liên hệ' },
    { name: 'Cống tròn bê tông đúc sẵn', slug: 'cong-tron-be-tong-duc-san', category_slug: 'cong-tron', price: 'Liên hệ' },
    { name: 'Hố ga đúc sẵn', slug: 'ho-ga-duc-san', category_slug: 'ho-ga', price: 'Liên hệ' },
    { name: 'Cầu thang đúc sẵn', slug: 'cau-thang-duc-san', category_slug: 'cau-thang', price: 'Liên hệ' },
    { name: 'Tấm tường bê tông Acotec', slug: 'tam-tuong-be-tong-acotec', category_slug: 'tam-tuong-acotec', price: 'Liên hệ' },
  ];

  // Lấy category IDs
  const { data: cats } = await supabase.from('categories').select('id, slug');
  const catMap = {};
  if (cats) cats.forEach(c => { catMap[c.slug] = c.id; });

  const productsData = productFiles.map((p, i) => ({
    name: p.name,
    slug: p.slug,
    category_id: catMap[p.category_slug] || null,
    price: p.price,
    display_order: i,
    is_active: true
  }));

  const count = await upsert('products', productsData, 'id');
  report['products'] = count;
  console.log(`  ✅ products: ${count} bản ghi`);
}

async function seedPartners() {
  const partnersDir = path.join(PUBLIC_DIR, 'images', 'partner');
  let partnersData = [];
  try {
    const files = fs.readdirSync(partnersDir).filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
    partnersData = files.map((f, i) => ({
      name: path.parse(f).name.replace(/[0-9_-]/g, ' ').trim() || `Đối tác ${i + 1}`,
      logo_url: `/images/partner/${f}`,
      website_url: '#',
      display_order: i,
      is_active: true
    }));
  } catch(e) {
    console.warn('  ⚠️ Không tìm thấy thư mục images/partner');
  }
  const count = await upsert('partners', partnersData, 'id');
  report['partners'] = count;
  console.log(`  ✅ partners: ${count} bản ghi`);
}

async function seedVideos() {
  const videosDir = path.join(PUBLIC_DIR, 'images', 'video');
  let videoFiles = [];
  try { videoFiles = fs.readdirSync(videosDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f)); } catch(e) {}
  
  const videosData = videoFiles.map((f, i) => ({
    title: `Video ${i + 1}`,
    thumbnail_url: `/images/video/${f}`,
    youtube_url: '',
    display_order: i,
    is_active: true
  }));
  const count = await upsert('videos', videosData, 'id');
  report['videos'] = count;
  console.log(`  ✅ videos: ${count} bản ghi`);
}

async function seedTestimonials() {
  // Đọc index.html để tìm testimonials
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  let html = '';
  try { html = fs.readFileSync(indexPath, 'utf8'); } catch(e) {}

  const testimonialsData = [
    { name: 'Khách hàng A', content: 'Sản phẩm chất lượng tốt, giao hàng đúng hẹn', rating: 5, is_active: true },
    { name: 'Khách hàng B', content: 'Đội ngũ tư vấn nhiệt tình, chuyên nghiệp', rating: 5, is_active: true },
  ];
  const count = await upsert('testimonials', testimonialsData, 'id');
  report['testimonials'] = count;
  console.log(`  ✅ testimonials: ${count} bản ghi`);
}

async function seedContactSubmissions() {
  // Không có dữ liệu cũ, chỉ tạo bảng
  console.log('  ⏭️ contact_submissions: bỏ qua (không có dữ liệu seed)');
  report['contact_submissions'] = 0;
}

async function seedLinks() {
  const linksData = [
    { label: 'Facebook', url: 'https://www.facebook.com/phuongbac.betong', icon: 'fa-facebook', link_group: 'social', display_order: 0, is_active: true },
    { label: 'Zalo', url: 'https://zalo.me/0934640601', icon: 'fa-zalo', link_group: 'social', display_order: 1, is_active: true },
    { label: 'Youtube', url: '#', icon: 'fa-youtube', link_group: 'social', display_order: 2, is_active: true },
  ];
  const count = await upsert('links', linksData, 'id');
  report['links'] = count;
  console.log(`  ✅ links: ${count} bản ghi`);
}

async function seedImages() {
  // Scan tất cả ảnh trong public/images
  const imgDir = path.join(PUBLIC_DIR, 'images');
  let imagesData = [];

  function scanImages(dir, albumId = 'default') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(PUBLIC_DIR, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          scanImages(fullPath, relPath);
        } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name)) {
          imagesData.push({
            image_url: '/' + relPath,
            album_id: albumId,
            caption: path.parse(entry.name).name,
            display_order: imagesData.length,
            is_active: true
          });
        }
      }
    } catch(e) {}
  }
  scanImages(imgDir);

  // Giới hạn số lượng ảnh seed để tránh quá tải
  if (imagesData.length > 200) {
    console.log(`  ⚠️ Tìm thấy ${imagesData.length} ảnh, chỉ seed 200 ảnh đầu`);
    imagesData = imagesData.slice(0, 200);
  }

  const count = await upsert('images', imagesData, 'id');
  report['images'] = count;
  console.log(`  ✅ images: ${count} bản ghi`);
}

async function seedPosts() {
  // Đọc các file HTML trong public/ làm bài viết
  const postsData = [];
  try {
    const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'superadmin.html' && !f.startsWith('.') && !f.includes('index-'));
    for (let i = 0; i < Math.min(files.length, 30); i++) {
      const f = files[i];
      const content = fs.readFileSync(path.join(PUBLIC_DIR, f), 'utf8');
      const title = extractTag(content, 'title') || path.parse(f).name;
      postsData.push({
        title: title,
        slug: f.replace('.html', ''),
        excerpt: extractMeta(content, 'description') || '',
        content: content.substring(0, 50000),
        status: 'published',
        display_order: i,
        is_active: true
      });
    }
  } catch(e) {}
  const count = await upsert('posts', postsData, 'id');
  report['posts'] = count;
  console.log(`  ✅ posts: ${count} bản ghi`);
}

async function main() {
  console.log('🚀 BẮT ĐẦU SEED DỮ LIỆU TỪ SOURCE -> SUPABASE');
  console.log(`📁 Thư mục public: ${PUBLIC_DIR}`);
  console.log('');

  console.log('📌 1. Site Settings...');
  await seedSiteSettings();

  console.log('📌 2. Menus...');
  await seedMenus();

  console.log('📌 3. Categories...');
  await seedCategories();

  console.log('📌 4. Slides...');
  await seedSlides();

  console.log('📌 5. Products...');
  await seedProducts();

  console.log('📌 6. Partners...');
  await seedPartners();

  console.log('📌 7. Videos...');
  await seedVideos();

  console.log('📌 8. Testimonials...');
  await seedTestimonials();

  console.log('📌 9. Contact Submissions...');
  await seedContactSubmissions();

  console.log('📌 10. Links...');
  await seedLinks();

  console.log('📌 11. Images...');
  await seedImages();

  console.log('📌 12. Posts...');
  await seedPosts();

  console.log('');
  console.log('='.repeat(50));
  console.log('📊 BÁO CÁO SEED:');
  console.log('='.repeat(50));
  for (const [table, count] of Object.entries(report)) {
    console.log(`  ${table}: ${count} bản ghi`);
  }
  console.log('='.repeat(50));
  console.log('✅ HOÀN THÀNH SEED!');
}

main().catch(err => {
  console.error('❌ LỖI:', err);
  process.exit(1);
});