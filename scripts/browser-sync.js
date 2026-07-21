/* ============================================================
 * BROWSER-SYNC.JS — Đồng bộ TOÀN BỘ bài viết website vào Dashboard
 *
 * CÁCH DÙNG:
 *   1. Chạy sql/01_SCHEMA_UPGRADE.sql trên Supabase SQL Editor trước.
 *   2. Mở https://webbetonglammau.vercel.app/admin.html, ĐĂNG NHẬP super admin.
 *   3. Bấm F12 -> tab Console -> dán TOÀN BỘ file này -> Enter.
 *   4. Chờ chạy xong, xem bảng tổng kết, rồi bấm "Tải lại" trên dashboard.
 *
 * Script tự dò trang, tự phân loại, tự chống trùng (so theo slug).
 * Chạy lại nhiều lần đều an toàn: đã có thì CẬP NHẬT, chưa có thì THÊM MỚI.
 * ============================================================ */
(async () => {
  'use strict';

  // ---------- 0) Kiểm tra đăng nhập ----------
  const TOKEN = (typeof authToken !== 'undefined' && authToken) ? authToken : null;
  if (!TOKEN) {
    console.error('❌ Chưa đăng nhập. Hãy đăng nhập super admin rồi chạy lại script này.');
    return;
  }
  console.log('%c🚀 BẮT ĐẦU ĐỒNG BỘ TOÀN BỘ NỘI DUNG WEBSITE', 'font-size:15px;font-weight:bold;color:#0a0');

  // ---------- 1) Tiện ích ----------
  const noAccent = s => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');

  const slugify = s => noAccent(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Đường dẫn tuyệt đối cho ảnh/link, tính theo trang gốc
  const absUrl = (src, baseHref) => {
    if (!src) return '';
    src = String(src).trim();
    if (/^data:/i.test(src)) return '';
    try { return new URL(src, new URL(baseHref, location.origin)).pathname; }
    catch { return ''; }
  };

  // ---------- 2) Dò toàn bộ trang chi tiết ----------
  // Seed: các trang danh sách của website. Từ đây bò ra mọi trang -p<n> / -n<n>.
  const SEEDS = [
    '/index.html', '/cong-tron-c53.html', '/cong-hop--c54.html', '/cong-hop-doi-c55.html',
    '/cong-be-tong-c46.html', '/ho-ga-duc-san-c48.html', '/cau-thang-duc-san-c49.html',
    '/tam-tuong-be-tong-acotec-c47.html', '/cac-san-pham-cau-kien-be-tong-duc-san-c50.html',
    '/tin-tuc-l2.html', '/du-an-l7.html', '/du-an-a3.html',
    '/khach-hang-l10.html', '/nha-cung-cap-l8.html',
    '/index.php/cac-san-pham-khac-c51.html', '/index.php/coc-van-cu-be-tong-du-ung-luc-c59.html',
    '/index.php/de-cong-(goi-do-cong)-c60.html', '/index.php/gioang-cao-su-c58.html'
  ];

  const DETAIL_RE = /-(p|n)\d+\.html$/i;
  const detailSet = new Map();   // path -> true
  const visited = new Set();
  const queue = [...SEEDS];

  const fetchText = async (url) => {
    const r = await fetch(url, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  };

  console.log('🔎 Đang dò danh sách trang chi tiết...');
  while (queue.length) {
    const url = queue.shift();
    const key = url.split('?')[0];
    if (visited.has(key)) continue;
    visited.add(key);

    let html;
    try { html = await fetchText(url); } catch { continue; }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href') || '';
      if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(raw)) return;
      let p;
      try { p = new URL(raw, new URL(url, location.origin)).pathname; } catch { return; }
      if (!/\.html$/i.test(p)) return;

      if (DETAIL_RE.test(p)) {
        detailSet.set(decodeURI(p), p);
      } else if (/-(c|l|a)\d+\.html$/i.test(p) && !visited.has(p) && visited.size < 80) {
        queue.push(p);   // trang danh mục -> bò tiếp
      }
    });
  }

  const details = [...detailSet.values()];
  console.log(`✅ Tìm thấy ${details.length} trang chi tiết.`);
  if (!details.length) { console.error('❌ Không dò được trang nào. Dừng.'); return; }

  // ---------- 3) Phân loại ----------
  const classify = (p) => {
    const d = decodeURI(p).toLowerCase();
    if (d.includes('/tin-tuc/') || d.includes('/tin-chuyen-nganh/') || d.includes('/tin-tuyen-dung')) return 'posts';
    if (d.includes('/du-an/')) return 'projects';
    if (d.includes('/khach-hang/') || d.includes('/nha-cung-cap/')) return 'partners';
    if (/-p\d+\.html$/i.test(d)) return /bao-?gia/.test(noAccent(d)) ? 'posts' : 'products';
    return 'posts';
  };

  // ---------- 4) Bóc nội dung từng trang ----------
  console.log('📖 Đang bóc nội dung...');
  const items = [];
  const seen = new Set();
  let readFail = 0;

  for (let i = 0; i < details.length; i++) {
    const p = details[i];
    let html;
    try { html = await fetchText(p); } catch { readFail++; continue; }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = (doc.querySelector('h1')?.textContent || doc.title || '').replace(/\s+/g, ' ').trim();

    let box = doc.querySelector('.detail_product');
    let brief = '';
    if (!box) {
      box = doc.querySelector('.content_news_page');
      brief = (doc.querySelector('.brief_news_page')?.textContent || '').replace(/\s+/g, ' ').trim();
      if (!box) box = doc.querySelector('.news_page');
    }
    if (!title || !box) { readFail++; continue; }

    // chuẩn hoá ảnh + link nội bộ về đường dẫn tuyệt đối
    box.querySelectorAll('img').forEach(img => {
      const a = absUrl(img.getAttribute('src'), p);
      if (a) img.setAttribute('src', a);
      img.removeAttribute('width'); img.removeAttribute('height');
    });
    box.querySelectorAll('a[href]').forEach(a => {
      const raw = a.getAttribute('href') || '';
      if (/^(https?:|mailto:|tel:|#)/i.test(raw)) return;
      const u = absUrl(raw, p);
      if (u) a.setAttribute('href', u);
    });

    const content = (box.innerHTML || '').trim();
    if (!content) { readFail++; continue; }
    const excerpt = (brief || box.textContent.replace(/\s+/g, ' ').trim()).slice(0, 300);
    const thumb = absUrl(box.querySelector('img')?.getAttribute('src'), p);

    const kind = classify(p);
    const base = slugify(title) || slugify(p.split('/').pop().replace(/\.html$/i, ''));
    const code = (p.match(/-((?:p|n)\d+)\.html$/i) || [])[1]?.toLowerCase() || '';
    let slug = base;
    if (seen.has(kind + '|' + slug)) slug = (base + '-' + code).slice(0, 120);
    let n = 2;
    while (seen.has(kind + '|' + slug)) { slug = (base + '-' + code + '-' + n).slice(0, 120); n++; }
    seen.add(kind + '|' + slug);

    items.push({ kind, title, slug, excerpt, content, thumb, src: p });
    if ((i + 1) % 20 === 0) console.log(`   ...đã đọc ${i + 1}/${details.length}`);
  }

  console.log(`✅ Bóc được ${items.length} bản ghi (lỗi đọc: ${readFail}).`);

  // ---------- 5) Lấy dữ liệu hiện có để biết THÊM hay CẬP NHẬT ----------
  const api = async (method, path, body) => {
    const r = await fetch(path, {
      method,
      headers: Object.assign({ Authorization: TOKEN }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    return r.json();
  };

  const existing = {};
  for (const t of ['posts', 'products', 'projects', 'partners']) {
    const r = await api('GET', `/api/admin/${t}?limit=1000`);
    const rows = r.data || r || [];
    existing[t] = new Map((Array.isArray(rows) ? rows : []).map(x => [x.slug, x.id]));
    console.log(`   · ${t}: hiện có ${existing[t].size} bản ghi`);
  }

  // ---------- 6) Ghi lên Supabase qua API admin ----------
  const rowFor = (it, order) => {
    if (it.kind === 'products') return {
      name: it.title, slug: it.slug, description: it.excerpt, excerpt: it.excerpt,
      content: it.content, thumbnail_url: it.thumb, status: 'published',
      display_order: order, is_active: true
    };
    if (it.kind === 'partners') return {
      name: it.title, slug: it.slug, excerpt: it.excerpt, content: it.content,
      logo_url: it.thumb, thumbnail_url: it.thumb,
      kind: it.src.includes('/nha-cung-cap/') ? 'nha-cung-cap' : 'khach-hang',
      display_order: order, is_active: true
    };
    if (it.kind === 'projects') return {
      title: it.title, slug: it.slug, excerpt: it.excerpt, content: it.content,
      thumbnail_url: it.thumb, status: 'published', display_order: order, is_active: true
    };
    return {   // posts
      title: it.title, slug: it.slug, excerpt: it.excerpt, content: it.content,
      thumbnail_url: it.thumb, tags: 'tin-tuc', status: 'published',
      display_order: order, is_active: true
    };
  };

  const stats = { added: 0, updated: 0, failed: 0 };
  const errors = [];

  console.log('💾 Đang ghi lên Supabase...');
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const row = rowFor(it, i);
    const id = existing[it.kind].get(it.slug);
    try {
      const res = id
        ? await api('PUT', `/api/admin/${it.kind}/${id}`, row)
        : await api('POST', `/api/admin/${it.kind}`, row);
      if (res && res.success === false) throw new Error(res.error || 'unknown');
      if (id) stats.updated++; else stats.added++;
    } catch (e) {
      stats.failed++;
      errors.push(`${it.kind} | ${it.slug} -> ${e.message}`);
    }
    if ((i + 1) % 20 === 0) { console.log(`   ...đã ghi ${i + 1}/${items.length}`); await sleep(120); }
  }

  // ---------- 7) Tổng kết ----------
  const byKind = items.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {});
  console.log('%c===== HOÀN TẤT =====', 'font-size:15px;font-weight:bold;color:#0a0');
  console.table(byKind);
  console.table(stats);
  if (errors.length) { console.warn('⚠️ Các lỗi gặp phải:'); errors.slice(0, 30).forEach(e => console.warn('   · ' + e)); }
  console.log('👉 Bấm nút "Tải lại" trên dashboard để thấy dữ liệu mới.');
})();
