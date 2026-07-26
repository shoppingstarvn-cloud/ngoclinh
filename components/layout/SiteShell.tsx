import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';

export function SiteShell({
  settings,
  menus,
  children,
}: {
  settings: Record<string, string>;
  menus: Array<{ id: number; label: string; url: string; parent_id: number | null }>;
  children: React.ReactNode;
}) {
  return (
    <div className="wrapper animate">
      <SiteHeader menus={menus} settings={settings} />
      <main>{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
