import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user-session';
import { markUserOnline, parsePresenceScope } from '@/lib/auth/presence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/account/presence — heartbeat khi user còn mở website (cookie member_token). */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let scope: unknown = 'main';
  try {
    const body = (await request.json()) as { scope?: unknown };
    scope = body?.scope;
  } catch {
    /* body rỗng → main */
  }

  await markUserOnline(user.id, parsePresenceScope(scope));
  return NextResponse.json({ ok: true });
}
