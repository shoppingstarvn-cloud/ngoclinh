// ============================================================
// SYNC-ALL-TO-SQL.JS — Quét TOÀN BỘ trang chi tiết của website
// và sinh ra 1 file SQL idempotent để chạy trên Supabase SQL Editor.
//
// Chạy: node scripts/sync-all-to-sql.js
// Kết quả: sql/SYNC_ALL_CONTENT.sql
//
// PHÂN LOẠI:
//   public/index.php/*-p<n>.html
//        · tiêu đề/tên file chứa "bao gia"  -> posts   (bài viết báo giá)
//        · còn lại                          -> products (sản phẩm)
//   public/index.php/tin-tuc|tin-chuyen-nganh|tin-tuyen-dung/*-n<n>.html -> posts
//   public/index.php/du-an/*-n<n>.html                                   -> projects
//   public/index.php/khach-hang|nha-cung-cap/*-n<n>.html                 -> partners
// ============================================================
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(process.cwd(), 'public');
const OUT_DIR = path.join(process.cwd(), 'sql');
const OUT_FILE = path.join(OUT_DIR, 'SYNC_ALL_CONTENT.sql');

// ---------- tiện ích ----------
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/-(p|n)\d+\.html$/i.test(f.name)) out.push(p);
  }
  return out;
}

