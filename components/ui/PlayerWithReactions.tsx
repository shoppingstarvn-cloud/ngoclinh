'use client';

import VideoPlayer from '@/components/ui/VideoPlayer';
import ReactionBar from '@/components/ui/ReactionBar';
import { reactionTargetFromUrl } from '@/lib/reactions';

/** Player 16:9 + thanh cảm xúc cộng dồn bên dưới. */
export default function PlayerWithReactions({
  src,
  title,
  className,
  showFavorite,
}: {
  src: string;
  title?: string;
  className?: string;
  showFavorite?: boolean;
}) {
  return (
    <div className="nl-react-media">
      <VideoPlayer src={src} title={title} className={className} showFavorite={showFavorite} />
      <ReactionBar target={reactionTargetFromUrl(src)} />
    </div>
  );
}
