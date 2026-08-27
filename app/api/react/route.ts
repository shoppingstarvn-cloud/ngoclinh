import { NextRequest, NextResponse } from 'next/server';
import { bumpReaction, peekReactionState } from '@/lib/reactions-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function targetFromRequest(req: NextRequest, body?: { target?: string; mediaId?: number }) {
  const url = new URL(req.url);
  const qTarget = url.searchParams.get('target') || '';
  const qMedia = Number(url.searchParams.get('mediaId') || 0);
  if (qTarget) return qTarget;
  if (qMedia) return `album:${qMedia}`;
  if (body?.target) return String(body.target);
  if (body?.mediaId) return `album:${Number(body.mediaId)}`;
  return '';
}

/** GET /api/react?target=album:123 | url:...  (cũng nhận mediaId=) */
export async function GET(req: NextRequest) {
  const target = targetFromRequest(req);
  if (!target) return NextResponse.json({ ok: false, error: 'Thiếu target' }, { status: 400 });
  const state = await peekReactionState(target);
  if ('status' in state) return NextResponse.json({ ok: false, error: state.error }, { status: state.status });
  return NextResponse.json({ ok: true, ...state });
}

/** POST /api/react { target, type } — mỗi lần bấm INSERT +1, không tắt. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { target?: string; mediaId?: number; type?: string };
  const target = targetFromRequest(req, body);
  const type = String(body.type || '');
  const result = await bumpReaction(target, type);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, locked: result.locked, needSql: result.needSql },
      { status: result.status },
    );
  }
  return NextResponse.json(result);
}
