import type { Metadata } from 'next';
import { SiteShell } from '@/components/layout/SiteShell';
import { getHomepageData } from '@/lib/data/homepage';
import {
  AboutLink,
  CategoryGrid,
  NewsSection,
  PartnerSection,
  ProductSection,
  ProjectSection,
  SlideCarousel,
  TestimonialSection,
} from '@/components/home/HomeSections';

// Luôn render động (không dùng Full Route Cache) để mọi thay đổi từ Super Admin
// (qua Server Actions + revalidatePath) phản ánh NGAY LẬP TỨC trên trang chủ,
// kể cả sau khi đã build/deploy — không cần rebuild lại.
export const dynamic = 'force-dynamic';

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
  const companyName = data.settings.site_name || 'CÔNG TY CỔ PHẦN THƯƠNG MẠI CỬA ÂU';

  return (
    <SiteShell
      settings={data.settings}
      menus={data.menus}
      links={data.links}
      categories={data.categories}
    >
      <SlideCarousel slides={data.slides} />
      <AboutLink companyName={companyName} introHtml={data.settings.intro_text} />
      <CategoryGrid categories={data.categories} />
      <ProductSection products={data.products} />
      <ProjectSection projects={data.projects} />
      <PartnerSection partners={data.partners} />
      <TestimonialSection testimonials={data.testimonials} />
      <NewsSection posts={data.posts} />
    </SiteShell>
  );
}
