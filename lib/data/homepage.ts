import { createClient } from '@/lib/supabase/server';

export async function getSiteSettings(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('*');
  const cfg: Record<string, string> = {};
  data?.forEach((row) => {
    cfg[row.key] = row.value;
  });
  return cfg;
}

export async function getHomepageData() {
  const supabase = await createClient();

  const [
    slides,
    products,
    partners,
    testimonials,
    posts,
    projects,
    menus,
    categories,
    settingsRows,
  ] = await Promise.all([
    supabase
      .from('slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(10),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(15),
    supabase
      .from('partners')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(20),
    supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(10),
    supabase
      .from('posts')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'published')
      .eq('tags', 'tin-tuc')
      .order('display_order')
      .limit(30),
    supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(4),
    supabase
      .from('menus')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(6),
    supabase.from('site_settings').select('*'),
  ]);

  const settings: Record<string, string> = {};
  settingsRows.data?.forEach((r) => {
    settings[r.key] = r.value;
  });

  return {
    slides: slides.data ?? [],
    products: products.data ?? [],
    partners: partners.data ?? [],
    testimonials: testimonials.data ?? [],
    posts: posts.data ?? [],
    projects: projects.data ?? [],
    menus: menus.data ?? [],
    categories: categories.data ?? [],
    settings,
  };
}

export type HomepageData = Awaited<ReturnType<typeof getHomepageData>>;
