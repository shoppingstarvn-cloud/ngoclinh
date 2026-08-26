import type { Metadata } from 'next';
import Script from 'next/script';
import {
  SHARE_DESCRIPTION,
  SHARE_IMAGE_ALT,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_TYPE,
  SHARE_IMAGE_WIDTH,
  shareImageUrl,
  SHARE_SITE_NAME,
  SHARE_TITLE,
  SHARE_TITLE_FULL,
  SITE_URL,
  shareOpenGraph,
  shareTwitter,
} from '@/lib/seo';
import './globals.css';
import ContentGate from '@/components/gate/ContentGate';

const SHOPMARTAI_FAVICON = '/logo/shopmartai-ai.png';

// Metadata tĩnh — không await Supabase, để <head> ra ngay cho crawler.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SHARE_TITLE_FULL,
    template: '%s | Ngọc Linh',
  },
  description: SHARE_DESCRIPTION,
  openGraph: shareOpenGraph(),
  twitter: shareTwitter(),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: `${SHOPMARTAI_FAVICON}?v=20260818`, type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: `${SHOPMARTAI_FAVICON}?v=20260818`,
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* OG đặt đầu <head> — crawler Zalo cắt HTML sớm, không đợi preload ảnh. */}
        <meta property="og:title" content={SHARE_TITLE} />
        <meta property="og:description" content={SHARE_DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:site_name" content={SHARE_SITE_NAME} />
        <meta property="og:locale" content="vi_VN" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={shareImageUrl()} />
        <meta property="og:image:secure_url" content={shareImageUrl()} />
        <meta property="og:image:type" content={SHARE_IMAGE_TYPE} />
        <meta property="og:image:width" content={String(SHARE_IMAGE_WIDTH)} />
        <meta property="og:image:height" content={String(SHARE_IMAGE_HEIGHT)} />
        <meta property="og:image:alt" content={SHARE_IMAGE_ALT} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SHARE_TITLE} />
        <meta name="twitter:description" content={SHARE_DESCRIPTION} />
        <meta name="twitter:image" content={shareImageUrl()} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href={`${SHOPMARTAI_FAVICON}?v=20260818`} />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href={`${SHOPMARTAI_FAVICON}?v=20260818`} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css"
        />
        {/* Font gốc của theme (Oswald + Roboto Condensed) — thiếu font này làm vỡ toàn bộ typography/spacing */}
        <link
          href="https://fonts.googleapis.com/css?family=Oswald:400,500,600,700|Roboto+Condensed:400,400i,700&subset=vietnamese"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css"
        />
        <link rel="stylesheet" href="/css/normalize.css" />
        <link rel="stylesheet" href="/css/css/layout.css" />
        <link rel="stylesheet" href="/css/css/register/register.css" />
        <link rel="stylesheet" href="/css/css/contact/contact.css" />
        <link rel="stylesheet" href="/css/css/news/news.css" />
        <link rel="stylesheet" href="/css/css/product/product.css" />
        <link rel="stylesheet" href="/css/animate/animate.css" />
        <link rel="stylesheet" href="/css/css/owlcarousel/assets/owl.carousel.min.css" />
        <link rel="stylesheet" href="/css/css/owlcarousel/assets/owl.theme.default.min.css" />
      </head>
      <body>
        {children}
        {/* Cổng mật khẩu xem nội dung (chỉ khối "Hoạt động phong trào") — chặn click toàn cục */}
        <ContentGate />
        {/* jQuery PHẢI nạp trước Bootstrap JS và Owl Carousel JS (giữ đúng thứ tự như bản tĩnh cũ) */}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/js/bootstrap.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
