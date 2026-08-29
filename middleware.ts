import { NextRequest, NextResponse } from 'next/server';
import { resolveAlbumShareMeta, shouldServeAlbumShareCard } from '@/lib/album/share-meta';
import { SEARCH_ENGINE_UA, SITE_URL, shareCrawlerHtml, shouldServeShareCard } from '@/lib/seo';

const STATIC_PREFIXES = [
  '/css',
  '/images',
  '/hpm',
  '/uploads',
  '/_next',
  '/api',
  '/favicon.ico',
  '/admin',
  '/og',
  '/logo',
  '/og-image.jpg',
];

const PASSTHROUGH_HTML = new Set(['/admin.html', '/superadmin.html']);

/** Link cũ dán Zalo — không giữ /hsai (chữ "sai"). */
const OLD_SHARE_PATHS = new Set(['/hsai', '/ai', '/share-card', '/hsai.html']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.replace(/\/+$/, '') || '/';
  const userAgent = request.headers.get('user-agent') || '';
  const isRsc = !!(request.headers.get('rsc') || request.headers.get('next-router-prefetch'));
  const isPrefetch = request.headers.get('purpose') === 'prefetch';
  const isSearchEngine = SEARCH_ENGINE_UA.test(userAgent);

  if (OLD_SHARE_PATHS.has(path) || pathname === '/hsai.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return NextResponse.redirect(url, 302);
  }

  // Khi người dùng thực sự click vào link (Sec-Fetch-User: ?1 chỉ browser thật mới gửi)
  // → redirect sang ?view=site để vào trang thật thay vì nhận share card OG.
  if (
    (pathname === '/' || path === '/') &&
    !request.nextUrl.searchParams.get('view') &&
    request.headers.get('sec-fetch-user') === '?1'
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.set('view', 'site');
    return NextResponse.redirect(url, 302);
  }

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
      view: request.nextUrl.searchParams.get('view'),
    })
  ) {
    return new NextResponse(
      shareCrawlerHtml({
        pageUrl: `${SITE_URL}/`,
        bounceToHome: false,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Không cache CDN — mỗi crawler/bot nhận response riêng.
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      },
    );
  }

  if (
    shouldServeAlbumShareCard({
      method: request.method,
      pathname,
      userAgent,
      isRsc,
      isPrefetch,
      isSearchEngine,
    })
  ) {
    const meta = await resolveAlbumShareMeta(pathname);
    if (meta) {
      return new NextResponse(
        shareCrawlerHtml({
          pageUrl: meta.pageUrl,
          title: meta.title,
          titleFull: meta.title,
          description: meta.description,
          imageUrl: meta.imageUrl,
          imageAlt: meta.imageAlt,
          bounceToHome: false,
          skipDefaultOg: true,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: '0',
          },
        },
      );
    }
  }

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

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
