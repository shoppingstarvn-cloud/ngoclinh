import { SITE_URL, shareCrawlerHtml } from '@/lib/seo';

/**
 * URL dán Zalo mới — cache của https://ngoclinh.shopmartai.com/ vẫn là Cửa Âu.
 * Crawler đọc OG; trình duyệt bị JS đẩy về trang chủ.
 */
export function GET() {
  return new Response(
    shareCrawlerHtml({
      pageUrl: `${SITE_URL}/ai`,
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

export function HEAD() {
  return GET();
}
