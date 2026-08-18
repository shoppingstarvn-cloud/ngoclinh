import { NextRequest, NextResponse } from 'next/server';
import { getLegacyPathForSlug } from '@/lib/detail-map';
import { shareCrawlerHtml, shouldServeShareCard } from '@/lib/seo';

// detail-map.ts đọc file bằng 'fs' — cần Node.js runtime (Edge không hỗ trợ 'fs').
// Next.js 15+ hỗ trợ Node.js Middleware ổn định qua cấu hình này.
export const runtime = 'nodejs';

const STATIC_PREFIXES = [
  '/css',
  '/images',
  '/hpm',
  '/uploads',
  '/_next',
  '/api',
  '/favicon.ico',
  '/admin', // dashboard React mới (/admin, /admin/*)
  '/og',
  '/logo',
  '/og-image.jpg',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    shouldServeShareCard({
      method: request.method,
      pathname,
      userAgent: request.headers.get('user-agent'),
      accept: request.headers.get('accept'),
      secFetchDest: request.headers.get('sec-fetch-dest'),
      rsc: request.headers.get('rsc') || request.headers.get('next-router-prefetch'),
    })
  ) {
    return new NextResponse(shareCrawlerHtml(), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  }

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Legacy index.php paths → App Router catch-all.
  // PHẢI kiểm tra TRƯỚC nhánh "/slug.html" bên dưới, nếu không
  // "/index.php/xxx-p12.html" sẽ bị nhánh đó bắt nhầm trước (cả hai đều
  // kết thúc bằng .html) và không bao giờ tới được /legacy/*.
  if (pathname.startsWith('/index.php/')) {
    const rest = pathname.replace(/^\/index\.php\/?/, '');
    const url = request.nextUrl.clone();
    url.pathname = `/legacy/${rest}`;
    return NextResponse.rewrite(url);
  }

  // Chặn phục vụ HTML tĩnh trang chủ cũ (nếu còn sót trong public) — luôn dùng App Router.
  if (pathname === '/index.html' || pathname === '/index-2.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 301);
  }

  // Legacy: /slug.html → giữ URL, rewrite nội bộ sang /slug (App Router)
  if (pathname.endsWith('.html') && pathname !== '/admin.html' && pathname !== '/superadmin.html') {
    const slug = decodeURIComponent(pathname.slice(1, -5));
    if (slug && slug !== 'index' && slug !== 'index-2') {
      const legacy = getLegacyPathForSlug(slug);
      if (legacy && legacy !== pathname) {
        // Slug có bản ghi legacy index.php — ưu tiên canonical legacy URL (SEO)
        const url = request.nextUrl.clone();
        url.pathname = legacy;
        return NextResponse.redirect(url, 301);
      }
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
