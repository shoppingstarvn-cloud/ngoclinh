/**
 * Seed khối slide liên hệ KD (comment_home) từ HTML cũ.
 * Chạy: node scripts/seed-testimonials-sales.js
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

if (!URL || !KEY) {
  console.error('Thiếu SUPABASE URL hoặc SERVICE KEY trong .env.local');
  process.exit(1);
}

const ROWS = [
  {
    name: 'Mr Minh Hoàng',
    title: 'GĐ Phụ Trách KD',
    phone: '',
    content:
      'Quý khách có nhu cầu về cống bê tông hãy liên hệ cho chúng tôi để được tư vấn những sản phẩm tốt nhất!',
    avatar_url: '/images/comment/8751246x0w.jpg',
    rating: 5,
    display_order: 0,
    is_active: true,
  },
  {
    name: 'Mr Nguyễn Ngọc Hiển',
    title: 'Kinh doanh Cống bê tông và gioăng cao su',
    phone: '0985547136',
    content: 'Cung cấp các loại gioăng cao su cho các mối nối cống tròn, cống hộp',
    avatar_url: '/images/comment/6960call.png',
    rating: 5,
    display_order: 1,
    is_active: true,
  },
  {
    name: 'Đinh Thượng Hải',
    title: 'TP Kinh doanh cống bê tông',
    phone: '0866622123',
    content:
      'Quý khách quan tâm đến cống bê tông đúc sẵn vui lòng liên hệ với chúng tôi để được tư vấn tốt nhất!',
    avatar_url: '/images/comment/2558246x0w.jpg',
    rating: 5,
    display_order: 2,
    is_active: true,
  },
];

async function rest(method, pathname, body) {
  const res = await fetch(`${URL}/rest/v1/${pathname}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' ? JSON.stringify(data) : String(data));
    err.status = res.status;
    throw err;
  }
  return data;
}

function pickPayload(row, columns) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (columns.has(k)) out[k] = v;
  }
  // Fallback: gộp title + phone vào name nếu thiếu cột (giống h3 HTML cũ)
  if (!columns.has('title') && !columns.has('phone')) {
    const parts = [row.name];
    if (row.title) parts.push(row.title);
    if (row.phone) parts.push(row.phone);
    out.name = parts.join(' - ');
  } else if (!columns.has('title') && row.title) {
    out.name = `${row.name} - ${row.title}${row.phone ? ` - ${row.phone}` : ''}`;
  }
  if (!columns.has('content') && columns.has('customer_name')) {
    // schema cũ khác
    out.customer_name = out.name || row.name;
    delete out.name;
  }
  return out;
}

async function detectColumns() {
  // Thử insert probe rồi rollback bằng delete — hoặc đọc OpenAPI
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const schema = await res.json();
  const defs = schema?.definitions?.testimonials?.properties;
  if (defs) return new Set(Object.keys(defs));
  // Fallback: giả định schema CMS hiện tại
  return new Set([
    'id',
    'name',
    'title',
    'phone',
    'avatar_url',
    'content',
    'rating',
    'display_order',
    'is_active',
    'created_at',
    'updated_at',
  ]);
}

async function ensureOptionalColumns() {
  // Không chạy DDL qua REST — nếu thiếu title/phone thì gộp vào name.
}

async function main() {
  console.log('URL:', URL);
  const existing = await rest('GET', 'testimonials?select=*&order=display_order.asc');
  console.log('Hiện có:', Array.isArray(existing) ? existing.length : existing);

  const columns = await detectColumns();
  console.log('Cột testimonials:', [...columns].join(', '));

  // Xóa bản ghi seed cũ (cùng avatar) rồi insert lại để idempotent
  for (const row of ROWS) {
    if (columns.has('avatar_url')) {
      await rest(
        'DELETE',
        `testimonials?avatar_url=eq.${encodeURIComponent(row.avatar_url)}`,
      );
    }
  }

  const payloads = ROWS.map((r) => pickPayload(r, columns));
  let inserted;
  try {
    inserted = await rest('POST', 'testimonials', payloads);
  } catch (e1) {
    console.warn('Insert full payload lỗi, thử gộp name:', e1.message);
    const fallback = ROWS.map((r) => {
      const parts = [r.name];
      if (r.title) parts.push(r.title);
      if (r.phone) parts.push(r.phone);
      const base = {
        name: parts.join(' - '),
        content: r.content,
        avatar_url: r.avatar_url,
        rating: 5,
        display_order: r.display_order,
        is_active: true,
      };
      return pickPayload(base, columns);
    });
    inserted = await rest('POST', 'testimonials', fallback);
  }

  console.log('Đã seed:', Array.isArray(inserted) ? inserted.length : inserted);
  const after = await rest('GET', 'testimonials?select=id,name,avatar_url,is_active,display_order&order=display_order.asc');
  console.log(JSON.stringify(after, null, 2));
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
