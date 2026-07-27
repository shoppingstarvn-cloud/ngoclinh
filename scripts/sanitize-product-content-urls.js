/**
 * Dọn URL CDN chết (/https://vacdn..., fbcdn emoji...) trong content sản phẩm.
 * Chạy: node scripts/sanitize-product-content-urls.js
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

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!URL || !KEY) {
  console.error('Thiếu env');
  process.exit(1);
}

const BAD_HOST =
  /(vacdn\.link|static\.xx\.fbcdn\.net|emoji\.php|uphinhnhanh\.com|rongbaycdn\.com)/i;

/** id → ảnh local thay thế khi content chứa CDN chết */
const FALLBACK_BY_ID = {
  24: '/images/attachment/6331conghopdoi-(2).jpg',
};

async function sb(pathname, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${pathname}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

function sanitizeHtml(html, fallbackImg) {
  if (!html) return { html, changed: false };
  let out = html;
  let changed = false;

  // ../https://... hoặc /https://... → https://...
  const beforeNorm = out;
  out = out.replace(/(?:\.\.\/)+https?:/gi, 'https:');
  out = out.replace(/\/+(https?:)/gi, '$1');
  if (out !== beforeNorm) changed = true;

  // Thay src trỏ host chết bằng ảnh local (nếu có)
  out = out.replace(/src=(["'])([^"']+)\1/gi, (full, q, src) => {
    if (!BAD_HOST.test(src)) return full;
    changed = true;
    if (fallbackImg) return `src=${q}${fallbackImg}${q}`;
    // Gỡ ảnh chết hoàn toàn
    return `src=${q}${q} data-removed-dead-cdn="1"`;
  });

  return { html: out, changed };
}

async function main() {
  const rows = await sb('products?select=id,name,content&order=id.asc');
  let n = 0;
  for (const p of rows) {
    const hasBad =
      BAD_HOST.test(p.content || '') ||
      /\/https?:/i.test(p.content || '') ||
      /\.\.\/https?:/i.test(p.content || '');
    if (!hasBad) continue;

    const { html, changed } = sanitizeHtml(p.content, FALLBACK_BY_ID[p.id] || null);
    if (!changed) continue;

    await sb(`products?id=eq.${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: html, updated_at: new Date().toISOString() }),
    });
    console.log(`SANITIZE #${p.id} ${(p.name || '').slice(0, 50)}`);
    n++;
  }
  console.log(`Done. Sanitized ${n} products.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
