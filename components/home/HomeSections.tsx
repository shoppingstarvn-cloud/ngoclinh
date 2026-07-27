'use client';

import Link from 'next/link';
import { postHref, itemHref, assetUrl, isValidAssetUrl } from '@/lib/slug';
import { useOwlCarousel } from '@/lib/hooks/useOwlCarousel';

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
              <img src={assetUrl(s.image_url)} alt={s.title || 'Slide'} />
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
    <div className="about_link">
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

interface Category {
  id: number;
  name: string;
  slug?: string;
  link_url?: string;
  description?: string;
  thumbnail_url?: string;
  image_url?: string;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <div className="service_home">
      <div className="container">
        <div className="row">
          {categories.map((cat) => (
            <div key={cat.id} className="col-12 col-md-4 item_s">
              <dl>
                <dt>
                  <Link href={itemHref(cat)} title={cat.name}>
                    <img
                      src={assetUrl(cat.thumbnail_url || cat.image_url) || '/images/placeholder.jpg'}
                      alt={cat.name}
                    />
                  </Link>
                </dt>
                <dd>
                  <h3>
                    <Link href={itemHref(cat)}>{cat.name}</Link>
                  </h3>
                  <div>{cat.description}</div>
                </dd>
              </dl>
            </div>
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
  useOwlCarousel(
    '.product-carousel',
    {
      loop: true,
      autoplay: true,
      margin: 20,
      responsiveClass: true,
      responsive: { 0: { items: 1, dots: true }, 600: { items: 2, dots: true }, 1000: { items: 3, dots: true } },
    },
    [products.length],
  );

  if (!products.length) return null;

  return (
    <div className="product">
      <div className="container">
        <div className="title">
          <p>
            <span>Sản phẩm của chúng tôi</span>
          </p>
        </div>
        <div className="brief">
          <p>
            <em>
              <strong>
                Cung cấp đa dạng các sản phẩm ống cống bê tông, cống hộp, hố ga, tấm tường bê
                tông acotec
              </strong>
            </em>
          </p>
        </div>
        <div className="row">
          <div className="owl-carousel owl-theme product-carousel">
            {products.map((p) => (
              <div key={p.id} className="item">
                <dl>
                  <dt>
                    <img
                      src={assetUrl(p.thumbnail_url) || '/images/placeholder.jpg'}
                      alt={p.name}
                      title={p.name}
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

interface Project {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  thumbnail_url?: string;
}

export function ProjectSection({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  return (
    <div className="project">
      <div className="container">
        <div className="title">
          <p>
            <span>Những dự án</span>
            <br /> đã hợp tác
          </p>
        </div>
        <div className="brief" />
        <div className="row list_project">
          {projects.map((p) => (
            <div key={p.id} className="col-12 col-md-6 item">
              <dl>
                <dt>
                  <div className="swing">
                    <figure>
                      <Link href={postHref(p.slug)}>
                        {p.thumbnail_url && <img src={assetUrl(p.thumbnail_url)} alt={p.title} />}
                      </Link>
                    </figure>
                  </div>
                </dt>
                <dd>
                  <h3>
                    <Link href={postHref(p.slug)}>{p.title}</Link>
                  </h3>
                  <p>{p.excerpt}</p>
                  <Link href={postHref(p.slug)} />
                </dd>
                <div className="clearfix" />
              </dl>
            </div>
          ))}
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

/** Tiêu đề slide giống HTML cũ: Họ tên - Chức vụ - SĐT */
function testimonialHeadline(t: Testimonial): string {
  const role = (t.title || t.position || '').trim();
  const phone = (t.phone || '').trim();
  if (!role && !phone) return t.name;
  if (role && t.name.includes(role)) {
    return phone && !t.name.includes(phone) ? `${t.name} - ${phone}` : t.name;
  }
  const parts = [t.name];
  if (role) parts.push(role);
  if (phone) parts.push(phone);
  return parts.join(' - ');
}

/** Bóc SĐT cuối chuỗi "Họ tên - chức vụ - 09xx" để gắn link tel: */
function extractTrailingPhone(text: string): { label: string; phone: string } | null {
  const m = text.match(/^(.*?)\s*-\s*((?:\+?84|0)\d[\d.\s]{7,})\s*$/);
  if (!m) return null;
  return { label: m[1].trim(), phone: m[2].replace(/\s+/g, '') };
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
              const phoneField = (t.phone || '').trim();
              const parsed = phoneField
                ? { label: headline.replace(new RegExp(`\\s*-\\s*${phoneField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), ''), phone: phoneField }
                : extractTrailingPhone(headline);

              return (
                <div key={t.id} className="item">
                  <div>
                    {t.avatar_url && (
                      <a>
                        <img src={assetUrl(t.avatar_url)} alt={headline} />
                      </a>
                    )}
                    <h3>
                      {parsed ? (
                        <>
                          {parsed.label}
                          {' - '}
                          <a href={`tel:${parsed.phone.replace(/\D/g, '')}`} style={{ color: 'inherit' }}>
                            {parsed.phone}
                          </a>
                        </>
                      ) : (
                        headline
                      )}
                    </h3>
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

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  thumbnail_url?: string;
}

export function NewsSection({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  const [first, ...rest] = posts;

  return (
    <div className="news">
      <div className="container">
        <div className="title">
          <p>Tin tức mới nhất</p>
        </div>
        <div className="row list_news">
          <div className="col-12 col-md-6 big_item">
            <dl>
              <dt>
                <div className="swing">
                  <figure className="effect-v7">
                    <Link href={postHref(first.slug)}>
                      {first.thumbnail_url && (
                        <img src={assetUrl(first.thumbnail_url)} alt={first.title} />
                      )}
                    </Link>
                  </figure>
                </div>
              </dt>
              <dd>
                <h3>
                  <Link href={postHref(first.slug)}>{first.title}</Link>
                </h3>
                <p>{first.excerpt}</p>
                <Link href={postHref(first.slug)}>Xem thêm</Link>
                <div className="clearfix" />
              </dd>
            </dl>
          </div>

          <div className="col-12 col-md-6 right">
            {rest.slice(0, 4).map((p) => (
              <div key={p.id} className="col-6 item">
                <dl>
                  <dt>
                    <div className="swing">
                      <figure className="effect-v7">
                        <Link href={postHref(p.slug)}>
                          {p.thumbnail_url && <img src={assetUrl(p.thumbnail_url)} alt={p.title} />}
                        </Link>
                      </figure>
                    </div>
                  </dt>
                  <dd>
                    <h3>
                      <Link href={postHref(p.slug)}>{p.title}</Link>
                    </h3>
                    <Link href={postHref(p.slug)} />
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
