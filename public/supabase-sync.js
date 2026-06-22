// ============================================================
// SUPABASE-SYNC.JS - CÔNG CỤ ĐỒNG BỘ DỮ LIỆU TỐI CAO
// Tự động đồng bộ tất cả dữ liệu từ Supabase ra website
// ============================================================

const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_KEY = "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 1. HÀM ĐỒNG BỘ CẤU HÌNH GỐC (Website Config)
// ============================================================
async function syncWebsiteConfig() {
    try {
        const { data: configs } = await _supabase.from('website_config').select('*');
        if (!configs) return;
        
        configs.forEach(c => {
            const { key, value } = c;
            
            // Cập nhật tất cả các element có id tương ứng
            const el = document.getElementById(key);
            if (el) el.value = value;
            
            // Cập nhật toàn bộ nội dung text có chứa data-sync attribute
            document.querySelectorAll(`[data-sync="${key}"]`).forEach(el => {
                el.textContent = value;
                if (el.tagName === 'IMG') el.src = value;
                if (el.tagName === 'A' && el.href) el.href = value;
            });
            
            // Cập nhật meta tags
            if (key === 'meta_keywords') {
                const meta = document.querySelector('meta[name="keywords"]');
                if (meta) meta.content = value;
            }
            if (key === 'meta_description') {
                const meta = document.querySelector('meta[name="description"]');
                if (meta) meta.content = value;
            }
            
            // Cập nhật title
            if (key === 'site_name') {
                const titleEl = document.querySelector('title');
                if (titleEl) titleEl.textContent = value;
            }
            
            // Cập nhật favicon
            if (key === 'favicon_url') {
                const link = document.querySelector('link[rel="icon"]');
                if (link) link.href = value;
            }
            
            // Cập nhật OG tags
            if (key === 'site_name') {
                document.querySelectorAll('meta[property="og:site_name"], meta[property="og:title"]').forEach(m => m.content = value);
            }
            if (key === 'meta_description') {
                const ogDesc = document.querySelector('meta[property="og:description"]');
                if (ogDesc) ogDesc.content = value;
            }
            if (key === 'logo_url') {
                const ogImg = document.querySelector('meta[property="og:image"]');
                if (ogImg) ogImg.content = value;
            }
        });
        
        // Cập nhật CSS variables
        const primaryColor = configs.find(c => c.key === 'primary_color')?.value || '#004d00';
        const secondaryColor = configs.find(c => c.key === 'secondary_color')?.value || '#dc3545';
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        
        console.log('[SYNC] Website config loaded');
    } catch (e) {
        console.error('[SYNC] Config error:', e);
    }
}

// ============================================================
// 2. ĐỒNG BỘ NỘI DUNG TRANG (Page Content)
// ============================================================
async function syncPageContent(slug) {
    try {
        const { data } = await _supabase.from('pages_content').select('*').eq('page_slug', slug).single();
        if (!data) return;
        
        // Cập nhật title trang
        const titleEl = document.querySelector('.page-title, .content-title, h1.page-title');
        if (titleEl) titleEl.textContent = data.title;
        
        // Cập nhật nội dung chính
        const contentEl = document.getElementById('page-content-body');
        if (contentEl) contentEl.innerHTML = data.content;
        
        // Cập nhật meta
        if (data.meta_title) document.title = data.meta_title;
        if (data.meta_description) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.content = data.meta_description;
        }
        
        console.log('[SYNC] Page content loaded:', slug);
    } catch (e) {
        console.error('[SYNC] Page content error:', e);
    }
}

