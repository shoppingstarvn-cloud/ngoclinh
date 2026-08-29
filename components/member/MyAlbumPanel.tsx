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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12, marginTop: 12 }}>
        {blocks.map((b) => <BlockCard key={b.id} block={b} onDrop={(f) => handleFiles(b.id, f)} onDelete={() => delBlock(b.id)} />)}
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

function BlockCard({ block, onDrop, onDelete }: { block: Block; onDrop: (f: FileList | File[]) => void; onDelete: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div style={{ border: '1px solid #dde', borderRadius: 10, padding: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 14 }}>{block.title}</b>
        <button onClick={onDelete} style={{ border: 'none', background: '#fee', color: '#b00', borderRadius: 6, cursor: 'pointer', padding: '4px 8px' }}>🗑</button>
      </div>
      <div style={{ fontSize: 12, color: '#678', margin: '4px 0 8px' }}>📸 {block.photos.toLocaleString('vi-VN')} · 🎬 {block.videos}</div>
      <div onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onDrop(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${over ? '#00A651' : '#bcd'}`, background: over ? '#eafaf0' : '#f7fbf9', borderRadius: 10, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', color: '#468' }}>
        <div style={{ fontSize: 24 }}>⬆️</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#046b38', textTransform: 'uppercase', marginBottom: 4 }}>Up ảnh &amp; video vào khối này</div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kéo-thả hoặc bấm để tải ảnh &amp; video nhật ký</div>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) onDrop(e.target.files); e.currentTarget.value = ''; }} />
    </div>
  );
}
