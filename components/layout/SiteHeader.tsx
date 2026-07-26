'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface MenuItem {
  id: number;
  label: string;
  url: string;
  parent_id: number | null;
}

function buildMenuTree(items: MenuItem[]) {
  const roots = items.filter((m) => !m.parent_id);
  const children = (pid: number) => items.filter((m) => m.parent_id === pid);
  return { roots, children };
}

function toHref(url: string) {
  if (!url || url === '#') return '#';
  return /^(https?:|\/)/.test(url) ? url : `/${url}`;
}

export function SiteHeader({
  menus,
  settings,
}: {
  menus: MenuItem[];
  settings: Record<string, string>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { roots, children } = buildMenuTree(menus);
  const siteName = settings.site_name || 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU';
  const logo = settings.logo_url || '/images/contact/4174logo_bt.png';

  const renderMenu = (mobile = false) =>
    roots.map((m) => {
      const subs = children(m.id);
      return (
        <li key={m.id}>
          <Link href={toHref(m.url)}>
            {m.label}
            {subs.length > 0 && !mobile && <i className="fa fa-angle-down" />}
          </Link>
          {subs.length > 0 && (
            <ul className={mobile ? 'one' : undefined}>
              {subs.map((s) => (
                <li key={s.id}>
                  <Link href={toHref(s.url)}>
                    {mobile && <i className="fa fa-angle-right" />} {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    });

  return (
    <>
      <div className={`menu-m${mobileOpen ? ' open' : ''}`}>
        <ul>{renderMenu(true)}</ul>
      </div>

      <div className="task-absolute d-block d-md-none">
        <div className="container">
          <div className="taskbar-m">
            <span>
              <button
                type="button"
                className="btn-m"
                aria-label="Menu"
                onClick={() => setMobileOpen((v) => !v)}
              />
              <i className={`fa ${mobileOpen ? 'fa-times' : 'fa-reorder'}`} />
            </span>
            <Link className="logo" href="/">
              <img src={logo} alt={siteName} />
            </Link>
          </div>
          <div className="padding-m" />
        </div>
      </div>

      <div className="top_page d-none d-md-block">
        <div className="container">
          <div className="row no-gutters">
            <div className="col-6">
              <p className="welcome">{siteName}</p>
            </div>
            <div className="col-6 right">
              <div className="row no-gutters">
                <div className="">
                  <div className="social">
                    <a href={settings.facebook_url || '#'} target="_blank" rel="noreferrer">
                      <i className="fa fa-facebook" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="header d-none d-md-block">
        <div className="container">
          <div className="row">
            <div className="col-2 logo">
              <Link href="/">
                <img src={logo} alt={siteName} />
              </Link>
            </div>
            <div className="col-10">
              <div className="tag_header text-right">
                {settings.address && (
                  <span className="address">Địa chỉ: {settings.address}</span>
                )}
                {settings.email && <span>Email: {settings.email}</span>}
                {settings.hotline && <span className="hotline">{settings.hotline}</span>}
              </div>
              <div className="menu text-right">
                <ul>{renderMenu()}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function SiteFooter({ settings }: { settings: Record<string, string> }) {
  return (
    <footer className="footer">
      <div className="container">
        <p id="footer-address">{settings.address}</p>
        <p id="footer-phone">{settings.hotline}</p>
        <p id="footer-email">{settings.email}</p>
        <p id="footer-copyright">
          {settings.footer_copyright ||
            'BẢN QUYỀN THUỘC VỀ CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU'}
        </p>
      </div>
    </footer>
  );
}
