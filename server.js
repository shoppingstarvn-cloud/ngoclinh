const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;

// === SUPABASE CONFIG ===
const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_KEY = "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// Serve static files: ưu tiên betongphuongbac.com (website chính), fallback ra thư mục gốc (superadmin, uploads)
app.use(express.static(path.join(__dirname, 'betongphuongbac.com')));
app.use(express.static(__dirname));

// Route gốc: hiển thị trang chủ từ betongphuongbac.com/index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'betongphuongbac.com', 'index.html'));
});

// ================================================================
// AUTH MIDDLEWARE
// ================================================================
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
        return res.json({ success: false, error: 'Chưa xác thực!' });
    }
    next();
}

// ================================================================
// AUTH API
// ================================================================
app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;
    // Check hardcoded passwords first (for development)
    if (password === "8386" || password === "admin" || password === "cuaau@2026") {
        const token = Buffer.from(`admin:${password}:${Date.now()}`).toString('base64');
        return res.json({ success: true, token, user: { username: 'admin', role: 'superadmin', full_name: 'Super Admin' } });
    }
    // Check Supabase admin_users
    try {
        const { data } = await supabase.from('admin_users').select('*').eq('password_hash', password).eq('is_active', true).single();
        if (data) {
            const token = Buffer.from(`${data.username}:${password}:${Date.now()}`).toString('base64');
            await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);
            return res.json({ success: true, token, user: { id: data.id, username: data.username, role: data.role, full_name: data.full_name } });
        }
    } catch(e) {}
    res.json({ success: false, error: 'Sai mật khẩu!' });
});

app.post('/api/auth/verify', authenticate, (req, res) => {
    res.json({ success: true, message: 'Token hợp lệ' });
});

