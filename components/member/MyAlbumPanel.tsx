'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { isVideoAsset, isVideoFile, tagIfVideo } from '@/lib/media-url';

type Block = { id: number; title: string; cover_url: string; photos: number; videos: number };
type Page = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  bg_image_url: string;
  slide_urls: string[];
  share_image_url: string;
  share_description: string;
};

async function post(body: Record<string, unknown>) {
  const r = await fetch('/api/member/album', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

export default function MyAlbumPanel() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bg, setBg] = useState('');
  const [sub, setSub] = useState('');
  const [slides, setSlides] = useState<string[]>([]);
  const [shareImage, setShareImage] = useState('');
  const [shareDesc, setShareDesc] = useState('');
  const [bTitle, setBTitle] = useState('');
  const [bCover, setBCover] = useState('');
  const [progress, setProgress] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/member/album');
    if (r.status === 403) { setForbidden(true); setLoading(false); return; }
    const d = await r.json();
    if (d.ok) {
      setPage(d.page); setBlocks(d.blocks || []);
      setBg(d.page.bg_image_url || '');
      setSub(d.page.subtitle || '');
      setSlides(d.page.slide_urls || []);
      setShareImage(d.page.share_image_url || '');
      setShareDesc(d.page.share_description || '');
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function savePage() {
    await post({
      action: 'savePage',
      subtitle: sub,
      bg_image_url: bg,
      slide_urls: slides.filter(Boolean),
      share_image_url: shareImage.trim(),
      share_description: shareDesc.trim(),
    });
    alert('Đã lưu trang.'); load();
  }
  async function addBlock() {
    if (!bTitle.trim()) return;
    await post({ action: 'addBlock', title: bTitle.trim(), cover_url: bCover.trim() });
    setBTitle(''); setBCover(''); load();
  }
  async function delBlock(id: number) {
    if (!confirm('Xoá khối này (cả ảnh/video)?')) return;
    await post({ action: 'delBlock', id }); load();
  }

  async function uploadOne(file: File) {
    let prepared = file;
    if (isVideoFile(file)) {
      const { remuxMp4Faststart } = await import('@/lib/client/mp4-faststart');
      prepared = await remuxMp4Faststart(file);
    }
    const ses = await post({ action: 'driveSession', filename: prepared.name, mimeType: prepared.type });
    if (!ses.ok) throw new Error(ses.error || 'session lỗi');
    const put = await fetch(ses.uploadUrl, { method: 'PUT', headers: { 'Content-Type': prepared.type || 'application/octet-stream' }, body: prepared });
    const pj = (await put.json().catch(() => ({}))) as { id?: string };
    if (!pj.id) throw new Error('Drive không trả id');
    const reg = await post({ action: 'driveRegister', file_id: pj.id, original_name: prepared.name, file_type: prepared.type });
    if (!reg.ok) throw new Error(reg.error || 'register lỗi');
    return { kind: isVideoFile(prepared) ? 'video' : 'image', url: tagIfVideo(reg.url, prepared), driveFileId: reg.fileId, name: prepared.name };
  }
  async function uploadImageUrl(file: File) {
    const item = await uploadOne(file);
    return item.url;
  }
  async function handleFiles(blockId: number, files: FileList | File[]) {
    const arr = Array.from(files); if (!arr.length) return;
    let done = 0; let batch: Array<{ kind: string; url: string; driveFileId: string; name: string }> = [];
    for (const f of arr) {
      setProgress(`Đang tải ${done + 1}/${arr.length}: ${f.name}`);
      try { batch.push(await uploadOne(f)); if (batch.length >= 20) { await post({ action: 'addMedia', blockId, items: batch }); batch = []; } } catch (e) { console.error(e); }
      done++;
    }
    if (batch.length) await post({ action: 'addMedia', blockId, items: batch });
    setProgress(''); alert(`Đã tải ${done} tệp lên khối!`); load();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải…</div>;
  if (forbidden) return <div style={{ padding: 40, textAlign: 'center', color: '#b00' }}>Bạn chưa được bổ nhiệm <b>Admin cấp 1</b>. Hãy đăng nhập đúng tài khoản đã được bổ nhiệm.</div>;
  if (!page) return <div style={{ padding: 40, textAlign: 'center' }}>Không tải được trang.</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <h2 style={{ color: '#046b38' }}>📔 Quản trị Trang con của tôi</h2>
      <p style={{ color: '#556' }}>Đường dẫn: <b>ngoclinh.shopmartai.com/{page.slug}</b> — thêm khối, kéo-thả upload ảnh/video (lưu Google Drive). (Bạn chỉ quản trị 1 trang con của mình.)</p>

      <div style={{ background: '#f7fbf9', border: '1px solid #d7e8de', borderRadius: 12, padding: 16, margin: '12px 0' }}>
        <b>Cài đặt trang</b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 8 }}>
          <div><label>Phụ đề</label><input style={inp} value={sub} onChange={(e) => setSub(e.target.value)} /></div>
          <div>
            <ImageUploadField
              theme="light"
              value={bg}
              onChange={setBg}
              uploadFile={uploadImageUrl}
              label="Up ảnh nền của website con"
              fieldHint="Ảnh (hoặc 1 video) phủ nền toàn trang con. Nên 1 file — file mới sẽ thay ảnh nền cũ."
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <ImageUploadField
            theme="light"
            mode="many"
            values={slides}
            onChangeUrls={setSlides}
            uploadFile={uploadImageUrl}
            label="Up bộ ảnh Slide chạy của website con"
            fieldHint="Nhiều ảnh chạy slideshow đầu trang website con. Kéo-thả không giới hạn số ảnh."
          />
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0 0' }}>
          Sau khi thay hoặc xóa ảnh nền / slide, bấm <b>Lưu trang</b> để áp dụng lên website.
        </p>
        <button style={btn} onClick={savePage}>💾 Lưu trang</button>
      </div>

      <div style={{ background: '#f0f7ff', border: '1px solid #c5daf0', borderRadius: 12, padding: 16, margin: '12px 0' }}>
        <b>Chia sẻ link (Zalo / Facebook)</b>
        <p style={{ fontSize: 13, color: '#556', margin: '6px 0 10px' }}>
          Ảnh và mô tả hiển thị khi gửi link album trên Zalo, Facebook… Không dùng banner trang chủ.
        </p>
        <div style={{ marginBottom: 10 }}>
          <ImageUploadField
            theme="light"
            value={shareImage}
            onChange={setShareImage}
            uploadFile={uploadImageUrl}
            acceptMode="image"
            label="Ảnh hiển thị khi chia sẻ link"
            fieldHint="Nên vuông hoặc ngang, tối thiểu 600×315 px. Kéo-thả hoặc bấm để tải ảnh lên."
          />
        </div>
        <SlideSharePicker slides={slides} selected={shareImage} onSelect={setShareImage} />
        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Giới thiệu về Album</label>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            Dòng chữ hiển thị dưới ảnh trong bản xem trước link. Để trống sẽ dùng phụ đề hoặc tên album.
          </div>
          <textarea
            style={{ ...inp, minHeight: 88, resize: 'vertical' }}
            value={shareDesc}
            onChange={(e) => setShareDesc(e.target.value)}
            placeholder="Ví dụ: Album kỷ niệm lớp 1A3 năm học 2025–2026…"
            maxLength={500}
          />
        </div>
        <button style={btn} onClick={savePage}>💾 Lưu cài đặt chia sẻ</button>
      </div>

      <b>Thêm khối sự kiện</b>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0', maxWidth: 560 }}>
        <input style={inp} placeholder="Tên khối (vd Khai giảng)" value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
        <div>
          <ImageUploadField
            theme="light"
            value={bCover}
            onChange={setBCover}
            uploadFile={uploadImageUrl}
            heading="Up ảnh bìa khối sự kiện (tuỳ chọn)"
            hint="Ảnh đại diện của khối mới. Có thể bỏ trống."
          />
        </div>
        <button style={btn} onClick={addBlock}>➕ Thêm khối</button>
      </div>
      {progress && <div style={{ background: '#eef6ff', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>⏳ {progress}</div>}

      <h3 style={{ margin: '20px 0 8px', color: '#046b38', fontSize: 17 }}>Quản lý các khối đã có</h3>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px' }}>
        Sửa tên khối, thay hoặc xóa ảnh bìa, xem và xóa từng ảnh/video trong khối. Thêm media mới bằng kéo-thả bên dưới.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12, marginTop: 4 }}>
        {blocks.map((b) => (
          <BlockCard
            key={b.id}
            block={b}
            uploadImageUrl={uploadImageUrl}
            onDrop={(f) => handleFiles(b.id, f)}
            onDelete={() => delBlock(b.id)}
            onSaved={load}
          />
        ))}
      </div>
      {blocks.length === 0 && <p style={{ color: '#889' }}>Chưa có khối nào. Thêm khối rồi kéo-thả ảnh/video vào.</p>}
    </div>
  );
}

