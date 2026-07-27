import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { LiveSiteSync } from '@/components/sync/LiveSiteSync';

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
  categories?: Array<{ id: number; name: string; slug: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="wrapper animate">
      <LiveSiteSync />
      <SiteHeader menus={menus} settings={settings} links={links} />
      <main>{children}</main>
      <SiteFooter settings={settings} links={links} categories={categories} />
    </div>
  );
}
