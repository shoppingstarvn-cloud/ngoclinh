import type { Metadata } from 'next';
import { SiteShell } from '@/components/layout/SiteShell';
import { getHomepageData } from '@/lib/data/homepage';
import {
  SHARE_DESCRIPTION,
  SHARE_SITE_NAME,
  SHARE_TITLE,
  SHARE_TITLE_FULL,
  SITE_URL,
  shareOpenGraph,
  shareTwitter,
} from '@/lib/seo';
import {
  AboutLink,
  ActivitySection,
  CategoryGrid,
  NewsSection,
  PartnerSection,
  ProjectSection,
  SlideCarousel,
  TestimonialSection,
} from '@/components/home/HomeSections';

// ISR 60s — HTML trang chủ đủ nhanh để crawler đọc hết OG (force-dynamic ~5s
// khiến Zalo timeout và giữ cache Cửa Âu). Admin vẫn revalidatePath('/') khi lưu.
export const revalidate = 60;

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
  const companyName = data.settings.site_name || SHARE_SITE_NAME;

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
      <ActivitySection images={data.activityImages} />
      <ProjectSection projects={data.projects} />
      <PartnerSection partners={data.partners} />
      <TestimonialSection testimonials={data.testimonials} />
      <NewsSection posts={data.posts} />
    </SiteShell>
  );
}
