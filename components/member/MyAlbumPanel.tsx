'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import ImageUploadField from '@/components/admin/ImageUploadField';
import { isVideoFile, tagIfVideo } from '@/lib/media-url';

type Block = { id: number; title: string; cover_url: string; photos: number; videos: number };
type Page = { id: number; slug: string; title: string; subtitle: string; bg_image_url: string; slide_urls: string[] };

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
      setBg(d.page.bg_image_url || ''); setSub(d.page.subtitle || ''); setSlides(d.page.slide_urls || []);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function savePage() {
    await post({ action: 'savePage', subtitle: sub, bg_image_url: bg, slide_urls: slides.filter(Boolean) });
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
    const ses = await post({ action: 'driveSession', filename: file.name, mimeType: file.type });
    if (!ses.ok) throw new Error(ses.error || 'session lỗi');
    const put = await fetch(ses.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
    const pj = (await put.json().catch(() => ({}))) as { id?: string };
    if (!pj.id) throw new Error('Drive không trả id');
    const reg = await post({ action: 'driveRegister', file_id: pj.id, original_name: file.name, file_type: file.type });
    if (!reg.ok) throw new Error(reg.error || 'register lỗi');
    return { kind: isVideoFile(file) ? 'video' : 'image', url: tagIfVideo(reg.url, file), driveFileId: reg.fileId, name: file.name };
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
            <label>Ảnh nền</label>
            <ImageUploadField theme="light" value={bg} onChange={setBg} uploadFile={uploadImageUrl} />
          </div>
        </div>
        <label>Ảnh slide (kéo-thả nhiều ảnh, không giới hạn)</label>
        <ImageUploadField theme="light" mode="many" values={slides} onChangeUrls={setSlides} uploadFile={uploadImageUrl} />
        <button style={btn} onClick={savePage}>💾 Lưu trang</button>
      </div>

      <b>Thêm khối sự kiện</b>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0', maxWidth: 560 }}>
        <input style={inp} placeholder="Tên khối (vd Khai giảng)" value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
        <div>
          <label>Ảnh bìa (tuỳ chọn)</label>
          <ImageUploadField theme="light" value={bCover} onChange={setBCover} uploadFile={uploadImageUrl} />
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
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kéo-thả hoặc bấm để tải ảnh &amp; video</div>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) onDrop(e.target.files); e.currentTarget.value = ''; }} />
    </div>
  );
}
