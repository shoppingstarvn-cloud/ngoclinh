import type { Metadata } from 'next';
import Script from 'next/script';
import { getSiteSettings } from '@/lib/data/homepage';
import { assetUrl } from '@/lib/slug';
import './globals.css';

const SHOPMARTAI_FAVICON = '/logo/shopmartai-ai.png';

export async function generateMetadata(): Promise<Metadata> {
  let favicon = SHOPMARTAI_FAVICON;
  try {
    const settings = await getSiteSettings();
    const fromCms = assetUrl(settings.favicon_url);
    if (fromCms) favicon = fromCms;
  } catch {
    // Tab luôn có logo ShopMartAI nếu CMS tạm lỗi
  }

  return {
    title: {
      default: 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU',
      template: '%s | CỬA ÂU',
    },
    description: 'Sản xuất cống bê tông đúc sẵn chất lượng cao — Cửa Âu',
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://ngoclinh.shopmartai.com',
    ),
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: `${favicon}?v=20260818`, type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      shortcut: `${favicon}?v=20260818`,
      apple: '/apple-touch-icon.png',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
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
        <link rel="stylesheet" href="/css/css/contact/contact.css" />
        <link rel="stylesheet" href="/css/css/news/news.css" />
        <link rel="stylesheet" href="/css/css/product/product.css" />
        <link rel="stylesheet" href="/css/animate/animate.css" />
        <link rel="stylesheet" href="/css/css/owlcarousel/assets/owl.carousel.min.css" />
        <link rel="stylesheet" href="/css/css/owlcarousel/assets/owl.theme.default.min.css" />
      </head>
      <body>
        {children}
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
