import { NextResponse } from 'next/server';

/** Kiểm tra nhanh stack deploy: Next.js (không còn Express tĩnh). */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    stack: 'nextjs',
    cms: 'supabase',
    time: new Date().toISOString(),
  });
}
