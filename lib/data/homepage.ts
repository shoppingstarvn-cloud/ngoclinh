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
    services,
    posts,
    projects,
    menus,
    categories,
    categorySubmenus,
    links,
    activityImages,
    settingsRows,
  ] = await Promise.all([
    supabase
      .from('slides')
      .select('*')
      .eq('is_active', true)
      // Sắp theo thứ tự; khi trùng số (vd tất cả = 0) thì slide mới (id lớn) lên trước.
      // KHÔNG giới hạn số lượng — hiện TẤT CẢ slide đang bật (Supabase mặc định tối đa 1000).
      .order('display_order', { ascending: true })
      .order('id', { ascending: false }),
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
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('id', { ascending: true }),
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
      .from('category_submenus')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('links')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(40),
    supabase
      .from('activity_images')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(30),
    supabase.from('site_settings').select('*'),
  ]);

  const settings: Record<string, string> = {};
  settingsRows.data?.forEach((r) => {
    settings[r.key] = r.value;
  });

  // Menu con 2 CẤP: cấp 1 (parent_id rỗng, thuộc category) -> children là cấp 2 (parent_id = id cấp 1).
  type SubNode = { id: number; label: string; link_url?: string; children: SubNode[] };
  const rows = categorySubmenus.data ?? [];
  const level1ByCat = new Map<number, SubNode[]>();
  const childrenByParent = new Map<number, SubNode[]>();
  rows.forEach((s) => {
    const node: SubNode = { id: s.id, label: s.label, link_url: s.link_url, children: [] };
    if (s.parent_id) {
      const pid = Number(s.parent_id);
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid)!.push(node);
    } else {
      const cid = Number(s.category_id);
      if (!level1ByCat.has(cid)) level1ByCat.set(cid, []);
      level1ByCat.get(cid)!.push(node);
    }
  });
  level1ByCat.forEach((arr) =>
    arr.forEach((n) => {
      n.children = childrenByParent.get(n.id) ?? [];
    }),
  );
  const categoriesWithSubmenus = (categories.data ?? []).map((c) => ({
    ...c,
    submenus: level1ByCat.get(Number(c.id)) ?? [],
  }));

  return {
    slides: slides.data ?? [],
    // Chỉ sản phẩm có ảnh local/Supabase — bỏ video không ảnh, CDN chết (/https://vacdn…)
    products: (products.data ?? [])
      .filter((p) => isTrustedMediaUrl(p.thumbnail_url))
      .slice(0, 15),
    // Chỉ đối tác có logo ảnh hợp lệ — tránh hiện tên xanh dưới khối dự án
    partners: (partners.data ?? []).filter((p) => isValidAssetUrl(p.logo_url)),
    testimonials: testimonials.data ?? [],
    // Bảng services chưa chạy SQL → data null, không làm vỡ trang chủ
    services: services.data ?? [],
    posts: posts.data ?? [],
    projects: projects.data ?? [],
    menus: menus.data ?? [],
    categories: categoriesWithSubmenus,
    links: links.data ?? [],
    // Hình ảnh hoạt động — chỉ ảnh hợp lệ (local/Supabase/Drive)
    activityImages: (activityImages.data ?? []).filter((a) => isValidAssetUrl(a.image_url)),
    settings,
  };
}

export type HomepageData = Awaited<ReturnType<typeof getHomepageData>>;
