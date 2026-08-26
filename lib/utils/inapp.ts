/**
 * Phát hiện trình duyệt IN-APP (webview nhúng) của Zalo, Facebook, Messenger,
 * Instagram, TikTok, Line, Zeta... — nơi Google CHẶN đăng nhập OAuth
 * (lỗi "disallowed_useragent" / "trình duyệt không an toàn").
 * Giải pháp: mở link bằng trình duyệt NGOÀI (Chrome/Safari) để Google cho phép.
 */
export interface InAppInfo {
  inApp: boolean;
  name: string; // 'Zalo' | 'Facebook' | 'Messenger' | 'Instagram' | 'TikTok' | ...
  os: 'android' | 'ios' | 'other';
}

export function detectInApp(): InAppInfo {
  if (typeof navigator === 'undefined') return { inApp: false, name: '', os: 'other' };
  const ua = navigator.userAgent || '';
  const os: InAppInfo['os'] = /android/i.test(ua)
    ? 'android'
    : /iphone|ipad|ipod/i.test(ua)
      ? 'ios'
      : 'other';

  let name = '';
  if (/zalo/i.test(ua)) name = 'Zalo';
  else if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) name = 'Facebook';
  else if (/Messenger|MessengerLite/i.test(ua)) name = 'Messenger';
  else if (/Instagram/i.test(ua)) name = 'Instagram';
  else if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) name = 'TikTok';
  else if (/\bLine\//i.test(ua)) name = 'Line';
  // Webview chung trên Android (không phải Chrome đầy đủ): wv hoặc Version/x.x Chrome
  else if (os === 'android' && /; wv\)/i.test(ua)) name = 'Ứng dụng';

  return { inApp: !!name, name, os };
}

/**
 * Cố gắng mở URL hiện tại bằng trình duyệt NGOÀI.
 * - Android: dùng intent:// để bật Chrome.
 * - iOS: thử mở Chrome iOS (googlechromes://); nếu không có, người dùng cần bấm
 *   menu "..." của Zalo/Facebook → "Mở trong trình duyệt/Safari".
 * Trả về true nếu đã thử điều hướng (Android/iOS-Chrome), false nếu cần hướng dẫn tay.
 */
export function openInExternalBrowser(info: InAppInfo, url = window.location.href): boolean {
  const noScheme = url.replace(/^https?:\/\//i, '');
  if (info.os === 'android') {
    // Mở Chrome; nếu không có Chrome, Android sẽ hỏi chọn trình duyệt.
    window.location.href = `intent://${noScheme}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }
  if (info.os === 'ios') {
    // Chrome iOS (nếu cài). Không cài thì không nhảy — cần hướng dẫn tay.
    window.location.href = `googlechromes://${noScheme}`;
    return false; // vẫn hiện hướng dẫn phòng khi không có Chrome
  }
  window.open(url, '_blank');
  return true;
}
