import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL, shareCrawlerHtml, shouldServeShareCard } from '@/lib/seo';

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
  '/hsai.html',
];

const PASSTHROUGH_HTML = new Set(['/admin.html', '/superadmin.html', '/hsai.html']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    shouldServeShareCard({
      method: request.method,
      pathname,
      userAgent: request.headers.get('user-agent'),
      accept: request.headers.get('accept'),
      secFetchDest: request.headers.get('sec-fetch-dest'),
      secFetchMode: request.headers.get('sec-fetch-mode'),
      secFetchUser: request.headers.get('sec-fetch-user'),
      rsc: request.headers.get('rsc') || request.headers.get('next-router-prefetch'),
    })
  ) {
    const path = pathname.replace(/\/+$/, '') || '/';
    const isLanding = path === '/hsai' || path === '/ai' || path === '/share-card';
    return new NextResponse(
      shareCrawlerHtml({
        pageUrl: isLanding ? `${SITE_URL}${path}` : undefined,
        bounceToHome: false,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  }

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Legacy index.php paths → App Router catch-all.
  if (pathname.startsWith('/index.php/')) {
    const rest = pathname.replace(/^\/index\.php\/?/, '');
    const url = request.nextUrl.clone();
    url.pathname = `/legacy/${rest}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === '/index.html' || pathname === '/index-2.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 301);
  }

  // Legacy: /slug.html → giữ URL, rewrite nội bộ sang /slug (App Router)
  if (pathname.endsWith('.html') && !PASSTHROUGH_HTML.has(pathname)) {
    const slug = decodeURIComponent(pathname.slice(1, -5));
    if (slug && slug !== 'index' && slug !== 'index-2') {
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
