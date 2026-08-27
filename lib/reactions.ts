/** Catalog cảm xúc dùng chung toàn website. */

export const REACTION_TYPES = [
  'like',
  'love',
  'haha',
  'wow',
  'yeu',
  'heart',
  'party',
  'pretty',
  'clap',
  'laugh',
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_META: Record<
  ReactionType,
  { label: string; emoji: string; care?: boolean }
> = {
  like: { label: 'Thích', emoji: '👍' },
  love: { label: 'Care', emoji: '', care: true },
  haha: { label: 'Haha', emoji: '😆' },
  wow: { label: 'Wow', emoji: '😮' },
  yeu: { label: 'Yêu', emoji: '💖' },
  heart: { label: 'Tim', emoji: '❤' },
  party: { label: 'Chúc mừng', emoji: '🎉' },
  pretty: { label: 'Đẹp', emoji: '😍' },
  clap: { label: 'Vỗ tay', emoji: '👏' },
  laugh: { label: 'Cười', emoji: '😂' },
};

export function isReactionType(value: string): value is ReactionType {
  return (REACTION_TYPES as readonly string[]).includes(value);
}

export function emptyReactionCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of REACTION_TYPES) counts[t] = 0;
  return counts;
}

export function albumReactionTarget(mediaId: number): string {
  return `album:${mediaId}`;
}

/** Chuẩn hoá URL ảnh/video thành target cảm xúc. */
export function reactionTargetFromUrl(src: string): string {
  const raw = String(src || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, 'https://ngoclinh.shopmartai.com');
    u.hash = '';
    return `url:${u.toString()}`.slice(0, 1800);
  } catch {
    return `url:${raw}`.slice(0, 1800);
  }
}

export type ParsedReactionTarget =
  | { kind: 'album'; mediaId: number; key: string }
  | { kind: 'url'; key: string };

export function parseReactionTarget(raw: string): ParsedReactionTarget | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('album:')) {
    const mediaId = Number(s.slice(6));
    if (!Number.isFinite(mediaId) || mediaId <= 0) return null;
    return { kind: 'album', mediaId, key: `album:${mediaId}` };
  }
  if (s.startsWith('url:')) {
    const inner = s.slice(4).trim();
    if (!inner) return null;
    return { kind: 'url', key: reactionTargetFromUrl(inner) };
  }
  if (/^\d+$/.test(s)) {
    const mediaId = Number(s);
    if (mediaId > 0) return { kind: 'album', mediaId, key: `album:${mediaId}` };
  }
  return { kind: 'url', key: reactionTargetFromUrl(s) };
}
