const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cuaau-superadmin-secret-2026';

// === SUPABASE CONFIG ===
const SUPABASE_URL = process.env.SUPABASE_URL || "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// Supabase client cho public read (dùng anon key)
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Supabase client cho admin write (dùng service role key)
const supabase = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'uploads';

// ================================================================
// BẢN ĐỒ SLUG → TRANG CHI TIẾT THẬT
// Trang chủ (realtime-data.js) sinh link /<slug>.html từ Supabase, nhưng
// file chi tiết thật nằm trong public/index.php/...-p<n>.html. Bản đồ này
// giúp server chuyển hướng /<slug>.html → đúng file, hết lỗi "Not found".
// File public/_detail-map.json sinh tự động bằng scripts/build-detail-map.js
// ================================================================
let DETAIL_MAP = {};
try {
  DETAIL_MAP = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', '_detail-map.json'), 'utf8'));
  console.log('🗺️  Đã nạp bản đồ chi tiết:', Object.keys(DETAIL_MAP).length, 'slug');
} catch (e) {
  console.warn('⚠️  Không nạp được _detail-map.json:', e.message);
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ================================================================
// CẤU HÌNH ĐƯỜNG DẪN TĨNH & TRANG CHỦ
// ================================================================
const ROOT_DIR = process.cwd();
// Serve từ thư mục public/ (nơi chứa index.html, CSS, JS, images)
app.use(express.static(path.join(ROOT_DIR, 'public')));
app.use('/uploads', express.static(path.join(ROOT_DIR, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
});

// ================================================================
// ADMIN AUTH MIDDLEWARE
// ================================================================
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Chưa xác thực!' });
  }
  const token = authHeader.slice(7);
  try {
    // Decode JWT đơn giản
    const parts = token.split(':');
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) {
      return res.status(401).json({ success: false, error: 'Token hết hạn!' });
    }
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ!' });
  }
}

function generateToken(admin) {
  const payload = {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url') + ':' + Date.now();
}

// ================================================================
// AUTH API (/api/auth/*)
// ================================================================
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ success: false, error: 'Nhập mật khẩu!' });

  // Check hardcoded passwords (compatibility)
  const hardcodedPasswords = ["8386", "admin", "cuaau@2026"];
  if (hardcodedPasswords.includes(password)) {
    const token = generateToken({ id: 0, username: 'admin', role: 'superadmin', full_name: 'Super Admin' });
    return res.json({ success: true, token, user: { username: 'admin', role: 'superadmin', full_name: 'Super Admin' } });
  }

  // Check Supabase admin_users (so sánh mật khẩu ĐÃ BĂM - sha256)
  // Tương thích ngược: chấp nhận cả bản ghi còn lưu plaintext (trong lúc chuyển đổi)
  try {
    const hashed = crypto.createHash('sha256').update(password).digest('hex');
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    const user = (data || []).find(u => u.password_hash === hashed || u.password_hash === password);
    if (user) {
      const token = generateToken(user);
      await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
      return res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
    }
  } catch(e) {}
  res.json({ success: false, error: 'Sai mật khẩu!' });
});

app.post('/api/auth/verify', adminAuth, (req, res) => {
  res.json({ success: true, user: req.admin });
});

// ================================================================
// CRUD GENERATOR: Tự động tạo CRUD cho tất cả các bảng CMS
// ================================================================
const CMS_TABLES = [
  { table: 'site_settings', label: 'Cài đặt', pk: 'id', publicRead: true },
  { table: 'menus', label: 'Menu', pk: 'id', publicRead: true },
  { table: 'categories', label: 'Danh mục', pk: 'id', publicRead: true },
  { table: 'posts', label: 'Bài viết', pk: 'id', publicRead: true },
  { table: 'projects', label: 'Dự án', pk: 'id', publicRead: true },
  { table: 'products', label: 'Sản phẩm', pk: 'id', publicRead: true },
  { table: 'slides', label: 'Slide', pk: 'id', publicRead: true },
  { table: 'images', label: 'Hình ảnh', pk: 'id', publicRead: true },
  { table: 'videos', label: 'Video', pk: 'id', publicRead: true },
  { table: 'partners', label: 'Đối tác', pk: 'id', publicRead: true },
  { table: 'testimonials', label: 'Đánh giá', pk: 'id', publicRead: true },
  { table: 'links', label: 'Liên kết', pk: 'id', publicRead: true },
  { table: 'contact_submissions', label: 'Liên hệ', pk: 'id', publicRead: false },
];

