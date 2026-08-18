import { SITE_URL } from '@/lib/seo';

/** /hsai không dùng nữa — chữ "sai" không hợp. Đưa về trang chủ. */
export function GET() {
  return Response.redirect(`${SITE_URL}/`, 302);
}

export function HEAD() {
  return GET();
}
