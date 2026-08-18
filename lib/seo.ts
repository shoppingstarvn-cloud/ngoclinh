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
