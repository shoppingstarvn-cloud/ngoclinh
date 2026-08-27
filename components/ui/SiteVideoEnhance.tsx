'use client';

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import VideoPlayer from '@/components/ui/VideoPlayer';

const SELECT = [
  '.detail-content video',
  '.content_news_page video',
  '.detail_product video',
  '.post-attachments video',
  '.legacy-static-page video',
  '.detail-content .nl-video-embed',
  '.content_news_page .nl-video-embed',
  '.detail_product .nl-video-embed',
  '.post-attachments .nl-video-embed',
  '.legacy-static-page .nl-video-embed',
].join(', ');

function srcOf(el: Element): string {
  if (el instanceof HTMLVideoElement) {
    return el.getAttribute('data-src') || el.currentSrc || el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
  }
  return el.getAttribute('data-src') || el.querySelector('iframe,video')?.getAttribute('src') || '';
}

/**
 * Bài viết cũ còn thẻ <video src="Drive download"> — hydrate thành player 16:9
 * (iframe preview Drive hoặc HTML5). Không đụng admin Quill / nền album.
 */
export default function SiteVideoEnhance() {
  useEffect(() => {
    const roots: Root[] = [];
    let t: number | undefined;

    function enhance() {
      document.querySelectorAll(SELECT).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (el.closest('[data-nl-yt], .nl-yt-host, .ql-editor, .admin-root, .nl-yt, .alb-vth, .alb-ph, .alb-tile, .alb-grid')) return;
        if (el.classList.contains('alb-bgvid') || el.classList.contains('thumb-img')) return;
        const src = srcOf(el);
        if (!src) return;
        const host = document.createElement('div');
        host.setAttribute('data-nl-yt', '1');
        host.className = 'nl-yt-host';
        el.replaceWith(host);
        const root = createRoot(host);
        roots.push(root);
        root.render(<VideoPlayer src={src} />);
      });
    }

    enhance();
    const mo = new MutationObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(enhance, 80);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
      roots.forEach((r) => {
        try {
          r.unmount();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  return null;
}
