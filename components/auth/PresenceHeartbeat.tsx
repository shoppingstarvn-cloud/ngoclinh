'use client';

import { useEffect } from 'react';

/**
 * Ping hiện diện ~30s khi user đã đăng nhập (cookie member_token).
 * Gắn ở root layout để đếm cả trang chủ, album /truong/lop và /quan-tri-trang-con.
 * Không ping Super Admin CMS (/admin) — đó không phải khách website.
 */
function detectScope(pathname: string): 'main' | 'member' {
  if (pathname.startsWith('/quan-tri-trang-con')) return 'member';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] !== 'api' && parts[0] !== 'admin' && parts[0] !== '_next') {
    return 'member';
  }
  return 'main';
}

export default function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;
    let timer = 0;

    async function ping() {
      if (stopped || document.hidden) return;
      const path = window.location.pathname;
      if (path.startsWith('/admin')) return;
      try {
        // 401 khi chưa đăng nhập: không dừng interval — user có thể login ngay trên trang này.
        await fetch('/api/account/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ scope: detectScope(path) }),
        });
      } catch {
        /* mạng tạm — lần interval sau thử lại */
      }
    }

    ping();
    timer = window.setInterval(ping, 30_000);
    document.addEventListener('visibilitychange', ping);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);

  return null;
}
