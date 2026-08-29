import { NextRequest, NextResponse } from 'next/server';

/** Kiểm tra nhanh stack deploy: Next.js (không còn Express tĩnh). */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'development' && req.nextUrl.searchParams.get('dv') === '1') {
    try {
      const { isConfigured, listRecentVideoFiles } = await import('@/lib/storage/googleDrive');
      const cid = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
      const oauth = {
        cid: cid.length,
        sec: (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim().length,
        ref: (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim().length,
        apps: cid.includes('.apps.googleusercontent.com'),
      };
      if (!isConfigured()) {
        return NextResponse.json({ ok: false, reason: 'oauth', oauth }, { status: 503 });
      }
      const files = await listRecentVideoFiles(8);
      return NextResponse.json({
        ok: true,
        oauth,
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          mime: f.mimeType,
          mb: Math.round((f.size / (1024 * 1024)) * 10) / 10,
        })),
      });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : 'err' },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({
    ok: true,
    stack: 'nextjs',
    cms: 'supabase',
    time: new Date().toISOString(),
  });
}
