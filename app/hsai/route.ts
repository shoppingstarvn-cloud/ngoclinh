import { SITE_URL, shareCrawlerHtml } from '@/lib/seo';

const html = () =>
  new Response(
    shareCrawlerHtml({
      pageUrl: `${SITE_URL}/hsai`,
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

/** URL dán Zalo mới — cache của "/" vẫn là Cửa Âu. Không dùng RootLayout (og:url=/). */
export function GET() {
  return html();
}

export function HEAD() {
  return html();
}
