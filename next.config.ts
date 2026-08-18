import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Ảnh slide thường > 1MB. Server Action mặc định 1MB → lỗi
  // "An unexpected response was received from the server."
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },

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
      // Zalo cache của "/" vẫn là Cửa Âu — đưa crawler sang thẻ OG riêng.
      { source: '/ai', destination: '/hsai.html', permanent: false },
      { source: '/share-card', destination: '/hsai.html', permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: '/hsai.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/og/zalo.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=300' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/og/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/og-image.jpg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

export default nextConfig;
