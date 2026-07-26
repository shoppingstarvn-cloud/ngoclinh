import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU',
    template: '%s | CỬA ÂU',
  },
  description: 'Sản xuất cống bê tông đúc sẵn chất lượng cao — Cửa Âu',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://webbetonglammau.vercel.app',
  ),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/images/favicon/8446logo_bt.png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css"
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
        <Script
          src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/js/bootstrap.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
