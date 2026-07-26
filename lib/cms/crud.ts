import type { SupabaseClient } from '@supabase/supabase-js';
import { ORDERED_TABLES, type CmsTableName } from '@/lib/cms/tables';

type Query = ReturnType<SupabaseClient['from']>;

export function applyPublicFilters(query: Query, table: CmsTableName) {
  let q = query.select('*');

  if (table !== 'site_settings' && table !== 'contact_submissions') {
    q = q.eq('is_active', true);
  }
  if (table === 'posts') {
    q = q.eq('status', 'published');
  }
  if ((ORDERED_TABLES as readonly string[]).includes(table)) {
    q = q
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  return q;
}

export function applyAdminFilters(
  query: Query,
  table: CmsTableName,
  params: URLSearchParams,
) {
  let q = query.select('*');

  const isActive = params.get('is_active');
  const categoryId = params.get('category_id');
  const albumId = params.get('album_id');
  const status = params.get('status');

  if (isActive !== null) q = q.eq('is_active', isActive === 'true');
  if (categoryId) q = q.eq('category_id', categoryId);
  if (albumId) q = q.eq('album_id', albumId);
  if (status) q = q.eq('status', status);

  if ((ORDERED_TABLES as readonly string[]).includes(table)) {
    q = q.order('display_order', { ascending: true });
  }
  return q.order('created_at', { ascending: false });
}

export function stripSystemFields(
  body: Record<string, unknown>,
  mode: 'create' | 'update',
) {
  const next = { ...body };
  delete next.id;
  if (mode === 'update') delete next.created_at;
  next.updated_at = new Date().toISOString();
  if (mode === 'create') next.created_at = new Date().toISOString();
  return next;
}
