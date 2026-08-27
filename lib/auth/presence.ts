import { createAdminClient } from '@/lib/supabase/admin';

/** User còn mở tab trong cửa sổ này thì tính là đang online. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type PresenceScope = 'main' | 'member';

function missingPresenceCol(message: string | undefined) {
  return /last_seen_at|last_seen_scope/i.test(message || '');
}

/** Cập nhật last_seen_at. Nuốt lỗi nếu chưa chạy sql/09_USER_PRESENCE.sql. */
export async function markUserOnline(
  userId: number,
  scope: PresenceScope | null = 'main',
  alsoLastLogin = false,
): Promise<{ ok: boolean; missingColumn?: boolean }> {
  if (!userId) return { ok: false };
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { last_seen_at: now };
  if (scope) patch.last_seen_scope = scope;
  if (alsoLastLogin) patch.last_login = now;
  const first = await supabase.from('users').update(patch).eq('id', userId);
  if (first.error && missingPresenceCol(first.error.message)) {
    if (alsoLastLogin) {
      await supabase.from('users').update({ last_login: now }).eq('id', userId);
    }
    return { ok: false, missingColumn: true };
  }
  if (first.error) return { ok: false };
  return { ok: true };
}

export function parsePresenceScope(raw: unknown): PresenceScope {
  return raw === 'member' ? 'member' : 'main';
}
