// ============ REALTIME DATA SYNC - ADMIN -> SUPABASE -> WEBSITE ============
const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcnV4aW52dnZhcXVmZ2h0aWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2NDg3ODUsImV4cCI6MjA0OTIyNDc4NX0.oj0-B1n1ILTR9Wt8m7S-6jgV7fTnLl-b8RiZE-wbPU4";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ RENDER SLIDES ============
async function loadSlides() {
    try {
        const { data, error } = await supabase
            .from('slides')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        
        const container = document.querySelector('.slide-carousel');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="item"><img src="images/slide/default.jpg" alt="Welcome"></div>';
            return;
        }
        
        container.innerHTML = data.map(slide => `
            <div class="item">
                <a href="${slide.link_url || '#'}"><img src="${slide.image_url}" alt="${slide.title || 'Slide'}" /></a>
                ${slide.title ? `<div><h3>${slide.title}</h3><p>${slide.subtitle || ''}</p></div>` : ''}
            </div>
        `).join('');
        
        // Reinit owl carousel
        if (window.jQuery && jQuery.fn.owlCarousel) {
            jQuery('.slide-carousel').trigger('destroy.owl.carousel').owlCarousel({
                loop: true, autoplay:true, margin:0, responsiveClass:true,
                responsive:{ 0:{ items:1, nav:false, dots: true }, 600:{ items:1, nav:false, dots: true }, 1000:{ items:1, nav:false, dots: true } }
            });
        }
    } catch(e) {
        console.error('[Slides]', e);
    }
}

// ============ RENDER PRODUCTS ============
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(12);
        
        if (error) throw error;
        
        const container = document.querySelector('.product-carousel');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="item"><p>Đang cập nhật sản phẩm...</p></div>';
            return;
        }
        
        container.innerHTML = data.map(p => `
            <div class="item">
                <dl>
                    <dt><img src="${p.thumbnail_url || 'images/placeholder.jpg'}" alt="${p.name}" title="${p.name}"></dt>
                    <dd>
                        <h3>${p.name}</h3>
                        ${p.price ? `<p class="price">${p.price}</p>` : ''}
                        <a href="${p.slug}.html"></a>
                    </dd>
                </dl>
            </div>
        `).join('');
        
        // Reinit
        if (window.jQuery && jQuery.fn.owlCarousel) {
            jQuery('.product-carousel').trigger('destroy.owl.carousel').owlCarousel({
                loop: true, autoplay:true, margin:20, responsiveClass:true,
                responsive:{ 0:{ items:1, nav:false, dots: true }, 600:{ items:2, nav:false, dots: true }, 1000:{ items:3, nav:false, dots: true } }
            });
        }
    } catch(e) {
        console.error('[Products]', e);
    }
}

// ============ RENDER PARTNERS ============
async function loadPartners() {
    try {
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(20);
        
        if (error) throw error;
        
        const container = document.querySelector('.partner-carousel');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="item"><p>Đang cập nhật đối tác...</p></div>';
            return;
        }
        
        container.innerHTML = data.map(p => `
            <div class="item">
                <a href="${p.website_url || '#'}" target="_blank" title="${p.name}">
                    <img src="${p.logo_url}" alt="${p.name}">
                </a>
            </div>
        `).join('');
        
        // Reinit
        if (window.jQuery && jQuery.fn.owlCarousel) {
            jQuery('.partner-carousel').trigger('destroy.owl.carousel').owlCarousel({
                loop: true, autoplay:true, margin:20, responsiveClass:true,
                responsive:{ 0:{ items:2, nav:false, dots: true }, 600:{ items:3, nav:false, dots: true }, 1000:{ items:6, nav:false, dots: true } }
            });
        }
    } catch(e) {
        console.error('[Partners]', e);
    }
}

// ============ RENDER TESTIMONIALS ============
async function loadTestimonials() {
    try {
        const { data, error } = await supabase
            .from('testimonials')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        
        const container = document.querySelector('.comment-carousel');
        if (!container) return;
        
        if (!data || data.length === 0) return;
        
        container.innerHTML = data.map(t => `
            <div class="item">
                <div class="testimonial-box">
                    ${t.avatar_url ? `<img src="${t.avatar_url}" alt="${t.name}" class="avatar">` : ''}
                    <p class="content">${t.content}</p>
                    <h4 class="name">${t.name}</h4>
                    ${t.rating ? `<div class="rating">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</div>` : ''}
                </div>
            </div>
        `).join('');
        
        // Reinit
        if (window.jQuery && jQuery.fn.owlCarousel) {
            jQuery('.comment-carousel').trigger('destroy.owl.carousel').owlCarousel({
                loop: true, autoplay:true, autoplayTimeout:4000, margin: 10, responsiveClass:true, nav:true,
                responsive:{ 0:{ items:1, nav:false, dots: true }, 600:{ items:1, nav:false, dots: true }, 1000:{ items:2, nav:true, dots: true } }
            });
        }
    } catch(e) {
        console.error('[Testimonials]', e);
    }
}

// ============ REALTIME SUBSCRIPTIONS ============
function subscribeRealtime() {
    // Slides Realtime
    supabase.channel('public:slides')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'slides' }, () => {
            console.log('[RT] Slides changed');
            loadSlides();
        })
        .subscribe();
    
    // Products Realtime
    supabase.channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            console.log('[RT] Products changed');
            loadProducts();
        })
        .subscribe();
    
    // Partners Realtime
    supabase.channel('public:partners')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => {
            console.log('[RT] Partners changed');
            loadPartners();
        })
        .subscribe();
    
    // Testimonials Realtime
    supabase.channel('public:testimonials')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => {
            console.log('[RT] Testimonials changed');
            loadTestimonials();
        })
        .subscribe();
    
    console.log('✅ Realtime sync active: Admin <-> Supabase <-> Website');
}

// ============ INIT ON PAGE LOAD ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            loadSlides();
            loadProducts();
            loadPartners();
            loadTestimonials();
            subscribeRealtime();
        }, 500); // Đợi owl carousel init xong
    });
} else {
    setTimeout(() => {
        loadSlides();
        loadProducts();
        loadPartners();
        loadTestimonials();
        subscribeRealtime();
    }, 500);
}
