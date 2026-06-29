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
        c.innerHTML = data.map(p => `
            <div class="item"><dl>
                <dt><img src="${p.thumbnail_url || 'images/placeholder.jpg'}" alt="${p.name}" title="${p.name}"></dt>
                <dd><h3>${p.name}</h3>${p.price ? `<p class="price">${p.price}</p>` : ''}<a href="${p.slug}.html"></a></dd>
            </dl></div>`).join('');
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
async function loadNews() {
    try {
        const { data } = await supabase.from('posts').select('*').eq('is_active', true).eq('status', 'published').order('display_order').limit(5);
        if (!data || data.length === 0) return;
        const big = document.querySelector('.news .list_news .big_item');
        const right = document.querySelector('.news .list_news .right');
        if (!big || !right) return;
        // Bài đầu = big item
        const p0 = data[0];
        big.innerHTML = `<dl>
            <dt><div class="swing"><figure class="effect-v7"><a href="${p0.slug}.html"><img src="${p0.thumbnail_url}" alt="${p0.title}" /></a></figure></div></dt>
            <dd><h3><a href="${p0.slug}.html">${p0.title}</a></h3><p>${p0.excerpt || ''}</p>
            <a href="${p0.slug}.html">Xem thêm</a><div class="clearfix"></div></dd>
        </dl>`;
        // Bài còn lại = right items
        right.innerHTML = data.slice(1).map(p => `
            <div class="col-6 item"><dl>
                <dt><div class="swing"><figure class="effect-v7"><a href="${p.slug}.html"><img src="${p.thumbnail_url}" alt="${p.title}" /></a></figure></div></dt>
                <dd><h3><a href="${p.slug}.html">${p.title}</a></h3><a href="${p.slug}.html"></a></dd>
            </dl></div>`).join('');
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
    } catch(e) { console.error('[Menus]', e); }
}

// ============ 8. CATEGORIES (Danh mục - service_home) ============
async function loadCategories() {
    try {
        const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order').limit(6);
        if (!data || data.length === 0) return;
        const c = document.querySelector('.service_home .row');
        if (!c) return;
        c.innerHTML = data.map(cat => `
            <div class="col-12 col-md-4 item_s"><dl>
                <dt><a href="${cat.slug}.html"><img src="${cat.thumbnail_url || cat.image_url || 'images/placeholder.jpg'}" alt="${cat.name}"></a></dt>
                <dd><h3><a href="${cat.slug}.html">${cat.name}</a></h3><div>${cat.description || ''}</div></dd>
            </dl></div>`).join('');
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

// ============ 12. SITE SETTINGS (Tên site, hotline, địa chỉ...) ============
async function loadSiteSettings() {
    try {
        const { data } = await supabase.from('site_settings').select('*');
        if (!data || data.length === 0) return;
        const cfg = {};
        data.forEach(s => cfg[s.key] = s.value);
        // Áp dụng từng cấu hình nếu có
        if (cfg.hotline) document.querySelectorAll('.hotline').forEach(e => e.textContent = cfg.hotline);
        if (cfg.address) document.querySelectorAll('.address').forEach(e => e.textContent = 'Địa chỉ: ' + cfg.address);
        if (cfg.site_name) { document.title = cfg.site_name; document.querySelectorAll('.welcome').forEach(e => e.textContent = cfg.site_name); }
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


