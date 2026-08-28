/** Nhận diện ảnh / video từ file upload hoặc URL (Drive không có đuôi file). */

export const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg|avif|bmp)$/i;
export const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|3gp)$/i;

export function isImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name || '');
}

export function isVideoFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  return VIDEO_EXT.test(file.name || '');
}

export function isAcceptedMediaFile(file: File, mode: 'image' | 'media'): boolean {
  if (isImageFile(file)) return true;
  if (mode === 'media' && isVideoFile(file)) return true;
  return false;
}

export function isVideoAsset(url?: string | null, mime?: string | null): boolean {
  if (mime && mime.toLowerCase().startsWith('video/')) return true;
  const v = String(url || '');
  if (!v) return false;
  if (/[#&?]media=video(?:&|$|#)/i.test(v)) return true;
  const path = v.split(/[?#]/)[0] || '';
  return VIDEO_EXT.test(path) || VIDEO_EXT.test(v);
}

/** Drive URL giống nhau cho ảnh và video — gắn hash để public render đúng thẻ <video>. */
export function tagIfVideo(url: string, file?: File): string {
  if (!url) return url;
  const isVid = (file && isVideoFile(file)) || isVideoAsset(url, file?.type);
  if (!isVid) return url;
  if (/[#&?]media=video(?:&|$|#)/i.test(url)) return url;
  return url.includes('#') ? `${url}&media=video` : `${url}#media=video`;
}

export function attachmentKindFromItem(url: string, type: string): 'image' | 'video' {
  return isVideoAsset(url, type) ? 'video' : 'image';
}

export function isVideoAttachment(a: { kind?: string; url?: string; type?: string }): boolean {
  if (a.kind === 'video') return true;
  if (a.kind === 'file') return false;
  return isVideoAsset(a.url, a.type);
}

export function isImageAttachment(a: { kind?: string; url?: string; type?: string }): boolean {
  if (isVideoAttachment(a)) return false;
  if (a.kind === 'file') return false;
  if (a.kind === 'image') return true;
  const t = (a.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  const url = String(a.url || '');
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  const path = url.split(/[?#]/)[0] || '';
  if (IMAGE_EXT.test(path)) return true;
  // Drive ảnh không có đuôi file — chỉ coi là ảnh khi chưa gắn #media=video.
  if (/lh3\.googleusercontent\.com\/d\//i.test(url)) return true;
  if (/drive\.google\.com\/(uc|thumbnail)/i.test(url)) return true;
  return false;
}

/** Lấy file id Google Drive từ mọi dạng URL (uc, preview, lh3, open?id=). */
export function extractDriveFileId(url?: string | null): string | null {
  const u = String(url || '');
  if (!u) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/api\/video\/drive\/([a-zA-Z0-9_-]+)/,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function driveThumbnailUrl(fileId: string, size = 'w1280'): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
}

export function driveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

/** Cùng origin — HTTP Range 206, khúc ≤4MB (dưới trần function Vercel). `v=` phá cache 404 cũ trên CDN. */
export function driveStreamApiUrl(fileId: string): string {
  return `/api/video/drive/${encodeURIComponent(fileId)}?v=3`;
}

export function driveStreamProxyApiUrl(fileId: string): string {
  return driveStreamApiUrl(fileId);
}

export function driveUsercontentDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

/** Ảnh poster khi Drive video không có frame (thẻ <video> download URL không load được). */
export function videoThumbUrl(url?: string | null): string | null {
  const id = extractDriveFileId(url);
  return id ? driveThumbnailUrl(id) : null;
}

/**
 * File phát được bằng HTML5 <video>.
 * Drive gốc (`uc?export=download`) không stream — dùng `/api/video/drive/:id`.
 * MOV/MKV lỗi codec thì VideoPlayer mới fallback iframe preview.
 */
export function isDirectPlayableVideoUrl(url?: string | null): boolean {
  const v = String(url || '').trim();
  if (!v) return false;
  if (/^(blob:|data:)/i.test(v)) return true;
  if (/\/api\/video\/drive\//i.test(v)) return true;
  if (extractDriveFileId(v) && /(?:drive\.google|googleusercontent\.com)/i.test(v)) return false;
  const path = v.split(/[?#]/)[0] || '';
  if (/supabase\.(co|in)\/storage/i.test(v)) {
    return /\.(mp4|webm|m4v)(\?|$)/i.test(path) || /video\/(mp4|webm)/i.test(v);
  }
  return /\.(mp4|webm|m4v)$/i.test(path);
}

export function videoPlaybackMode(url?: string | null): 'html5' | 'drive-iframe' {
  const v = String(url || '');
  if (extractDriveFileId(v)) return 'html5';
  if (isDirectPlayableVideoUrl(v)) return 'html5';
  return 'html5';
}
