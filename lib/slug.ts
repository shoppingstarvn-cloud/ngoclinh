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

/**
 * Chuẩn hoá 1 link admin nhập tay để KHÔNG bị ghép nhầm domain phía trước.
 *
 * Vấn đề gốc: link "trần" như "shopmartai.com" hay "www.abc.vn/x" không bắt đầu
 * bằng http(s):// nên bị code cũ thêm "/" → trình duyệt hiểu là trang CON của
 * ngoclinh.shopmartai.com → 404. Hàm này nhận diện tên miền để tự thêm https://
 *
 * Quy tắc:
 *  - rỗng/"#"           -> "#"
 *  - #neo, mailto:, tel: -> giữ nguyên
 *  - http(s):// hoặc //cdn -> giữ nguyên (LINK NGOÀI)
 *  - www.xxx            -> https://www.xxx (LINK NGOÀI)
 *  - đoạn đầu giống tên miền có phần mở rộng (.com/.vn/...) và KHÔNG phải trang
 *    .html -> https://... (LINK NGOÀI)
 *  - bắt đầu bằng "/"   -> nội bộ, giữ nguyên
 *  - còn lại (slug, x.html) -> nội bộ, thêm "/"
 */
export function resolveHref(raw?: string | null): string {
  const u = (raw || '').trim();
  if (!u || u === '#') return '#';
  if (/^(#|mailto:|tel:)/i.test(u)) return u;
  if (/^(https?:)?\/\//i.test(u) || /^https?:/i.test(u)) return u;
  if (/^www\./i.test(u)) return `https://${u}`;
  const firstSeg = u.split(/[/?#]/)[0];
  const looksDomain =
    /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(firstSeg) && /\.[a-z]{2,}$/i.test(firstSeg);
  const isHtmlPage = /\.html?$/i.test(firstSeg);
  if (looksDomain && !isHtmlPage) return `https://${u}`;
  if (u.startsWith('/')) return u;
  return `/${u}`;
}

export function itemHref(item: {
  slug?: string | null;
  link_url?: string | null;
}): string {
  const u = (item.link_url || '').trim();
  if (u) return resolveHref(u);
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
  // Ảnh Google Drive (upload qua app) — link không có đuôi file nhưng vẫn là ảnh thật.
  if (/lh3\.googleusercontent\.com\/d\//i.test(v)) return true;
  if (/drive\.google\.com\/(uc|thumbnail)/i.test(v)) return true;
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
  if (/lh3\.googleusercontent\.com\/d\//i.test(v)) return true;
  if (/drive\.google\.com\/(uc|thumbnail)/i.test(v)) return true;
  if (v.startsWith('data:image/')) return true;
  return false;
}

export function postHref(slug?: string | null): string {
  if (!slug) return '#';
  const s = String(slug).trim();
  // Link ngoài (có scheme / www / tên miền) -> để resolveHref xử lý, KHÔNG ép .html
  if (/^(https?:|\/\/|www\.)/i.test(s)) return resolveHref(s);
  const firstSeg = s.split(/[/?#]/)[0];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(firstSeg) && /\.[a-z]{2,}$/i.test(firstSeg) && !/\.html?$/i.test(firstSeg)) {
    return resolveHref(s);
  }
  // Nội bộ: trang chi tiết .html
  if (s.startsWith('/')) return /\.html?$/i.test(s) ? s : `${s}.html`;
  return /\.html?$/i.test(s) ? `/${s}` : `/${s}.html`;
}