function noAccent(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function slugify(s) {
  return noAccent(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// Chuẩn hoá đường dẫn ảnh: trang nằm trong public/index.php/... nên "../hpm/x.jpg" -> "/hpm/x.jpg"
function absUrl(src, fileDir) {
  if (!src) return '';
  src = String(src).trim();
  if (/^(https?:)?\/\//i.test(src)) return src;
  if (/^data:/i.test(src)) return '';
  const abs = path.posix.normalize(
    path.posix.join(fileDir.split(path.sep).join('/'), src)
  );
  const idx = abs.indexOf('/public/');
  const rel = idx >= 0 ? abs.slice(idx + '/public'.length) : abs.replace(/^.*?public/, '');
  return rel.startsWith('/') ? rel : '/' + rel;
}

// Escape chuỗi cho SQL literal (dùng dollar-quoting để an toàn tuyệt đối với HTML)
const TAG = '$sync$';
function q(v) {
  if (v === null || v === undefined || v === '') return "''";
  const s = String(v);
  if (s.includes(TAG)) return "'" + s.replace(/'/g, "''") + "'";
  return TAG + s + TAG;
}

// ---------- phân loại ----------
function classify(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const base = path.basename(file);
  const dir = path.dirname(rel);

  if (/^index\.php\/tin-tuc/i.test(dir)) return 'posts';
  if (/^index\.php\/tin-chuyen-nganh/i.test(dir)) return 'posts';
  if (/^index\.php\/tin-tuyen-dung/i.test(dir)) return 'posts';
  if (/^index\.php\/du-an/i.test(dir)) return 'projects';
  if (/^index\.php\/khach-hang/i.test(dir)) return 'partners';
  if (/^index\.php\/nha-cung-cap/i.test(dir)) return 'partners';

  if (/-p\d+\.html$/i.test(base)) {
    return /bao-?gia/i.test(noAccent(base)) ? 'posts' : 'products';
  }
  return 'posts';
}

// ---------- quét ----------
const files = walk(ROOT);
console.log(`🔎 Tìm thấy ${files.length} trang chi tiết.`);

const buckets = { posts: [], products: [], projects: [], partners: [] };
const seen = new Set();
let skipped = 0;
const skipLog = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const fileDir = path.posix.join('/public', path.dirname(rel));
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);

  const title = ($('h1').first().text() || $('title').text() || '').replace(/\s+/g, ' ').trim();

  // Website dùng 2 khuôn trang khác nhau:
  //   · trang sản phẩm/báo giá (-p) -> .detail_product
  //   · trang tin tức/dự án/đối tác (-n) -> .content_news_page (mô tả ngắn ở .brief_news_page)
  let box = $('.detail_product').first();
  let briefText = '';
  if (!box.length) {
    box = $('.content_news_page').first();
    briefText = $('.brief_news_page').first().text().replace(/\s+/g, ' ').trim();
    if (!box.length) box = $('.news_page').first();
  }

  if (!title || !box.length) {
    skipped++; skipLog.push(`${rel} — thiếu h1 hoặc khối nội dung`);
    continue;
  }

  // chuẩn hoá mọi ảnh trong nội dung sang đường dẫn tuyệt đối
  box.find('img').each((_, el) => {
    const s = $(el).attr('src');
    const a = absUrl(s, fileDir);
    if (a) $(el).attr('src', a);
    $(el).removeAttr('width').removeAttr('height');
  });
  // gỡ link nội bộ dạng index.php để không dẫn đi lung tung
  box.find('a[href]').each((_, el) => {
    const h = $(el).attr('href') || '';
    if (/^index\.php\//i.test(h)) $(el).attr('href', '/' + h);
  });

  const content = (box.html() || '').trim();
  const excerpt = (briefText || box.text().replace(/\s+/g, ' ').trim()).slice(0, 300);
  const thumb = absUrl(box.find('img').first().attr('src'), fileDir);
  if (!content) { skipped++; skipLog.push(`${rel} — nội dung rỗng`); continue; }

  const kind = classify(file);
  const baseSlug = slugify(title) || slugify(path.basename(file, '.html'));
  // mã trang gốc (p87 / n32) dùng làm hậu tố khi trùng — luôn duy nhất theo website
  const code = ((path.basename(file).match(/-((?:p|n)\d+)\.html$/i) || [])[1] || '').toLowerCase();
  let slug = baseSlug;
  if (seen.has(kind + '|' + slug)) slug = (baseSlug + '-' + code).slice(0, 120);
  let n = 2;
  while (seen.has(kind + '|' + slug)) { slug = (baseSlug + '-' + code + '-' + n).slice(0, 120); n++; }
  seen.add(kind + '|' + slug);

  buckets[kind].push({ title, slug, excerpt, content, thumb, rel, kind });
}

// ---------- sinh SQL ----------
const L = [];
L.push('-- ============================================================');
L.push('-- SYNC_ALL_CONTENT.sql — TỰ ĐỘNG SINH, ĐỪNG SỬA TAY');
L.push(`-- Sinh lúc: ${new Date().toISOString()}`);
L.push(`-- Nguồn: ${files.length} trang chi tiết trong public/index.php/`);
L.push(`-- posts=${buckets.posts.length}  products=${buckets.products.length}  projects=${buckets.projects.length}  partners=${buckets.partners.length}`);
L.push('-- Chạy lại nhiều lần đều an toàn (idempotent, ON CONFLICT DO UPDATE).');
L.push('-- ============================================================');
L.push('BEGIN;');
L.push('');

L.push('-- ---------- 1) NÂNG CẤP SCHEMA ----------');
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS excerpt       text DEFAULT '';`);
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS content       text DEFAULT '';`);
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS status        text DEFAULT 'published';`);
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS link_url      text DEFAULT '';`);
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS category_id   bigint;`);
L.push(`ALTER TABLE products  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();`);
L.push(`ALTER TABLE partners  ADD COLUMN IF NOT EXISTS slug          text DEFAULT '';`);
L.push(`ALTER TABLE partners  ADD COLUMN IF NOT EXISTS excerpt       text DEFAULT '';`);
L.push(`ALTER TABLE partners  ADD COLUMN IF NOT EXISTS content       text DEFAULT '';`);
L.push(`ALTER TABLE partners  ADD COLUMN IF NOT EXISTS thumbnail_url text DEFAULT '';`);
L.push(`ALTER TABLE projects  ADD COLUMN IF NOT EXISTS status        text DEFAULT 'published';`);
L.push('');

L.push('-- ---------- 2) DỌN SLUG RỖNG/TRÙNG TRƯỚC KHI TẠO UNIQUE INDEX ----------');
for (const t of ['posts', 'products', 'projects', 'partners']) {
  const nameCol = (t === 'products' || t === 'partners') ? 'name' : 'title';
  L.push(`UPDATE ${t} SET slug = 'auto-' || id WHERE slug IS NULL OR btrim(slug) = '';`);
  L.push(`UPDATE ${t} a SET slug = a.slug || '-' || a.id`);
  L.push(`  WHERE EXISTS (SELECT 1 FROM ${t} b WHERE b.slug = a.slug AND b.id < a.id);`);
  L.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${t}_slug_uidx ON ${t} (slug);`);
  L.push('');
}

