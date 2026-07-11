// ============ REALTIME DATA SYNC - ADMIN <-> SUPABASE <-> WEBSITE ============
// Cơ chế AN TOÀN: Chỉ ghi đè hardcode KHI Supabase CÓ dữ liệu (tránh trang trắng)
// Bọc toàn bộ trong IIFE để biến cục bộ KHÔNG đụng global 'supabase' của thư viện CDN
// → triệt tiêu lỗi "Identifier 'supabase' has already been declared" và an toàn khi nạp lại.
(function () {
"use strict";
const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
// Lấy thư viện từ global rồi tạo client cục bộ (chỉ tạo 1 lần trong scope này)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


function reinitOwl(sel, opts) {
    if (window.jQuery && jQuery.fn.owlCarousel) {
        try { jQuery(sel).trigger('destroy.owl.carousel'); } catch(e){}
        jQuery(sel).owlCarousel(opts);
    }
}

// Link đích cho thẻ sản phẩm / danh mục: ưu tiên link_url (admin đặt), fallback slug.html.
// Luôn trả link tuyệt đối từ gốc để chạy đúng ở mọi độ sâu trang.
function itemHref(item) {
    const u = (item.link_url || '').trim();
    if (u) return /^(https?:|\/|#)/.test(u) ? u : '/' + u;
    if (item.slug) return '/' + item.slug + '.html';
    return '#';
}

// ============ 1. SLIDES (Dynamic 100% -> #slide-container) ============
async function loadSlides() {
    // Container động: ưu tiên #slide-container, fallback .slide-carousel
    const c = document.querySelector('#slide-container, .slide-carousel');
    if (!c) return;
    try {
        const { data } = await supabase
            .from('slides')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('id', { ascending: true })
            .limit(10);

        // XÓA SẠCH nội dung cũ (huỷ owl cũ trước khi vẽ lại) — đảm bảo realtime luôn mới nhất
        try { if (window.jQuery) jQuery(c).trigger('destroy.owl.carousel'); } catch(e){}
        c.innerHTML = '';

        if (!data || data.length === 0) return; // Không còn slide active -> để trống (đúng dữ liệu Supabase)

        // CHÈN LẠI các slide mới từ Supabase
        c.innerHTML = data.map(s => `
            <div class="item">
                <a href="${s.link_url || '#'}"><img src="${s.image_url}" alt="${s.title || 'Slide'}" /></a>
                ${s.title ? `<div><h3>${s.title}</h3><p>${s.subtitle || ''}</p></div>` : ''}
            </div>`).join('');

        // Khởi tạo lại carousel sau khi đã có dữ liệu thật
        reinitOwl('#slide-container', { loop: data.length > 1, autoplay:true, margin:0, responsiveClass:true, responsive:{0:{items:1,dots:true},1000:{items:1,dots:true}} });
    } catch(e) { console.error('[Slides]', e); }
}


// ============ 2. PRODUCTS ============
async function loadProducts() {
    try {
        const c = document.querySelector('.product-carousel');
        if (!c) return;
        const { data } = await supabase.from('products').select('*').eq('is_active', true).order('display_order').limit(15);
        if (!data || data.length === 0) {
            reinitOwl('.product-carousel', { loop:true, autoplay:true, margin:20, responsiveClass:true, responsive:{0:{items:1,dots:true},600:{items:2,dots:true},1000:{items:3,dots:true}} });
            return; // Giữ nội dung tĩnh + vẫn chạy carousel
        }
        // BỌC CẢ THẺ (ảnh + chữ) trong 1 link -> bấm bất kỳ đâu trên thẻ/ảnh đều nhảy đúng trang
        c.innerHTML = data.map(p => `
            <div class="item"><a href="${itemHref(p)}" title="${p.name}" style="display:block;position:relative;color:inherit;text-decoration:none">
                <dl>
                    <dt><img src="${p.thumbnail_url || 'images/placeholder.jpg'}" alt="${p.name}" title="${p.name}"></dt>
                    <dd><h3>${p.name}</h3>${p.price ? `<p class="price">${p.price}</p>` : ''}</dd>
                </dl>
            </a></div>`).join('');
        reinitOwl('.product-carousel', { loop:true, autoplay:true, margin:20, responsiveClass:true, responsive:{0:{items:1,dots:true},600:{items:2,dots:true},1000:{items:3,dots:true}} });
    } catch(e) { console.error('[Products]', e); }
}

// ============ 3. PARTNERS ============
async function loadPartners() {
    try {
        const c = document.querySelector('.partner-carousel');
        if (!c) return;
        const { data } = await supabase.from('partners').select('*').eq('is_active', true).order('display_order').limit(20);
        if (!data || data.length === 0) {
            reinitOwl('.partner-carousel', { loop:true, autoplay:true, margin:20, responsiveClass:true, responsive:{0:{items:2,dots:true},600:{items:3,dots:true},1000:{items:6,dots:true}} });
            return; // Giữ nội dung tĩnh + vẫn chạy carousel
        }
        c.innerHTML = data.map(p => `
            <div class="item"><a href="${p.website_url || '#'}" target="_blank" title="${p.name}"><img src="${p.logo_url}" alt="${p.name}"></a></div>`).join('');
        reinitOwl('.partner-carousel', { loop:true, autoplay:true, margin:20, responsiveClass:true, responsive:{0:{items:2,dots:true},600:{items:3,dots:true},1000:{items:6,dots:true}} });
    } catch(e) { console.error('[Partners]', e); }
}

// ============ 4. TESTIMONIALS ============
async function loadTestimonials() {
    try {
        const c = document.querySelector('.comment-carousel');
        if (!c) return;
        const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).order('display_order').limit(10);
        if (!data || data.length === 0) {
            reinitOwl('.comment-carousel', { loop:true, autoplay:true, autoplayTimeout:4000, margin:10, responsiveClass:true, nav:true, responsive:{0:{items:1,dots:true},1000:{items:2,nav:true,dots:true}} });
            return; // Giữ nội dung tĩnh + vẫn chạy carousel
        }
        c.innerHTML = data.map(t => `
            <div class="item"><div>
                ${t.avatar_url ? `<a><img src="${t.avatar_url}" alt="${t.name}"></a>` : ''}
                <h3>${t.name}</h3><div>${t.content}</div>
            </div></div>`).join('');
        reinitOwl('.comment-carousel', { loop:true, autoplay:true, autoplayTimeout:4000, margin:10, responsiveClass:true, nav:true, responsive:{0:{items:1,dots:true},1000:{items:2,nav:true,dots:true}} });
    } catch(e) { console.error('[Testimonials]', e); }
}

// ============ 5. POSTS / NEWS (Bài viết tin tức) ============
// Link bài viết tuyệt đối từ gốc (chạy đúng ở mọi độ sâu trang)
function postHref(slug) {
    if (!slug) return '#';
    if (/^(https?:|\/)/.test(slug)) return /\.html?$/i.test(slug) ? slug : slug + '.html';
    return '/' + slug + '.html';
}
async function loadNews() {
    try {
        const { data } = await supabase.from('posts').select('*').eq('is_active', true).eq('status', 'published').order('display_order').limit(30);
        if (!data || data.length === 0) return;

        // (a) Khối tin TRANG CHỦ (.news .list_news) — nếu có
        const big = document.querySelector('.news .list_news .big_item');
        const right = document.querySelector('.news .list_news .right');
        if (big && right) {
            const p0 = data[0];
            big.innerHTML = `<dl>
                <dt><div class="swing"><figure class="effect-v7"><a href="${postHref(p0.slug)}"><img src="${p0.thumbnail_url}" alt="${p0.title}" /></a></figure></div></dt>
                <dd><h3><a href="${postHref(p0.slug)}">${p0.title}</a></h3><p>${p0.excerpt || ''}</p>
                <a href="${postHref(p0.slug)}">Xem thêm</a><div class="clearfix"></div></dd>
            </dl>`;
            right.innerHTML = data.slice(1, 5).map(p => `
                <div class="col-6 item"><dl>
                    <dt><div class="swing"><figure class="effect-v7"><a href="${postHref(p.slug)}"><img src="${p.thumbnail_url}" alt="${p.title}" /></a></figure></div></dt>
                    <dd><h3><a href="${postHref(p.slug)}">${p.title}</a></h3><a href="${postHref(p.slug)}"></a></dd>
                </dl></div>`).join('');
        }

        // (b) Cột "TIN TỨC & SỰ KIỆN" bên phải (.news_box .slides) — nếu có
        const newsSlides = document.querySelector('.news_box .slides');
        if (newsSlides) {
            newsSlides.innerHTML = data.slice(0, 6).map(p => `
                <li><dl>
                    <dt><a href="${postHref(p.slug)}"><img src="${p.thumbnail_url}" alt="${p.title}" /></a></dt>
                    <dd><a href="${postHref(p.slug)}">${p.title}</a></dd>
                </dl></li>`).join('');
        }
    } catch(e) { console.error('[News]', e); }
}

// ============ 6. PROJECTS (Dự án - từ categories type=project hoặc posts) ============
async function loadProjects() {
    try {
        const { data } = await supabase.from('posts').select('*').eq('is_active', true).eq('status', 'published').order('display_order').limit(4);
        if (!data || data.length === 0) return;
        const c = document.querySelector('.project .list_project');
        if (!c) return;
        c.innerHTML = data.map(p => `
            <div class="col-12 col-md-6 item"><dl>
                <dt><div class="swing"><figure><a href="${p.slug}.html"><img src="${p.thumbnail_url}" alt="${p.title}" /></a></figure></div></dt>
                <dd><h3><a href="${p.slug}.html">${p.title}</a></h3><p>${p.excerpt || ''}</p><a href="${p.slug}.html"></a></dd>
                <div class="clearfix"></div>
            </dl></div>`).join('');
    } catch(e) { console.error('[Projects]', e); }
}

// ============ 7. MENUS (Menu điều hướng) ============
async function loadMenus() {
    try {
        const { data } = await supabase.from('menus').select('*').eq('is_active', true).order('display_order');
        if (!data || data.length === 0) return;
        // Build cây menu cha-con
        const roots = data.filter(m => !m.parent_id);
        const children = (pid) => data.filter(m => m.parent_id === pid);
        const buildLi = (m) => {
            const subs = children(m.id);
            return `<li><a href="${m.url || '#'}">${m.label}${subs.length ? ' <i class="fa fa-angle-down"></i>' : ''}</a>${subs.length ? `<ul>${subs.map(buildLi).join('')}</ul>` : ''}</li>`;
        };
        const html = roots.map(buildLi).join('');
        const pcMenu = document.querySelector('.header .menu ul');
        if (pcMenu) pcMenu.innerHTML = html;
        // Menu mobile (.menu-m) dùng cùng cây dữ liệu
        const mMenu = document.querySelector('.menu-m ul');
        if (mMenu) mMenu.innerHTML = html;
        // Đồng bộ CỘT DANH MỤC bên trái (trang sản phẩm) theo menu "Sản phẩm"
        syncProductSidebar(data, children);
    } catch(e) { console.error('[Menus]', e); }
}

// Đồng bộ cột "Danh mục" bên trái (.menuleft_box) = nhánh con của menu "Sản phẩm"
function syncProductSidebar(data, children) {
    const box = document.querySelector('.menuleft_box');
    if (!box) return;                       // trang không có cột danh mục -> bỏ qua
    const ul = box.querySelector('ul');
    if (!ul) return;
    // Tìm menu gốc "Sản phẩm" (khớp CHÍNH XÁC, tránh nhầm "Chứng nhận tiêu chuẩn sản phẩm")
    const norm = s => (s || '').trim().toLowerCase();
    let sanpham = data.find(m => !m.parent_id && norm(m.label) === 'sản phẩm');
    // Dự phòng: menu gốc dạng nhóm (url '#') có nhiều con nhất
    if (!sanpham) {
        const roots = data.filter(m => !m.parent_id && data.some(c => c.parent_id === m.id));
        sanpham = roots.sort((a, b) => data.filter(c => c.parent_id === b.id).length - data.filter(c => c.parent_id === a.id).length)[0];
    }
    if (!sanpham) return;
    const here = (location.pathname.split('/').pop() || '').toLowerCase();
    const toHref = (u) => (!u || /^(https?:|\/|#)/.test(u)) ? (u || '#') : ('/' + u);
    const buildLi = (m) => {
        const subs = children(m.id);
        const href = toHref(m.url);
        const active = (href.split('/').pop() || '').toLowerCase() === here && here ? ' active' : '';
        return `<li class="${active.trim()}"><a href="${href}"><i class="fa fa-long-arrow-right"></i> ${m.label}</a>${subs.length ? `<ul>${subs.map(buildLi).join('')}</ul>` : ''}</li>`;
    };
    ul.innerHTML = children(sanpham.id).map(buildLi).join('');
}

// ============ 8. CATEGORIES (Danh mục - service_home) ============
async function loadCategories() {
    try {
        const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order').limit(6);
        if (!data || data.length === 0) return;
        const c = document.querySelector('.service_home .row');
        if (!c) return;
        // BỌC CẢ THẺ danh mục trong 1 link -> bấm bất kỳ đâu trên ảnh đều nhảy đúng trang
        c.innerHTML = data.map(cat => `
            <div class="col-12 col-md-4 item_s"><a href="${itemHref(cat)}" title="${cat.name}" style="display:block;position:relative;color:inherit;text-decoration:none"><dl>
                <dt><img src="${cat.thumbnail_url || cat.image_url || 'images/placeholder.jpg'}" alt="${cat.name}"></dt>
                <dd><h3>${cat.name}</h3><div>${cat.description || ''}</div></dd>
            </dl></a></div>`).join('');
    } catch(e) { console.error('[Categories]', e); }
}

// ============ 9. VIDEOS (render vào #video-list nếu có) ============
async function loadVideos() {
    try {
        const { data } = await supabase.from('videos').select('*').eq('is_active', true).order('display_order').limit(12);
        if (!data || data.length === 0) return;
        const c = document.querySelector('#video-list, .video-list');
        if (!c) return;
        c.innerHTML = data.map(v => `
            <div class="col-12 col-md-4 item">
                <a href="${v.youtube_url || v.embed_url || '#'}" target="_blank">
                    <img src="${v.thumbnail_url}" alt="${v.title}">
                    <h3>${v.title}</h3>
                </a>
            </div>`).join('');
    } catch(e) { console.error('[Videos]', e); }
}

// ============ 10. PHOTOS (Thư viện ảnh -> #photo-list nếu có) ============
async function loadPhotos() {
    try {
        const { data } = await supabase.from('photos').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('id', { ascending: true }).limit(30);
        if (!data || data.length === 0) return;
        const c = document.querySelector('#photo-list, .photo-list, .gallery-list');
        if (!c) return;
        c.innerHTML = data.map(p => `
            <div class="col-6 col-md-3 item">
                <a href="${p.file_path}" target="_blank"><img src="${p.file_path}" alt="${p.title || ''}"></a>
            </div>`).join('');
    } catch(e) { console.error('[Photos]', e); }
}

// ============ 11. LINKS (Social/Footer) ============
async function loadLinks() {
    try {
        const { data } = await supabase.from('links').select('*').eq('is_active', true).order('display_order');
        if (!data || data.length === 0) return;
        const social = document.querySelector('.social');
        if (social) {
            const sLinks = data.filter(l => l.link_group === 'social');
            if (sLinks.length) social.innerHTML = sLinks.map(l => `<a href="${l.url}" target="_blank"><i class="${l.icon || 'fa fa-link'}"></i></a>`).join('');
        }
    } catch(e) { console.error('[Links]', e); }
}

// ============ 12. SITE SETTINGS (Tên site, hotline, địa chỉ, intro_text, footer, logo, favicon, meta) ============
async function loadSiteSettings() {
    try {
        const { data } = await supabase.from('site_settings').select('*');
        if (!data || data.length === 0) return;
        const cfg = {};
        data.forEach(s => cfg[s.key] = s.value);

        // --- Header: hotline, address, site_name ---
        if (cfg.hotline)   document.querySelectorAll('.hotline').forEach(e => e.textContent = cfg.hotline);
        if (cfg.address)   document.querySelectorAll('.address').forEach(e => e.textContent = 'Địa chỉ: ' + cfg.address);
        if (cfg.site_name) {
            document.title = cfg.site_name;
            document.querySelectorAll('.welcome').forEach(e => e.textContent = cfg.site_name);
            const ogTitle = document.querySelector('meta[property="og:title"]'); if (ogTitle) ogTitle.setAttribute('content', cfg.site_name);
            const ogSite  = document.querySelector('meta[property="og:site_name"]'); if (ogSite) ogSite.setAttribute('content', cfg.site_name);
        }

        // --- Logo website (mọi ảnh logo trong header) ---
        if (cfg.logo_url) {
            document.querySelectorAll('.logo img, a.logo img').forEach(img => img.setAttribute('src', cfg.logo_url));
            const ogImg = document.querySelector('meta[property="og:image"]'); if (ogImg) ogImg.setAttribute('content', cfg.logo_url);
        }

        // --- Favicon (icon tab trình duyệt) ---
        if (cfg.favicon_url) {
            document.querySelectorAll('link[rel="icon"]').forEach(link => link.setAttribute('href', cfg.favicon_url));
        }

        // --- Meta SEO ---
        if (cfg.meta_description) {
            const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', cfg.meta_description);
            const ogDesc = document.querySelector('meta[property="og:description"]'); if (ogDesc) ogDesc.setAttribute('content', cfg.meta_description);
        }
        if (cfg.meta_keywords) {
            const meta = document.querySelector('meta[name="keywords"]'); if (meta) meta.setAttribute('content', cfg.meta_keywords);
        }

        // --- Đoạn giới thiệu xanh lá (key: intro_text → id="dynamic-intro") ---
        // Quản lý trong Admin > Cài đặt Website: key=intro_text, value=<HTML hoặc text>
        if (cfg.intro_text) {
            const el = document.getElementById('dynamic-intro');
            if (el) el.innerHTML = cfg.intro_text;
        }

        // --- Footer spans (id="footer-address", "footer-phone", "footer-email", "footer-copyright") ---
        if (cfg.address)          { const el = document.getElementById('footer-address');   if (el) el.textContent = cfg.address; }
        if (cfg.hotline)          { const el = document.getElementById('footer-phone');     if (el) el.textContent = cfg.hotline; }
        if (cfg.email)            { const el = document.getElementById('footer-email');     if (el) el.textContent = cfg.email; }
        if (cfg.footer_copyright) { const el = document.getElementById('footer-copyright'); if (el) el.textContent = cfg.footer_copyright; }

        // --- Hook tổng quát: bất kỳ phần tử nào có data-sync="ten_key" đều được tự động điền ---
        // Cho phép mở rộng thêm cấu hình mới trong tương lai mà KHÔNG cần sửa code này nữa.
        Object.keys(cfg).forEach(key => {
            document.querySelectorAll(`[data-sync="${key}"]`).forEach(el => {
                const val = cfg[key];
                if (!val) return;
                if (el.tagName === 'IMG') el.setAttribute('src', val);
                else if (el.tagName === 'A') el.setAttribute('href', val);
                else if (el.tagName === 'META') el.setAttribute('content', val);
                else if (el.tagName === 'LINK') el.setAttribute('href', val);
                else el.textContent = val;
            });
        });

    } catch(e) { console.error('[Settings]', e); }
}

// ============ LOAD ALL ============
function loadAll() {
    loadSlides(); loadProducts(); loadPartners(); loadTestimonials();
    loadNews(); loadProjects(); loadMenus(); loadCategories();
    loadVideos(); loadPhotos(); loadLinks(); loadSiteSettings();
}

// ============ REALTIME SUBSCRIPTIONS - 12 BẢNG ============
function subscribeRealtime() {
    const map = {
        slides: loadSlides, products: loadProducts, partners: loadPartners,
        testimonials: loadTestimonials, posts: () => { loadNews(); loadProjects(); },
        menus: loadMenus, categories: loadCategories, videos: loadVideos,
        photos: loadPhotos, links: loadLinks, site_settings: loadSiteSettings
    };
    Object.keys(map).forEach(table => {
        supabase.channel('public:' + table)
            .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                console.log('[RT]', table, 'changed → re-render');
                map[table]();
            })
            .subscribe();
    });
    console.log('✅ Realtime 12 bảng active: Admin <-> Supabase <-> Website');
}

// ============ INIT ============
function init() {
    setTimeout(() => { loadAll(); subscribeRealtime(); }, 600);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})(); // end IIFE — đóng scope cục bộ, không rò rỉ biến ra global


