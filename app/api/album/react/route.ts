import { NextRequest, NextResponse } from 'next/server';
import { bumpReaction, peekReactionState } from '@/lib/reactions-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/album/react?mediaId= — đếm cộng dồn từng loại + số lần tôi đã thả. */
export async function GET(req: NextRequest) {
  const mediaId = Number(new URL(req.url).searchParams.get('mediaId') || 0);
  if (!mediaId) return NextResponse.json({ ok: false }, { status: 400 });
  const state = await peekReactionState(`album:${mediaId}`);
  if ('status' in state) return NextResponse.json({ ok: false, error: state.error }, { status: state.status });
  return NextResponse.json({ ok: true, ...state });
}

/** POST /api/album/react {mediaId, type} — mỗi lần bấm +1, không bật/tắt. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { mediaId?: number; type?: string };
  const mediaId = Number(body.mediaId || 0);
  const type = String(body.type || 'like');
  if (!mediaId) return NextResponse.json({ ok: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  const result = await bumpReaction(`album:${mediaId}`, type);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, locked: result.locked, needSql: result.needSql },
      { status: result.status },
    );
  }
  return NextResponse.json(result);
}
