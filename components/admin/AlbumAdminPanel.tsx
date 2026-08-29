'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import ImageUploadField from './ImageUploadField';
import { isVideoFile, tagIfVideo } from '@/lib/media-url';

const swalDark = { background: '#1a1a2e', color: '#fff' };

interface Props { authHeader: string }
type Page = { id: number; slug: string; title: string; subtitle: string; bg_image_url: string; slide_urls: string[]; submenu_label: string; is_active: boolean; display_order: number };
type Block = { id: number; page_id: number; title: string; cover_url: string; display_order: number; is_active: boolean; photos: number; videos: number };

export default function AlbumAdminPanel({ authHeader }: Props) {
  const [pages, setPages] = useState<Page[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // form trang
  const [pTitle, setPTitle] = useState('');
  const [pSlug, setPSlug] = useState('');
  const [pSub, setPSub] = useState('');
  const [pBg, setPBg] = useState('');
  const [pSlides, setPSlides] = useState<string[]>([]);

  // form khối
  const [bTitle, setBTitle] = useState('');
  const [bCover, setBCover] = useState('');

  const [progress, setProgress] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/album', { headers: { Authorization: authHeader } });
    const d = await r.json();
    if (d.ok) {
      setPages(d.pages || []);
      setBlocks(d.blocks || []);
      if (sel === null && d.pages?.[0]) setSel(d.pages[0].id);
    }
    setLoading(false);
  }, [authHeader, sel]);
  useEffect(() => { load(); }, [load]);

  const cur = pages.find((p) => p.id === sel) || null;
  const curBlocks = blocks.filter((b) => b.page_id === sel);

  useEffect(() => {
    if (cur) { setPTitle(cur.title); setPSlug(cur.slug); setPSub(cur.subtitle || ''); setPBg(cur.bg_image_url || ''); setPSlides(cur.slide_urls || []); }
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePage(id?: number) {
    const body = {
      id,
      title: id ? pTitle : (prompt('Tên trang con mới (vd Lớp 1A3):') || ''),
      slug: id ? pSlug : '',
      subtitle: id ? pSub : '',
      bg_image_url: id ? pBg : '',
      slide_urls: id ? pSlides.filter(Boolean) : [],
    };
    if (!body.title) return;
    const r = await fetch('/api/admin/album', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!d.ok) return Swal.fire({ icon: 'error', title: 'Lỗi', text: d.error || 'Lưu thất bại', ...swalDark });
    Swal.fire({ icon: 'success', title: 'Đã lưu trang!', timer: 1000, showConfirmButton: false, ...swalDark });
    if (!id && d.id) setSel(d.id);
    await load();
  }

  async function delPage(id: number) {
    const c = await Swal.fire({ icon: 'warning', title: 'Xoá trang con?', text: 'Xoá cả khối + ảnh/video của trang.', showCancelButton: true, confirmButtonText: 'XOÁ', ...swalDark });
    if (!c.isConfirmed) return;
    await fetch(`/api/admin/album?id=${id}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    setSel(null); await load();
  }

  async function addBlock() {
    if (!sel || !bTitle.trim()) return;
    const r = await fetch('/api/admin/album/block', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ page_id: sel, title: bTitle.trim(), cover_url: bCover.trim() }) });
    const d = await r.json();
    if (!d.ok) return Swal.fire({ icon: 'error', title: 'Lỗi', text: d.error, ...swalDark });
    setBTitle(''); setBCover(''); await load();
  }
  async function delBlock(id: number) {
    const c = await Swal.fire({ icon: 'warning', title: 'Xoá khối?', text: 'Xoá cả ảnh/video trong khối.', showCancelButton: true, confirmButtonText: 'XOÁ', ...swalDark });
    if (!c.isConfirmed) return;
    await fetch(`/api/admin/album/block?id=${id}`, { method: 'DELETE', headers: { Authorization: authHeader } });
    await load();
  }

  // ---- Upload thẳng lên Drive rồi ghi vào khối ----
  async function uploadOne(file: File): Promise<{ kind: string; url: string; driveFileId: string; name: string }> {
    let prepared = file;
    if (isVideoFile(file)) {
      const { remuxMp4Faststart } = await import('@/lib/client/mp4-faststart');
      prepared = await remuxMp4Faststart(file);
    }
    const ses = await fetch('/api/upload/drive-session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ filename: prepared.name, mimeType: prepared.type }) }).then((r) => r.json());
    if (!ses.success) throw new Error(ses.error || 'Không tạo được phiên upload');
    const put = await fetch(ses.uploadUrl, { method: 'PUT', headers: { 'Content-Type': prepared.type || 'application/octet-stream' }, body: prepared });
    const pj = (await put.json().catch(() => ({}))) as { id?: string };
    if (!pj.id) throw new Error('Drive không trả file id');
    const reg = await fetch('/api/upload/drive-register', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ file_id: pj.id, original_name: prepared.name, file_type: prepared.type }) }).then((r) => r.json());
    if (!reg.success) throw new Error(reg.error || 'Ghi Drive lỗi');
    return { kind: isVideoFile(prepared) ? 'video' : 'image', url: tagIfVideo(reg.url, prepared), driveFileId: reg.fileId, name: prepared.name };
  }

  async function uploadImageUrl(file: File) {
    const item = await uploadOne(file);
    return item.url;
  }

  async function handleFiles(blockId: number, files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    let done = 0; const batch: { kind: string; url: string; driveFileId: string; name: string }[] = [];
    for (const f of arr) {
      setProgress(`Đang tải ${done + 1}/${arr.length}: ${f.name}`);
      try {
        const item = await uploadOne(f);
        batch.push(item);
        // ghi theo lô 20 để không mất tiến độ khi tải hàng nghìn file
        if (batch.length >= 20) {
          await fetch('/api/admin/album/media', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ blockId, items: batch.splice(0) }) });
        }
      } catch (e) { console.error('upload lỗi', f.name, e); }
      done++;
    }
    if (batch.length) await fetch('/api/admin/album/media', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader }, body: JSON.stringify({ blockId, items: batch }) });
    setProgress('');
    Swal.fire({ icon: 'success', title: `Đã tải ${done} tệp lên khối!`, timer: 1400, showConfirmButton: false, ...swalDark });
    await load();
  }

  if (loading) return <div className="text-center p-5"><i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }} /></div>;

  return (
    <div className="card"><div className="card-body">
      <h5 className="mb-2"><i className="fas fa-images text-success" /> Trang con (Album / Nhật ký)</h5>
      <p className="text-muted" style={{ fontSize: 13.5 }}>Mỗi trang con có đường dẫn đẹp: <b>ngoclinh.shopmartai.com/{cur?.slug || 'lop1a3'}</b>. Thêm khối, kéo-thả upload ảnh/video (lưu Google Drive), thành viên đăng nhập + mở khoá sẽ bình luận/thả cảm xúc/tải về.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
        <select className="form-select" style={{ maxWidth: 280 }} value={sel ?? ''} onChange={(e) => setSel(Number(e.target.value))}>
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title} — /{p.slug}</option>)}
        </select>
        <button className="btn btn-success btn-sm" onClick={() => savePage(undefined)}><i className="fas fa-plus" /> Tạo trang con</button>
        {cur && <button className="btn btn-outline-danger btn-sm" onClick={() => delPage(cur.id)}><i className="fas fa-trash" /> Xoá trang</button>}
      </div>

      {cur && (
        <div className="border rounded p-3 mb-3 nl-album-settings" style={{ background: '#fafffb' }}>
          <div className="row g-2">
            <div className="col-md-4"><label className="form-label fw-bold">Tên trang</label><input className="form-control" value={pTitle} onChange={(e) => setPTitle(e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label fw-bold">Đường dẫn (slug)</label><input className="form-control" value={pSlug} onChange={(e) => setPSlug(e.target.value)} placeholder="lop1a3" /></div>
            <div className="col-md-4"><label className="form-label fw-bold">Phụ đề</label><input className="form-control" value={pSub} onChange={(e) => setPSub(e.target.value)} /></div>
            <div className="col-12">
              <ImageUploadField
                theme="light"
                value={pBg}
                onChange={setPBg}
                uploadFile={uploadImageUrl}
                label="Up ảnh nền của website con"
                fieldHint="Ảnh (hoặc 1 video) phủ nền toàn trang con. Nên 1 file — file mới sẽ thay ảnh nền cũ."
              />
            </div>
            <div className="col-12">
              <ImageUploadField
                theme="light"
                mode="many"
                values={pSlides}
                onChangeUrls={setPSlides}
                uploadFile={uploadImageUrl}
                label="Up bộ ảnh Slide chạy của website con"
                fieldHint="Nhiều ảnh chạy slideshow đầu trang website con. Kéo-thả không giới hạn số ảnh."
              />
            </div>
          </div>
          <button className="btn btn-success btn-sm mt-2" onClick={() => savePage(cur.id)}><i className="fas fa-save" /> Lưu trang</button>
        </div>
      )}

      {cur && (
        <>
          <h6 className="fw-bold mt-3">Thêm khối sự kiện</h6>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
            <input className="form-control" placeholder="Tên khối (vd Khai giảng)" value={bTitle} onChange={(e) => setBTitle(e.target.value)} />
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
            <div>
              <button className="btn btn-success btn-sm" onClick={addBlock}><i className="fas fa-plus" /> Thêm khối</button>
            </div>
          </div>

          {progress && <div className="alert alert-info py-2 mt-2 mb-0" style={{ fontSize: 13 }}><i className="fas fa-spinner fa-spin" /> {progress}</div>}

          <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {curBlocks.map((b) => (
              <BlockCard key={b.id} block={b} onDrop={(files) => handleFiles(b.id, files)} onDelete={() => delBlock(b.id)} />
            ))}
          </div>
          {curBlocks.length === 0 && <p className="text-muted mt-2">Chưa có khối nào. Thêm khối rồi kéo-thả ảnh/video vào.</p>}
        </>
      )}
    </div></div>
  );
}

function BlockCard({ block, onDrop, onDelete }: { block: Block; onDrop: (files: FileList | File[]) => void; onDelete: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="border rounded p-2" style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 14 }}>{block.title}</b>
        <button className="btn btn-sm btn-outline-danger" onClick={onDelete} title="Xoá khối"><i className="fas fa-trash" /></button>
      </div>
      <div style={{ fontSize: 12, color: '#678', margin: '4px 0 8px' }}>📸 {block.photos.toLocaleString('vi-VN')} ảnh · 🎬 {block.videos} video</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onDrop(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${over ? '#00A651' : '#bcd'}`, background: over ? '#eafaf0' : '#f7fbf9', borderRadius: 10, padding: '18px 10px', textAlign: 'center', cursor: 'pointer', color: '#468' }}
      >
        <div style={{ fontSize: 26 }}>⬆️</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#046b38', textTransform: 'uppercase', marginBottom: 4 }}>Up ảnh &amp; video vào khối này</div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kéo-thả hoặc bấm để tải<br />ảnh &amp; video nhật ký (không giới hạn)</div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.length) onDrop(e.target.files); e.currentTarget.value = ''; }} />
    </div>
  );
}
