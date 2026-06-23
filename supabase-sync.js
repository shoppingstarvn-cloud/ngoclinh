// ============================================================
// SUPABASE-SYNC.JS - CÔNG CỤ ĐỒNG BỘ DỮ LIỆU TỐI CAO
// Tự động đồng bộ tất cả dữ liệu từ Supabase ra website
// Phiên bản: 4.0 - Sử dụng /api/public/* endpoints
// ============================================================

const API_BASE = window.location.origin;

// ============================================================
// Hàm fetch API chung
// ============================================================
async function apiGet(url) {
    try {
        const resp = await fetch(url);
        return await resp.json();
    } catch(e) {
        console.error('[SYNC] Fetch error:', url, e);
        return { success: false, error: e.message };
    }
}

// ============================================================
// 1. ĐỒNG BỘ CẤU HÌNH (site_settings)
// ============================================================
async function syncWebsiteConfig() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/site_settings`);
        if (!result.success || !result.data) return;
        const configs = result.data;
        
        configs.forEach(c => {
            const { key, value } = c;
            
            // Cập nhật element có id tương ứng
            const el = document.getElementById(key);
            if (el) {
                if (el.tagName === 'IMG') el.src = value;
                else if (el.tagName === 'A') el.href = value;
                else el.textContent = value;
            }
            
            // Cập nhật data-sync attributes
            document.querySelectorAll(`[data-sync="${key}"]`).forEach(el => {
                if (el.tagName === 'IMG') el.src = value;
                else if (el.tagName === 'A' && el.href) el.href = value;
                else el.textContent = value;
            });
            
            // Meta tags
            if (key === 'meta_keywords') {
                const meta = document.querySelector('meta[name="keywords"]');
                if (meta) meta.content = value;
            }
            if (key === 'meta_description') {
                const meta = document.querySelector('meta[name="description"]');
                if (meta) meta.content = value;
            }
            if (key === 'site_name') {
                const titleEl = document.querySelector('title');
                if (titleEl) titleEl.textContent = value;
                document.querySelectorAll('meta[property="og:site_name"], meta[property="og:title"]').forEach(m => m.content = value);
            }
            if (key === 'favicon_url') {
                const link = document.querySelector('link[rel="icon"]');
                if (link) link.href = value;
            }
            if (key === 'logo_url') {
                const ogImg = document.querySelector('meta[property="og:image"]');
                if (ogImg) ogImg.content = value;
            }
            if (key === 'meta_description') {
                const ogDesc = document.querySelector('meta[property="og:description"]');
                if (ogDesc) ogDesc.content = value;
            }
        });
        
        console.log('[SYNC] Site settings loaded:', configs.length);
    } catch (e) {
        console.error('[SYNC] Config error:', e);
    }
}

// ============================================================
// 2. ĐỒNG BỘ SLIDES
// ============================================================
async function syncSlides() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/slides`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const slides = result.data;
        
        const sliderContainer = document.querySelector('.slide-carousel, #slide-carousel');
        if (!sliderContainer) return;
        
        sliderContainer.innerHTML = slides.map(s => `
            <div class="item">
                <a href="${s.link_url || '#'}">
                    <img src="${s.image_url}" alt="${s.title || 'Slide'}" onerror="this.src='https://via.placeholder.com/1920x600?text=Slide'">
                </a>
                ${s.title ? `<div><h3>${s.title}</h3>${s.subtitle ? `<p>${s.subtitle}</p>` : ''}</div>` : ''}
            </div>
        `).join('');
        
        // Re-init owl carousel nếu có
        if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
            sliderContainer.trigger('destroy.owl.carousel');
            sliderContainer.owlCarousel({
                loop: true, autoplay: true, margin: 0,
                responsiveClass: true,
                responsive: {
                    0: { items: 1, nav: false, dots: true },
                    600: { items: 1, nav: false, dots: true },
                    1000: { items: 1, nav: false, dots: true }
                }
            });
        }
        
        console.log('[SYNC] Slides loaded:', slides.length);
    } catch (e) {
        console.error('[SYNC] Slides error:', e);
    }
}

