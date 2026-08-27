import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, isAdminPayload } from '@/lib/auth/session';
import { ONLINE_WINDOW_MS } from '@/lib/auth/presence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function missingPresenceCol(message: string | undefined) {
  return /last_seen_at|last_seen_scope/i.test(message || '');
}

/** pending website-only — khớp inferStatus trong UsersAdminPanel. */
function isPendingWebsite(u: { role?: string | null; request_type?: string | null; request_status?: string | null }) {
  if (u.request_type !== 'website') return false;
  if (u.role === 'admin1' || u.role === 'superadmin') return false;
  const s = String(u.request_status || '').toLowerCase();
  if (s === 'approved' || s === 'rejected') return false;
  return true;
}

/** GET /api/admin/users/stats → 3 số badge tab Quản lý Users. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!isAdminPayload(admin)) return admin;

  const supabase = createAdminClient();
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  const registeredQ = await supabase.from('users').select('id', { count: 'exact', head: true });
  const registered = registeredQ.count ?? 0;

  let online = 0;
  const onlineQ = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('last_seen_at', since);
  if (onlineQ.error && missingPresenceCol(onlineQ.error.message)) {
    const fallback = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login', since);
    online = fallback.count ?? 0;
  } else if (!onlineQ.error) {
    online = onlineQ.count ?? 0;
  }

  let pendingWebsite = 0;
  const websiteQ = await supabase
    .from('users')
    .select('role, request_type, request_status')
    .eq('request_type', 'website')
    .limit(2000);
  if (websiteQ.error && /request_status/i.test(websiteQ.error.message || '')) {
    const fb = await supabase.from('users').select('role, request_type').eq('request_type', 'website').limit(2000);
    pendingWebsite = (fb.data || []).filter((u) => u.role !== 'admin1' && u.role !== 'superadmin').length;
  } else if (!websiteQ.error) {
    pendingWebsite = (websiteQ.data || []).filter(isPendingWebsite).length;
  }

  return NextResponse.json({ ok: true, registered, online, pendingWebsite });
}
