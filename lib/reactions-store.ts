import { createAdminClient } from '@/lib/supabase/admin';
import { getAlbumAccess } from '@/lib/album/album';
import { getCurrentUser } from '@/lib/auth/user-session';
import {
  REACTION_TYPES,
  emptyReactionCounts,
  isReactionType,
  parseReactionTarget,
  type ParsedReactionTarget,
} from '@/lib/reactions';

const UNIQUE_FAIL = /duplicate key|unique constraint|23505/i;
const MISSING_TABLE = /does not exist|42P01|schema cache/i;

export type ReactionState = {
  counts: Record<string, number>;
  mine: Record<string, number>;
};

export type ReactionAuth =
  | { ok: true; userId: number }
  | { ok: false; status: number; locked?: boolean; error: string };

export async function authForReactionTarget(parsed: ParsedReactionTarget): Promise<ReactionAuth> {
  if (parsed.kind === 'album') {
    const access = await getAlbumAccess();
    if (!access.loggedIn || !access.unlocked || !access.userId) {
      return {
        ok: false,
        status: 403,
        locked: true,
        error: 'Bạn cần đăng nhập và mở khoá nội dung để thả cảm xúc.',
      };
    }
    return { ok: true, userId: access.userId };
  }

  const user = await getCurrentUser();
  if (user?.id) return { ok: true, userId: user.id };

  const access = await getAlbumAccess();
  if (access.loggedIn && access.userId) return { ok: true, userId: access.userId };

  return {
    ok: false,
    status: 403,
    locked: true,
    error: 'Bạn cần đăng nhập để thả cảm xúc.',
  };
}

async function countMatch(
  supabase: ReturnType<typeof createAdminClient>,
  table: 'album_reactions' | 'site_reactions',
  match: Record<string, string | number>,
): Promise<Record<string, number>> {
  const counts = emptyReactionCounts();
  await Promise.all(
    REACTION_TYPES.map(async (type) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('type', type);
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
      const { count, error } = await q;
      if (error) return;
      counts[type] = count || 0;
    }),
  );
  return counts;
}

export async function readReactionState(
  rawTarget: string,
  userId?: number | null,
): Promise<ReactionState | { error: string; status: number }> {
  const parsed = parseReactionTarget(rawTarget);
  if (!parsed) return { error: 'Thiếu đối tượng cảm xúc', status: 400 };
  const supabase = createAdminClient();

  if (parsed.kind === 'album') {
    const counts = await countMatch(supabase, 'album_reactions', { media_id: parsed.mediaId });
    const mine = userId
      ? await countMatch(supabase, 'album_reactions', { media_id: parsed.mediaId, user_id: userId })
      : emptyReactionCounts();
    return { counts, mine };
  }

  const counts = await countMatch(supabase, 'site_reactions', { target: parsed.key });
  const mine = userId
    ? await countMatch(supabase, 'site_reactions', { target: parsed.key, user_id: userId })
    : emptyReactionCounts();
  return { counts, mine };
}

export async function bumpReaction(
  rawTarget: string,
  type: string,
): Promise<
  | (ReactionState & { ok: true })
  | { ok: false; status: number; locked?: boolean; needSql?: boolean; error: string }
> {
  if (!isReactionType(type)) {
    return { ok: false, status: 400, error: 'Loại cảm xúc không hợp lệ' };
  }
  const parsed = parseReactionTarget(rawTarget);
  if (!parsed) return { ok: false, status: 400, error: 'Thiếu đối tượng cảm xúc' };

  const auth = await authForReactionTarget(parsed);
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  if (parsed.kind === 'album') {
    const { error } = await supabase.from('album_reactions').insert({
      media_id: parsed.mediaId,
      user_id: auth.userId,
      type,
    });
    if (error) {
      if (UNIQUE_FAIL.test(error.message || '')) {
        return {
          ok: false,
          status: 409,
          needSql: true,
          error:
            'Cần chạy sql/10_REACTIONS_MULTI_CLICK.sql trên Supabase (SQL Editor) để mỗi lần bấm được cộng dồn.',
        };
      }
      return { ok: false, status: 500, error: error.message || 'Không lưu được cảm xúc' };
    }
  } else {
    const { error } = await supabase.from('site_reactions').insert({
      target: parsed.key,
      user_id: auth.userId,
      type,
    });
    if (error) {
      if (MISSING_TABLE.test(error.message || '') || UNIQUE_FAIL.test(error.message || '')) {
        return {
          ok: false,
          status: 409,
          needSql: true,
          error:
            'Cần chạy sql/10_REACTIONS_MULTI_CLICK.sql trên Supabase (SQL Editor) để cảm xúc hoạt động trên bài viết.',
        };
      }
      return { ok: false, status: 500, error: error.message || 'Không lưu được cảm xúc' };
    }
  }

  const state = await readReactionState(parsed.key, auth.userId);
  if ('status' in state) return { ok: false, status: state.status, error: state.error };
  return { ok: true, ...state };
}

export async function peekReactionState(rawTarget: string): Promise<ReactionState | { error: string; status: number }> {
  const parsed = parseReactionTarget(rawTarget);
  if (!parsed) return { error: 'Thiếu đối tượng cảm xúc', status: 400 };
  const member = await getCurrentUser();
  let userId = member?.id ?? null;
  if (!userId) {
    const access = await getAlbumAccess();
    userId = access.userId;
  }
  return readReactionState(parsed.key, userId);
}
