'use client';

import type { MouseEvent as ReactMouseEvent, ReactNode, SyntheticEvent } from 'react';
import Link from 'next/link';
import { postHref, itemHref, assetUrl, resolveHref, isTrustedMediaUrl, isValidAssetUrl } from '@/lib/slug';
import { useOwlCarousel } from '@/lib/hooks/useOwlCarousel';
import MediaAsset from '@/components/ui/MediaAsset';

function hideBrokenMedia(e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallback === '1') return;
  el.dataset.fallback = '1';
  el.style.visibility = 'hidden';
}

interface Slide {
  id: number;
  title?: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
}

export function SlideCarousel({ slides }: { slides: Slide[] }) {
  useOwlCarousel(
    '#slide-container',
    {
      loop: slides.length > 1,
      autoplay: true,
      autoHeight: true,
      margin: 0,
      responsiveClass: true,
      responsive: { 0: { items: 1, dots: true }, 1000: { items: 1, dots: true } },
    },
    [slides.length],
  );

  if (!slides.length) return <div className="slider_box" />;

  return (
    <div className="slider_box">
      <div id="slide-container" className="owl-carousel owl-theme slide-carousel">
        {slides.map((s) => (
          <div key={s.id} className="item">
            <Link href={s.link_url || '#'}>
              <MediaAsset src={s.image_url} alt={s.title || 'Slide'} variant="hero" />
            </Link>
            {s.title && (
              <div>
                <h3>{s.title}</h3>
                <p>{s.subtitle}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AboutLink({
  companyName,
  introHtml,
}: {
  companyName: string;
  introHtml?: string;
}) {
  if (!introHtml) return null;
  return (
    <div className="about_link" id="gioi-thieu">
      <div className="container">
        <div className="title">
          <p>Giới thiệu về chúng tôi</p>
        </div>
        <div className="row">
          <div className="col-12 col-md-6 wow fadeInRight left" data-wow-delay="0.3s">
            <div className="name_company">
              <h2>{companyName}</h2>
            </div>
          </div>
          <div
            className="content"
            id="dynamic-intro"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        </div>
      </div>
    </div>
  );
}

interface CategorySubmenu {
  id: number;
  label: string;
  link_url?: string;
  children?: CategorySubmenu[];
}

interface Category {
  id: number;
  name: string;
  slug?: string;
  link_url?: string;
  description?: string;
  thumbnail_url?: string;
  image_url?: string;
  submenus?: CategorySubmenu[];
}

function CategoryCard({ cat }: { cat: Category }) {
  const subs = (cat.submenus ?? []).filter((s) => s.label);
  const href = itemHref(cat);
  const desc = (cat.description || '').trim();
  return (
    <div className="col-12 col-md-4 item_s cat-card">
      <dl>
        <dt>
          {/* effect-v7 = hiệu ứng kim tuyến quét sáng + zoom (giống vùng bài viết) */}
          <figure className="effect-v7">
            <Link href={href} title={cat.name}>
              <MediaAsset
                src={cat.thumbnail_url || cat.image_url || '/images/placeholder.jpg'}
                alt={cat.name}
              />
            </Link>
          </figure>
        </dt>
        <dd>
          <h3>
            <Link href={href}>{cat.name}</Link>
          </h3>
          {desc ? (
            <div>
              <Link href={href}>{desc}</Link>
            </div>
          ) : null}
        </dd>
      </dl>
      {subs.length > 0 && (
        <ul className="cat-submenu">
          {subs.map((s) => {
            const sHref = s.link_url ? resolveHref(s.link_url) : href;
            const sExt = /^https?:\/\//i.test(sHref);
            const kids = (s.children ?? []).filter((k) => k.label);
            return (
              <li key={s.id} className={kids.length ? 'has-children' : undefined}>
                <Link
                  href={sHref}
                  {...(sExt ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {s.label}
                  {kids.length > 0 && <span className="caret">›</span>}
                </Link>
                {kids.length > 0 && (
                  <ul className="cat-submenu-2">
                    {kids.map((k) => {
                      const kHref = k.link_url ? resolveHref(k.link_url) : sHref;
                      const kExt = /^https?:\/\//i.test(kHref);
                      return (
                        <li key={k.id}>
                          <Link
                            href={kHref}
                            {...(kExt ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          >
                            {k.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Khối MENU trang chủ = đúng các dòng `categories` gốc trong DB.
 * Chỉ clone ảo hàng 1 khi chưa seed (chưa có *-r2 và chưa bật cờ).
 * Sau khi Super Admin seed/SQL: tôn trọng thêm/bớt/sửa/xóa — không tự đắp lại.
 */
function homeCategoryRows(
  categories: Category[],
  padMissingRow3: boolean,
): Category[] {
  const isClone = (c: Category) => String(c.slug || '').endsWith('-r2');
  const originals = categories.filter((c) => !isClone(c));
  const dbClones = categories.filter(isClone);
  if (dbClones.length > 0 || !originals.length || !padMissingRow3) return categories;
  const row3 = originals.slice(0, 3).map((c) => ({
    ...c,
    slug: `${c.slug || 'cat'}-r2`,
    link_url: (c.link_url || '').trim() || (c.slug ? `/${c.slug}.html` : ''),
  }));
  return [...originals, ...row3];
}

export function CategoryGrid({
  categories,
  padMissingRow3 = true,
}: {
  categories: Category[];
  padMissingRow3?: boolean;
}) {
  const cards = homeCategoryRows(categories, padMissingRow3);
  if (!cards.length) return null;
  return (
    <div className="service_home" id="menu-trang-chu">
      <div className="container">
        <div className="row">
          {cards.map((cat, i) => (
            <CategoryCard key={`${cat.slug || cat.id}-${i}`} cat={cat} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Product {
  id: number;
  name: string;
  slug?: string;
  link_url?: string;
  thumbnail_url?: string;
  price?: string;
}

export function ProductSection({ products }: { products: Product[] }) {
  // Lọc lần nữa phía UI — chỉ thẻ có ảnh tin cậy (local / Supabase)
  const visible = products.filter((p) => isTrustedMediaUrl(p.thumbnail_url));

  useOwlCarousel(
    '.product-carousel',
    {
      loop: visible.length > 1,
      autoplay: true,
      margin: 20,
      responsiveClass: true,
      responsive: { 0: { items: 1, dots: true }, 600: { items: 2, dots: true }, 1000: { items: 3, dots: true } },
    },
    [visible.length],
  );

  if (!visible.length) return null;

  return (
    <div className="product">
      <div className="container">
        <div className="title">
          <p>
            <span>Sản phẩm chủ lực</span>
          </p>
        </div>
        <div className="brief">
          <p>
            <em>
              <strong>
                Hệ Sinh Thái AI — đào tạo AI, truyền thông, sự kiện, thiết kế website/app
                và luyện thi cùng chuyên gia Bùi Ngọc Linh.
              </strong>
            </em>
          </p>
        </div>
        <div className="row">
          <div className="owl-carousel owl-theme product-carousel">
            {visible.map((p) => (
              <div key={p.id} className="item">
                <dl>
                  <dt>
                    <MediaAsset
                      src={p.thumbnail_url}
                      alt={p.name}
                      title={p.name}
                      onError={hideBrokenMedia}
                    />
                  </dt>
                  <dd>
                    <h3>{p.name}</h3>
                    {p.price && <p className="price">{p.price}</p>}
                    {/* Lớp phủ 100%×100% giống bản gốc (realtime-data.js) — bấm bất kỳ
                        đâu trên thẻ (kể cả ảnh ở <dt>) đều nhảy đúng trang chi tiết. */}
                    <Link
                      href={itemHref(p)}
                      title={p.name}
                      style={{ left: 0, top: 0, width: '100%', height: '100%' }}
                    />
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActivityImage {
  id: number | string;
  title?: string;
  image_url?: string;
  is_active?: boolean;
}

/** Vùng "Hình ảnh hoạt động" — gallery riêng, tái dùng style carousel sản phẩm. */
export function ActivitySection({ images }: { images: ActivityImage[] }) {
  const visible = images.filter((a) => isValidAssetUrl(a.image_url));

  useOwlCarousel(
    '.activity-carousel',
    {
      loop: visible.length > 1,
      autoplay: true,
      margin: 20,
      responsiveClass: true,
      responsive: { 0: { items: 1, dots: true }, 600: { items: 2, dots: true }, 1000: { items: 3, dots: true } },
    },
    [visible.length],
  );

  if (!visible.length) return null;

  return (
    <div className="product">
      <div className="container">
        <div className="title">
          <p>
            <span>Hình ảnh hoạt động</span>
          </p>
        </div>
        <div className="brief">
          <p>
            <em>
              <strong>Những hình ảnh hoạt động và sự kiện nổi bật của chúng tôi.</strong>
            </em>
          </p>
        </div>
        <div className="row">
          <div className="owl-carousel owl-theme activity-carousel">
            {visible.map((a) => (
              <div key={a.id} className="item">
                <dl>
                  <dt>
                    <MediaAsset
                      src={a.image_url}
                      alt={a.title || 'Hình ảnh hoạt động'}
                      title={a.title || ''}
                      onError={hideBrokenMedia}
                    />
                  </dt>
                  <dd>
                    <h3>{a.title || ''}</h3>
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Project {
  id: number;
  title: string;
  slug: string;
  link_url?: string;
  excerpt?: string;
  thumbnail_url?: string;
}

export function ProjectSection({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  return (
    <div className="project" id="du-an">
      <div className="container">
        <div className="title">
          <p>
            <span className="neon-title">Những dự án</span>
          </p>
        </div>
        <div className="brief" />
        <div className="row list_project">
          {projects.map((p) => {
            // Ưu tiên link_url admin nhập (kể cả link NGOÀI); fallback slug nội bộ.
            const href = itemHref(p);
            const external = /^https?:\/\//i.test(href);
            const extProps = external
              ? { target: '_blank', rel: 'noopener noreferrer' as const }
              : {};
            return (
              <div key={p.id} className="col-12 col-md-6 item proj-card fx-card">
                <dl>
                  <dt>
                    {/* effect-v7 = kim tuyến quét sáng; logo canh giữa, không tràn */}
                    <figure className="effect-v7">
                      <Link href={href} title={p.title} {...extProps}>
                        {p.thumbnail_url && <MediaAsset src={p.thumbnail_url} alt={p.title} />}
                      </Link>
                    </figure>
                  </dt>
                  <dd>
                    <h3>
                      <Link href={href} {...extProps}>
                        {p.title}
                      </Link>
                    </h3>
                    <p>{p.excerpt}</p>
                    <Link className="proj-more" href={href} aria-label="Xem thêm" {...extProps} />
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Partner {
  id: number;
  name: string;
  logo_url?: string;
  website_url?: string;
  is_active?: boolean;
}

export function PartnerSection({ partners }: { partners: Partner[] }) {
  // Chỉ hiện đối tác active + có logo hợp lệ — nguồn duy nhất = Supabase (Admin).
  // Không bao giờ fallback HTML tĩnh / hardcode.
  const visible = partners.filter(
    (p) => p.is_active !== false && isValidAssetUrl(p.logo_url),
  );

  useOwlCarousel(
    '.partner-carousel',
    {
      loop: visible.length > 1,
      autoplay: true,
      margin: 20,
      responsiveClass: true,
      responsive: { 0: { items: 2, dots: true }, 600: { items: 3, dots: true }, 1000: { items: 6, dots: true } },
    },
    [visible.length],
  );

  if (!visible.length) return null;

  return (
    <div className="partner">
      <div className="container">
        <div className="owl-carousel owl-theme partner-carousel">
          {visible.map((p) => (
            <div key={p.id} className="item">
              <a href={p.website_url || '#'} target="_blank" rel="noreferrer" title={p.name}>
                <img src={assetUrl(p.logo_url)} alt={p.name} title={p.name} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Testimonial {
  id: number;
  name: string;
  content: string;
  avatar_url?: string | null;
  title?: string | null;
  phone?: string | null;
  position?: string | null;
  is_active?: boolean;
}

/**
 * Tiêu đề slide đúng HTML cũ: "Họ tên - Chức vụ - SĐT" (SĐT là chữ thuần trong h3).
 * KHÔNG bọc SĐT bằng <a> — CSS .comment_home .item>div a biến mọi <a> thành khối tròn 100px.
 */
function testimonialHeadline(t: Testimonial): string {
  const role = (t.title || t.position || '').trim();
  const phone = (t.phone || '').trim();
  // name đã chứa đủ chuỗi cũ (seed fallback) → giữ nguyên
  if ((!role || t.name.includes(role)) && (!phone || t.name.includes(phone))) {
    return t.name.trim();
  }
  const parts = [t.name.trim()];
  if (role && !t.name.includes(role)) parts.push(role);
  if (phone && !t.name.includes(phone)) parts.push(phone);
  return parts.join(' - ');
}

function testimonialTelHref(t: Testimonial): string | null {
  const raw =
    (t.phone || '').trim() ||
    (t.name.match(/(?:\+?84|0)\d[\d.\s-]{7,}\d/) || [])[0] ||
    '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 9) return null;
  return `tel:${digits}`;
}

export function TestimonialSection({ testimonials }: { testimonials: Testimonial[] }) {
  const visible = testimonials.filter((t) => t.is_active !== false);

  useOwlCarousel(
    '.comment-carousel',
    {
      loop: visible.length > 1,
      autoplay: true,
      autoplayTimeout: 4000,
      autoplayHoverPause: true,
      margin: 10,
      responsiveClass: true,
      nav: true,
      // Slide chạy từ phải sang trái (RTL) — đúng cảm giác site cũ
      rtl: true,
      smartSpeed: 600,
      responsive: {
        0: { items: 1, nav: false, dots: true },
        600: { items: 1, nav: false, dots: true },
        1000: { items: 2, nav: true, dots: true },
      },
    },
    [visible.length],
  );

  if (!visible.length) return null;

  return (
    <div className="comment_home">
      <div className="container">
        <div>
          <div className="owl-carousel owl-theme comment-carousel">
            {visible.map((t) => {
              const headline = testimonialHeadline(t);
              const tel = testimonialTelHref(t);
              const avatar = t.avatar_url ? assetUrl(t.avatar_url) : null;
              // Markup khớp legacy: <a><img/></a> float phải → <h3> chữ thuần → <div> mô tả
              const avatarLink = avatar ? (
                tel ? (
                  <a className="comment_avatar" href={tel} aria-label={`Gọi ${headline}`}>
                    <img src={avatar} alt={headline} />
                  </a>
                ) : (
                  <a className="comment_avatar">
                    <img src={avatar} alt={headline} />
                  </a>
                )
              ) : null;

              return (
                <div key={t.id} className="item">
                  <div>
                    {avatarLink}
                    <h3>{headline}</h3>
                    <div>{t.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface Service {
  id: number;
  title_top: string;
  title_bottom?: string;
  image_url?: string;
  link_top?: string;
  link_bottom?: string;
  is_active?: boolean;
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function ServiceLink({
  href,
  title,
  children,
  className,
}: {
  href: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const ext = isExternalHref(href);
  const extra = ext ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {};
  return (
    <Link href={href || '#'} title={title} className={className} {...extra}>
      {children}
    </Link>
  );
}

/** Mỗi dịch vụ = 1 khối giống danh mục: ảnh trên + thanh trắng tên + mũi tên xanh dưới.
 *  KHÔNG dùng class .service_home / .cat-submenu — giữ nguyên menu danh mục. */
export function ServiceSection({
  services,
  selectedServiceId,
  onSelectService,
}: {
  services: Service[];
  selectedServiceId?: number;
  onSelectService?: (s: Service) => void;
}) {
  const visible = services.filter((s) => s.is_active !== false && (s.title_top || '').trim());
  if (!visible.length) return null;
  const pickMode = Boolean(onSelectService);

  return (
    <div className="dichvu_home" id="cac-dich-vu">
      <div className="container">
        <div className="title">
          <p>
            <span className="neon-title">Các dịch vụ</span>
          </p>
          {pickMode ? (
            <p className="dichvu-form-hint">Bấm vào ô dịch vụ để điền form đăng ký bên dưới</p>
          ) : null}
        </div>
        <div className="row">
          {visible.map((s) => {
            const href =
              resolveHref(s.link_top) !== '#'
                ? resolveHref(s.link_top)
                : resolveHref(s.link_bottom);
            const desc = (s.title_bottom || '').trim();
            const picked = selectedServiceId != null && selectedServiceId === s.id;
            const onPick = (e: ReactMouseEvent) => {
              if (!onSelectService) return;
              e.preventDefault();
              onSelectService(s);
            };
            return (
              <div key={s.id} className={`col-12 col-md-4 item_s cat-card${picked ? ' is-picked' : ''}`}>
                <dl>
                  <dt>
                    <figure className="effect-v7">
                      {pickMode ? (
                        <a href="#form-dang-ky" title={s.title_top} onClick={onPick}>
                          {s.image_url ? (
                            <MediaAsset src={s.image_url} alt={s.title_top} />
                          ) : (
                            <span className="dichvu-photo-empty" aria-hidden />
                          )}
                        </a>
                      ) : (
                        <ServiceLink href={href} title={s.title_top}>
                          {s.image_url ? (
                            <MediaAsset src={s.image_url} alt={s.title_top} />
                          ) : (
                            <span className="dichvu-photo-empty" aria-hidden />
                          )}
                        </ServiceLink>
                      )}
                    </figure>
                  </dt>
                  <dd>
                    <h3>
                      {pickMode ? (
                        <a href="#form-dang-ky" onClick={onPick}>
                          {s.title_top}
                        </a>
                      ) : (
                        <ServiceLink href={href}>{s.title_top}</ServiceLink>
                      )}
                    </h3>
                    {desc ? <div>{desc}</div> : null}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  thumbnail_url?: string;
}

export function NewsSection({ posts }: { posts: Post[] }) {
  useOwlCarousel(
    '.news-carousel',
    {
      loop: posts.length > 2,
      autoplay: posts.length > 1,
      autoplayTimeout: 4000,
      autoplayHoverPause: true,
      autoplaySpeed: 700,
      smartSpeed: 700,
      margin: 20,
      nav: false,
      dots: posts.length > 2,
      slideBy: 1,
      responsiveClass: true,
      responsive: {
        0: { items: 1, dots: true },
        768: { items: 2, dots: true },
      },
    },
    [posts.length],
  );

  if (!posts.length) return null;

  return (
    <div className="news" id="tin-tuc">
      <div className="container">
        <div className="title">
          <p>Tin tức mới nhất</p>
        </div>
        <div className="list_news">
          <div className="owl-carousel owl-theme news-carousel">
            {posts.map((p) => (
              <div key={p.id} className="item big_item fx-card">
                <dl>
                  <dt>
                    <div className="swing">
                      <figure className="effect-v7">
                        <Link href={postHref(p.slug)}>
                          {p.thumbnail_url && (
                            <MediaAsset src={p.thumbnail_url} alt={p.title} />
                          )}
                        </Link>
                      </figure>
                    </div>
                  </dt>
                  <dd>
                    <h3>
                      <Link href={postHref(p.slug)}>{p.title}</Link>
                    </h3>
                    <p>{p.excerpt}</p>
                    <Link href={postHref(p.slug)}>Xem thêm</Link>
                    <div className="clearfix" />
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