// ============================================================
// 3. ĐỒNG BỘ SẢN PHẨM (products)
// ============================================================
async function syncProducts() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/products`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const products = result.data;
        
        const container = document.querySelector('.product-carousel, #product-carousel');
        if (!container) return;
        
        container.innerHTML = products.map(p => `
            <div class="item">
                <dl>
                    <dt>
                        <img src="${p.thumbnail_url || 'https://via.placeholder.com/400x300?text=Product'}" 
                             alt="${p.name}" 
                             title="${p.name}"
                             onerror="this.src='https://via.placeholder.com/400x300?text=Product'">
                    </dt>
                    <dd>
                        <h3>${p.name}</h3>
                        ${p.description ? `<p>${p.description.substring(0, 150)}...</p>` : ''}
                        ${p.slug ? `<a href="${p.slug}.html">Xem chi tiết</a>` : ''}
                    </dd>
                </dl>
            </div>
        `).join('');
        
        if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
            container.trigger('destroy.owl.carousel');
            container.owlCarousel({
                loop: true, autoplay: true, margin: 20,
                responsiveClass: true,
                responsive: {
                    0: { items: 1, nav: false, dots: true },
                    600: { items: 2, nav: false, dots: true },
                    1000: { items: 3, nav: false, dots: true }
                }
            });
        }
        
        console.log('[SYNC] Products loaded:', products.length);
    } catch (e) {
        console.error('[SYNC] Products error:', e);
    }
}

// ============================================================
// 4. ĐỒNG BỘ BÀI VIẾT / TIN TỨC (posts)
// ============================================================
async function syncPosts() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/posts`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const posts = result.data;
        
        // News section
        const newsContainer = document.querySelector('.list_news, #list-news');
        if (newsContainer) {
            newsContainer.innerHTML = posts.map((p, i) => {
                if (i === 0) {
                    return `<div class="col-12 col-md-6 big_item">
                        <dl>
                            <dt><div class="swing"><figure class="effect-v7">
                                <a href="${p.slug}.html"><img src="${p.thumbnail_url || 'https://via.placeholder.com/600x400?text=News'}" alt="${p.title}"></a>
                            </figure></div></dt>
                            <dd>
                                <h3><a href="${p.slug}.html">${p.title}</a></h3>
                                <p>${(p.excerpt || p.content || '').substring(0, 300)}</p>
                                <a href="${p.slug}.html">Xem thêm</a>
                            </dd>
                        </dl>
                    </div>`;
                } else {
                    return `<div class="col-6 item">
                        <dl>
                            <dt><div class="swing"><figure class="effect-v7">
                                <a href="${p.slug}.html"><img src="${p.thumbnail_url || 'https://via.placeholder.com/300x200?text=News'}" alt="${p.title}"></a>
                            </figure></div></dt>
                            <dd><h3><a href="${p.slug}.html">${p.title}</a></h3></dd>
                        </dl>
                    </div>`;
                }
            }).join('');
        }
        
        console.log('[SYNC] Posts loaded:', posts.length);
    } catch (e) {
        console.error('[SYNC] Posts error:', e);
    }
}

// ============================================================
// 5. ĐỒNG BỘ ĐỐI TÁC (partners)
// ============================================================
async function syncPartners() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/partners`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const partners = result.data;
        
        const container = document.querySelector('.partner-carousel, #partner-carousel');
        if (!container) return;
        
        container.innerHTML = partners.map(p => `
            <div class="item">
                <a href="${p.website_url || '#'}">
                    <img src="${p.logo_url || 'https://via.placeholder.com/150x80?text=Partner'}" 
                         alt="${p.name}" 
                         title="${p.name}"
                         onerror="this.src='https://via.placeholder.com/150x80?text=Partner'">
                </a>
            </div>
        `).join('');
        
        if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
            container.trigger('destroy.owl.carousel');
            container.owlCarousel({
                loop: true, autoplay: true, margin: 20,
                responsiveClass: true,
                responsive: {
                    0: { items: 2, nav: false, dots: true },
                    600: { items: 3, nav: false, dots: true },
                    1000: { items: 6, nav: false, dots: true }
                }
            });
        }
        
        console.log('[SYNC] Partners loaded:', partners.length);
    } catch (e) {
        console.error('[SYNC] Partners error:', e);
    }
}

// ============================================================
// 6. ĐỒNG BỘ TESTIMONIALS
// ============================================================
async function syncTestimonials() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/testimonials`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const testimonials = result.data;
        
        const container = document.querySelector('.comment-carousel, #comment-carousel');
        if (!container) return;
        
        container.innerHTML = testimonials.map(t => `
            <div class="item">
                <div>
                    ${t.avatar_url ? `<a><img src="${t.avatar_url}" alt="${t.name}" 
                        onerror="this.src='https://via.placeholder.com/100x100?text=Avatar'" style="width:80px;height:80px;border-radius:50%;object-fit:cover;"></a>` : ''}
                    <h3>${t.name}</h3>
                    ${t.rating ? `<div class="text-warning">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</div>` : ''}
                    <div>${t.content}</div>
                </div>
            </div>
        `).join('');
        
        if (typeof $ !== 'undefined' && $.fn.owlCarousel) {
            container.trigger('destroy.owl.carousel');
            container.owlCarousel({
                loop: true, autoplay: false, margin: 10,
                responsiveClass: true, nav: true,
                responsive: {
                    0: { items: 1, nav: false, dots: true },
                    600: { items: 1, nav: false, dots: true },
                    1000: { items: 2, nav: true, dots: true }
                }
            });
        }
        
        console.log('[SYNC] Testimonials loaded:', testimonials.length);
    } catch (e) {
        console.error('[SYNC] Testimonials error:', e);
    }
}