function emit(table, rows, cols, build) {
  if (!rows.length) return;
  L.push(`-- ---------- ${table.toUpperCase()} (${rows.length} bản ghi) ----------`);
  const CHUNK = 25;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    L.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES`);
    L.push(part.map(r => '  (' + build(r).join(', ') + ')').join(',\n') + ';');
    L.push('');
  }
  // cập nhật lại bằng ON CONFLICT: viết lại thành upsert
}

// posts
if (buckets.posts.length) {
  L.push(`-- ---------- 3) POSTS — Bài viết (${buckets.posts.length}) ----------`);
  const CH = 20;
  for (let i = 0; i < buckets.posts.length; i += CH) {
    const part = buckets.posts.slice(i, i + CH);
    L.push('INSERT INTO posts (title, slug, excerpt, content, thumbnail_url, tags, status, display_order, is_active) VALUES');
    L.push(part.map((r, k) =>
      `  (${q(r.title)}, ${q(r.slug)}, ${q(r.excerpt)}, ${q(r.content)}, ${q(r.thumb)}, ${q('tin-tuc')}, 'published', ${i + k}, true)`
    ).join(',\n'));
    L.push('ON CONFLICT (slug) DO UPDATE SET');
    L.push('  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,');
    L.push('  thumbnail_url = EXCLUDED.thumbnail_url, status = EXCLUDED.status, is_active = true, updated_at = now();');
    L.push('');
  }
}

// products
if (buckets.products.length) {
  L.push(`-- ---------- 4) PRODUCTS — Sản phẩm (${buckets.products.length}) ----------`);
  const CH = 20;
  for (let i = 0; i < buckets.products.length; i += CH) {
    const part = buckets.products.slice(i, i + CH);
    L.push('INSERT INTO products (name, slug, description, excerpt, content, thumbnail_url, status, display_order, is_active) VALUES');
    L.push(part.map((r, k) =>
      `  (${q(r.title)}, ${q(r.slug)}, ${q(r.excerpt)}, ${q(r.excerpt)}, ${q(r.content)}, ${q(r.thumb)}, 'published', ${i + k}, true)`
    ).join(',\n'));
    L.push('ON CONFLICT (slug) DO UPDATE SET');
    L.push('  name = EXCLUDED.name, description = EXCLUDED.description, excerpt = EXCLUDED.excerpt,');
    L.push('  content = EXCLUDED.content, thumbnail_url = EXCLUDED.thumbnail_url, is_active = true, updated_at = now();');
    L.push('');
  }
}

// projects
if (buckets.projects.length) {
  L.push(`-- ---------- 5) PROJECTS — Dự án (${buckets.projects.length}) ----------`);
  L.push('INSERT INTO projects (title, slug, excerpt, content, thumbnail_url, display_order, is_active) VALUES');
  L.push(buckets.projects.map((r, k) =>
    `  (${q(r.title)}, ${q(r.slug)}, ${q(r.excerpt)}, ${q(r.content)}, ${q(r.thumb)}, ${k}, true)`
  ).join(',\n'));
  L.push('ON CONFLICT (slug) DO UPDATE SET');
  L.push('  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,');
  L.push('  thumbnail_url = EXCLUDED.thumbnail_url, is_active = true, updated_at = now();');
  L.push('');
}

// partners
if (buckets.partners.length) {
  L.push(`-- ---------- 6) PARTNERS — Khách hàng & Nhà cung cấp (${buckets.partners.length}) ----------`);
  L.push('INSERT INTO partners (name, slug, excerpt, content, logo_url, thumbnail_url, display_order, is_active) VALUES');
  L.push(buckets.partners.map((r, k) =>
    `  (${q(r.title)}, ${q(r.slug)}, ${q(r.excerpt)}, ${q(r.content)}, ${q(r.thumb)}, ${q(r.thumb)}, ${k}, true)`
  ).join(',\n'));
  L.push('ON CONFLICT (slug) DO UPDATE SET');
  L.push('  name = EXCLUDED.name, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,');
  L.push('  logo_url = EXCLUDED.logo_url, thumbnail_url = EXCLUDED.thumbnail_url, is_active = true;');
  L.push('');
}

L.push('-- ---------- 7) PHÂN QUYỀN ĐỌC CHO ANON (dashboard + website) ----------');
L.push('GRANT SELECT ON posts, products, projects, partners TO anon, authenticated;');
L.push('');
L.push('COMMIT;');
L.push('');
L.push("NOTIFY pgrst, 'reload schema';");
L.push('');
L.push('-- ---------- KIỂM CHỨNG ----------');
L.push("SELECT 'posts' AS bang, count(*) FROM posts");
L.push("UNION ALL SELECT 'products', count(*) FROM products");
L.push("UNION ALL SELECT 'projects', count(*) FROM projects");
L.push("UNION ALL SELECT 'partners', count(*) FROM partners;");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, L.join('\n'), 'utf8');

console.log('\n===== KẾT QUẢ =====');
console.log(`📝 posts    : ${buckets.posts.length}`);
console.log(`📦 products : ${buckets.products.length}`);
console.log(`🏗️  projects : ${buckets.projects.length}`);
console.log(`🤝 partners : ${buckets.partners.length}`);
console.log(`⚠️  bỏ qua   : ${skipped}`);
if (skipLog.length) skipLog.slice(0, 20).forEach(s => console.log('   · ' + s));
console.log(`\n✅ Đã ghi: ${OUT_FILE}`);
console.log(`   Dung lượng: ${(fs.statSync(OUT_FILE).size / 1024).toFixed(1)} KB`);
