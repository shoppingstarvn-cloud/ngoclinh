const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;
const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;

function humanSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function assertUploadable(file: File) {
  if (!file) throw new Error('Không có file.');
  if (file.size <= 0) throw new Error('File rỗng.');
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error(`File quá nặng (${humanSize(file.size)}). Chọn ảnh/video dưới 12MB.`);
  }
  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  if (/heic|heif/i.test(mime) || /\.hei[cf]$/i.test(name)) {
    throw new Error('Ảnh HEIC (iPhone) chưa hỗ trợ. Anh xuất JPEG/PNG trong Ảnh rồi kéo lại.');
  }
  const ok =
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    /\.(jpe?g|png|webp|gif|svg|avif|mp4|webm|mov)$/i.test(name);
  if (!ok) {
    throw new Error('Chỉ nhận ảnh (JPG/PNG/WEBP/GIF) hoặc video MP4.');
  }
}

/** Nén ảnh lớn trên trình duyệt — tránh vượt giới hạn body của Vercel (~4.5MB). */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE_PX / bitmap.width, MAX_EDGE_PX / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return file;
  if (blob.size >= file.size && file.size < 2 * 1024 * 1024) return file;

  const base = (file.name || 'slide').replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export async function prepareUploadFile(file: File): Promise<File> {
  assertUploadable(file);
  return compressImageForUpload(file);
}

/**
 * Upload qua REST /api/upload — KHÔNG dùng Server Action.
 * Server Action mặc định chỉ ~1MB nên kéo thả ảnh slide hay ra
 * "An unexpected response was received from the server."
 */
// Cache kho lưu trữ đang dùng (drive nếu đã cấu hình biến môi trường, không thì supabase).
let _uploadBackend: 'drive' | 'supabase' | null = null;
async function uploadBackend(): Promise<'drive' | 'supabase'> {
  if (_uploadBackend) return _uploadBackend;
  try {
    const res = await fetch('/api/upload/backend', { credentials: 'include' });
    const json = (await res.json()) as { backend?: string };
    _uploadBackend = json.backend === 'drive' ? 'drive' : 'supabase';
  } catch {
    _uploadBackend = 'supabase';
  }
  return _uploadBackend;
}

function assertNotHeic(file: File) {
  if (!file || file.size <= 0) throw new Error('File rỗng hoặc không hợp lệ.');
  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  if (/heic|heif/i.test(mime) || /\.hei[cf]$/i.test(name)) {
    throw new Error('Ảnh HEIC (iPhone) chưa hỗ trợ. Anh xuất JPEG/PNG trong Ảnh rồi kéo lại.');
  }
}

/** Tải 1 file THẲNG lên Google Drive (không qua máy chủ, không giới hạn dung lượng). */
async function driveUpload(file: File): Promise<string> {
  assertNotHeic(file);
  // Ảnh vẫn nén để hiển thị nhanh; video/file lớn giữ nguyên → đẩy thẳng Drive.
  const prepared = file.type.startsWith('image/') ? await compressImageForUpload(file) : file;

  // 1) Xin phiên upload resumable từ máy chủ
  const sessRes = await fetch('/api/upload/drive-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: prepared.name,
      mimeType: prepared.type || 'application/octet-stream',
    }),
  });
  const sess = (await sessRes.json().catch(() => ({}))) as {
    success?: boolean;
    uploadUrl?: string;
    error?: string;
  };
  if (!sessRes.ok || !sess.success || !sess.uploadUrl) {
    if (sessRes.status === 401 || sessRes.status === 403) {
      throw new Error('Phiên đăng nhập hết hạn. Anh F5 rồi đăng nhập lại.');
    }
    throw new Error(sess.error || 'Không xin được phiên tải lên Drive.');
  }

  // 2) PUT file thẳng lên Drive — KHÔNG gửi Authorization; fetch tự stream file lớn.
  let put: Response;
  try {
    put = await fetch(sess.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': prepared.type || 'application/octet-stream' },
      body: prepared,
    });
  } catch {
    throw new Error('Tải lên Drive lỗi mạng (Failed to fetch). Anh kiểm tra mạng rồi thử lại.');
  }
  if (!put.ok) {
    let m = 'HTTP ' + put.status;
    try {
      const t = await put.text();
      if (t) m = t;
    } catch {
      /* noop */
    }
    throw new Error('Tải lên Drive lỗi: ' + m);
  }
  const info = (await put.json().catch(() => ({}))) as { id?: string };
  if (!info.id) throw new Error('Drive không trả về mã file.');

  // 3) Ghi metadata + đặt công khai → lấy URL dùng được
  const regRes = await fetch('/api/upload/drive-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      file_id: info.id,
      original_name: prepared.name,
      file_type: prepared.type || '',
    }),
  });
  const reg = (await regRes.json().catch(() => ({}))) as {
    success?: boolean;
    url?: string;
    error?: string;
  };
  if (!regRes.ok || !reg.success || !reg.url) {
    throw new Error(reg.error || 'Ghi file Drive thất bại.');
  }
  return reg.url;
}

export async function uploadMediaFile(file: File): Promise<string> {
  // Ưu tiên Google Drive khi đã cấu hình (không giới hạn dung lượng).
  const backend = await uploadBackend();
  if (backend === 'drive') {
    return driveUpload(file);
  }

  // Fallback: Supabase Storage qua /api/upload (giới hạn ~4.5MB của Vercel).
  const prepared = await prepareUploadFile(file);
  const formData = new FormData();
  formData.append('file', prepared, prepared.name);

  let res: Response;
  try {
    res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
  } catch {
    throw new Error('Không kết nối được server upload. Kiểm tra mạng rồi thử lại.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 413) {
      throw new Error('Ảnh vẫn quá nặng sau khi nén. Anh chọn ảnh dưới 8MB nhé.');
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('Phiên đăng nhập hết hạn. Anh F5 rồi đăng nhập lại.');
    }
    throw new Error(`Server không nhận file (mã ${res.status}). Thử ảnh nhỏ hơn hoặc đăng nhập lại.`);
  }

  const json = (await res.json()) as { success?: boolean; url?: string; error?: string };
  if (!res.ok || !json.success || !json.url) {
    throw new Error(json.error || 'Upload thất bại.');
  }
  return json.url;
}
