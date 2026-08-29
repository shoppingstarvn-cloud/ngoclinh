'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { assetUrl } from '@/lib/slug';
import {
  extractDriveFileId,
  isVideoAsset,
  mediaDisplayUrl,
  videoThumbUrl,
  type MediaDisplayQuality,
} from '@/lib/media-url';
import PlayerWithReactions from '@/components/ui/PlayerWithReactions';

export type MediaAssetVariant = 'card' | 'hero' | 'gallery';

interface MediaAssetProps {
  src?: string | null;
  alt?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  variant?: MediaAssetVariant;
  kind?: string | null;
  displayQuality?: MediaDisplayQuality;
  driveFileId?: string | null;
  thumbSize?: string;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
}

function ThumbImage({
  url,
  driveFileId,
  displayQuality,
  thumbSize,
  alt,
  title,
  className,
  style,
  onError,
}: {
  url: string;
  driveFileId?: string | null;
  displayQuality: MediaDisplayQuality;
  thumbSize?: string;
  alt?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const primary = useMemo(
    () => mediaDisplayUrl(url, { driveFileId, quality: displayQuality, thumbSize }),
    [url, driveFileId, displayQuality, thumbSize],
  );
  const fallback = useMemo(() => {
    if (displayQuality !== 'thumb') return null;
    return mediaDisplayUrl(url, { driveFileId, quality: 'full' });
  }, [url, driveFileId, displayQuality]);

  const [src, setSrc] = useState(primary);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setTriedFallback(false);
  }, [primary]);

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      if (!triedFallback && fallback && src !== fallback) {
        setTriedFallback(true);
        setSrc(fallback);
        return;
      }
      onError?.(e);
    },
    [triedFallback, fallback, src, onError],
  );

  const lazy = displayQuality === 'thumb';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      style={style}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      onError={handleError}
    />
  );
}

/**
 * Ảnh hoặc video theo URL (kể cả Google Drive + hash #media=video).
 */
export default function MediaAsset({
  src,
  alt = '',
  title,
  className,
  style,
  variant = 'card',
  kind,
  displayQuality = 'full',
  driveFileId,
  thumbSize,
  onError,
}: MediaAssetProps) {
  const url = assetUrl(src);
  const resolvedDriveId = driveFileId ?? extractDriveFileId(url);

  if (!url) return null;
  if (kind === 'video' || isVideoAsset(url)) {
    if (variant === 'gallery') {
      return <PlayerWithReactions src={url} title={title} className={className} />;
    }
    const thumb = videoThumbUrl(url);
    return (
      <span className={`nl-media-thumb ${className || ''}`.trim()} style={style} title={title}>
        {thumb ? (
          <ThumbImage
            url={thumb}
            driveFileId={resolvedDriveId}
            displayQuality="thumb"
            thumbSize={thumbSize || 'w400'}
            alt={alt}
            onError={onError}
          />
        ) : null}
        <span className="nl-media-play" aria-hidden>
          ▶
        </span>
      </span>
    );
  }

  return (
    <ThumbImage
      url={url}
      driveFileId={resolvedDriveId}
      displayQuality={displayQuality}
      thumbSize={thumbSize}
      alt={alt}
      title={title}
      className={className}
      style={style}
      onError={onError}
    />
  );
}
