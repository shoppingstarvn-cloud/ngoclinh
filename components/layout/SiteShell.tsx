import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { LiveSiteSync } from '@/components/sync/LiveSiteSync';
import { applyMenuLabelsToCategories } from '@/lib/nav/sync-labels';

export function SiteShell({
  settings,
  menus,
  links,
  categories,
  children,
}: {
  settings: Record<string, string>;
  menus: Array<{ id: number; label: string; url: string; parent_id: number | null }>;
  links?: Array<{
    id: number;
    label: string;
    url: string;
    icon?: string | null;
    link_group?: string | null;
  }>;
  categories?: Array<{ id: number; name: string; slug: string; link_url?: string | null }>;
  children: React.ReactNode;
}) {
  const syncedCategories = applyMenuLabelsToCategories(categories ?? [], menus);
  return (
    <div className="wrapper animate">
      <LiveSiteSync />
      <SiteHeader menus={menus} settings={settings} links={links} />
      <main>{children}</main>
      <SiteFooter settings={settings} links={links} categories={syncedCategories} />
    </div>
  );
}
