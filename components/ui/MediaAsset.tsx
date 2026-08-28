import type { CSSProperties, SyntheticEvent } from 'react';
import { assetUrl } from '@/lib/slug';
import { isVideoAsset, videoThumbUrl } from '@/lib/media-url';
import PlayerWithReactions from '@/components/ui/PlayerWithReactions';

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
      return <PlayerWithReactions src={url} title={title} className={className} />;
    }
    const thumb = videoThumbUrl(url);
    return (
      <span className={`nl-media-thumb ${className || ''}`.trim()} style={style} title={title}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={alt} onError={onError} />
        ) : null}
        <span className="nl-media-play" aria-hidden>
          ▶
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} title={title} className={className} style={style} onError={onError} />
  );
}
