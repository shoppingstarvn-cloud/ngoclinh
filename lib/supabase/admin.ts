import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/lib/supabase/env';

/** Client service_role — CHỈ dùng server-side (API routes, Server Actions). */
export function createAdminClient() {
  const url = getSupabaseUrl();
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'uploads';
