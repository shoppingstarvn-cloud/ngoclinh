'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Lắng nghe postgres_changes trên mọi bảng CMS.
 * Khi Super Admin thêm/sửa/xóa → site tự router.refresh() ngay (không cần F5).
 */
const CMS_TABLES = [
  'site_settings',
  'menus',
  'categories',
  'slides',
  'products',
  'posts',
  'projects',
  'partners',
  'testimonials',
  'services',
  'register_blocks',
  'videos',
  'photos',
  'links',
] as const;

export function LiveSiteSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase.channel('live-site-sync');
    for (const table of CMS_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