// ============================================================
// 7. ĐỒNG BỘ VIDEO
// ============================================================
async function syncVideos() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/videos`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const videos = result.data;
        
        const container = document.querySelector('.video-list, #video-list, .list-video');
        if (!container) return;
        
        container.innerHTML = videos.map(v => `
            <div class="col-12 col-md-4 mb-3">
                <div class="card">
                    <div class="card-body p-2">
                        ${v.youtube_url ? `
                        <div class="embed-responsive embed-responsive-16by9">
                            <iframe src="${v.youtube_url.replace('watch?v=', 'embed/')}" 
                                     frameborder="0" allowfullscreen class="embed-responsive-item"></iframe>
                        </div>` : 
                        v.embed_url ? `<video src="${v.embed_url}" controls class="w-100" style="max-height:200px"></video>` :
                        `<img src="${v.thumbnail_url || 'https://via.placeholder.com/400x250?text=Video'}" 
                              class="w-100" style="height:200px;object-fit:cover;"
                              onerror="this.src='https://via.placeholder.com/400x250?text=Video'">`
                        }
                        <h6 class="mt-2">${v.title}</h6>
                        ${v.description ? `<p class="small text-muted">${v.description}</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('[SYNC] Videos loaded:', videos.length);
    } catch (e) {
        console.error('[SYNC] Videos error:', e);
    }
}

// ============================================================
// 8. ĐỒNG BỘ MENU (menus)
// ============================================================
async function syncMenus() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/menus`);
        if (!result.success || !result.data || result.data.length === 0) return;
        const menus = result.data;
        
        // Build menu tree
        function buildMenuTree(parentId) {
            const children = menus.filter(m => m.parent_id === parentId);
            if (children.length === 0) return '';
            let html = '';
            children.forEach(item => {
                const hasChildren = menus.some(m => m.parent_id === item.id);
                html += `<li>
                    <a href="${item.url}">${item.label}${hasChildren ? ' <i class="fa fa-angle-down"></i>' : ''}</a>
                    ${hasChildren ? `<ul>${buildMenuTree(item.id)}</ul>` : ''}
                </li>`;
            });
            return html;
        }
        
        document.querySelectorAll('.menu ul:first-child, #main-menu').forEach(menuContainer => {
            const html = buildMenuTree(null);
            if (html) menuContainer.innerHTML = html;
        });
        
        // Mobile menu
        const mobileContainer = document.querySelector('.menu-m ul, #mobile-menu');
        if (mobileContainer) {
            mobileContainer.innerHTML = buildMenuTree(null);
        }
        
        console.log('[SYNC] Menus loaded:', menus.length);
    } catch (e) {
        console.error('[SYNC] Menus error:', e);
    }
}

// ============================================================
// 9. ĐỒNG BỘ CATEGORIES (dùng làm service blocks)
// ============================================================
async function syncCategories() {
    try {
        const result = await apiGet(`${API_BASE}/api/public/categories`);
        if (!result.success || !result.data) return;
        console.log('[SYNC] Categories loaded:', result.data.length);
    } catch (e) {}
}

// ============================================================
// 10. ĐỒNG BỘ TOÀN BỘ WEBSITE
// ============================================================
async function syncEntireWebsite() {
    console.log('[SYNC] Bắt đầu đồng bộ toàn bộ website...');
    
    await syncWebsiteConfig();
    await syncMenus();
    await syncSlides();
    await syncProducts();
    await syncPosts();
    await syncPartners();
    await syncVideos();
    await syncTestimonials();
    await syncCategories();
    
    console.log('[SYNC] Đồng bộ hoàn tất!');
}

// ============================================================
// 11. SUBSCRIBE REAL-TIME (Lắng nghe thay đổi từ Admin)
// ============================================================
function subscribeRealtime() {
    const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
    
    if (typeof supabase === 'undefined') {
        console.log('[SYNC] Supabase client not loaded, skipping Realtime');
        return;
    }
    
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const tables = ['site_settings', 'menus', 'categories', 'posts', 'products', 
                    'slides', 'images', 'videos', 'partners', 'testimonials', 'links'];
    
    tables.forEach(table => {
        try {
            _supabase.channel(`public-${table}`)
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: table }, 
                    () => {
                        console.log(`[REALTIME] ${table} changed, re-syncing...`);
                        // Re-sync specific section based on table
                        switch(table) {
                            case 'site_settings': syncWebsiteConfig(); break;
                            case 'menus': syncMenus(); break;
                            case 'slides': syncSlides(); break;
                            case 'products': syncProducts(); break;
                            case 'posts': syncPosts(); break;
                            case 'partners': syncPartners(); break;
                            case 'videos': syncVideos(); break;
                            case 'testimonials': syncTestimonials(); break;
                        }
                    })
                .subscribe();
        } catch(e) {
            console.error(`[REALTIME] Error subscribing to ${table}:`, e);
        }
    });
    
    console.log('[REALTIME] Subscribed to all table changes');
}

// ============================================================
// INIT - Tự động chạy khi trang load
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Load Supabase CDN nếu chưa có (cần cho Realtime)
    if (typeof supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            setTimeout(syncEntireWebsite, 500);
            setTimeout(subscribeRealtime, 1000);
        };
        document.head.appendChild(script);
    } else {
        setTimeout(syncEntireWebsite, 300);
        setTimeout(subscribeRealtime, 800);
    }
});