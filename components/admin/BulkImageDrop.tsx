'use client';

import { CSSProperties, DragEvent, useRef, useState } from 'react';
import { uploadMediaFile } from '@/lib/client/upload-media';

export type BulkImageTheme = 'dark' | 'light';

export interface BulkImageItem {
  url: string;
  name: string;
  type: string;
}

interface BulkImageDropProps {
  items: BulkImageItem[];
  onChange: (items: BulkImageItem[]) => void;
  /** Mặc định: uploadMediaFile (Drive gốc / Super Admin). Album thành viên phải truyền hàm riêng. */
  uploadFile?: (file: File) => Promise<string>;
  theme?: BulkImageTheme;
  showLabel?: boolean;
}

function prevent(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function palette(theme: BulkImageTheme) {
  if (theme === 'light') {
    return {
      label: '#334155',
      text: '#334155',
      muted: '#64748b',
      status: '#0aa2c0',
      thumbBorder: '#e2e8f0',
    };
  }
  return {
    label: 'rgba(255,255,255,0.75)',
    text: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.45)',
    status: '#0dcaf0',
    thumbBorder: 'rgba(255,255,255,0.1)',
  };
}

/**
 * Vùng kéo-thả ảnh hàng loạt không giới hạn — cùng UI/hành vi với
 * Super Admin «Ảnh gửi kèm» (AttachmentField).
 */
export default function BulkImageDrop({
  items,
  onChange,
  uploadFile,
  theme = 'dark',
  showLabel = true,
}: BulkImageDropProps) {
  const [status, setStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = palette(theme);
  const put = uploadFile || uploadMediaFile;

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => (f.type || '').startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|bmp)$/i.test(f.name || ''));
    if (!list.length) {
      setStatus('Chỉ nhận file ảnh. Anh chọn JPG/PNG/WEBP/GIF.');
      return;
    }
    setBusy(true);
    const added: BulkImageItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setStatus(`Đang tải ${i + 1}/${list.length}: ${f.name}…`);
      try {
        const url = await put(f);
        added.push({ name: f.name, url, type: f.type || 'image/*' });
      } catch (e) {
        setStatus(`Lỗi tải "${f.name}": ${e instanceof Error ? e.message : ''}`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setStatus('');
    setBusy(false);
    if (added.length) onChange([...items, ...added]);
  }

  function removeAt(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  const zoneStyle = (active: boolean): CSSProperties => ({
    border: `2px dashed ${active ? '#0dcaf0' : '#0d6efd'}`,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    cursor: busy ? 'wait' : 'pointer',
    background: active ? 'rgba(13,202,240,0.15)' : 'rgba(13,110,253,0.05)',
    opacity: busy ? 0.75 : 1,
  });

  return (
    <div>
      {status && (
        <div style={{ fontSize: 13, color: colors.status, marginBottom: 8 }}>
          <i className="fas fa-spinner fa-spin" /> {status}
        </div>
      )}
      {showLabel && (
        <div style={{ fontSize: 13, color: colors.label, marginBottom: 6 }}>🖼️ Ảnh gửi kèm</div>
      )}
      <div
        role="button"
        tabIndex={0}
        style={zoneStyle(dragOver)}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!busy) inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          prevent(e);
          setDragOver(true);
        }}
        onDragOver={(e) => {
          prevent(e);
          e.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          prevent(e);
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          prevent(e);
          setDragOver(false);
          if (busy) return;
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
      >
        <div style={{ color: colors.text }}>Kéo-thả ảnh vào đây, hoặc bấm để chọn ảnh</div>
        <div style={{ fontSize: 12, color: colors.muted }}>
          Chọn NHIỀU ảnh cùng lúc · PC &amp; điện thoại · giữ nguyên gốc
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {items.map((it, idx) => (
            <div key={`${it.url}-${idx}`} style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.url}
                alt={it.name}
                style={{
                  width: 90,
                  height: 90,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: `2px solid ${colors.thumbBorder}`,
                  background: theme === 'light' ? '#fff' : '#111',
                }}
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                title="Gỡ ảnh"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#dc3545',
                  color: '#fff',
                  cursor: 'pointer',
                  lineHeight: '20px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
