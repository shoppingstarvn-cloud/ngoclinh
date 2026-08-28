import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { BUCKET_NAME } from '@/lib/supabase/admin';

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const ALLOWED_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.avif',
  '.mp4',
  '.webm',
  '.mov',
]);

export type StoredUpload = {
  url: string;
  fileName: string;
};

function getStorageClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(
    /\/$/,
    '',
  );
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) {
    throw new Error(
      'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trên Vercel. Vào Project → Settings → Environment Variables, thêm rồi Redeploy.',
    );
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_KEY đang bị nhầm sang anon key. Cần service_role key trong Supabase → Settings → API.',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeExt(file: File): string {
  const ext = path.extname(file.name || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/svg+xml') return '.svg';
  if (mime.startsWith('video/')) return '.mp4';
  return '.jpg';
}

function humanSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

async function ensurePublicBucket(supabase: SupabaseClient) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) return;

  const found = buckets?.find((b) => b.name === BUCKET_NAME || b.id === BUCKET_NAME);
  const options = {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ],
  };

  if (!found) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, options);
    if (createErr && !/already exists|duplicate/i.test(createErr.message)) {
      throw new Error(
        `Không tạo được kho ảnh "${BUCKET_NAME}": ${createErr.message}. Anh vào Supabase → Storage → New bucket → tên "${BUCKET_NAME}" → bật Public.`,
      );
    }
    return;
  }

  if (found.public === false) {
    await supabase.storage.updateBucket(BUCKET_NAME, { public: true, fileSizeLimit: MAX_UPLOAD_BYTES });
  }
}

/** Ghi file lên Supabase Storage bucket `uploads` và trả URL công khai. */
export async function storeAdminUpload(file: File): Promise<StoredUpload> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('Không nhận được file. Anh kéo thả lại hoặc chọn file từ máy.');
  }
  if (file.size <= 0) throw new Error('File rỗng.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Ảnh/video quá nặng (${humanSize(file.size)}). Giới hạn ${humanSize(MAX_UPLOAD_BYTES)}.`);
  }

  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  if (/heic|heif/i.test(mime) || /\.hei[cf]$/i.test(name)) {
    throw new Error('Ảnh HEIC (iPhone) chưa hỗ trợ. Anh mở Ảnh → xuất JPEG/PNG rồi kéo lại.');
  }
  if (mime && !ALLOWED_MIME.has(mime) && !mime.startsWith('image/')) {
    throw new Error(`Định dạng "${mime || name}" không hỗ trợ. Dùng JPG, PNG, WEBP, GIF hoặc MP4.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt(file)}`;
  const supabase = getStorageClient();
  await ensurePublicBucket(supabase);

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, buffer, {
    contentType: mime || 'image/jpeg',
    upsert: true,
    cacheControl: '3600',
  });

  if (error || !data) {
    const msg = error?.message || 'Upload lên Storage thất bại';
    if (/bucket|not found/i.test(msg)) {
      throw new Error(
        `Chưa có kho ảnh "${BUCKET_NAME}". Vào Supabase → Storage → New bucket → tên "${BUCKET_NAME}" → bật Public.`,
      );
    }
    if (/row-level security|permission|not allowed|unauthorized|jwt/i.test(msg)) {
      throw new Error(
        'Supabase từ chối ghi Storage. Kiểm tra SUPABASE_SERVICE_KEY (service_role) trên Vercel rồi Redeploy.',
      );
    }
    if (/mime|not allowed|invalid/i.test(msg)) {
      throw new Error(`Kho ảnh không nhận định dạng này. ${msg}`);
    }
    throw new Error(msg);
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path || fileName);
  if (!urlData?.publicUrl) throw new Error('Upload xong nhưng không lấy được URL công khai.');
  return { url: urlData.publicUrl, fileName: data.path || fileName };
}
