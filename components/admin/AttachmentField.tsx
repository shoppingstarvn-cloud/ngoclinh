'use client';

import { CSSProperties, DragEvent, useRef, useState } from 'react';
import { uploadMediaFile } from '@/lib/client/upload-media';
import BulkImageDrop, { type BulkImageItem } from './BulkImageDrop';

export interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  kind: 'image' | 'file';
}

interface AttachmentFieldProps {
  value: unknown;
  onChange: (items: AttachmentItem[]) => void;
}

function parseItems(value: unknown): AttachmentItem[] {
  if (Array.isArray(value)) return value as AttachmentItem[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const a = JSON.parse(value);
      return Array.isArray(a) ? (a as AttachmentItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function prevent(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Khu ĐÍNH KÈM TÁCH BIỆT kiểu Gmail: "Ảnh gửi kèm" + "File đính kèm (mọi định dạng)".
 * Kéo-thả hoặc bấm chọn NHIỀU file cùng lúc (PC & điện thoại) → tải THẲNG lên Google
 * Drive (giữ nguyên gốc, không nén) → lưu dạng mảng [{name,url,type,kind}].
 */
export default function AttachmentField({ value, onChange }: AttachmentFieldProps) {
  const items = parseItems(value);
  const [status, setStatus] = useState('');
  const [dragFile, setDragFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | File[], forceKind?: 'image' | 'file') {
    const list = Array.from(files);
    if (!list.length) return;
    const added: AttachmentItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setStatus(`Đang tải ${i + 1}/${list.length}: ${f.name}…`);
      try {
        const url = await uploadMediaFile(f);
        const isImg = forceKind ? forceKind === 'image' : (f.type || '').startsWith('image/');
        added.push({ name: f.name, url, type: f.type || '', kind: isImg ? 'image' : 'file' });
      } catch (e) {
        setStatus(`Lỗi tải "${f.name}": ${e instanceof Error ? e.message : ''}`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setStatus('');
    onChange([...items, ...added]);
  }

  function removeAt(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  const imageItems = items.filter((it) => it.kind === 'image');
  const files = items.map((it, idx) => ({ it, idx })).filter((x) => x.it.kind !== 'image');

  function setImages(next: BulkImageItem[]) {
    const rest = items.filter((it) => it.kind !== 'image');
    onChange([
      ...next.map((it) => ({ name: it.name, url: it.url, type: it.type, kind: 'image' as const })),
      ...rest,
    ]);
  }

  const zoneStyle = (active: boolean): CSSProperties => ({
    border: `2px dashed ${active ? '#0dcaf0' : '#0d6efd'}`,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    cursor: 'pointer',
    background: active ? 'rgba(13,202,240,0.15)' : 'rgba(13,110,253,0.05)',
  });

  return (
    <div>
      {status && (
        <div style={{ fontSize: 13, color: '#0dcaf0', marginBottom: 8 }}>
          <i className="fas fa-spinner fa-spin" /> {status}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <BulkImageDrop items={imageItems} onChange={setImages} />
      </div>

      {/* FILE ĐÍNH KÈM */}
      <div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>📎 File đính kèm (PDF/Word/Excel/PPT/mọi định dạng)</div>
        <div
          role="button"
          tabIndex={0}
          style={zoneStyle(dragFile)}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          onDragEnter={(e) => { prevent(e); setDragFile(true); }}
          onDragOver={(e) => { prevent(e); e.dataTransfer.dropEffect = 'copy'; setDragFile(true); }}
          onDragLeave={(e) => { prevent(e); setDragFile(false); }}
          onDrop={(e) => { prevent(e); setDragFile(false); if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files, 'file'); }}
        >
          <div style={{ color: 'rgba(255,255,255,0.75)' }}>Kéo-thả file vào đây, hoặc bấm để chọn</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Chọn nhiều file cùng lúc · mọi định dạng · không giới hạn dung lượng</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) void addFiles(e.target.files, 'file'); e.target.value = ''; }}
          />
        </div>
        {files.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map(({ it, idx }) => (
              <li key={it.url} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 10px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {it.name}</span>
                <a href={it.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">Xem</a>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeAt(idx)}>Gỡ</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