// --- PUBLIC READ (GET /api/public/:table) ---
CMS_TABLES.filter(t => t.publicRead).forEach(({ table, pk }) => {
  app.get(`/api/public/${table}`, async (req, res) => {
    try {
      let query = supabasePublic.from(table).select('*');
      // Lọc is_active
      if (table !== 'site_settings' && table !== 'contact_submissions') {
        query = query.eq('is_active', true);
      }
      // Lọc status cho posts
      if (table === 'posts') {
        query = query.eq('status', 'published');
      }
      // Order - try with created_at, fallback if column doesn't exist
      try {
        if (['slides', 'menus', 'categories', 'products', 'partners', 'testimonials', 'links', 'images', 'videos'].includes(table)) {
          query = query.order('display_order', { ascending: true }).order('created_at', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }
      } catch(e) {}
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (e) {
      // Fallback: try without ordering
      try {
        let fallbackQuery = supabasePublic.from(table).select('*');
        if (table !== 'site_settings' && table !== 'contact_submissions') {
          fallbackQuery = fallbackQuery.eq('is_active', true);
        }
        if (table === 'posts') {
          fallbackQuery = fallbackQuery.eq('status', 'published');
        }
        const { data } = await fallbackQuery;
        res.json({ success: true, data: data || [] });
      } catch (e2) {
        res.json({ success: false, error: e.message });
      }
    }
  });

  // GET by ID
  app.get(`/api/public/${table}/:id`, async (req, res) => {
    try {
      const { data, error } = await supabasePublic.from(table).select('*').eq(pk, req.params.id).single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (e) {
      res.status(404).json({ success: false, error: e.message });
    }
  });
});

// --- ADMIN CRUD (GET/POST/PUT/DELETE /api/admin/:table) ---
CMS_TABLES.forEach(({ table, pk }) => {
  // GET ALL (admin - kể cả inactive)
  app.get(`/api/admin/${table}`, adminAuth, async (req, res) => {
    try {
      let query = supabase.from(table).select('*');
      // Filter by query params
      const { is_active, category_id, album_id, status } = req.query;
      if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
      if (category_id) query = query.eq('category_id', category_id);
      if (album_id) query = query.eq('album_id', album_id);
      if (status) query = query.eq('status', status);
      
      // Order
      if (['slides', 'menus', 'categories', 'products', 'partners', 'testimonials', 'links', 'images', 'videos'].includes(table)) {
        query = query.order('display_order', { ascending: true });
      }
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // GET by ID
  app.get(`/api/admin/${table}/:id`, adminAuth, async (req, res) => {
    try {
      const { data, error } = await supabase.from(table).select('*').eq(pk, req.params.id).single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (e) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  // POST (Create)
  app.post(`/api/admin/${table}`, adminAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      delete body.id; // Không cho set ID
      body.created_at = new Date().toISOString();
      body.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from(table).insert(body).select();
      if (error) throw error;
      res.json({ success: true, data: data?.[0] || data });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // PUT (Update)
  app.put(`/api/admin/${table}/:id`, adminAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      delete body.id;
      delete body.created_at;
      body.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from(table).update(body).eq(pk, req.params.id).select();
      if (error) throw error;
      res.json({ success: true, data: data?.[0] || data });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // DELETE
  app.delete(`/api/admin/${table}/:id`, adminAuth, async (req, res) => {
    try {
      const { error } = await supabase.from(table).delete().eq(pk, req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });
});

// ================================================================
// FILE UPLOAD - Upload to Supabase Storage
// ================================================================
app.post('/api/upload', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('Không có file!');
    const file = req.file;
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    
    // Upload to local /uploads directory
    const localDir = path.join(ROOT_DIR, 'uploads');
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    fs.writeFileSync(localPath, file.buffer);
    const localUrl = `/uploads/${fileName}`;

    // Upload to Supabase Storage
    let supabaseUrl = null;
    try {
      const { data: sbData, error: sbError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });
      if (!sbError && sbData) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        supabaseUrl = publicUrl;
      }
    } catch(e) { /* Silent fallback to local */ }

    res.json({ 
      success: true, 
      url: supabaseUrl || localUrl,
      localUrl,
      supabaseUrl,
      fileName 
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ================================================================
// PUBLIC API
// ================================================================
app.get('/api/public/config', async (req, res) => {
  const { data } = await supabasePublic.from('site_settings').select('*');
  const config = {};
  if (data) data.forEach(c => { config[c.key] = c.value; });
  res.json(config);
});

app.post('/api/public/contact', async (req, res) => {
  try {
    const { full_name, phone, email, subject, message } = req.body;
    const { error } = await supabase.from('contact_submissions').insert({
      full_name, phone, email, subject, message
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ================================================================
// ADMIN: Lấy tất cả dữ liệu cho admin (1 request duy nhất)
// ================================================================
app.get('/api/admin/all-data', adminAuth, async (req, res) => {
  try {
    const result = {};
    for (const { table } of CMS_TABLES) {
      const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(500);
      result[table] = data || [];
    }
    res.json({ success: true, data: result });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ================================================================
// SYNC ENGINE
// ================================================================
app.post('/api/sync/files-to-supabase', adminAuth, async (req, res) => {
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
          } else if (entry.name.endsWith('.html') && entry.name !== 'superadmin.html' && entry.name !== 'admin.html') {
            htmlFiles.push(fullPath);
          }
        }
      } catch(e) {}
    }
    findHtmlFiles(ROOT_DIR);
    
    for (const filePath of htmlFiles) {
      results.scanned++;
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
      let pageSlug = relativePath.replace('.html', '').replace(/[/\\]/g, '-').replace(/[^a-zA-Z0-9-_]/g, '-');
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1] : '';
      
      const { data: existing } = await supabase.from('posts').select('id').eq('slug', pageSlug).maybeSingle();
      if (!existing) {
        await supabase.from('posts').insert({
          title: title, slug: pageSlug, content: content.substring(0, 100000), status: 'published'
        });
        results.updated++;
      }
    }
    res.json({ success: true, scanned: results.scanned, updated: results.updated });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ================================================================
// SPA FALLBACK
// ================================================================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API not found' });
    }
    const ext = path.extname(req.path);

    // CHUYỂN HƯỚNG trang chi tiết: /<slug>.html không có file → tìm trong bản đồ
    if (ext.toLowerCase() === '.html') {
        try {
            const slug = decodeURIComponent(req.path.replace(/^\/+/, '').replace(/\.html$/i, ''));
            const target = DETAIL_MAP[slug];
            if (target && target !== req.path) {
                return res.redirect(301, target);
            }
        } catch (e) { /* bỏ qua, rơi xuống 404 */ }
    }

    if (ext && ['.html', '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.xml', '.txt'].includes(ext.toLowerCase())) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
});

// ================================================================
// START (chỉ chạy local, không chạy trên Vercel)
// ================================================================
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 SUPER ADMIN ENGINE đang chạy tại cổng: ${PORT}`);
        console.log(`🔗 Supabase: ${SUPABASE_URL}`);
        console.log(`🌐 Admin: http://localhost:${PORT}/admin.html`);
        console.log(`🌐 Website: http://localhost:${PORT}/`);
    });
}

module.exports = app;