// ============================================================
// 3. ĐỒNG BỘ SLIDES
// ============================================================
async function syncSlides() {
    try {
        const { data: slides } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'slide-anh')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!slides || slides.length === 0) return;
        
        const sliderContainer = document.querySelector('.slide-carousel, #slide-carousel');
        if (!sliderContainer) return;
        
        sliderContainer.innerHTML = slides.map((s, i) => `
            <div class="item ${i === 0 ? 'active' : ''}">
                <a href="${s.url_link || '#'}">
                    <img src="${s.thumbnail}" alt="${s.post_title}" onerror="this.src='https://via.placeholder.com/1920x600?text=Slide'">
                </a>
                ${s.post_title ? `<div><h3>${s.post_title}</h3>${s.post_content ? `<p>${s.post_content}</p>` : ''}</div>` : ''}
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
// 4. ĐỒNG BỘ SẢN PHẨM (Product Carousel)
// ============================================================
async function syncProducts() {
    try {
        const { data: products } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'san-pham')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!products || products.length === 0) return;
        
        const container = document.querySelector('.product-carousel, #product-carousel');
        if (!container) return;
        
        container.innerHTML = products.map(p => `
            <div class="item">
                <dl>
                    <dt>
                        <img src="${p.thumbnail || 'https://via.placeholder.com/400x300?text=Product'}" 
                             alt="${p.post_title}" 
                             title="${p.post_title}"
                             onerror="this.src='https://via.placeholder.com/400x300?text=Product'">
                    </dt>
                    <dd>
                        <h3>${p.post_title}</h3>
                        ${p.post_content ? `<p>${p.post_content.substring(0, 150)}...</p>` : ''}
                        ${p.url_link ? `<a href="${p.url_link}">Xem chi tiết</a>` : ''}
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
// 5. ĐỒNG BỘ DỰ ÁN
// ============================================================
async function syncProjects() {
    try {
        const { data: projects } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'du-an-thicong')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!projects || projects.length === 0) return;
        
        const container = document.querySelector('.list_project, #list-project');
        if (!container) return;
        
        container.innerHTML = projects.map(p => `
            <div class="col-12 col-md-6 item">
                <dl>
                    <dt>
                        <div class="swing">
                            <figure class="effect-v7">
                                <a href="${p.url_link || '#'}">
                                    <img src="${p.thumbnail || 'https://via.placeholder.com/600x400?text=Project'}" 
                                         alt="${p.post_title}"
                                         onerror="this.src='https://via.placeholder.com/600x400?text=Project'">
                                </a>
                            </figure>
                        </div>
                    </dt>
                    <dd>
                        <h3><a href="${p.url_link || '#'}">${p.post_title}</a></h3>
                        <p>${p.post_content || ''}</p>
                        ${p.url_link ? `<a href="${p.url_link}">Xem thêm</a>` : ''}
                    </dd>
                </dl>
            </div>
        `).join('');
        
        console.log('[SYNC] Projects loaded:', projects.length);
    } catch (e) {
        console.error('[SYNC] Projects error:', e);
    }
}

// ============================================================
// 6. ĐỒNG BỘ TIN TỨC
// ============================================================
async function syncNews() {
    try {
        const { data: news } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'tin-tuc')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!news || news.length === 0) return;
        
        const container = document.querySelector('.list_news, #list-news');
        if (!container) return;
        
        container.innerHTML = news.map((n, i) => {
            if (i === 0) {
                return `
                    <div class="col-12 col-md-6 big_item">
                        <dl>
                            <dt>
                                <div class="swing">
                                    <figure class="effect-v7">
                                        <a href="${n.url_link || '#'}">
                                            <img src="${n.thumbnail || 'https://via.placeholder.com/600x400?text=News'}" 
                                                 alt="${n.post_title}"
                                                 onerror="this.src='https://via.placeholder.com/600x400?text=News'">
                                        </a>
                                    </figure>
                                </div>
                            </dt>
                            <dd>
                                <h3><a href="${n.url_link || '#'}">${n.post_title}</a></h3>
                                <p>${(n.post_content || '').substring(0, 300)}${(n.post_content || '').length > 300 ? '...' : ''}</p>
                                ${n.url_link ? `<a href="${n.url_link}">Xem thêm</a>` : ''}
                            </dd>
                        </dl>
                    </div>`;
            } else {
                return `
                    <div class="col-6 item">
                        <dl>
                            <dt>
                                <div class="swing">
                                    <figure class="effect-v7">
                                        <a href="${n.url_link || '#'}">
                                            <img src="${n.thumbnail || 'https://via.placeholder.com/300x200?text=News'}" 
                                                 alt="${n.post_title}"
                                                 onerror="this.src='https://via.placeholder.com/300x200?text=News'">
                                        </a>
                                    </figure>
                                </div>
                            </dt>
                            <dd>
                                <h3><a href="${n.url_link || '#'}">${n.post_title}</a></h3>
                            </dd>
                        </dl>
                    </div>`;
            }
        }).join('');
        
        console.log('[SYNC] News loaded:', news.length);
    } catch (e) {
        console.error('[SYNC] News error:', e);
    }
}

