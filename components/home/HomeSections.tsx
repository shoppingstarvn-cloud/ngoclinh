'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { postHref, itemHref } from '@/lib/slug';

interface Slide {
  id: number;
  title?: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
}

export function SlideCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(slides.length, 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  if (!slides.length) return null;

  const slide = slides[index];

  return (
    <div id="slide-container" className="slide-carousel">
      <div className="item">
        <Link href={slide.link_url || '#'}>
          <img src={slide.image_url} alt={slide.title || 'Slide'} />
        </Link>
        {slide.title && (
          <div>
            <h3>{slide.title}</h3>
            <p>{slide.subtitle}</p>
          </div>
        )}
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

export function ProductCarousel({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <div className="product-carousel owl-carousel">
      {products.map((p) => (
        <div key={p.id} className="item">
          <dl>
            <dt>
              <img
                src={p.thumbnail_url || '/images/placeholder.jpg'}
                alt={p.name}
                title={p.name}
              />
            </dt>
            <dd>
              <h3>{p.name}</h3>
              {p.price && <p className="price">{p.price}</p>}
              <Link href={itemHref(p)} title={p.name} style={{ position: 'absolute', inset: 0 }} />
            </dd>
          </dl>
        </div>
      ))}
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

export function NewsBlock({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  const [first, ...rest] = posts;

  return (
    <div className="news">
      <div className="list_news">
        <div className="big_item">
          <dl>
            <dt>
              <Link href={postHref(first.slug)}>
                {first.thumbnail_url && <img src={first.thumbnail_url} alt={first.title} />}
              </Link>
            </dt>
            <dd>
              <h3>
                <Link href={postHref(first.slug)}>{first.title}</Link>
              </h3>
              <p>{first.excerpt}</p>
              <Link href={postHref(first.slug)}>Xem thêm</Link>
            </dd>
          </dl>
        </div>
        <div className="right">
          {rest.slice(0, 4).map((p) => (
            <div key={p.id} className="col-6 item">
              <dl>
                <dt>
                  <Link href={postHref(p.slug)}>
                    {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} />}
                  </Link>
                </dt>
                <dd>
                  <h3>
                    <Link href={postHref(p.slug)}>{p.title}</Link>
                  </h3>
                </dd>
              </dl>
            </div>
          ))}
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

export function ProjectList({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  return (
    <div className="project">
      <div className="list_project row">
        {projects.map((p) => (
          <div key={p.id} className="col-12 col-md-6 item">
            <dl>
              <dt>
                <Link href={postHref(p.slug)}>
                  {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} />}
                </Link>
              </dt>
              <dd>
                <h3>
                  <Link href={postHref(p.slug)}>{p.title}</Link>
                </h3>
                <p>{p.excerpt}</p>
              </dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Partner {
  id: number;
  name: string;
  logo_url?: string;
  website_url?: string;
}

export function PartnerCarousel({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;
  return (
    <div className="partner-carousel owl-carousel">
      {partners.map((p) => (
        <div key={p.id} className="item">
          <a href={p.website_url || '#'} target="_blank" rel="noreferrer" title={p.name}>
            {p.logo_url && <img src={p.logo_url} alt={p.name} />}
          </a>
        </div>
      ))}
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
      <div className="row">
        {categories.map((cat) => (
          <div key={cat.id} className="col-12 col-md-4 item_s">
            <dl>
              <dt>
                <Link href={itemHref(cat)} title={cat.name}>
                  <img
                    src={cat.thumbnail_url || cat.image_url || '/images/placeholder.jpg'}
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
  );
}
