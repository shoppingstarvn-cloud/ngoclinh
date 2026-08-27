'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  drivePreviewUrl,
  extractDriveFileId,
  videoPlaybackMode,
  videoThumbUrl,
} from '@/lib/media-url';
import { isMediaFavorite, toggleMediaFavorite } from '@/lib/media-favorites';

const QUALITIES = [
  { id: 'auto', label: 'Tự động', h: 0 },
  { id: '720', label: '720p', h: 720 },
  { id: '1080', label: '1080p', h: 1080 },
  { id: '2k', label: '2K', h: 1440 },
  { id: '4k', label: '4K', h: 2160 },
] as const;

type QualityId = (typeof QUALITIES)[number]['id'];

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function requestFs(el: HTMLElement) {
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  if (el.requestFullscreen) return el.requestFullscreen();
  if (anyEl.webkitRequestFullscreen) return anyEl.webkitRequestFullscreen();
}

function exitFs() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
}

export default function VideoPlayer({
  src,
  title,
  poster,
  className,
  showFavorite = true,
  favoriteKind = 'video',
}: {
  src: string;
  title?: string;
  poster?: string;
  className?: string;
  showFavorite?: boolean;
  favoriteKind?: 'video' | 'image';
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qWrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'html5' | 'drive-iframe'>(() => videoPlaybackMode(src));
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState<QualityId>('auto');
  const [qOpen, setQOpen] = useState(false);
  const [sourceH, setSourceH] = useState(0);
  const [fs, setFs] = useState(false);
  const [fav, setFav] = useState(false);
  const [err, setErr] = useState('');

  const driveId = extractDriveFileId(src);
  const posterUrl = poster || videoThumbUrl(src) || undefined;

  useEffect(() => {
    setMode(videoPlaybackMode(src));
    setErr('');
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setSourceH(0);
    setFav(isMediaFavorite(src));
  }, [src]);

  useEffect(() => {
    const onFs = () => {
      const el = wrapRef.current;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setFs(!!(document.fullscreenElement === el || doc.webkitFullscreenElement === el));
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange' as 'fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange' as 'fullscreenchange', onFs);
    };
  }, []);

  useEffect(() => {
    if (!qOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!qWrapRef.current?.contains(e.target as Node)) setQOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [qOpen]);

  const onHtml5Error = useCallback(() => {
    if (driveId) {
      setMode('drive-iframe');
      setErr('');
      return;
    }
    setErr('Không phát được video này. Thử Tải về rồi mở bằng trình phát trên máy.');
  }, [driveId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (fs) void exitFs();
    else void requestFs(el);
  };

  useEffect(() => {
    if (mode !== 'html5') return;
    const v = videoRef.current;
    if (!v) return;
    const check = () => {
      if (v.error) onHtml5Error();
    };
    v.addEventListener('error', check);
    const t = window.setTimeout(check, 800);
    return () => {
      v.removeEventListener('error', check);
      window.clearTimeout(t);
    };
  }, [mode, src, onHtml5Error]);

  const qMeta = QUALITIES.find((q) => q.id === quality) || QUALITIES[0];
  const capH = fs || quality === 'auto' || !qMeta.h ? undefined : qMeta.h;
  const stageStyle = capH
    ? {
        maxHeight: capH,
        width: `min(100%, ${Math.round((capH * 16) / 9)}px)`,
        marginInline: 'auto' as const,
      }
    : undefined;

  const iframeSrc = driveId ? drivePreviewUrl(driveId) : '';

  return (
    <div className={`nl-yt ${className || ''}`.trim()} ref={wrapRef}>
      <div
        className={`nl-yt-stage${mode === 'drive-iframe' ? ' nl-yt-drive' : ''}`}
        style={stageStyle}
        onClick={mode === 'html5' ? togglePlay : undefined}
      >
        {mode === 'drive-iframe' && iframeSrc ? (
          <iframe
            src={iframeSrc}
            title={title || 'Video'}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <video
            ref={videoRef}
            src={src}
            poster={posterUrl}
            playsInline
            controls={false}
            preload="metadata"
            title={title}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 0);
              setSourceH(e.currentTarget.videoHeight || 0);
            }}
            onError={onHtml5Error}
          />
        )}
        {mode === 'html5' && !playing && !err && (
          <button
            type="button"
            className="nl-yt-bigplay"
            aria-label="Phát video"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            ▶
          </button>
        )}
        {err && <div className="nl-yt-err">{err}</div>}
      </div>

      <div className="nl-yt-bar" onClick={(e) => e.stopPropagation()}>
        {mode === 'html5' && (
          <>
            <button type="button" className="nl-yt-btn" onClick={togglePlay} title={playing ? 'Tạm dừng' : 'Phát'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <span className="nl-yt-time">
              {fmt(current)} / {fmt(duration)}
            </span>
            <input
              className="nl-yt-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(current, duration || 0)}
              onChange={(e) => {
                const t = Number(e.target.value);
                const v = videoRef.current;
                if (v) v.currentTime = t;
                setCurrent(t);
              }}
            />
            <button
              type="button"
              className="nl-yt-btn"
              title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
              }}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              className="nl-yt-vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const n = Number(e.target.value);
                const v = videoRef.current;
                setVolume(n);
                if (v) {
                  v.volume = n;
                  v.muted = n === 0;
                  setMuted(n === 0);
                }
              }}
            />
          </>
        )}
        {mode === 'drive-iframe' && (
          <span className="nl-yt-hint">Nút phát nằm trong khung video · kéo rộng như YouTube 16:9</span>
        )}

        <div className="nl-yt-qwrap" ref={qWrapRef}>
          <button
            type="button"
            className="nl-yt-btn nl-yt-qlabel"
            onClick={() => setQOpen((o) => !o)}
            title="Chọn độ phân giải"
          >
            {qMeta.label}
          </button>
          {qOpen && (
            <div className="nl-yt-qmenu" role="menu">
              {QUALITIES.map((q) => {
                const over = q.h > 0 && sourceH > 0 && q.h > sourceH;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={over}
                    className={quality === q.id ? 'on' : ''}
                    title={over ? 'Video gốc thấp hơn mức này' : q.label}
                    onClick={() => {
                      if (over) return;
                      setQuality(q.id);
                      setQOpen(false);
                    }}
                  >
                    {q.label}
                    {over ? ' (không có)' : ''}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button type="button" className="nl-yt-btn" onClick={toggleFullscreen} title={fs ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
          {fs ? '✕ Thoát toàn màn hình' : '⛶ Toàn màn hình'}
        </button>

        {showFavorite && (
          <button
            type="button"
            className={`nl-yt-btn${fav ? ' on' : ''}`}
            title={favoriteKind === 'image' ? 'Ảnh yêu thích' : 'Video yêu thích'}
            onClick={() => setFav(toggleMediaFavorite(src))}
          >
            {fav ? '★' : '☆'} {favoriteKind === 'image' ? 'Ảnh yêu thích' : 'Video yêu thích'}
          </button>
        )}
      </div>
    </div>
  );
}
