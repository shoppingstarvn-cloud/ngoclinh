'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import AuthModal from '@/components/auth/AuthModal';
import MediaAsset from '@/components/ui/MediaAsset';
import VideoPlayer from '@/components/ui/VideoPlayer';
import ReactionBar from '@/components/ui/ReactionBar';
import { driveDownloadUrl, extractDriveFileId, isVideoAsset, mediaDisplayUrl, videoThumbUrl } from '@/lib/media-url';
import { isMediaFavorite, toggleMediaFavorite } from '@/lib/media-favorites';
import { albumReactionTarget } from '@/lib/reactions';

type Block = { id: number; title: string; cover_url: string; photos: number; videos: number };
type Media = { id: number; kind: string; url: string; name: string; drive_file_id?: string | null };

function mediaDriveId(m: { url: string; drive_file_id?: string | null }) {
  const id = m.drive_file_id?.trim();
  return id || extractDriveFileId(m.url);
}
type PageInfo = { slug: string; title: string; subtitle: string; bg_image_url: string; slide_urls: string[] };

const GRADS = [
  'linear-gradient(135deg,#f6d365,#fda085)', 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(135deg,#84fab0,#8fd3f4)', 'linear-gradient(135deg,#ff9a9e,#fecfef)',
  'linear-gradient(135deg,#f093fb,#f5576c)', 'linear-gradient(135deg,#5ee7df,#b490ca)',
  'linear-gradient(135deg,#43e97b,#38f9d7)', 'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#4facfe,#00f2fe)', 'linear-gradient(135deg,#667eea,#764ba2)',
];

export default function AlbumView({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [locked, setLocked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/album/lookup?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (r.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await r.json();
    setPage(d.page || null);
    setBlocks(Array.isArray(d.blocks) ? d.blocks : []);
    setLocked(!!d.locked);
    setLoggedIn(!!d.loggedIn);
    setLoading(false);
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  // ---- Lightbox khối ----
  const [lbBlock, setLbBlock] = useState<Block | null>(null);
  const [videos, setVideos] = useState<Media[]>([]);
  const [photos, setPhotos] = useState<Media[]>([]);
  const [pTotal, setPTotal] = useState(0);
  const [pOffset, setPOffset] = useState(0);

  const loadPhotos = useCallback(async (b: Block, off: number) => {
    const r = await fetch(`/api/album/media?blockId=${b.id}&kind=image&offset=${off}&limit=48`);
    const d = await r.json();
    const arr: Media[] = d.media || [];
    setPhotos((p) => (off === 0 ? arr : [...p, ...arr]));
    setPTotal(d.total || 0);
    setPOffset(off + arr.length);
  }, []);

  async function openBlock(b: Block) {
    setLbBlock(b); setPhotos([]); setPOffset(0); setPTotal(0); setVideos([]);
    const rv = await fetch(`/api/album/media?blockId=${b.id}&kind=video&limit=60`);
    const dv = await rv.json();
    setVideos(dv.media || []);
    await loadPhotos(b, 0);
  }

  // ---- Viewer 1 ảnh/video ----
  const [viewer, setViewer] = useState<Media | null>(null);

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🌸 Đang tải…</div>;
  }
  if (notFound || !page) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Trang con không tồn tại.</div>;
  }

  const slides = (page.slide_urls && page.slide_urls.length ? page.slide_urls
    : blocks.map((b) => b.cover_url).filter(Boolean));
  const bgIsVideo = isVideoAsset(page.bg_image_url);
  const bgDriveId = extractDriveFileId(page.bg_image_url);
  const bgThumb = bgIsVideo ? videoThumbUrl(page.bg_image_url) : null;
  const bgPhotoUrl =
    page.bg_image_url && !bgIsVideo
      ? mediaDisplayUrl(page.bg_image_url, { driveFileId: bgDriveId, quality: 'thumb', thumbSize: 'w1280' })
      : null;
  const bgStyle: CSSProperties = bgPhotoUrl
    ? { backgroundImage: `url(${bgPhotoUrl})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }
    : {};

  return (
    <div className="alb-root" style={bgStyle}>
      <style>{CSS}</style>
      {bgIsVideo && page.bg_image_url && (
        bgThumb
          ? <div className="alb-bgvid" style={{ backgroundImage: `url(${bgThumb})` }} aria-hidden />
          : <div className="alb-bgvid" aria-hidden />
      )}
      <div className="alb-bgfx"><div className="alb-aurora" /><div className="alb-aurora b" /></div>
      {['🌸', '🍃', '✨', '🌸', '🌿', '✨', '🌷', '🍃', '✨'].map((p, i) => (
        <div key={i} className="alb-petal" style={{ left: `${6 + i * 11}%`, animationDuration: `${8 + (i % 5) * 2}s`, fontSize: i % 3 === 1 ? 18 : 24 }}>{p}</div>
      ))}

      <div className="alb-wrap">
        {loggedIn && !locked && (
          <div className="alb-lock">🔓 Đã đăng nhập — bạn được bình luận, thả cảm xúc &amp; tải về</div>
        )}

        {slides.length > 0 && (
          <div className="alb-slider"><div className="alb-track">
            {[...slides, ...slides].map((u, i) => (
              <div className="alb-tile" key={i} style={u ? {} : { background: GRADS[i % GRADS.length] }}>
                {u ? (
                  <MediaAsset
                    src={u}
                    alt=""
                    displayQuality="thumb"
                    thumbSize="w400"
                    driveFileId={extractDriveFileId(u)}
                  />
                ) : '🖼️'}
              </div>
            ))}
          </div></div>
        )}

        <div className="alb-titlewrap"><h1 className="alb-neon">{page.title}<small>NHẬT KÝ · ALBUM HOẠT ĐỘNG</small></h1></div>
        {page.subtitle && <p className="alb-subtitle">{page.subtitle}</p>}

        {locked ? (
          <div className="alb-gate">
            <div className="alb-gate-icon" aria-hidden>🔒</div>
            <h3>Trang riêng — cần đăng nhập</h3>
            <p>Vui lòng đăng nhập tài khoản để xem nội dung trang này.</p>
            <button type="button" className="alb-btn green" onClick={() => setAuthOpen(true)}>Đăng nhập / Đăng ký</button>
          </div>
        ) : blocks.length === 0 ? (
          <div className="alb-empty">Chưa có sự kiện nào. Hãy thêm khối &amp; ảnh trong Dashboard Admin.</div>
        ) : (
          <div className="alb-stack">
            {blocks.map((b, i) => {
              const mag = 6 + ((i * 7) % 11);
              const rot = (i % 2 ? mag : -mag);
              return (
                <div key={b.id} className="alb-card" style={{ ['--rot']: `${rot}deg`, ['--dur']: `${3 + (i % 3)}s` } as CSSProperties} onClick={() => openBlock(b)}>
                  <div className="alb-glo" />
                  <span className="alb-badge">📸 {b.photos.toLocaleString('vi-VN')} · 🎬 {b.videos}</span>
                  <div className="alb-ph" style={b.cover_url ? {} : { background: GRADS[i % GRADS.length] }}>
                    {b.cover_url ? (
                      <MediaAsset
                        src={b.cover_url}
                        alt={b.title}
                        displayQuality="thumb"
                        thumbSize="w400"
                        driveFileId={extractDriveFileId(b.cover_url)}
                      />
                    ) : '🖼️'}
                  </div>
                  <div className="alb-cap"><h3>{b.title}</h3><div className="alb-meta">{b.photos.toLocaleString('vi-VN')} ảnh · {b.videos} video</div></div>
                </div>
              );
            })}
          </div>
        )}

        {!locked && (
          <footer className="alb-footer"><span>🌸 Nhật ký · Album nghệ thuật — lưu giữ mãi mãi, vô hạn &amp; chia sẻ 🌸</span></footer>
        )}
      </div>

      {/* Lightbox 1 khối */}
      {lbBlock && (
        <div className="alb-lb" onClick={(e) => e.target === e.currentTarget && setLbBlock(null)}>
          <div className="alb-lbbox">
            <div className="alb-lbhead"><h2>{lbBlock.title}</h2><button className="alb-x" onClick={() => setLbBlock(null)}>×</button></div>
            <div className="alb-lbbody">
              <div className="alb-counter">Đang xem {photos.length.toLocaleString('vi-VN')} / {pTotal.toLocaleString('vi-VN')} ảnh · {videos.length} video — kho lưu trên Google Drive</div>
              {videos.length > 0 && <>
                <div className="alb-lbl">🎬 Video sự kiện</div>
                <div className="alb-videos">
                  {videos.map((v) => (
                    <div className="alb-vth" key={v.id} onClick={() => setViewer(v)}>
                      <MediaAsset
                        src={v.url}
                        alt={v.name}
                        kind={v.kind}
                        driveFileId={mediaDriveId(v)}
                        displayQuality="thumb"
                        thumbSize="w200"
                      />
                      <div className="alb-vplay">▶</div>
                    </div>
                  ))}
                </div>
              </>}
              <div className="alb-lbl">🖼️ Tất cả ảnh</div>
              <div className="alb-grid">
                {photos.map((m) => (
                  <div key={m.id} onClick={() => setViewer(m)}>
                    <MediaAsset
                      src={m.url}
                      alt={m.name}
                      kind={m.kind}
                      displayQuality="thumb"
                      thumbSize="w200"
                      driveFileId={mediaDriveId(m)}
                    />
                  </div>
                ))}
              </div>
              {pOffset < pTotal && (
                <div style={{ textAlign: 'center', margin: '14px 0' }}>
                  <button className="alb-btn soft" onClick={() => lbBlock && loadPhotos(lbBlock, pOffset)}>⬇️ Tải thêm ảnh</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewer 1 ảnh/video + bình luận + cảm xúc */}
      {viewer && <MediaViewer media={viewer} onClose={() => setViewer(null)} />}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => {
          setAuthOpen(false);
          setLoggedIn(true);
          load();
        }}
      />
    </div>
  );
}

/* ---------- Viewer chi tiết 1 ảnh/video ---------- */
function MediaViewer({ media, onClose }: { media: Media; onClose: () => void }) {
  const [comments, setComments] = useState<{ id: number; user_name: string; content: string; created_at: string }[]>([]);
  const [text, setText] = useState('');
  const [fav, setFav] = useState(false);

  useEffect(() => {
    fetch(`/api/album/comment?mediaId=${media.id}`).then((r) => r.json()).then((d) => setComments(d.comments || [])).catch(() => {});
    setFav(isMediaFavorite(media.url));
  }, [media.id, media.url]);

  async function send() {
    const c = text.trim(); if (!c) return;
    const r = await fetch('/api/album/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId: media.id, content: c }) });
    if (r.status === 403) { alert('Bạn cần đăng nhập để bình luận.'); return; }
    const d = await r.json(); if (d.ok && d.comment) { setComments((p) => [d.comment, ...p]); setText(''); }
  }

  const isVideo = media.kind === 'video' || isVideoAsset(media.url);
  const driveId = mediaDriveId(media);
  const downloadHref = driveId ? driveDownloadUrl(driveId) : media.url;
  const fullPhotoSrc = !isVideo
    ? mediaDisplayUrl(media.url, { driveFileId: driveId, quality: 'full' })
    : null;
  return (
    <div className="alb-lb" style={{ zIndex: 60 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="alb-lbbox" style={{ maxWidth: isVideo ? 1100 : 820 }}>
        <div className="alb-lbhead"><h2>{isVideo ? '🎬 Video' : '🖼️ Ảnh'}</h2><button className="alb-x" onClick={onClose}>×</button></div>
        <div className="alb-lbbody">
          {isVideo
            ? <VideoPlayer src={media.url} title={media.name} />
            : (
              <>
                <img
                  src={fullPhotoSrc || media.url}
                  alt={media.name}
                  loading="eager"
                  decoding="async"
                  style={{ width: '100%', borderRadius: 14, maxHeight: 520, objectFit: 'contain', background: '#f3f6f4' }}
                />
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className={`alb-btn soft${fav ? ' on' : ''}`}
                    onClick={() => setFav(toggleMediaFavorite(media.url))}
                  >
                    {fav ? '★' : '☆'} Ảnh yêu thích
                  </button>
                </div>
              </>
            )}
          <ReactionBar
            target={albumReactionTarget(media.id)}
            extra={<a className="alb-btn soft" href={downloadHref} target="_blank" rel="noreferrer">⬇️ Tải về</a>}
          />
          <div className="alb-cmts">
            <div className="alb-cinput">
              <input placeholder="Viết bình luận…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className="alb-btn green" onClick={send}>Gửi</button>
            </div>
            {comments.map((c) => (
              <div className="alb-cmt" key={c.id}>
                <div className="alb-av">{(c.user_name || '?').slice(0, 1).toUpperCase()}</div>
                <div className="alb-cbody"><b>{c.user_name}</b><br />{c.content}</div>
              </div>
            ))}
            {comments.length === 0 && <div style={{ color: '#8aa', fontSize: 13, padding: '6px 2px' }}>Chưa có bình luận. Hãy là người đầu tiên 💬</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.alb-root{position:relative;min-height:100vh;overflow-x:hidden;color:#123;font-family:'Segoe UI',system-ui,Arial,sans-serif;
  background:radial-gradient(1200px 600px at 12% -5%,rgba(255,182,193,.45),transparent 60%),radial-gradient(1000px 620px at 100% 0%,rgba(144,238,144,.5),transparent 55%),radial-gradient(900px 700px at 50% 120%,rgba(173,216,230,.4),transparent 60%),linear-gradient(180deg,#f4fff7,#eafaf0 40%,#f6fff9)}
.alb-bgvid{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;background-size:cover;background-position:center;z-index:0;pointer-events:none}
.alb-bgfx{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.alb-aurora{position:absolute;inset:-25%;filter:blur(36px);opacity:.85;animation:albaur 11s ease-in-out infinite alternate;
  background:radial-gradient(40% 40% at 20% 30%,rgba(255,120,200,.4),transparent 60%),radial-gradient(45% 45% at 82% 18%,rgba(70,220,160,.45),transparent 60%),radial-gradient(50% 50% at 60% 82%,rgba(120,170,255,.4),transparent 60%),radial-gradient(35% 35% at 8% 80%,rgba(255,214,90,.35),transparent 60%)}
.alb-aurora.b{animation-duration:15s;animation-direction:alternate-reverse;opacity:.55;mix-blend-mode:screen}
@keyframes albaur{0%{transform:translate(0,0) scale(1)}50%{transform:translate(4%,-3%) scale(1.12) rotate(3deg)}100%{transform:translate(-3%,4%) scale(1.06) rotate(-3deg)}}
.alb-petal{position:fixed;top:-40px;z-index:1;pointer-events:none;animation:albfall linear infinite;opacity:.85}
@keyframes albfall{0%{transform:translateY(-40px) rotate(0);opacity:0}10%{opacity:.95}100%{transform:translateY(110vh) rotate(360deg);opacity:.2}}
.alb-wrap{position:relative;z-index:2;max-width:1120px;margin:0 auto;padding:0 18px 70px}
.alb-lock{display:flex;justify-content:center;gap:8px;background:rgba(0,166,81,.12);border:1px solid rgba(0,166,81,.35);color:#046b38;font-weight:700;font-size:13.5px;border-radius:0 0 14px 14px;padding:8px 16px;max-width:560px;margin:0 auto 6px}
.alb-slider{margin:14px 0 8px;overflow:hidden;border-radius:20px;box-shadow:0 18px 44px rgba(0,80,40,.28);border:3px solid #fff}
.alb-track{display:flex;width:max-content;animation:albslide 34s linear infinite}
.alb-slider:hover .alb-track{animation-play-state:paused}
.alb-tile{height:220px;width:340px;display:flex;align-items:center;justify-content:center;font-size:60px;color:#fff;overflow:hidden}
.alb-tile img,.alb-tile video,.alb-tile .nl-media-thumb{width:100%;height:100%;object-fit:cover}
@keyframes albslide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.alb-titlewrap{text-align:center;margin:28px 0 6px}
.alb-neon{font-size:clamp(38px,7vw,74px);font-weight:900;letter-spacing:3px;margin:0;color:#fff;animation:albneon 1.6s infinite alternate}
.alb-neon small{display:block;font-size:.3em;letter-spacing:8px;margin-top:8px;font-weight:800}
@keyframes albneon{0%{text-shadow:0 0 6px #fff,0 0 16px #ff2fd0,0 0 30px #ff2fd0,0 0 48px #ff2fd0}25%{text-shadow:0 0 6px #fff,0 0 16px #00e6ff,0 0 30px #00e6ff,0 0 48px #00e6ff}50%{text-shadow:0 0 6px #fff,0 0 16px #7CFC00,0 0 30px #39FF14,0 0 48px #39FF14}75%{text-shadow:0 0 6px #fff,0 0 16px #ffd400,0 0 30px #ff9500,0 0 48px #ff9500}100%{text-shadow:0 0 6px #fff,0 0 16px #b14cff,0 0 30px #b14cff,0 0 48px #b14cff}}
.alb-subtitle{text-align:center;color:#0c5a34;font-size:16px;max-width:660px;margin:6px auto 4px;font-weight:600}
.alb-gate{max-width:420px;margin:30px auto;background:#fff;border-top:5px solid #00A651;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.25);padding:26px;text-align:center}
.alb-gate-icon{font-size:52px;line-height:1;margin:0 0 12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15))}
.alb-gate h3{color:#004000;margin:0 0 10px;font-size:1.15rem;font-weight:700}
.alb-gate p{color:#334155;margin:0 0 18px;font-size:15px;line-height:1.5}
.alb-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;font-size:16px;outline:none}
.alb-note{font-size:12.5px;color:#64748b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;padding:10px 12px;margin:12px 0}
.alb-err{margin-top:8px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;font-size:13px}
.alb-empty{text-align:center;color:#5a6;margin:40px auto;font-weight:600}
.alb-stack{margin-top:34px;display:flex;flex-direction:column;align-items:center;gap:88px}
@keyframes albfloaty{0%,100%{transform:rotate(var(--rot,0deg)) translateY(0)}50%{transform:rotate(var(--rot,0deg)) translateY(-16px)}}
@keyframes albneonedge{0%{box-shadow:0 16px 36px rgba(0,60,30,.3),0 0 0 3px rgba(255,255,255,.55),0 0 26px 4px #ff2fd0}25%{box-shadow:0 16px 36px rgba(0,60,30,.3),0 0 0 3px rgba(255,255,255,.55),0 0 26px 4px #00e6ff}50%{box-shadow:0 16px 36px rgba(0,60,30,.3),0 0 0 3px rgba(255,255,255,.55),0 0 26px 4px #39FF14}75%{box-shadow:0 16px 36px rgba(0,60,30,.3),0 0 0 3px rgba(255,255,255,.55),0 0 26px 4px #ffd400}100%{box-shadow:0 16px 36px rgba(0,60,30,.3),0 0 0 3px rgba(255,255,255,.55),0 0 26px 4px #b14cff}}
.alb-card{position:relative;width:min(460px,94%);aspect-ratio:3/2;border-radius:20px;overflow:hidden;cursor:pointer;color:#fff;border:5px solid #fff;transform:rotate(var(--rot,0deg));animation:albfloaty var(--dur,4s) ease-in-out infinite,albneonedge 2s linear infinite;transition:transform .35s cubic-bezier(.2,.9,.3,1.3)}
.alb-card:hover{animation-play-state:paused;z-index:9;transform:rotate(0) translateY(-12px) scale(1.06)!important;box-shadow:0 34px 66px rgba(0,70,35,.5),0 0 0 4px #fff,0 0 48px 8px rgba(0,230,160,.75)!important}
.alb-ph{display:flex;align-items:center;justify-content:center;height:100%;font-size:82px;overflow:hidden}
.alb-ph img,.alb-ph video,.alb-ph .nl-media-thumb{width:100%;height:100%;object-fit:cover}
.alb-glo{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.6) 48%,transparent 64%);transform:translateX(-130%);transition:transform .8s;z-index:2}
.alb-card:hover .alb-glo{transform:translateX(130%)}
.alb-badge{position:absolute;top:12px;right:12px;background:rgba(3,40,22,.72);color:#fff;font-size:13px;font-weight:800;padding:6px 12px;border-radius:30px;z-index:3}
.alb-cap{position:absolute;left:0;right:0;bottom:0;padding:18px 20px 15px;background:linear-gradient(180deg,transparent,rgba(3,40,22,.86));z-index:3}
.alb-cap h3{margin:0;font-size:21px;text-shadow:0 3px 12px rgba(0,0,0,.7)}
.alb-cap .alb-meta{font-size:13.5px;opacity:.96;margin-top:4px;font-weight:600}
.alb-footer{text-align:center;margin-top:46px;color:#0c5a34;font-weight:700;font-size:14px}
.alb-footer span{background:rgba(255,255,255,.7);padding:8px 18px;border-radius:30px;border:1px solid rgba(0,166,81,.3)}
.alb-lb{position:fixed;inset:0;z-index:50;background:rgba(6,20,12,.86);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px}
.alb-lbbox{background:#fff;border-radius:20px;max-width:960px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.5);border-top:6px solid #00A651}
.alb-lbhead{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;position:sticky;top:0;background:#fff;border-bottom:1px solid #eef;z-index:2}
.alb-lbhead h2{margin:0;color:#046b38;font-size:20px}
.alb-x{border:none;background:#f1f5f2;width:38px;height:38px;border-radius:50%;font-size:20px;cursor:pointer;color:#555}
.alb-lbbody{padding:18px 20px 24px}
.alb-lbbody .nl-yt{width:100%;margin:0 0 12px}
.alb-counter{margin:2px 0 8px;font-weight:800;color:#046b38;font-size:14px;background:#eaf7ef;border:1px dashed #9fd8b8;border-radius:10px;padding:9px 12px;text-align:center}
.alb-lbl{margin:16px 0 8px;font-weight:800;color:#0c5a34;font-size:15px}
.alb-videos{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.alb-vth{position:relative;flex:0 0 auto;width:190px;height:116px;border-radius:12px;overflow:hidden;cursor:pointer;background:linear-gradient(135deg,#5ee7df,#b490ca);display:flex;align-items:center;justify-content:center}
.alb-vth img,.alb-vth video,.alb-vth .nl-media-thumb{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.alb-vth .nl-media-play{display:none}
.alb-vplay{position:relative;z-index:1;color:#fff;font-size:34px;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.alb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px}
.alb-grid img,.alb-grid video{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;cursor:pointer;transition:.2s;background:#eef}
.alb-grid img:hover,.alb-grid video:hover{transform:scale(1.06);box-shadow:0 6px 16px rgba(0,0,0,.3)}
.alb-btn{border:none;border-radius:12px;padding:11px 16px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;text-decoration:none}
.alb-btn.green{background:#00A651;color:#fff}.alb-btn.soft{background:#eef7f1;color:#046b38}
.alb-btn.soft.on{background:#00A651;color:#fff}
.alb-lbbody .nl-reactbar{margin:14px 0}
.alb-cmts{margin-top:12px;border-top:1px dashed #cfe6d8;padding-top:12px}
.alb-cinput{display:flex;gap:8px;margin-bottom:12px}
.alb-cinput input{flex:1;border:1px solid #cfe6d8;border-radius:12px;padding:11px 14px;font-size:14px;outline:none}
.alb-cmt{display:flex;gap:10px;margin-bottom:10px}
.alb-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00A651,#39FF14);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0}
.alb-cbody{background:#f5faf7;border-radius:12px;padding:8px 12px;flex:1;font-size:14px}.alb-cbody b{color:#046b38}
`;
