'use client';

import { useState, type CSSProperties } from 'react';

/**
 * Thanh nút CHIA SẺ dùng chung cho mọi ảnh/video (trang chủ + website con).
 * - Facebook, Zalo: chia sẻ THẬT (mở hộp đăng, có ảnh xem trước, bấm vào quay về ngoclinh).
 * - Video: thêm YouTube, TikTok (mở nền tảng + copy link — web không tự đăng được).
 * - "Chia sẻ": Web Share API (trên điện thoại mở khay chọn TikTok/YouTube/FB/Zalo… thật).
 * sharePath là đường dẫn trang xem-trước riêng của ảnh/video, vd "/s/am/123".
 */
export default function ShareBar({
  sharePath,
  title = 'Ngọc Linh · Hệ sinh thái AI',
  isVideo = false,
  youtubeUrl = '',
}: {
  sharePath: string;
  title?: string;
  isVideo?: boolean;
  youtubeUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  function absUrl() {
    if (typeof window === 'undefined') return sharePath;
    return sharePath.startsWith('http') ? sharePath : window.location.origin + sharePath;
  }
  function popup(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=680,height=640');
  }
  async function copyLink(): Promise<string> {
    const u = absUrl();
    try {
      await navigator.clipboard.writeText(u);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
    return u;
  }

  function shareFacebook() {
    popup('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(absUrl()));
  }
  function shareZalo() {
    popup('https://sp.zalo.me/plugins/share?href=' + encodeURIComponent(absUrl()));
  }
  function openYouTube() {
    if (youtubeUrl) popup(youtubeUrl);
    else popup('https://www.youtube.com');
  }
  async function openTikTok() {
    await copyLink();
    if (navigator.share) {
      try { await navigator.share({ title, url: absUrl() }); return; } catch { /* user huỷ */ }
    }
    alert('Đã sao chép link. Mở TikTok và dán link vào bài đăng nhé.');
    popup('https://www.tiktok.com');
  }
  async function systemShare() {
    const u = absUrl();
    if (navigator.share) {
      try { await navigator.share({ title, url: u }); return; } catch { /* user huỷ */ }
    }
    await copyLink();
    alert('Trình duyệt không hỗ trợ chia sẻ nhanh. Đã sao chép link để anh/chị dán đi chia sẻ.');
  }

  return (
    <div style={wrap}>
      <span style={label}>Chia sẻ:</span>
      <button type="button" onClick={shareFacebook} style={btn('#1877F2')} title="Chia sẻ lên Facebook">
        <i className="fab fa-facebook-f" /> Facebook
      </button>
      <button type="button" onClick={shareZalo} style={btn('#0068FF')} title="Chia sẻ lên Zalo">
        <b style={{ fontStyle: 'italic' }}>Zalo</b>
      </button>
      {isVideo && (
        <>
          <button type="button" onClick={openYouTube} style={btn('#FF0000')} title="Mở / chia sẻ trên YouTube">
            <i className="fab fa-youtube" /> YouTube
          </button>
          <button type="button" onClick={openTikTok} style={btn('#111827')} title="Chia sẻ lên TikTok">
            <i className="fab fa-tiktok" /> TikTok
          </button>
        </>
      )}
      <button type="button" onClick={systemShare} style={btn('#16a34a')} title="Chia sẻ (khay hệ thống)">
        <i className="fas fa-share-alt" /> Chia sẻ
      </button>
      <button type="button" onClick={copyLink} style={btn('#475569')} title="Sao chép link">
        <i className="fas fa-link" /> {copied ? 'Đã chép!' : 'Chép link'}
      </button>
    </div>
  );
}

const wrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  margin: '10px 0',
};
const label: CSSProperties = { fontSize: 13, fontWeight: 700, color: '#334155' };
function btn(bg: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1.2,
  };
}
