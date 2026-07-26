import type { Metadata } from 'next';
import { SiteShell } from '@/components/layout/SiteShell';
import { getHomepageData } from '@/lib/data/homepage';
import {
  CategoryGrid,
  NewsBlock,
  PartnerCarousel,
  ProductCarousel,
  ProjectList,
  SlideCarousel,
} from '@/components/home/HomeSections';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getHomepageData();
  return {
    title: settings.site_name || 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU',
    description: settings.meta_description,
    keywords: settings.meta_keywords,
  };
}

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <SiteShell settings={data.settings} menus={data.menus}>
      <SlideCarousel slides={data.slides} />

      {data.settings.intro_text && (
        <section
          id="dynamic-intro"
          className="container"
          dangerouslySetInnerHTML={{ __html: data.settings.intro_text }}
        />
      )}

      <section className="container service_home">
        <CategoryGrid categories={data.categories} />
      </section>

      <section className="container">
        <ProductCarousel products={data.products} />
      </section>

      <section className="container">
        <NewsBlock posts={data.posts} />
      </section>

      <section className="container">
        <ProjectList projects={data.projects} />
      </section>

      <section className="container">
        <PartnerCarousel partners={data.partners} />
      </section>
    </SiteShell>
  );
}