// ================================================================
// GLOBAL API: GET ALL WEBSITE DATA
// ================================================================
app.get('/api/website/data', authenticate, async (req, res) => {
    try {
        const tables = ['website_config', 'pages_content', 'categories', 'categories_and_posts', 
                        'navigation', 'site_media', 'social_links', 'staff', 'testimonials', 
                        'contact_submissions', 'slides', 'partners', 'products', 'videos', 'menus'];
        const result = {};
        for (const table of tables) {
            const { data } = await supabase.from(table).select('*').order('id', { ascending: false });
            result[table] = data || [];
        }
        res.json({ success: true, data: result });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: WEBSITE_CONFIG
// ================================================================
app.post('/api/website/config', authenticate, async (req, res) => {
    try {
        const { key, value } = req.body;
        const { data, error } = await supabase.from('website_config').upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        ).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: PAGES_CONTENT
// ================================================================
app.post('/api/website/page', authenticate, async (req, res) => {
    try {
        const { page_slug, title, image_url, content, meta_title, meta_description } = req.body;
        const { data, error } = await supabase.from('pages_content').upsert({
            page_slug, title, image_url, content, meta_title, meta_description,
            updated_at: new Date().toISOString()
        }, { onConflict: 'page_slug' }).select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/page/:slug', authenticate, async (req, res) => {
    try {
        await supabase.from('pages_content').delete().eq('page_slug', req.params.slug);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: CATEGORIES
// ================================================================
app.post('/api/website/category', authenticate, async (req, res) => {
    try {
        const { id, name, slug, image_url, description } = req.body;
        let result;
        if (id) {
            result = await supabase.from('categories').update({ name, slug, image_url, description, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('categories').insert([{ name, slug, image_url, description }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: CATEGORIES_AND_POSTS (Dynamic content)
// ================================================================
app.get('/api/website/posts', authenticate, async (req, res) => {
    try {
        const { category } = req.query;
        let query = supabase.from('categories_and_posts').select('*').order('id', { ascending: false });
        if (category) query = query.eq('category', category);
        const { data } = await query;
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/website/post', authenticate, async (req, res) => {
    try {
        const { id, category, post_title, thumbnail, post_content, url_link, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('categories_and_posts').update({
                category, post_title, thumbnail, post_content, url_link, sort_order, is_active,
                updated_at: new Date().toISOString()
            }).eq('id', id).select();
        } else {
            result = await supabase.from('categories_and_posts').insert([{
                category, post_title, thumbnail, post_content, url_link, sort_order: sort_order || 0, is_active: is_active !== false
            }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/post/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('categories_and_posts').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: NAVIGATION
// ================================================================
app.post('/api/website/navigation', authenticate, async (req, res) => {
    try {
        const { id, label, url, parent_id, icon, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('navigation').update({ label, url, parent_id, icon, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('navigation').insert([{ label, url, parent_id, icon, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/navigation/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('navigation').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: SITE_MEDIA
// ================================================================
app.post('/api/website/media', authenticate, async (req, res) => {
    try {
        const { id, title, url, type, alt_text, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('site_media').update({ title, url, type, alt_text, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('site_media').insert([{ title, url, type, alt_text, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/media/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('site_media').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: STAFF
// ================================================================
app.post('/api/website/staff', authenticate, async (req, res) => {
    try {
        const { id, full_name, position, phone, email, avatar_url, description, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('staff').update({ full_name, position, phone, email, avatar_url, description, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('staff').insert([{ full_name, position, phone, email, avatar_url, description, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/staff/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('staff').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: TESTIMONIALS
// ================================================================
app.post('/api/website/testimonial', authenticate, async (req, res) => {
    try {
        const { id, customer_name, position, company_name, avatar_url, content, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('testimonials').update({ customer_name, position, company_name, avatar_url, content, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('testimonials').insert([{ customer_name, position, company_name, avatar_url, content, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/testimonial/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('testimonials').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: CONTACT SUBMISSIONS
// ================================================================
app.get('/api/website/contacts', authenticate, async (req, res) => {
    try {
        const { data } = await supabase.from('contact_submissions').select('*').order('id', { ascending: false });
        res.json({ success: true, data: data || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/website/contact/status', authenticate, async (req, res) => {
    try {
        const { id, status, note } = req.body;
        await supabase.from('contact_submissions').update({ status, note, updated_at: new Date().toISOString() }).eq('id', id);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/contact/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('contact_submissions').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: SLIDES
// ================================================================
app.post('/api/website/slide', authenticate, async (req, res) => {
    try {
        const { id, slide_title, slide_subtitle, slide_image_url, link_url, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('slides').update({ slide_title, slide_subtitle, slide_image_url, link_url, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('slides').insert([{ slide_title, slide_subtitle, slide_image_url, link_url, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/slide/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('slides').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: PARTNERS
// ================================================================
app.post('/api/website/partner', authenticate, async (req, res) => {
    try {
        const { id, partner_name, logo_url, website_url, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('partners').update({ partner_name, logo_url, website_url, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('partners').insert([{ partner_name, logo_url, website_url, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/partner/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('partners').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: PRODUCTS
// ================================================================
app.post('/api/website/product', authenticate, async (req, res) => {
    try {
        const { id, product_name, product_category, thumbnail, description, price, specifications, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('products').update({ product_name, product_category, thumbnail, description, price, specifications, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('products').insert([{ product_name, product_category, thumbnail, description, price, specifications, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/product/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('products').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: VIDEOS
// ================================================================
app.post('/api/website/video', authenticate, async (req, res) => {
    try {
        const { id, video_title, video_url, thumbnail_url, description, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('videos').update({ video_title, video_url, thumbnail_url, description, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('videos').insert([{ video_title, video_url, thumbnail_url, description, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/video/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('videos').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// CRUD: MENUS
// ================================================================
app.post('/api/website/menu', authenticate, async (req, res) => {
    try {
        const { id, menu_name, parent_id, link_url, icon_class, sort_order, is_active } = req.body;
        let result;
        if (id) {
            result = await supabase.from('menus').update({ menu_name, parent_id, link_url, icon_class, sort_order, is_active, updated_at: new Date().toISOString() }).eq('id', id).select();
        } else {
            result = await supabase.from('menus').insert([{ menu_name, parent_id, link_url, icon_class, sort_order: sort_order || 0, is_active: is_active !== false }]).select();
        }
        if (result.error) throw result.error;
        res.json({ success: true, data: result.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/website/menu/:id', authenticate, async (req, res) => {
    try {
        await supabase.from('menus').delete().eq('id', parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// DELETE ANY TABLE ITEM (Generic)
// ================================================================
app.post('/api/website/delete-item', authenticate, async (req, res) => {
    try {
        const { table, id } = req.body;
        if (!table || !id) throw new Error('Thiếu thông tin');
        const allowedTables = ['categories', 'categories_and_posts', 'navigation', 'site_media', 'staff', 'testimonials'];
        if (!allowedTables.includes(table)) throw new Error('Bảng không được phép');
        await supabase.from(table).delete().eq('id', parseInt(id));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// SYNC ENGINE
// ================================================================
app.post('/api/sync/files-to-supabase', authenticate, async (req, res) => {
    try {
        const results = { scanned: 0, updated: 0, errors: [] };
        const htmlFiles = [];
        
        function findHtmlFiles(dir) {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        findHtmlFiles(fullPath);
                    } else if (entry.name.endsWith('.html') && entry.name !== 'superadmin.html') {
                        htmlFiles.push(fullPath);
                    }
                }
            } catch(e) {}
        }
        findHtmlFiles(__dirname);
        
        for (const filePath of htmlFiles) {
            results.scanned++;
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
            let pageSlug = relativePath.replace('.html', '').replace(/[/\\]/g, '-').replace(/[^a-zA-Z0-9-_]/g, '-');
            const titleMatch = content.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : '';
            
            const { data: existing } = await supabase.from('pages_content').select('id').eq('page_slug', pageSlug).maybeSingle();
            if (!existing) {
                await supabase.from('pages_content').insert({
                    page_slug: pageSlug, title: title, content: content.substring(0, 100000)
                });
                results.updated++;
            }
        }
        res.json({ success: true, scanned: results.scanned, updated: results.updated });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/sync/supabase-to-files', authenticate, async (req, res) => {
    try {
        const { data: configs } = await supabase.from('website_config').select('*');
        const configMap = {};
        if (configs) configs.forEach(c => { configMap[c.key] = c.value; });
        
        // Update index.html if exists
        const indexPath = path.join(__dirname, 'betongphuongbac.com', 'index.html');
        if (fs.existsSync(indexPath)) {
            let content = fs.readFileSync(indexPath, 'utf8');
            if (configMap['site_name']) content = content.replace(/CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU/g, configMap['site_name']);
            if (configMap['hotline']) content = content.replace(/0947881181/g, configMap['hotline']);
            if (configMap['email']) content = content.replace(/congtycuaau8386@gmail\.com/g, configMap['email']);
            if (configMap['logo_url']) content = content.replace(/src="images\/contact\/4174logo_bt\.png"/g, `src="${configMap['logo_url']}"`);
            if (configMap['address']) content = content.replace(/Địa chỉ:\s*[^<]*/g, `Địa chỉ: ${configMap['address']}`);
            fs.writeFileSync(indexPath, content, 'utf8');
        }
        
        res.json({ success: true, message: 'Đã đồng bộ từ Supabase ra file HTML' });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// FILE UPLOAD API - Upload to Local + Supabase Storage
// ================================================================
// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('Không có file!');
        const file = req.file;
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const localPath = path.join(UPLOADS_DIR, fileName);
        
        // Save to local /uploads directory
        fs.writeFileSync(localPath, file.buffer);
        const url = `/uploads/${fileName}`;
        
        res.json({ success: true, url, fileName });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ================================================================
// PUBLIC API (No auth)
// ================================================================
app.get('/api/public/config', async (req, res) => {
    const { data } = await supabase.from('website_config').select('*');
    const config = {};
    if (data) data.forEach(c => { config[c.key] = c.value; });
    res.json(config);
});

app.get('/api/public/posts/:category', async (req, res) => {
    const { data } = await supabase.from('categories_and_posts').select('*').eq('category', req.params.category).eq('is_active', true).order('sort_order').order('id', { ascending: false });
    res.json(data || []);
});

app.get('/api/public/slides', async (req, res) => {
    const { data } = await supabase.from('slides').select('*').eq('is_active', true).order('sort_order');
    res.json(data || []);
});

app.get('/api/public/partners', async (req, res) => {
    const { data } = await supabase.from('partners').select('*').eq('is_active', true).order('sort_order');
    res.json(data || []);
});

app.get('/api/public/testimonials', async (req, res) => {
    const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).order('sort_order');
    res.json(data || []);
});

app.get('/api/public/products', async (req, res) => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('sort_order');
    res.json(data || []);
});

// ================================================================
// SPA FALLBACK: Mọi route không phải API, không phải file tĩnh
// đều trả về betongphuongbac.com/index.html
// ================================================================
app.get('*', (req, res) => {
    // Bỏ qua các route API, tránh ghi đè
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API not found' });
    }
    // Bỏ qua các file có đuôi (file tĩnh đã được express.static xử lý)
    const ext = path.extname(req.path);
    if (ext && ['.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.xml', '.txt'].includes(ext.toLowerCase())) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, 'betongphuongbac.com', 'index.html'));
});

// ================================================================
// START
// ================================================================
app.listen(PORT, () => {
    console.log(`🚀 SUPER ADMIN ENGINE đang chạy tại cổng: ${PORT}`);
    console.log(`🔗 Supabase: ${SUPABASE_URL}`);
    console.log(`🌐 Admin: http://localhost:${PORT}/superadmin.html`);
});