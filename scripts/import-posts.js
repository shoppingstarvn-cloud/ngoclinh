// ============================================================
// IMPORT-POSTS.JS — Nhập toàn bộ bài viết từ HTML tĩnh vào Supabase
// Chạy 1 lần: node scripts/import-posts.js
// Cần biến môi trường: SUPABASE_SERVICE_KEY (service_role của project)
// ============================================================
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bfruxinvvvaqufghtigw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Thiếu SUPABASE_SERVICE_KEY. Hãy đặt biến môi trường rồi chạy lại.');
  process.exit(1);
}

// Chặn trường hợp chưa thay chuỗi mẫu bằng khóa thật
if (/[^\x00-\x7F]/.test(SERVICE_KEY) || /PASTE|DAN_|VAO_DAY|YOUR_KEY/i.test(SERVICE_KEY)) {
  console.error('❌ SUPABASE_SERVICE_KEY vẫn đang là CHUỖI MẪU, chưa phải khóa thật.');
  console.error('   → Supabase → project bfruxinvvvaqufghtigw → Settings → API');
  console.error('   → Copy khóa "service_role" (bắt đầu bằng eyJ... hoặc sb_secret_...)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const ROOT = path.join(process.cwd(), 'public');

// Lấy tất cả trang chi tiết: -p<số>.html (sản phẩm/bài viết) và -n<số>.html (dự án/khách hàng)
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/-(p|n)\d+\.html$/i.test(f.name)) out.push(p);
  }
  return out;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function absUrl(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return '/' + String(src).replace(/^\.*\//, '');
}

(async () => {
  let files = [];
  try {
    files = walk(ROOT);
  } catch (e) {
    console.error('❌ Không đọc được thư mục public/:', e.message);
    process.exit(1);
  }

  console.log(`🔎 Tìm thấy ${files.length} trang chi tiết.`);
  let inserted = 0, updated = 0, skipped = 0;
  const seen = new Set();

  for (const file of files) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch { skipped++; continue; }

    const $ = cheerio.load(html);
    const title = ($('h1').first().text() || '').replace(/\s+/g, ' ').trim();
    const box = $('.detail_product').first();
    const content = box.length ? (box.html() || '').trim() : '';

    if (!title || !content) { skipped++; continue; }

    const slug = slugify(title) || slugify(path.basename(file, '.html'));
    if (seen.has(slug)) { skipped++; continue; }   // tránh trùng trong cùng lần chạy
    seen.add(slug);

    const excerpt = box.text().replace(/\s+/g, ' ').trim().slice(0, 300);
    const thumb = absUrl(box.find('img').first().attr('src'));

    const row = {
      title,
      slug,
      excerpt,
      content,
      thumbnail_url: thumb,
      status: 'published',
      is_active: true,
      display_order: 0
    };

    try {
      const { data: existing, error: selErr } = await sb
        .from('posts').select('id').eq('slug', slug).limit(1);
      if (selErr) throw selErr;

      if (existing && existing.length) {
        const { error } = await sb.from('posts').update(row).eq('id', existing[0].id);
        if (error) throw error;
        updated++;
        console.log(`♻️  Cập nhật: ${title.slice(0, 70)}`);
      } else {
        const { error } = await sb.from('posts').insert(row);
        if (error) throw error;
        inserted++;
        console.log(`✅ Thêm mới: ${title.slice(0, 70)}`);
      }
    } catch (e) {
      skipped++;
      console.log(`⚠️  Lỗi [${slug}]: ${e.message}`);
    }
  }

  console.log('\n===== HOÀN TẤT =====');
  console.log(`✅ Thêm mới : ${inserted}`);
  console.log(`♻️  Cập nhật : ${updated}`);
  console.log(`⚠️  Bỏ qua   : ${skipped}`);
  console.log('👉 Mở /admin.html → tab "Bài viết" để kiểm tra.');
})();
