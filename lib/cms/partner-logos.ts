/**
 * Map tên đối tác → logo local trong /public/images/partner
 * dùng khi sửa bản ghi logo_url hỏng (/https://..., HTML page...).
 */
export const PARTNER_LOGO_MAP: Array<{ match: RegExp; logo: string }> = [
  { match: /ecopark|ecopack/i, logo: '/images/partner/732ecopark.jpg' },
  { match: /vinaconex/i, logo: '/images/partner/8451logovinaconex.jpg' },
  { match: /\bvin\b|vinschool|vingroup/i, logo: '/images/partner/4989vin.png' },
  { match: /trung\s*nam/i, logo: '/images/partner/5159trung-nam.png' },
  { match: /vietin|vietinbank/i, logo: '/images/partner/7007vietinbank.png' },
  { match: /\bhud\b/i, logo: '/images/partner/709hud-logo-2.jpg' },
];

export function resolvePartnerLogo(name: string, current?: string | null): string {
  const raw = (current || '').trim();
  const fixed = raw.replace(/^\/+(https?:)/i, '$1');

  // Giữ logo local / storage hợp lệ
  if (fixed && !/\.html?($|\?|#)/i.test(fixed)) {
    if (fixed.startsWith('/images/') || fixed.includes('supabase') || /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(fixed)) {
      return fixed.startsWith('http') || fixed.startsWith('/') ? fixed : `/${fixed}`;
    }
  }

  for (const rule of PARTNER_LOGO_MAP) {
    if (rule.match.test(name)) return rule.logo;
  }
  return '';
}