const inp: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', fontSize: 14 };
const btn: CSSProperties = { marginTop: 8, background: '#00A651', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' };

/** Trên mobile: chọn nhanh ảnh từ slide đã có (ẩn trên desktop). */
function SlideSharePicker({
  slides,
  selected,
  onSelect,
}: {
  slides: string[];
  selected: string;
  onSelect: (url: string) => void;
}) {
  const imageSlides = slides.filter((u) => u && !isVideoAsset(u));
  if (!imageSlides.length) return null;
  return (
    <div className="nl-slide-share-picker" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
        Hoặc chọn từ ảnh slide (tiện trên điện thoại)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {imageSlides.map((url) => {
          const active = selected === url;
          return (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              style={{
                padding: 0,
                border: active ? '3px solid #00A651' : '2px solid #cbd5e1',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#fff',
                width: 72,
                height: 72,
              }}
              title="Dùng ảnh này khi chia sẻ link"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          );
        })}
      </div>
      <style jsx>{`
        @media (min-width: 768px) {
          .nl-slide-share-picker {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

type MediaItem = { id: number; kind: string; url: string; name: string | null };

function BlockCard({
  block,
  uploadImageUrl,
  onDrop,
  onDelete,
  onSaved,
}: {
  block: Block;
  uploadImageUrl: (file: File) => Promise<string>;
  onDrop: (f: FileList | File[]) => void | Promise<void>;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [cover, setCover] = useState(block.cover_url || '');
  const [saving, setSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [counts, setCounts] = useState({ photos: block.photos, videos: block.videos });

  useEffect(() => {
    setTitle(block.title);
    setCover(block.cover_url || '');
    setCounts({ photos: block.photos, videos: block.videos });
  }, [block.id, block.title, block.cover_url, block.photos, block.videos]);

  async function loadMedia() {
    setMediaLoading(true);
    const d = await post({ action: 'getBlockMedia', blockId: block.id });
    if (d.ok) setMedia(d.media || []);
    setMediaLoading(false);
  }

  async function toggleMedia() {
    const next = !mediaOpen;
    setMediaOpen(next);
    if (next && !media.length) await loadMedia();
  }

  async function saveBlock() {
    const t = title.trim();
    if (!t) { alert('Vui lòng nhập tên khối.'); return; }
    setSaving(true);
    const d = await post({ action: 'updateBlock', id: block.id, title: t, cover_url: cover });
    setSaving(false);
    if (!d.ok) { alert(d.error || 'Không lưu được khối.'); return; }
    onSaved();
  }

  async function removeMedia(id: number) {
    if (!confirm('Xóa ảnh/video này khỏi khối?')) return;
    const d = await post({ action: 'delMedia', id });
    if (!d.ok) { alert('Không xóa được.'); return; }
    setMedia((prev) => prev.filter((m) => m.id !== id));
    setCounts((c) => {
      const item = media.find((m) => m.id === id);
      if (!item) return c;
      return item.kind === 'video' ? { ...c, videos: Math.max(0, c.videos - 1) } : { ...c, photos: Math.max(0, c.photos - 1) };
    });
    onSaved();
  }

  const dirty = title.trim() !== block.title || (cover || '') !== (block.cover_url || '');

  return (
    <div style={{ border: '1px solid #dde', borderRadius: 10, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#64748b' }}>Tên khối</label>
          <input style={{ ...inp, marginTop: 4 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <button type="button" onClick={onDelete} title="Xóa cả khối" style={{ border: 'none', background: '#fee', color: '#b00', borderRadius: 6, cursor: 'pointer', padding: '6px 10px', marginTop: 18 }}>🗑</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <ImageUploadField
          theme="light"
          mode="single"
          value={cover}
          onChange={setCover}
          uploadFile={uploadImageUrl}
          heading="Ảnh bìa khối"
          hint="Thay hoặc xóa ảnh bìa, rồi bấm Lưu khối."
        />
      </div>
      <button type="button" style={{ ...btn, marginTop: 8, opacity: saving ? 0.7 : 1, width: '100%' }} disabled={saving || !dirty} onClick={saveBlock}>
        {saving ? 'Đang lưu…' : '💾 Lưu khối'}
      </button>
      <div style={{ fontSize: 12, color: '#678', margin: '8px 0' }}>📸 {counts.photos.toLocaleString('vi-VN')} · 🎬 {counts.videos}</div>
      <button type="button" onClick={toggleMedia} style={{ ...btn, background: '#eef6ff', color: '#046b38', width: '100%', marginTop: 0 }}>
        {mediaOpen ? '▲ Ẩn ảnh & video trong khối' : '▼ Xem / xóa ảnh & video trong khối'}
      </button>
      {mediaOpen && (
        <div style={{ marginTop: 8 }}>
          {mediaLoading && <div style={{ fontSize: 12, color: '#678' }}>Đang tải danh sách…</div>}
          {!mediaLoading && media.length === 0 && <div style={{ fontSize: 12, color: '#889' }}>Chưa có ảnh/video.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(72px,1fr))', gap: 6, marginTop: 6 }}>
            {media.map((m) => (
              <div key={m.id} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid #dde', aspectRatio: '1' }}>
                {m.kind === 'video' ? (
                  <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
                <button type="button" onClick={() => removeMedia(m.id)} style={{ position: 'absolute', top: 2, right: 2, border: 'none', background: 'rgba(220,38,38,0.9)', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '2px 5px' }}>✕</button>
              </div>
            ))}
          </div>
          {!mediaLoading && media.length > 0 && (
            <button type="button" onClick={loadMedia} style={{ marginTop: 6, fontSize: 12, border: 'none', background: 'transparent', color: '#046b38', cursor: 'pointer', textDecoration: 'underline' }}>Tải lại danh sách</button>
          )}
        </div>
      )}
      <div onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          if (!e.dataTransfer.files?.length) return;
          await onDrop(e.dataTransfer.files);
          if (mediaOpen) await loadMedia();
        }}
        style={{ border: `2px dashed ${over ? '#00A651' : '#bcd'}`, background: over ? '#eafaf0' : '#f7fbf9', borderRadius: 10, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', color: '#468', marginTop: 10 }}>
        <div style={{ fontSize: 22 }}>⬆️</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#046b38', textTransform: 'uppercase', marginBottom: 4 }}>Thêm ảnh &amp; video</div>
        <div style={{ fontSize: 12 }}>Kéo-thả hoặc bấm để tải lên</div>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files?.length) {
            await onDrop(e.target.files);
            if (mediaOpen) await loadMedia();
          }
          e.currentTarget.value = '';
        }} />
    </div>
  );
}
