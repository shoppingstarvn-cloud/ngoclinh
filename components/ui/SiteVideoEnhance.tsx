'use client';

import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PlayerWithReactions from '@/components/ui/PlayerWithReactions';
import ReactionBar from '@/components/ui/ReactionBar';
import { reactionTargetFromUrl } from '@/lib/reactions';

const VIDEO_SELECT = [
  '.nl-video-embed',
  '.detail-content video',
  '.content_news_page video',
  '.detail_product video',
  '.desc_product video',
  '.post-attachments video',
  '#dynamic-intro video',
  '.detail-content .nl-video-embed',
  '.content_news_page .nl-video-embed',
  '.detail_product .nl-video-embed',
  '.desc_product .nl-video-embed',
  '.post-attachments .nl-video-embed',
  '#dynamic-intro .nl-video-embed',
  '.detail-content iframe[src*="drive.google.com"]',
  '.content_news_page iframe[src*="drive.google.com"]',
  '.detail_product iframe[src*="drive.google.com"]',
  '.desc_product iframe[src*="drive.google.com"]',
  '.post-attachments iframe[src*="drive.google.com"]',
  '#dynamic-intro iframe[src*="drive.google.com"]',
].join(', ');

/** Chỉ ảnh nội dung bài/sản phẩm — không logo, slider, hộp hỗ trợ. */
const IMG_SELECT = [
  '.detail-content img',
  '.content_news_page img',
  '.detail_product img',
  '.desc_product img',
  '.left_ppage img',
  '.brief_ppage img',
  '.post-attachments img',
  '#dynamic-intro img',
].join(', ');

function srcOf(el: Element): string {
  if (el instanceof HTMLVideoElement) {
    return el.getAttribute('data-src') || el.currentSrc || el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '';
  }
  if (el instanceof HTMLIFrameElement) {
    return el.getAttribute('src') || '';
  }
  return el.getAttribute('data-src') || el.querySelector('iframe,video')?.getAttribute('src') || '';
}

function skipHost(el: Element): boolean {
  return !!el.closest(
    [
      '[data-nl-yt]',
      '[data-nl-react]',
      '.nl-yt-host',
      '.nl-react-media',
      '.ql-editor',
      '.admin-root',
      '.nl-yt',
      '.alb-vth',
      '.alb-ph',
      '.alb-tile',
      '.alb-grid',
      '.alb-lb',
      '.nl-reactbar',
      '.cat-card',
      '.effect-v7',
      '.nl-media-thumb',
      '.logo',
      '.slides',
      '.flexslider',
      '.slider_sub',
      '.subslider',
      '.support_box',
      '.taskbar-m',
      '.taskbar',
      'header',
      'footer',
      '.footer',
      'nav',
      '.menu',
    ].join(', '),
  );
}

function wrapImage(img: HTMLImageElement, roots: Root[]) {
  if (skipHost(img) || img.dataset.nlReactPending === '1') return;
  if (img.classList.contains('alb-bgvid') || img.classList.contains('thumb-img')) return;
  const src = img.currentSrc || img.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) return;
  if (!img.complete) {
    img.dataset.nlReactPending = '1';
    img.addEventListener(
      'load',
      () => {
        delete img.dataset.nlReactPending;
        wrapImage(img, roots);
      },
      { once: true },
    );
    return;
  }
  const w = img.clientWidth;
  const h = img.clientHeight;
  if (!w || !h || w < 96 || h < 64) return;

  const host = document.createElement('div');
  host.setAttribute('data-nl-react', '1');
  host.className = 'nl-react-media';
  const frameP = img.closest('.left_ppage > p');
  const parent = img.parentElement;
  if (frameP?.parentElement) {
    frameP.replaceWith(host);
    host.appendChild(frameP);
  } else if (parent instanceof HTMLAnchorElement) {
    parent.replaceWith(host);
    host.appendChild(parent);
  } else {
    img.replaceWith(host);
    host.appendChild(img);
  }
  const bar = document.createElement('div');
  host.appendChild(bar);
  const root = createRoot(bar);
  roots.push(root);
  root.render(<ReactionBar target={reactionTargetFromUrl(src)} compact />);
}

/**
 * Bài viết cũ còn thẻ <video> — hydrate thành player 16:9 + thanh cảm xúc cộng dồn.
 * Ảnh nội dung bài viết cũng gắn cùng thanh cảm xúc. Không đụng admin Quill / nền album.
 */
export default function SiteVideoEnhance() {
  useEffect(() => {
    const roots: Root[] = [];
    let t: number | undefined;

    function enhance() {
      document.querySelectorAll(VIDEO_SELECT).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        if (skipHost(el)) return;
        if ((el instanceof HTMLIFrameElement || el instanceof HTMLVideoElement) && el.closest('.nl-video-embed')) return;
        if (el.querySelector('[data-nl-yt], .nl-yt')) return;
        if (el.classList.contains('alb-bgvid') || el.classList.contains('thumb-img')) return;
        const src = srcOf(el);
        if (!src) return;
        const host = document.createElement('div');
        host.setAttribute('data-nl-yt', '1');
        host.className = 'nl-yt-host';
        el.replaceWith(host);
        const root = createRoot(host);
        roots.push(root);
        root.render(<PlayerWithReactions src={src} />);
      });
      document.querySelectorAll(IMG_SELECT).forEach((el) => {
        if (el instanceof HTMLImageElement) wrapImage(el, roots);
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
