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
