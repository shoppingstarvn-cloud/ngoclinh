'use client';

import type { CSSProperties } from 'react';
import ReactionBar from '@/components/ui/ReactionBar';
import { reactionTargetFromUrl } from '@/lib/reactions';

/** Ảnh nội dung + thanh cảm xúc cộng dồn (bấm n lần = n cảm xúc). */
export default function ImageWithReactions({
  src,
  alt = '',
  href,
  className,
  style,
  compact = true,
}: {
  src: string;
  alt?: string;
  href?: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={style} />
  );
  return (
    <div className="nl-react-media" data-nl-react="1">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {img}
        </a>
      ) : (
        img
      )}
      <ReactionBar target={reactionTargetFromUrl(src)} compact={compact} />
    </div>
  );
}
