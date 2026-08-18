'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { SHARE_SITE_NAME } from '@/lib/seo';
import { assetUrl } from '@/lib/slug';

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

export interface CmsLink {
  id: number;
  label: string;
  url: string;
  icon?: string | null;
  link_group?: string | null;
}

export function SiteHeader({
  menus,
  settings,
  links = [],
}: {
  menus: MenuItem[];
  settings: Record<string, string>;
  links?: CmsLink[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { roots, children } = buildMenuTree(menus);
  const siteName = settings.site_name || SHARE_SITE_NAME;
  const logo = assetUrl(settings.logo_url) || '/images/contact/4174logo_bt.png';
  const socialLinks = links.filter((l) => l.link_group === 'social');
  const facebookHref = settings.facebook_url || socialLinks.find((l) => /facebook/i.test(l.label + l.url))?.url;

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
            <form
              className="search_form"
              action="https://congbetongcuaau.com/index.php/tim-kiem.html"
              method="GET"
            >
              <input type="text" name="txtkeyword" placeholder="Từ khóa tìm kiếm..." autoComplete="off" />
              <button type="submit">
                <i className="fa fa-search" />
              </button>
            </form>
          </div>
          <div className="padding-m" />
        </div>
      </div>

      <div className="top_page d-none d-md-block">
        <div className="container">
          <div className="row no-gutters">
            <div className="col-6 wow bounceInLeft">
              <p className="welcome">{siteName}</p>
            </div>

            <div className="col-6 right">
              <div className="row no-gutters">
                <div className="search">
                  <form action="https://congbetongcuaau.com/index.php/tim-kiem.html" method="GET">
                    <input
                      type="text"
                      name="txtkeyword"
                      placeholder="Từ khóa tìm kiếm..."
                      autoComplete="off"
                    />
                    <button type="submit">
                      <i className="fa fa-search" />
                    </button>
                  </form>
                </div>
                <div className="">
                  <div className="social">
                    {facebookHref ? (
                      <a href={facebookHref} target="_blank" rel="noreferrer" aria-label="Facebook">
                        <i className="fa fa-facebook" />
                      </a>
                    ) : null}
                    {socialLinks
                      .filter((l) => l.url !== facebookHref)
                      .map((l) => (
                        <a key={l.id} href={toHref(l.url)} target="_blank" rel="noreferrer" title={l.label}>
                          <i className={l.icon || 'fa fa-link'} />
                        </a>
                      ))}
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

export function SiteFooter({
  settings,
  links = [],
  categories = [],
}: {
  settings: Record<string, string>;
  links?: CmsLink[];
  categories?: Array<{ id: number; name: string; slug: string }>;
}) {
  const siteName = settings.site_name || SHARE_SITE_NAME;
  const logo = assetUrl(settings.logo_url) || '/images/contact/4174logo_bt.png';
  const linkStyle: CSSProperties = {
    color: '#ccc',
    textDecoration: 'none',
    transition: 'color 0.3s',
    display: 'block',
    padding: '5px 0',
    cursor: 'pointer',
    position: 'relative',
    zIndex: 9999,
  };

  const footerLinks = links.filter((l) => l.link_group === 'footer' || l.link_group === 'quick');
  const socialLinks = links.filter((l) => l.link_group === 'social');
  const serviceLinks =
    footerLinks.length > 0
      ? footerLinks.slice(0, 6)
      : [
          { id: -1, label: 'Giới thiệu công ty', url: '/gioi-thieu-a1.html' },
          { id: -2, label: 'Dự án tiêu biểu', url: '/du-an-a3.html' },
          { id: -3, label: 'Liên hệ', url: '/lien-he.html' },
        ];
  const productLinks =
    categories.length > 0
      ? categories.slice(0, 6).map((c) => ({
          id: c.id,
          label: c.name,
          url: c.slug?.includes('.html') ? `/${c.slug.replace(/^\//, '')}` : `/${c.slug}.html`,
        }))
      : [
          { id: -11, label: 'Hố ga bê tông', url: '/ho-ga-duc-san-c48.html' },
          { id: -12, label: 'Cống hộp đúc sẵn', url: '/cong-hop--c54.html' },
          { id: -13, label: 'Cống tròn bê tông', url: '/cong-tron-c53.html' },
        ];

  return (
    <footer>
      <div
        style={{
          backgroundColor: '#004d00',
          color: '#ffffff',
          padding: '50px 0 20px 0',
          width: '100%',
          clear: 'both',
          position: 'relative',
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      >
        <div className="container">
          <div className="row">
            <div className="col-12 col-md-3 mb-4">
              <Link href="/" style={{ display: 'inline-block' }}>
                <img
                  src={logo}
                  alt={siteName}
                  style={{
                    maxWidth: 150,
                    background: '#fff',
                    padding: 5,
                    borderRadius: 5,
                    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                  }}
                />
              </Link>
              <div style={{ marginTop: 20 }}>
                {settings.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#fff', marginRight: 15, fontSize: 24, display: 'inline-block', padding: 5 }}
                  >
                    <i className="fa fa-facebook" />
                  </a>
                )}
                {socialLinks.map((l) => (
                  <a
                    key={l.id}
                    href={toHref(l.url)}
                    target="_blank"
                    rel="noreferrer"
                    title={l.label}
                    style={{ color: '#fff', marginRight: 12, fontSize: 24, display: 'inline-block', padding: 5 }}
                  >
                    <i className={l.icon || 'fa fa-link'} />
                  </a>
                ))}
              </div>
            </div>

            <div className="col-12 col-md-5 mb-4">
              <h5 style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20, color: '#fff' }}>
                {siteName}
              </h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
                <li>
                  <i className="fa fa-map-marker" style={{ width: 25 }} /> Địa chỉ:{' '}
                  <span id="footer-address">{settings.address}</span>
                </li>
                <li>
                  <i className="fa fa-phone" style={{ width: 25 }} /> Điện thoại:{' '}
                  <span id="footer-phone">{settings.hotline}</span>
                </li>
                <li>
                  <i className="fa fa-envelope" style={{ width: 25 }} /> Email:{' '}
                  <span id="footer-email">{settings.email}</span>
                </li>
                {settings.website_url && (
                  <li>
                    <i className="fa fa-globe" style={{ width: 25 }} /> Website:{' '}
                    <a href={settings.website_url} style={{ color: '#fff', textDecoration: 'none' }}>
                      {settings.website_url}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div className="col-12 col-md-2 mb-4">
              <h5 style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20, color: '#fff' }}>
                DỊCH VỤ
              </h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
                {serviceLinks.map((l) => (
                  <li key={l.id}>
                    <Link href={toHref(l.url)} style={linkStyle}>
                      • {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-12 col-md-2 mb-4">
              <h5 style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20, color: '#fff' }}>
                SẢN PHẨM
              </h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
                {productLinks.map((l) => (
                  <li key={l.id}>
                    <Link href={toHref(l.url)} style={linkStyle}>
                      • {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#003300',
          color: '#ffffff',
          padding: '15px 0',
          width: '100%',
          clear: 'both',
          borderTop: '1px solid #005900',
          position: 'relative',
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-12 col-md-9 mb-3 mb-md-0 text-center text-md-left">
              <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }} id="footer-copyright">
                {settings.footer_copyright || `BẢN QUYỀN THUỘC VỀ ${SHARE_SITE_NAME}`}
              </p>
            </div>
            <div className="col-12 col-md-3 text-center text-md-right">
              <a
                href="http://online.gov.vn/HomePage/CustomWebsiteDisplay.aspx?DocId=57677"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', cursor: 'pointer' }}
              >
                <img
                  src="/images/contact/2171da-thong-bao-bct.png"
                  alt="Bộ Công Thương"
                  style={{ height: 40, marginRight: 15, display: 'inline-block' }}
                />
              </a>
              <a
                href="#top"
                className="go-top"
                style={{
                  color: '#fff',
                  background: '#444',
                  padding: '5px 12px',
                  borderRadius: 3,
                  display: 'inline-block',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <i className="fa fa-arrow-up" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
