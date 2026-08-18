import { shareCrawlerHtml } from '@/lib/seo';

/** HTML OG siêu nhẹ — dùng để kiểm tra thẻ Zalo/Facebook. */
export function GET() {
  return new Response(shareCrawlerHtml(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
    },
  });
}
