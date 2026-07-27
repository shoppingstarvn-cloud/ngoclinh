/** Slugify — cùng thuật toán scripts/build-detail-map.js & detail-sync.js */

export function noAccent(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function slugify(s: string, maxLen = 120): string {
  return noAccent(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
}

export function itemHref(item: {
  slug?: string | null;
  link_url?: string | null;
}): string {
  const u = (item.link_url || '').trim();
  if (u) return /^(https?:|\/|#)/.test(u) ? u : `/${u}`;
  if (item.slug) return `/${item.slug}.html`;
  return '#';
}

/**
 * Chuẩn hoá URL ảnh/video lấy từ Supabase (site_settings, categories...).
 * Một số bản ghi cũ lưu đường dẫn thiếu dấu "/" đầu (VD: "images/logo.png"),
 * khiến trình duyệt hiểu nhầm thành đường dẫn CON của trang hiện tại (ví dụ
 * trang "/san-pham-abc.html" sẽ tìm nhầm "/images/logo.png" thành lỗi ở các
 * URL lồng nhiều cấp) → ảnh vỡ tuỳ trang. Luôn trả về URL tuyệt đối từ gốc
 * domain hoặc giữ nguyên nếu đã là http(s)/data URL.
 *
 * Bản ghi HTTrack cũ còn lưu "/https://cdn..." hoặc "../https://cdn..." —
 * gỡ prefix "./" / "../" / "/" trước khi nhận diện URL tuyệt đối.
 */
export function assetUrl(u?: string | null): string {
  let v = (u || '').trim();
  if (!v) return '';
  // Gỡ ../ hoặc ./ lặp (nội dung HTML cũ trong trang chi tiết)
  v = v.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  // Bản ghi cũ đôi khi lưu "/https://..." — sửa về URL tuyệt đối chuẩn
  const fixed = v.replace(/^\/+(https?:)/i, '$1');
  if (/^(https?:|data:|blob:)/i.test(fixed)) return fixed;
  if (fixed.startsWith('/')) return fixed;
  return `/${fixed}`;
}

/** Host CDN ngoài đã chết / không phải ảnh sản phẩm thật (emoji FB, vacdn 404…) */
const UNTRUSTED_MEDIA_HOST =
  /(vacdn\.link|static\.xx\.fbcdn\.net|emoji\.php|uphinhnhanh\.com|rongbaycdn\.com|nhadepkientruc\.com)/i;

/** Ảnh/logo hợp lệ để hiển thị trên site (loại URL HTML / trang web / rỗng / hỏng) */
export function isValidAssetUrl(u?: string | null): boolean {
  const v = assetUrl(u);
  if (!v) return false;
  if (/\.html?($|\?|#)/i.test(v)) return false;
  if (/^https?:\/\/[^/]+\/?$/i.test(v)) return false;
  if (UNTRUSTED_MEDIA_HOST.test(v)) return false;
  // Phải là file ảnh / đường dẫn media — không chấp nhận URL trang web làm “logo”
  if (/\.(png|jpe?g|webp|gif|svg|avif)($|\?)/i.test(v)) return true;
  if (v.startsWith('/images/') || v.startsWith('/hpm/') || v.startsWith('/uploads/')) return true;
  if (v.includes('/storage/v1/object/')) return true;
  if (v.startsWith('data:image/')) return true;
  return false;
}

/**
 * Ảnh tin cậy cho carousel trang chủ: chỉ local (/images, /hpm, /uploads)
 * hoặc Supabase Storage — tránh CDN ngoài dễ 404 / bị chặn hotlink.
 */
export function isTrustedMediaUrl(u?: string | null): boolean {
  if (!isValidAssetUrl(u)) return false;
  const v = assetUrl(u);
  if (v.startsWith('/images/') || v.startsWith('/hpm/') || v.startsWith('/uploads/')) return true;
  if (v.includes('/storage/v1/object/')) return true;
  if (v.startsWith('data:image/')) return true;
  return false;
}

export function postHref(slug?: string | null): string {
  if (!slug) return '#';
  if (/^(https?:|\/)/.test(slug)) {
    return /\.html?$/i.test(slug) ? slug : `${slug}.html`;
  }
  return `/${slug}.html`;
}
