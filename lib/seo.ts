import type { Metadata } from 'next';

/** Tên miền LIVE — thẻ Zalo/Facebook phải là URL tuyệt đối HTTPS. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ngoclinh.shopmartai.com'
).replace(/\/$/, '');

/** Copy giống trang Lovable (hesinhthaiai.lovable.app) — chỉ đổi domain. */
export const SHARE_TITLE = 'Hệ Sinh Thái AI - Học AI cùng Chuyên Gia';
export const SHARE_TITLE_FULL =
  'Hệ Sinh Thái AI - Học AI cùng Chuyên Gia | Mr Ngọc Linh';
export const SHARE_DESCRIPTION =
  'Chia sẻ hệ sinh thái AI với bạn. Học AI cùng chuyên gia Mr Ngọc Linh. Không cần kỹ năng vẫn chuyên nghiệp.';
export const SHARE_SITE_NAME = 'Hệ Sinh Thái AI';
export const SHARE_IMAGE_PATH = '/og/ngoclinh-og.jpg';
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;
export const SHARE_IMAGE_ALT = 'Ngọc Linh - Chuyên Gia AI — Phát triển Hệ Sinh Thái AI';

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

export function shareImage() {
  return {
    url: absoluteUrl(SHARE_IMAGE_PATH),
    secureUrl: absoluteUrl(SHARE_IMAGE_PATH),
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    alt: SHARE_IMAGE_ALT,
    type: 'image/jpeg',
  };
}

export function shareOpenGraph(opts?: {
  title?: string;
  description?: string;
  url?: string;
}): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    locale: 'vi_VN',
    url: opts?.url ?? `${SITE_URL}/`,
    siteName: SHARE_SITE_NAME,
    title: opts?.title ?? SHARE_TITLE,
    description: opts?.description ?? SHARE_DESCRIPTION,
    images: [shareImage()],
  };
}

export function shareTwitter(opts?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title: opts?.title ?? SHARE_TITLE,
    description: opts?.description ?? SHARE_DESCRIPTION,
    images: [absoluteUrl(SHARE_IMAGE_PATH)],
  };
}

/**
 * Bot chia sẻ — KHÔNG khớp chữ "Zalo" trần (WebView trong app Zalo
 * cũng chứa "Zalo", phải trả trang thật cho người mở link).
 */
export const SHARE_CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot-LinkExpanding|TelegramBot|WhatsApp|Pinterest|Discordbot|ZaloBot|ZaloShare|ZaloPreview|Embedly|redditbot|SkypeUriPreview|vkShare|Iframely|bitlybot|Quora Link Preview/i;

export const SEARCH_ENGINE_UA =
  /Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Applebot|Slurp|CoccocBot/i;

export function isShareCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && SHARE_CRAWLER_UA.test(userAgent);
}

/** Trang chủ siêu nhẹ cho bot Zalo/Facebook — tránh SSR 5s + HTML khổng lồ. */
export function shouldServeShareCard(opts: {
  method: string;
  pathname: string;
  userAgent: string | null | undefined;
  accept: string | null | undefined;
  secFetchDest: string | null | undefined;
  rsc: string | null | undefined;
}): boolean {
  if (opts.method !== 'GET' && opts.method !== 'HEAD') return false;
  if (opts.pathname !== '/' && opts.pathname !== '') return false;
  const ua = opts.userAgent || '';
  if (SEARCH_ENGINE_UA.test(ua)) return false;
  if (opts.rsc) return false;
  if (isShareCrawler(ua)) return true;
  // Bot lạ (Zalo đôi khi không ghi ZaloBot): không phải trình duyệt thật.
  if (opts.secFetchDest === 'document') return false;
  const accept = opts.accept || '';
  if (!opts.secFetchDest && (!accept || accept === '*/*')) return true;
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML siêu nhẹ cho crawler Zalo/Facebook.
 * Trang chủ Next.js SSR quá nặng (ảnh preload + JSON CMS) nên bot cắt sớm
 * và giữ cache cũ "Cửa Âu".
 */
export function shareCrawlerHtml(): string {
  const title = escapeHtml(SHARE_TITLE);
  const titleFull = escapeHtml(SHARE_TITLE_FULL);
  const description = escapeHtml(SHARE_DESCRIPTION);
  const siteName = escapeHtml(SHARE_SITE_NAME);
  const image = escapeHtml(absoluteUrl(SHARE_IMAGE_PATH));
  const url = escapeHtml(`${SITE_URL}/`);
  const alt = escapeHtml(SHARE_IMAGE_ALT);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleFull}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${siteName}">
<meta property="og:locale" content="vi_VN">
<meta property="og:type" content="website">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${SHARE_IMAGE_WIDTH}">
<meta property="og:image:height" content="${SHARE_IMAGE_HEIGHT}">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<img src="${image}" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" alt="${alt}">
</body>
</html>`;
}
