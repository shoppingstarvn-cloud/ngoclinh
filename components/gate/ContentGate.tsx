'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AuthModal from '@/components/auth/AuthModal';
import { hrefMatchesAlbum } from '@/lib/album/href-keys';

/**
 * Cổng đăng nhập TOÀN CỤC — chặn link menu con của khối "Hoạt động phong trào".
 * Trang album: cho vào URL → AlbumView hiện thẻ "cần đăng nhập" (như ảnh mẫu).
 * Link legacy (.html): mở AuthModal trước khi điều hướng.
 */
export default function ContentGate() {
  const [targets, setTargets] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const albumKeysRef = useRef<Set<string>>(new Set());
  const unlockedRef = useRef(false);
  const pendingRef = useRef<{ href: string; external: boolean } | null>(null);

  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    fetch('/api/gate/context')
      .then((r) => r.json())
      .then((d) => {
        unlockedRef.current = !!d.unlocked;
        setTargets(Array.isArray(d.targets) ? d.targets : []);
        setPatterns(Array.isArray(d.patterns) ? d.patterns : []);
        const keys = d.albumMatchKeys ?? d.albumSlugs;
        if (Array.isArray(keys)) {
          albumKeysRef.current = new Set(
            keys.map((s: string) => String(s).toLowerCase()),
          );
        }
      })
      .catch(() => {});
  }, []);

  const followPending = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p) return;
    if (p.external) window.open(p.href, '_blank');
    else window.location.href = p.href;
  }, []);

  useEffect(() => {
    if (!targets.length && !patterns.length) return;
    function onClick(e: MouseEvent) {
      if (unlockedRef.current) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el) return;
      const raw = (el as HTMLAnchorElement).getAttribute('href') || '';
      if (!raw) return;
      const rawLc = raw.toLowerCase();
      const hit = targets.includes(raw) || patterns.some((p) => p && rawLc.includes(p));
      if (!hit) return;
      if (hrefMatchesAlbum(raw, albumKeysRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      pendingRef.current = { href: raw, external: /^https?:\/\//i.test(raw) };
      setAuthOpen(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [targets, patterns]);

  return (
    <AuthModal
      open={authOpen}
      onClose={() => {
        setAuthOpen(false);
        pendingRef.current = null;
      }}
      onAuthed={() => {
        unlockedRef.current = true;
        setAuthOpen(false);
        followPending();
      }}
    />
  );
}
