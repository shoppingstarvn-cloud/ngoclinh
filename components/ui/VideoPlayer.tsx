'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  drivePreviewUrl,
  driveStreamApiUrl,
  extractDriveFileId,
  videoThumbUrl,
} from '@/lib/media-url';
import { isMediaFavorite, toggleMediaFavorite } from '@/lib/media-favorites';
import { peekDrivePlaySource, prefetchDriveWindow, resolveDrivePlayUrl } from '@/lib/client/drive-play';
import { MAX_CHUNK } from '@/lib/storage/drive-range';

const QUALITIES = [
  { id: 'auto', label: 'Tự động', h: 0 },
  { id: '720', label: '720p', h: 720 },
  { id: '1080', label: '1080p', h: 1080 },
  { id: '2k', label: '2K', h: 1440 },
  { id: '4k', label: '4K', h: 2160 },
] as const;

type QualityId = (typeof QUALITIES)[number]['id'];

const STALL_MS = 20_000;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

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

function html5Src(src: string, driveId: string | null): string {
  if (!driveId) return src;
  return driveStreamApiUrl(driveId);
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
  const stallTimer = useRef<number>(0);
  const waitingRef = useRef(false);
  const startedRef = useRef(false);
  const lastUi = useRef(0);
  const netRetryRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const prevDriveIdRef = useRef<string | null | undefined>(undefined);
  const prevSrcRef = useRef<string | undefined>(undefined);
  const prevReloadRef = useRef(0);
  const prefetchAtRef = useRef(-1);

  const driveId = extractDriveFileId(src);
  const [mode, setMode] = useState<'html5' | 'drive-iframe'>('html5');
  const [blobFor, setBlobFor] = useState<{ id: string; url: string } | null>(null);
  const [streamSize, setStreamSize] = useState(0);
  const [loadingFull, setLoadingFull] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [triedPlay, setTriedPlay] = useState(false);
  const [buffering, setBuffering] = useState(false);
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
  const [reloadKey, setReloadKey] = useState(0);
  const [loadPct, setLoadPct] = useState(0);

  const posterUrl = poster || videoThumbUrl(src) || undefined;
  const blobUrl = driveId && blobFor?.id === driveId ? blobFor.url : null;
  const playSrc = blobUrl || (driveId && loadingFull ? '' : html5Src(src, driveId));
  const iframeSrc = driveId ? drivePreviewUrl(driveId) : '';

  const clearStall = useCallback(() => {
    waitingRef.current = false;
    window.clearTimeout(stallTimer.current);
    stallTimer.current = 0;
    setBuffering(false);
  }, []);

  const armStall = useCallback(() => {
    waitingRef.current = true;
    setBuffering(true);
    window.clearTimeout(stallTimer.current);
    stallTimer.current = window.setTimeout(() => {
      waitingRef.current = false;
    }, STALL_MS);
  }, []);

  useEffect(() => {
    const srcChanged = prevSrcRef.current !== src;
    const driveChanged = prevDriveIdRef.current !== driveId;
    prevSrcRef.current = src;
    prevDriveIdRef.current = driveId;
    // Strict Mode gọi effect 2 lần cùng src — đừng reset duration về 0:00 sau khi đã có metadata.
    if (!srcChanged && !driveChanged) return;

    setMode('html5');
    setFav(isMediaFavorite(src));
    netRetryRef.current = 0;
    pendingPlayRef.current = false;
    startedRef.current = false;
    prefetchAtRef.current = -1;
    setReloadKey(0);
    setErr('');
    setPlaying(false);
    setTriedPlay(false);
    setBuffering(false);
    setCurrent(0);
    setDuration(0);
    setSourceH(0);
    clearStall();

    if (!driveChanged) return;

    setLoadPct(0);
    setStreamSize(0);
    if (driveId) {
      const hit = peekDrivePlaySource(driveId);
      if (hit?.kind === 'blob') {
        setBlobFor({ id: driveId, url: hit.url });
        setLoadPct(100);
        setLoadingFull(false);
      } else if (hit?.kind === 'iframe') {
        setMode('drive-iframe');
        setBlobFor(null);
        setLoadingFull(false);
      } else {
        setBlobFor(null);
        setLoadingFull(true);
      }
    } else {
      setBlobFor(null);
      setLoadingFull(false);
    }
  }, [src, driveId, clearStall]);

  useEffect(() => {
    // Strict Mode chạy lại effect với cùng reloadKey — đừng xóa duration sau onLoadedMetadata.
    if (prevReloadRef.current === reloadKey) return;
    prevReloadRef.current = reloadKey;
    startedRef.current = false;
    setErr('');
    setPlaying(false);
    setTriedPlay(false);
    setBuffering(false);
    setCurrent(0);
    setDuration(0);
    setSourceH(0);
    clearStall();
  }, [reloadKey, clearStall]);

  useEffect(() => {
    if (mode !== 'html5' || !playSrc) return;
    let n = 0;
    const tick = () => {
      const v = videoRef.current;
      const d = v?.duration;
      if (v && Number.isFinite(d) && (d as number) > 0) {
        setDuration(d as number);
        return true;
      }
      return false;
    };
    if (tick()) return;
    const id = window.setInterval(() => {
      n += 1;
      if (tick() || n > 24) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [playSrc, mode, reloadKey]);

  useEffect(() => {
    if (!driveId) {
      setLoadingFull(false);
      return;
    }
    const cached = peekDrivePlaySource(driveId);
    if (cached?.kind === 'blob') {
      setLoadPct(100);
      setBlobFor({ id: driveId, url: cached.url });
      setLoadingFull(false);
      return;
    }
    if (cached?.kind === 'iframe') {
      setMode('drive-iframe');
      setLoadingFull(false);
      return;
    }
    let alive = true;
    setLoadingFull(true);
    void (async () => {
      try {
        const resolved = await resolveDrivePlayUrl(driveId, new AbortController().signal, (done, total) => {
          if (!alive) return;
          if (total > 0) setLoadPct(Math.min(99, Math.round((done / total) * 100)));
        });
        if (!alive) return;
        if (resolved.kind === 'blob') {
          setLoadPct(100);
          setStreamSize(0);
          setBlobFor({ id: driveId, url: resolved.url });
        } else if (resolved.kind === 'iframe') {
          setMode('drive-iframe');
          setStreamSize(0);
          setBlobFor(null);
        } else {
          setStreamSize(resolved.size || 0);
        }
      } catch {
        /* phát bằng Range stream cùng origin */
      } finally {
        if (alive) setLoadingFull(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [driveId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playSrc || !pendingPlayRef.current) return;
    pendingPlayRef.current = false;
    setTriedPlay(true);
    void v.play().catch(() => {});
  }, [playSrc]);

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

  useEffect(() => () => window.clearTimeout(stallTimer.current), []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) {
      pendingPlayRef.current = true;
      setTriedPlay(true);
      return;
    }
    setTriedPlay(true);
    if (v.paused) {
      pendingPlayRef.current = false;
      void v.play();
    } else {
      pendingPlayRef.current = false;
      v.pause();
    }
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (fs) void exitFs();
    else void requestFs(el);
  };

  const qMeta = QUALITIES.find((q) => q.id === quality) || QUALITIES[0];
  const capH = fs || quality === 'auto' || !qMeta.h ? undefined : qMeta.h;
  const stageStyle = capH
    ? {
        maxHeight: capH,
        width: `min(100%, ${Math.round((capH * 16) / 9)}px)`,
        marginInline: 'auto' as const,
      }
    : undefined;

  const showSpinner = mode === 'html5' && !err && (loadingFull || (buffering && (playing || triedPlay)));
  const showBigPlay = mode === 'html5' && !playing && !err && !showSpinner && !loadingFull;

  return (
    <div className={`nl-yt ${className || ''}`.trim()} data-nl-yt="1" ref={wrapRef}>
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
        ) : playSrc ? (
          <video
            key={`${playSrc}:${reloadKey}`}
            ref={videoRef}
            src={playSrc}
            poster={posterUrl}
            playsInline
            controls={false}
            preload="auto"
            disableRemotePlayback
            title={title}
            onPlay={() => {
              startedRef.current = true;
              setPlaying(true);
              setTriedPlay(true);
            }}
            onPause={() => setPlaying(false)}
            onWaiting={() => {
              if (blobUrl) return;
              if (driveId && streamSize > 0) {
                const v = videoRef.current;
                const t = v?.currentTime || 0;
                const d = v?.duration || 0;
                const from = d > 0 ? Math.floor((t / d) * streamSize) : 0;
                prefetchDriveWindow(driveId, streamSize, from);
              }
              // MP4 thường (không Drive): waiting lúc vừa bấm phát là bình thường — đừng nháy vòng xoay.
              if (!driveId) return;
              if (triedPlay || playing) armStall();
            }}
            onStalled={() => {
              if (blobUrl) return;
              if (driveId && streamSize > 0) {
                const v = videoRef.current;
                const t = v?.currentTime || 0;
                const d = v?.duration || 0;
                const from = d > 0 ? Math.floor((t / d) * streamSize) : 0;
                prefetchDriveWindow(driveId, streamSize, from);
              }
              if (!driveId) return;
              if (triedPlay || playing) armStall();
            }}
            onPlaying={() => {
              startedRef.current = true;
              clearStall();
            }}
            onCanPlay={clearStall}
            onCanPlayThrough={clearStall}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              const t = el.currentTime;
              if (t > 0.25) startedRef.current = true;
              const dur = el.duration;
              if (driveId && !blobUrl && streamSize > 0 && Number.isFinite(dur) && dur > 0) {
                const approx = Math.floor((t / dur) * streamSize);
                const aligned = Math.floor(approx / MAX_CHUNK) * MAX_CHUNK;
                if (aligned !== prefetchAtRef.current) {
                  prefetchAtRef.current = aligned;
                  prefetchDriveWindow(driveId, streamSize, aligned);
                }
              }
              if (Number.isFinite(dur) && dur > 0) setDuration(dur);
              const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
              if (now - lastUi.current < 250 && !el.paused && !el.ended) return;
              lastUi.current = now;
              setCurrent(t);
            }}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              setDuration(Number.isFinite(el.duration) ? el.duration : 0);
              setSourceH(el.videoHeight || 0);
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onLoadedData={(e) => {
              const el = e.currentTarget;
              if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
            }}
            onEnded={(e) => {
              const el = e.currentTarget;
              setPlaying(false);
              setCurrent(el.duration || el.currentTime);
              if (Number.isFinite(el.duration)) setDuration(el.duration);
              clearStall();
            }}
            onError={(e) => {
              const el = e.currentTarget;
              const code = el.error?.code || 0;
              const hadMeta = el.readyState >= 1 || startedRef.current;
              clearStall();
              if (startedRef.current && code === MEDIA_ERR_NETWORK) {
                setErr('Mất kết nối khi đang phát. Thử tải lại trang.');
                return;
              }
              // Codec máy quay (HEVC) — chỉ khi đã đọc được metadata. 502/HTML không nhảy iframe Drive (nguồn lag).
              if (driveId && (code === MEDIA_ERR_DECODE || (code === MEDIA_ERR_SRC_NOT_SUPPORTED && hadMeta))) {
                setMode('drive-iframe');
                setErr('');
                return;
              }
              if ((code === MEDIA_ERR_NETWORK || code === MEDIA_ERR_SRC_NOT_SUPPORTED) && netRetryRef.current < 1) {
                netRetryRef.current += 1;
                setReloadKey((k) => k + 1);
                return;
              }
              setErr('Không phát được video này. Thử Tải về rồi mở bằng trình phát trên máy.');
            }}
          />
        ) : null}
        {showBigPlay && (
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
        {showSpinner && (
          <div className="nl-yt-wait" aria-hidden>
            <i />
            {loadingFull ? (
              <span>Đang nạp video để phát mượt{loadPct > 0 ? `… ${loadPct}%` : '…'}</span>
            ) : null}
          </div>
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
          <span className="nl-yt-hint">Định dạng máy quay (HEVC/MOV) — Drive chuyển mã. Nên xuất MP4 H.264 để chạy mượt.</span>
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
