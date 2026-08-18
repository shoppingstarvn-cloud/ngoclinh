import { SITE_URL } from '@/lib/seo';

export function GET() {
  return Response.redirect(`${SITE_URL}/`, 302);
}

export function HEAD() {
  return GET();
}
