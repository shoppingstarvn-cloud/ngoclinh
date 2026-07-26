import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Legacy CSS/JS trong public/css — import trực tiếp qua layout
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'bfruxinvvvaqufghtigw.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    unoptimized: true,
  },

  // Redirect + rewrite phần lớn xử lý trong middleware.ts (cần logic động,
  // đọc _detail-map.json). Ở đây chỉ giữ các rule tĩnh, đơn giản.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/index-2.html', destination: '/', permanent: true },
      // admin.html/superadmin.html tĩnh cũ → dashboard React mới tại /admin
      { source: '/admin.html', destination: '/admin', permanent: true },
      { source: '/superadmin.html', destination: '/admin', permanent: true },
    ];
  },
};

export default nextConfig;
