import fs from 'fs';
import path from 'path';

let cachedMap: Record<string, string> | null = null;

/** Nạp public/_detail-map.json — slug → đường dẫn legacy */
export function getDetailMap(): Record<string, string> {
  if (cachedMap) return cachedMap;
  try {
    const file = path.join(process.cwd(), 'public', '_detail-map.json');
    cachedMap = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
  } catch {
    cachedMap = {};
  }
  return cachedMap!;
}

export function getLegacyPathForSlug(slug: string): string | undefined {
  return getDetailMap()[slug];
}

export function slugFromLegacyPath(pathname: string): string | null {
  const map = getDetailMap();
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  for (const [slug, legacyPath] of Object.entries(map)) {
    if (legacyPath === normalized) return slug;
  }
  return null;
}
