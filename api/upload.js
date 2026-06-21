// Vercel Serverless Function for file upload
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bfruxinvvvaqufghtigw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_QUYv4qEJntioJJ-XWtHkdA_haHovSml";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            // Try base64 upload
            const { file, fileName } = req.body || {};
            if (!file) throw new Error('Không có file!');
            
            const buffer = Buffer.from(file.replace(/^data:.+;base64,/, ''), 'base64');
            const ext = fileName ? fileName.split('.').pop() : 'jpg';
            const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            
            const { data, error } = await supabase.storage
                .from('website-images')
                .upload(name, buffer, { contentType: `image/${ext}`, upsert: true });
            
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('website-images').getPublicUrl(name);
            
            return res.json({ success: true, url: publicUrl, fileName: name });
        }
        
        // For multipart, we'd need a parser, but Vercel handles this via body parser
        // Fallback to reading raw body
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks);
        
        // Extract file from multipart
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) throw new Error('No boundary');
        
        const parts = raw.toString('latin1').split(`--${boundary}`);
        let fileBuffer = null;
        let fileName = `upload-${Date.now()}.jpg`;
        
        for (const part of parts) {
            if (part.includes('Content-Disposition: form-data; name="file"')) {
                const headerEnd = part.indexOf('\r\n\r\n') + 4;
                const content = part.substring(headerEnd).trim();
                // Remove trailing boundary markers
                const clean = content.replace(/\r?\n--$/, '');
                fileBuffer = Buffer.from(clean, 'latin1');
                
                // Try to get filename
                const nameMatch = part.match(/filename="([^"]+)"/);
                if (nameMatch) {
                    const originalName = nameMatch[1];
                    const ext = originalName.split('.').pop() || 'jpg';
                    fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                }
            }
        }
        
        if (!fileBuffer) throw new Error('Không tìm thấy file trong request!');
        
        const ext = fileName.split('.').pop();
        const { data, error } = await supabase.storage
            .from('website-images')
            .upload(fileName, fileBuffer, { contentType: `image/${ext}`, upsert: true });
        
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('website-images').getPublicUrl(fileName);
        
        res.json({ success: true, url: publicUrl, fileName });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
};