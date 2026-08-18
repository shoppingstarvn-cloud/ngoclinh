import type { Metadata } from 'next';
import { SiteShell } from '@/components/layout/SiteShell';
import { getHomepageData } from '@/lib/data/homepage';
import {
  SHARE_DESCRIPTION,
  SHARE_TITLE,
  SHARE_TITLE_FULL,
  SITE_URL,
  shareOpenGraph,
  shareTwitter,
} from '@/lib/seo';
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
  // Thẻ Zalo/Facebook lấy từ đây — không lấy title/mô tả từ CMS.
  return {
    title: SHARE_TITLE_FULL,
    description: SHARE_DESCRIPTION,
    alternates: { canonical: SITE_URL },
    openGraph: shareOpenGraph({
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
      url: `${SITE_URL}/`,
    }),
    twitter: shareTwitter(),
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
