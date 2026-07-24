// ============================================================
// BUILD-DETAIL-MAP.JS — Sinh public/_detail-map.json
// ------------------------------------------------------------
// Quét mọi trang chi tiết trong public/index.php/ (-p<n> / -n<n>),
// đọc <h1>, sinh slug (cùng thuật toán đồng bộ Supabase), rồi ánh xạ
//   slug  ->  đường dẫn file thật
// Server dùng bản đồ này để chuyển hướng /<slug>.html → trang chi tiết thật.
//
// Chạy khi THÊM/ĐỔI TÊN trang chi tiết:  node scripts/build-detail-map.js
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'public');
const OUT = path.join(ROOT, '_detail-map.json');

function walk(d, o = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, o);
    else if (/-(p|n)\d+\.html$/i.test(f.name)) o.push(p);
  }
  return o;
}

const noAccent = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D');
const slugify = s => noAccent(s).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

const files = walk(path.join(ROOT, 'index.php'));
const map = {};
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) continue;
  const title = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!title) continue;
  const base = slugify(title);
  const url = '/' + path.relative(ROOT, f).split(path.sep).join('/');
  const code = (f.match(/-((?:p|n)\d+)\.html$/i) || [])[1];
  if (!map[base]) map[base] = url;
  if (code && !map[base + '-' + code.toLowerCase()]) map[base + '-' + code.toLowerCase()] = url;
}

// ---- ÁNH XẠ THỦ CÔNG cho bản ghi cũ / danh mục không có trang chi tiết riêng ----
const MANUAL = {
  'cong-be-tong-tron': '/cong-tron-c53.html'  // sản phẩm seed "Cống bê tông tròn" → danh mục cống tròn
};
Object.assign(map, MANUAL);

fs.writeFileSync(OUT, JSON.stringify(map));
console.log('✅ Đã ghi', OUT);
console.log('   Số slug:', Object.keys(map).length, '| từ', files.length, 'trang chi tiết');
