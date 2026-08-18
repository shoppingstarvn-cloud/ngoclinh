import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'SUPER ADMIN',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo/shopmartai-ai.png?v=20260818', type: 'image/png' },
    ],
    shortcut: '/logo/shopmartai-ai.png?v=20260818',
    apple: '/apple-touch-icon.png',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* FontAwesome 6 riêng cho /admin — site chính vẫn dùng FontAwesome 4 legacy,
          nạp trực tiếp ở đây để Next.js tự hoist vào <head>, không ảnh hưởng route khác. */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      {children}
    </>
  );
}
