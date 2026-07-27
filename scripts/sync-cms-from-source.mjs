/**
 * Đồng bộ / sửa dữ liệu CMS từ mã nguồn + sửa logo đối tác hỏng.
 *
 * Chạy:
 *   node scripts/sync-cms-from-source.mjs
 *
 * Đọc .env.local (SUPABASE_SERVICE_KEY + NEXT_PUBLIC_SUPABASE_URL).
 * KHÔNG dùng publishable/anon key để ghi.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://bfruxinvvvaqufghtigw.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!SERVICE_KEY || SERVICE_KEY.startsWith('sb_publishable_') || SERVICE_KEY.includes('anon')) {
  console.error('❌ Cần SUPABASE_SERVICE_KEY (service_role) trong .env.local — không dùng publishable/anon.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PARTNER_LOGO_MAP = [
  { match: /ecopark|ecopack/i, logo: '/images/partner/732ecopark.jpg' },
  { match: /vinaconex/i, logo: '/images/partner/8451logovinaconex.jpg' },
  { match: /\bvin\b|vinschool|vingroup/i, logo: '/images/partner/4989vin.png' },
  { match: /trung\s*nam/i, logo: '/images/partner/5159trung-nam.png' },
  { match: /vietin|vietinbank/i, logo: '/images/partner/7007vietinbank.png' },
  { match: /\bhud\b/i, logo: '/images/partner/709hud-logo-2.jpg' },
];

function resolvePartnerLogo(name, current) {
  const raw = (current || '').trim();
  const fixed = raw.replace(/^\/+(https?:)/i, '$1');
  if (fixed && !/\.html?($|\?|#)/i.test(fixed)) {
    if (
      fixed.startsWith('/images/') ||
      fixed.includes('supabase') ||
      /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(fixed)
    ) {
      return fixed.startsWith('http') || fixed.startsWith('/') ? fixed : `/${fixed}`;
    }
  }
  for (const rule of PARTNER_LOGO_MAP) {
    if (rule.match.test(name)) return rule.logo;
  }
  return '';
}

function isValidAssetUrl(u) {
  const v = (u || '').trim().replace(/^\/+(https?:)/i, '$1');
  if (!v) return false;
  if (/\.html?($|\?|#)/i.test(v)) return false;
  if (/^https?:\/\/[^/]+\/?$/i.test(v)) return false;
  if (/\.(png|jpe?g|webp|gif|svg|avif)($|\?)/i.test(v)) return true;
  if (v.startsWith('/images/') || v.startsWith('/hpm/') || v.startsWith('/uploads/')) return true;
  if (v.includes('/storage/v1/object/')) return true;
  if (v.startsWith('data:image/')) return true;
  return false;
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

async function repairPartners() {
  console.log('\n🔧 Sửa partners…');
  const { data, error } = await supabase.from('partners').select('*');
  if (error) throw error;
  let fixed = 0;
  let deactivated = 0;
  for (const p of data || []) {
    const nextLogo = resolvePartnerLogo(p.name || '', p.logo_url);
    const patch = {};
    if (nextLogo !== (p.logo_url || '')) {
      patch.logo_url = nextLogo || null;
      fixed++;
    }
    const ok = isValidAssetUrl(nextLogo || p.logo_url);
    if (!ok && p.is_active) {
      patch.is_active = false;
      deactivated++;
    } else if (ok && !p.is_active && nextLogo) {
      patch.is_active = true;
    }
    if (Object.keys(patch).length) {
      const { error: e } = await supabase
        .from('partners')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', p.id);
      if (e) console.error('  ❌', p.name, e.message);
      else console.log(`  ✅ ${p.name} → logo=${patch.logo_url ?? '(giữ)'} active=${patch.is_active ?? p.is_active}`);
    }
  }
  console.log(`  → fixed=${fixed}, deactivated=${deactivated}, total=${(data || []).length}`);
}

async function syncProjectsFromIndex() {
  console.log('\n📦 Đồng bộ projects từ public/index.html (chỉ bổ sung thiếu, không xóa)…');
  const indexPath = path.join(PUBLIC, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('  (không có index.html — bỏ qua)');
    return;
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  // Khối .list_project: title + excerpt + img
  const items = [];
  const blockRe =
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (!title) continue;
    items.push({
      title,
      slug: slugify(title),
      thumbnail_url: m[1].startsWith('/') ? m[1] : `/${m[1]}`,
      excerpt: m[3].replace(/<[^>]+>/g, '').trim().slice(0, 500),
      is_active: true,
      status: 'published',
      display_order: items.length,
    });
  }

  const { data: existing } = await supabase.from('projects').select('id,slug,title');
  const bySlug = new Map((existing || []).map((r) => [r.slug, r]));
  let inserted = 0;
  for (const item of items) {
    if (bySlug.has(item.slug)) continue;
    // Không tự insert thêm nếu DB đã cố ý chỉ còn 1 dự án — chỉ log
    console.log(`  ℹ️  HTML có dự án chưa có trong DB: ${item.title} (${item.slug}) — bỏ qua (giữ đúng dữ liệu Admin)`);
  }
  console.log(`  → HTML projects=${items.length}, DB=${(existing || []).length}, inserted=${inserted}`);
  console.log('  (Nguyên tắc: Super Admin là nguồn sự thật — script KHÔNG ghi đè số dự án đã xóa)');
}

async function countTables() {
  console.log('\n📊 Đếm bảng CMS:');
  const tables = [
    'site_settings',
    'menus',
    'categories',
    'slides',
    'products',
    'posts',
    'projects',
    'partners',
    'testimonials',
    'videos',
    'photos',
    'links',
  ];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(`  ❌ ${t}: ${error.message}`);
    else console.log(`  • ${t}: ${count}`);
  }
  const { count: activeProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  const { count: activePartners } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  console.log(`\n  ✅ projects active = ${activeProjects} (trang chủ chỉ hiện số này)`);
  console.log(`  ✅ partners active = ${activePartners} (chỉ hiện khi có logo hợp lệ)`);
}

async function main() {
  console.log('🚀 sync-cms-from-source');
  console.log('   URL:', SUPABASE_URL);
  await repairPartners();
  await syncProjectsFromIndex();
  await countTables();
  console.log('\n✅ Xong. Mở Super Admin → Dashboard → “Sửa logo đối tác + Đồng bộ site” nếu cần revalidate Next cache.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
