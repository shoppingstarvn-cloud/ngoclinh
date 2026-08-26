'use client';

import { useEffect } from 'react';

type OwlOptions = Record<string, unknown>;

interface JQueryWithOwl {
  (selector: string): {
    trigger: (event: string) => unknown;
    owlCarousel: (options: OwlOptions) => unknown;
  };
  fn?: { owlCarousel?: unknown };
}

declare global {
  interface Window {
    jQuery?: JQueryWithOwl;
  }
}

/**
 * Khởi tạo Owl Carousel (jQuery plugin) trên selector đã cho, tương đương
 * hàm reinitOwl() trong realtime-data.js cũ. CSS owl.carousel.min.css đặt
 * `.owl-carousel { display: none }` cho tới khi JS thêm class `owl-loaded`,
 * nên nếu không gọi hàm này thì các khối carousel sẽ bị ẩn hoàn toàn.
 */
export function useOwlCarousel(selector: string, options: OwlOptions, deps: readonly unknown[]) {
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const revealFallback = () => {
      if (typeof document === 'undefined') return;
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add('owl-loaded');
      });
    };

    const init = () => {
      const $ = window.jQuery;
      if (!$ || !$.fn || !$.fn.owlCarousel) return false;
      try {
        $(selector).trigger('destroy.owl.carousel');
      } catch {
        // chưa init lần nào — bỏ qua
      }
      $(selector).owlCarousel(options);
      return true;
    };

    if (!init()) {
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts += 1;
        if (cancelled) {
          if (pollTimer) clearInterval(pollTimer);
          return;
        }
        if (init()) {
          if (pollTimer) clearInterval(pollTimer);
          return;
        }
        if (attempts > 40) {
          if (pollTimer) clearInterval(pollTimer);
          revealFallback();
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      const $ = window.jQuery;
      if ($ && $.fn && $.fn.owlCarousel) {
        try {
          $(selector).trigger('destroy.owl.carousel');
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