// ============================================================
// 7. ĐỒNG BỘ ĐỐI TÁC (Partner Logos)
// ============================================================
async function syncPartners() {
    try {
        const { data: partners } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'doi-tac')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!partners || partners.length === 0) return;
        
        const container = document.querySelector('.partner-carousel, #partner-carousel');
        if (!container) return;
        
        container.innerHTML = partners.map(p => `
            <div class="item">
                <a href="${p.url_link || '#'}">
                    <img src="${p.thumbnail || 'https://via.placeholder.com/150x80?text=Partner'}" 
                         alt="${p.post_title}" 
                         title="${p.post_title}"
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
// 8. ĐỒNG BỘ VIDEO
// ============================================================
async function syncVideos() {
    try {
        const { data: videos } = await _supabase
            .from('categories_and_posts')
            .select('*')
            .eq('category', 'video-clip')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: false });
        
        if (!videos || videos.length === 0) return;
        
        const container = document.querySelector('.video-list, #video-list, .list-video');
        if (!container) return;
        
        container.innerHTML = videos.map(v => `
            <div class="col-12 col-md-4 mb-3">
                <div class="card">
                    <div class="card-body p-2">
                        ${v.video_url ? `
                        <div class="embed-responsive embed-responsive-16by9">
                            ${v.video_url.includes('youtube') || v.video_url.includes('youtu.be') ? 
                              `<iframe src="${v.video_url.replace('watch?v=', 'embed/')}" 
                                       frameborder="0" allowfullscreen class="embed-responsive-item"></iframe>` :
                              `<video src="${v.video_url}" controls class="w-100"></video>`
                            }
                        </div>` : 
                        `<img src="${v.thumbnail || 'https://via.placeholder.com/400x250?text=Video'}" 
                              class="w-100" style="height:200px;object-fit:cover;"
                              onerror="this.src='https://via.placeholder.com/400x250?text=Video'">`
                        }
                        <h6 class="mt-2">${v.post_title}</h6>
                        ${v.post_content ? `<p class="small text-muted">${v.post_content}</p>` : ''}
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
// 9. ĐỒNG BỘ TESTIMONIALS (Nhận xét khách hàng)
// ============================================================
async function syncTestimonials() {
    try {
        const { data: testimonials } = await _supabase
            .from('testimonials')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        
        if (!testimonials || testimonials.length === 0) return;
        
        const container = document.querySelector('.comment-carousel, #comment-carousel');
        if (!container) return;
        
        container.innerHTML = testimonials.map(t => `
            <div class="item">
                <div>
                    ${t.avatar_url ? `<a><img src="${t.avatar_url}" alt="${t.customer_name}" 
                        onerror="this.src='https://via.placeholder.com/100x100?text=Avatar'"></a>` : ''}
                    <h3>${t.customer_name} ${t.position ? `- ${t.position}` : ''}</h3>
                    ${t.company_name ? `<small class="text-muted">${t.company_name}</small>` : ''}
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
// 10. ĐỒNG BỘ MENU / NAVIGATION
// ============================================================
async function syncNavigation() {
    try {
        const { data: menuItems } = await _supabase
            .from('navigation')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });
        
        if (!menuItems || menuItems.length === 0) return;
        
        // Cập nhật menu chính
        document.querySelectorAll('.menu ul, #main-menu').forEach(menuContainer => {
            // Chỉ cập nhật menu có data-sync-menu
            if (menuContainer.dataset.syncMenu !== undefined) {
                menuContainer.innerHTML = buildMenuTree(menuItems, null);
            }
        });
        
        console.log('[SYNC] Navigation loaded:', menuItems.length);
    } catch (e) {
        console.error('[SYNC] Navigation error:', e);
    }
}

function buildMenuTree(items, parentId) {
    const children = items.filter(i => i.parent_id === parentId);
    if (children.length === 0) return '';
    
    let html = '';
    children.forEach(item => {
        const hasChildren = items.some(i => i.parent_id === item.id);
        html += `<li>
            <a href="${item.url}">${item.icon ? `<i class="${item.icon}"></i> ` : ''}${item.label}${hasChildren ? ' <i class="fa fa-angle-down"></i>' : ''}</a>
            ${hasChildren ? `<ul>${buildMenuTree(items, item.id)}</ul>` : ''}
        </li>`;
    });
    return html;
}

// ============================================================
// 11. ĐỒNG BỘ STAFF (Nhân sự)
// ============================================================
async function syncStaff() {
    try {
        const { data: staff } = await _supabase
            .from('staff')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        
        if (!staff || staff.length === 0) return;
        
        const container = document.querySelector('.staff-list, #staff-list');
        if (!container) return;
        
        container.innerHTML = staff.map(s => `
            <div class="col-12 col-md-4 mb-3">
                <div class="card text-center h-100">
                    ${s.avatar_url ? `<img src="${s.avatar_url}" class="card-img-top" style="height:200px;object-fit:cover;" 
                         alt="${s.full_name}" onerror="this.src='https://via.placeholder.com/300x200?text=Staff'">` : ''}
                    <div class="card-body">
                        <h5 class="card-title">${s.full_name}</h5>
                        <p class="card-text text-muted">${s.position || ''}</p>
                        ${s.phone ? `<p class="card-text"><i class="fa fa-phone"></i> ${s.phone}</p>` : ''}
                        ${s.email ? `<p class="card-text"><i class="fa fa-envelope"></i> ${s.email}</p>` : ''}
                        ${s.description ? `<p class="card-text small">${s.description}</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('[SYNC] Staff loaded:', staff.length);
    } catch (e) {
        console.error('[SYNC] Staff error:', e);
    }
}

// ============================================================
// 12. ĐỒNG BỘ TOÀN BỘ WEBSITE
// ============================================================
async function syncEntireWebsite() {
    console.log('[SYNC] Bắt đầu đồng bộ toàn bộ website...');
    
    await syncWebsiteConfig();
    
    // Lấy slug từ URL hiện tại
    const path = window.location.pathname;
    let slug = 'index';
    if (path.includes('gioi-thieu')) slug = 'gioi-thieu';
    else if (path.includes('lien-he')) slug = 'lien-he';
    else if (path.includes('du-an')) slug = 'du-an';
    else if (path.includes('tin-tuc')) slug = 'tin-tuc';
    
    await syncPageContent(slug);
    await syncSlides();
    await syncProducts();
    await syncProjects();
    await syncNews();
    await syncPartners();
    await syncVideos();
    await syncTestimonials();
    await syncNavigation();
    await syncStaff();
    
    console.log('[SYNC] Đồng bộ hoàn tất!');
}

// ============================================================
// 13. SUBSCRIBE REAL-TIME (Lắng nghe thay đổi từ Admin)
// ============================================================
function subscribeRealtime() {
    const tables = ['website_config', 'pages_content', 'categories_and_posts', 
                    'categories', 'navigation', 'site_media', 'social_links',
                    'staff', 'testimonials'];
    
    tables.forEach(table => {
        _supabase.channel(`${table}-changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: table }, 
                () => {
                    console.log(`[REALTIME] ${table} changed, re-syncing...`);
                    switch(table) {
                        case 'website_config': syncWebsiteConfig(); break;
                        case 'pages_content': 
                            const path = window.location.pathname;
                            let slug = 'index';
                            if (path.includes('gioi-thieu')) slug = 'gioi-thieu';
                            else if (path.includes('lien-he')) slug = 'lien-he';
                            syncPageContent(slug); 
                            break;
                        case 'categories_and_posts': 
                            syncSlides();
                            syncProducts();
                            syncProjects();
                            syncNews();
                            syncPartners();
                            syncVideos();
                            break;
                        case 'navigation': syncNavigation(); break;
                        case 'staff': syncStaff(); break;
                        case 'testimonials': syncTestimonials(); break;
                    }
                })
            .subscribe();
    });
    
    console.log('[REALTIME] Subscribed to all table changes');
}

// ============================================================
// INIT - Tự động chạy khi trang load
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Load Supabase CDN nếu chưa có
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