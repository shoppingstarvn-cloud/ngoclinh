// ============ SUPABASE STORAGE UPLOAD HANDLER ============
// Xử lý upload file trực tiếp lên Supabase Storage thay vì nhập URL

const UPLOAD_BUCKET = 'uploads'; // Tên bucket trên Supabase Storage
let uploadedFiles = {}; // Cache các file đã upload

// Upload file lên Supabase Storage
async function uploadToSupabaseStorage(file, folder = '') {
    try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = folder ? `${folder}/${timestamp}-${safeName}` : `${timestamp}-${safeName}`;
        
        const { data, error } = await _supabase.storage
            .from(UPLOAD_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = _supabase.storage
            .from(UPLOAD_BUCKET)
            .getPublicUrl(fileName);
        
        return { success: true, url: publicUrl, path: fileName };
    } catch (e) {
        console.error('[Upload Error]', e);
        return { success: false, error: e.message };
    }
}

// Render upload zone cho các trường image_url, logo_url, thumbnail_url, file_path, avatar_url
function renderUploadZone(fieldId, fieldKey, currentValue = '') {
    const isImageField = ['image_url', 'logo_url', 'thumbnail_url', 'file_path', 'avatar_url'].includes(fieldKey);
    if (!isImageField) return null; // Chỉ áp dụng cho các trường ảnh
    
    const zoneId = `upload-zone-${fieldId}`;
    const previewId = `upload-preview-${fieldId}`;
    const progressId = `upload-progress-${fieldId}`;
    
    setTimeout(() => {
        initUploadZone(fieldId, fieldKey, zoneId, previewId, progressId);
    }, 100);
    
    return `
        <div class="upload-zone" id="${zoneId}">
            <i class="fas fa-cloud-upload-alt"></i>
            <p><strong>Kéo thả</strong> file vào đây hoặc <strong>click để chọn</strong></p>
            <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0">Hỗ trợ: JPG, PNG, GIF, WEBP (max 10MB)</p>
            <input type="file" accept="image/*" multiple style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer">
        </div>
        <div class="upload-progress" id="${progressId}" style="display:none">
            <div class="upload-progress-bar"></div>
        </div>
        <div class="upload-preview" id="${previewId}"></div>
        <p style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:10px">Hoặc nhập URL thủ công:</p>
        <input class="form-control" id="${fieldId}" value="${currentValue}" placeholder="https://...">
    `;
}

// Khởi tạo upload zone với drag & drop
function initUploadZone(fieldId, fieldKey, zoneId, previewId, progressId) {
    const zone = document.getElementById(zoneId);
    const input = zone?.querySelector('input[type=file]');
    const preview = document.getElementById(previewId);
    const progress = document.getElementById(progressId);
    const urlInput = document.getElementById(fieldId);
    
    if (!zone || !input) return;
    
    // Drag & drop events
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) handleFileUpload(files, fieldId, preview, progress, urlInput);
    });
    
    // File input change
    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length) handleFileUpload(files, fieldId, preview, progress, urlInput);
    });
}

// Xử lý upload files
async function handleFileUpload(files, fieldId, previewEl, progressEl, urlInputEl) {
    if (!files.length) return;
    
    // Show progress
    if (progressEl) {
        progressEl.style.display = 'block';
        const bar = progressEl.querySelector('.upload-progress-bar');
        bar.style.width = '0%';
    }
    
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        if (progressEl) {
            const bar = progressEl.querySelector('.upload-progress-bar');
            bar.style.width = `${((i + 1) / files.length) * 100}%`;
        }
        
        const result = await uploadToSupabaseStorage(file, 'images');
        if (result.success) {
            results.push(result);
            
            // Show preview
            if (previewEl) {
                const img = document.createElement('img');
                img.src = result.url;
                img.title = file.name;
                previewEl.appendChild(img);
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Upload thất bại',
                text: `File ${file.name}: ${result.error}`,
                background: '#1a1a2e',
                color: '#fff'
            });
        }
    }
    
    // Hide progress
    setTimeout(() => {
        if (progressEl) progressEl.style.display = 'none';
    }, 500);
    
    // Điền URL vào input (nếu chỉ 1 file)
    if (results.length === 1 && urlInputEl) {
        urlInputEl.value = results[0].url;
        Swal.fire({
            icon: 'success',
            title: 'Upload thành công!',
            text: 'URL đã được điền tự động',
            timer: 1500,
            showConfirmButton: false,
            background: '#1a1a2e',
            color: '#fff'
        });
    } else if (results.length > 1) {
        Swal.fire({
            icon: 'success',
            title: `Upload ${results.length} ảnh thành công!`,
            text: 'Chọn 1 ảnh để gán URL, hoặc sử dụng module "Thư viện ảnh"',
            background: '#1a1a2e',
            color: '#fff'
        });
    }
    
    uploadedFiles[fieldId] = results;
}

console.log('📤 Upload Handler loaded');
