/**
 * Vá thumbnail sản phẩm hỏng (CDN chết /https://..., .html, emoji FB, rỗng).
 * Chạy: node scripts/fix-product-thumbnails.js
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

if (!URL || !KEY) {
  console.error('Thiếu SUPABASE URL hoặc SERVICE KEY trong .env.local');
  process.exit(1);
}

function assetUrl(u) {
  let v = String(u || '').trim();
  if (!v) return '';
  v = v.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  const fixed = v.replace(/^\/+(https?:)/i, '$1');
  if (/^(https?:|data:|blob:)/i.test(fixed)) return fixed;
  if (fixed.startsWith('/')) return fixed;
  return `/${fixed}`;
}

const UNTRUSTED =
  /(vacdn\.link|static\.xx\.fbcdn\.net|emoji\.php|uphinhnhanh\.com|rongbaycdn\.com|nhadepkientruc\.com)/i;

function isTrusted(u) {
  const v = assetUrl(u);
  if (!v) return false;
  if (/\.html?($|\?|#)/i.test(v)) return false;
  if (UNTRUSTED.test(v)) return false;
  if (v.startsWith('/images/') || v.startsWith('/hpm/') || v.startsWith('/uploads/')) return true;
  if (v.includes('/storage/v1/object/')) return true;
  return false;
}

function fileExists(webPath) {
  const rel = decodeURIComponent(webPath.replace(/^\//, '').split('?')[0]);
  return fs.existsSync(path.join(PUBLIC, rel));
}

/** Map id → ảnh local đã xác nhận tồn tại (từ HTML gốc / sản phẩm cùng loại) */
const MANUAL_FIXES = {
  // Cống hộp TCVN 9116 — og:image + thumb trang p90
  24: '/images/attachment/thumb/6331conghopdoi-(2).jpg',
  // Video không có ảnh → tắt khỏi carousel (is_active=false)
  19: null,
  26: null,
  // Emoji FB làm thumbnail → ảnh hố ga local
  41: '/hpm/images/Upload/images/conghopbetongphuongbac.jpg',
  // CDN ngoài / .html
  48: '/hpm/images/Upload/images/cong-hop-be-tong-duc-san%20(1).jpg',
  61: '/images/attachment/thumb/4547dsc_2303.jpg',
  62: '/images/attachment/thumb/4547dsc_2303.jpg',
  74: '/hpm/images/Upload/images/cong-tron-be-tong%20(15).jpg',
};

function findOgImageFromHtml(slugOrName) {
  const needle = String(slugOrName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  if (!needle || needle.length < 6) return null;
  const dirs = [path.join(PUBLIC, 'index.php'), PUBLIC];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
    } catch {
      continue;
    }
    const hit = files.find((f) => f.toLowerCase().includes(needle.slice(0, 24)));
    if (!hit) continue;
    const html = fs.readFileSync(path.join(dir, hit), 'utf8');
    const m =
      html.match(/og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/id="zoom_01"[^>]*src=["']([^"']+)["']/i) ||
      html.match(/attachment\/thumb\/[^"'\s>]+\.(?:jpe?g|png|webp)/i);
    if (!m) continue;
    let src = m[1] || m[0];
    src = src.replace(/^\.\.\//, '/').replace(/^\/\.\.\//, '/');
    if (!src.startsWith('/')) src = '/' + src.replace(/^\.\//, '');
    // Chuẩn hoá ../images → /images
    src = src.replace(/^\/+images\//, '/images/');
    if (fileExists(src) || fileExists(decodeURIComponent(src))) return assetUrl(src);
  }
  return null;
}

async function sb(pathname, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${pathname}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${res.status} ${pathname}: ${text.slice(0, 300)}`);
  return data;
}

async function main() {
  const products = await sb('products?select=id,name,slug,thumbnail_url,is_active&order=id.asc');
  console.log(`Tổng sản phẩm: ${products.length}`);

  const bad = products.filter((p) => !isTrusted(p.thumbnail_url));
  console.log(`Thumbnail không tin cậy: ${bad.length}`);

  let fixed = 0;
  let deactivated = 0;

  for (const p of bad) {
    let next = MANUAL_FIXES[p.id];
    if (next === undefined) {
      next = findOgImageFromHtml(p.slug) || findOgImageFromHtml(p.name);
    }

    if (next === null) {
      // Video / không có ảnh — tắt để không vào carousel
      await sb(`products?id=eq.${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
      });
      console.log(`OFF  #${p.id} ${(p.name || '').slice(0, 50)}`);
      deactivated++;
      continue;
    }

    if (!next) {
      console.log(`SKIP #${p.id} chưa có fallback — ${(p.name || '').slice(0, 50)}`);
      continue;
    }

    // Encode space nếu path có khoảng trắng chưa encode
    if (next.includes(' ') && !next.includes('%20')) {
      next = next.replace(/ /g, '%20');
    }

    const checkPath = next.includes('%') ? decodeURIComponent(next) : next;
    if (!fileExists(checkPath) && !next.includes('/storage/')) {
      console.log(`MISS #${p.id} file không tồn tại: ${next}`);
      continue;
    }

    await sb(`products?id=eq.${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        thumbnail_url: next,
        updated_at: new Date().toISOString(),
      }),
    });
    console.log(`FIX  #${p.id} → ${next}`);
    fixed++;
  }

  // Quét lại: mọi /https:// còn sót trong thumbnail
  const again = await sb('products?select=id,name,thumbnail_url&order=id.asc');
  const stillBad = again.filter((p) => !isTrusted(p.thumbnail_url) && p.thumbnail_url);
  console.log('---');
  console.log(`Đã sửa thumbnail: ${fixed}`);
  console.log(`Đã tắt (không ảnh): ${deactivated}`);
  console.log(`Còn nghi ngờ: ${stillBad.length}`);
  stillBad.forEach((p) => console.log(`  #${p.id} ${p.thumbnail_url}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
