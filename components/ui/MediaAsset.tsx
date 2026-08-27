import type { CSSProperties, SyntheticEvent } from 'react';
import { assetUrl } from '@/lib/slug';
import { isVideoAsset, videoThumbUrl } from '@/lib/media-url';
import VideoPlayer from '@/components/ui/VideoPlayer';

export type MediaAssetVariant = 'card' | 'hero' | 'gallery';

interface MediaAssetProps {
  src?: string | null;
  alt?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  variant?: MediaAssetVariant;
  /** album_media.kind — Drive không có đuôi file nên URL một mình không đủ nhận video. */
  kind?: string | null;
  onError?: (e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => void;
}

/**
 * Ảnh hoặc video theo URL (kể cả Google Drive + hash #media=video).
 * Gallery = player 16:9. Card/hero = thumbnail (Drive) hoặc video muted cover.
 */
export default function MediaAsset({
  src,
  alt = '',
  title,
  className,
  style,
  variant = 'card',
  kind,
  onError,
}: MediaAssetProps) {
  const url = assetUrl(src);
  if (!url) return null;
  if (kind === 'video' || isVideoAsset(url)) {
    if (variant === 'gallery') {
      return <VideoPlayer src={url} title={title} className={className} />;
    }
    const thumb = videoThumbUrl(url);
    if (thumb) {
      return (
        <span className={`nl-media-thumb ${className || ''}`.trim()} style={style} title={title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={alt} onError={onError} />
          <span className="nl-media-play" aria-hidden>
            ▶
          </span>
        </span>
      );
    }
    const auto = true;
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
        controls={false}
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
