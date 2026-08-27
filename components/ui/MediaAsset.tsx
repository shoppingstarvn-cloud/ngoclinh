import type { CSSProperties, SyntheticEvent } from 'react';
import { assetUrl } from '@/lib/slug';
import { isVideoAsset } from '@/lib/media-url';

export type MediaAssetVariant = 'card' | 'hero' | 'gallery';

interface MediaAssetProps {
  src?: string | null;
  alt?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  variant?: MediaAssetVariant;
  onError?: (e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => void;
}

/**
 * Ảnh hoặc video theo URL (kể cả Google Drive + hash #media=video).
 * Không đánh 'use client' — dùng được ở RSC (listing) lẫn client (homepage).
 */
export default function MediaAsset({
  src,
  alt = '',
  title,
  className,
  style,
  variant = 'card',
  onError,
}: MediaAssetProps) {
  const url = assetUrl(src);
  if (!url) return null;
  if (isVideoAsset(url)) {
    const auto = variant !== 'gallery';
    return (
      <video
        src={url}
        className={className}
        style={style}
        title={title}
        autoPlay={auto}
        muted={auto}
        loop={auto}
        playsInline
        controls={variant === 'gallery'}
        preload="metadata"
        onError={onError}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} title={title} className={className} style={style} onError={onError} />
  );
}
