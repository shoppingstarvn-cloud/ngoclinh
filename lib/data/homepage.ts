import { createPublicClient } from '@/lib/supabase/public';
import { isTrustedMediaUrl, isValidAssetUrl } from '@/lib/slug';

export async function getSiteSettings(): Promise<Record<string, string>> {
  const supabase = createPublicClient();
  const { data } = await supabase.from('site_settings').select('*');
  const cfg: Record<string, string> = {};
  data?.forEach((row) => {
    cfg[row.key] = row.value;
  });
  return cfg;
}

export async function getHomepageData() {
  const supabase = createPublicClient();

  const [
    slides,
    products,
    partners,
    testimonials,
    posts,
    projects,
    menus,
    categories,
    links,
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
      // Lấy dư rồi lọc ảnh tin cậy — tránh carousel hiện icon ảnh vỡ
      .limit(50),
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
      .limit(12),
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
      .limit(12),
    supabase
      .from('links')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(40),
    supabase.from('site_settings').select('*'),
  ]);

  const settings: Record<string, string> = {};
  settingsRows.data?.forEach((r) => {
    settings[r.key] = r.value;
  });

  return {
    slides: slides.data ?? [],
    // Chỉ sản phẩm có ảnh local/Supabase — bỏ video không ảnh, CDN chết (/https://vacdn…)
    products: (products.data ?? [])
      .filter((p) => isTrustedMediaUrl(p.thumbnail_url))
      .slice(0, 15),
    // Chỉ đối tác có logo ảnh hợp lệ — tránh hiện tên xanh dưới khối dự án
    partners: (partners.data ?? []).filter((p) => isValidAssetUrl(p.logo_url)),
    testimonials: testimonials.data ?? [],
    posts: posts.data ?? [],
    projects: projects.data ?? [],
    menus: menus.data ?? [],
    categories: categories.data ?? [],
    links: links.data ?? [],
    settings,
  };
}

export type HomepageData = Awaited<ReturnType<typeof getHomepageData>>;
