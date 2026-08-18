'use client';

import { DragEvent, useCallback, useRef, useState } from 'react';
import { uploadMediaFile } from '@/lib/client/upload-media';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
}

function prevent(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export default function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressHint, setProgressHint] = useState('');
  const [error, setError] = useState('');
  const [urlDraft, setUrlDraft] = useState('');

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError('');
      setProgressHint(`Đang nén & tải lên: ${file.name || 'ảnh'}…`);
      try {
        const url = await uploadMediaFile(file);
        onChange(url);
        setProgressHint('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi khi upload file!');
        setProgressHint('');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const takeFile = useCallback(
    (file?: File | null) => {
      if (!file) {
        setError('Không nhận được file. Anh kéo thả ảnh từ thư mục máy, không kéo từ trình duyệt khác.');
        return;
      }
      void upload(file);
    },
    [upload],
  );

  return (
    <div className="upload-zone">
      <div
        className={`upload-drop-area${dragOver ? ' dragover' : ''}`}
        role="button"
        tabIndex={0}
        style={{
          border: `2px dashed ${error ? '#dc3545' : '#0d6efd'}`,
          padding: 20,
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          borderRadius: 8,
          background: dragOver ? 'rgba(13,202,240,0.15)' : 'rgba(13,110,253,0.05)',
          opacity: uploading ? 0.75 : 1,
        }}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
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
          const file = e.dataTransfer.files?.[0];
          if (file) {
            takeFile(file);
            return;
          }
          const uri = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').trim();
          if (/^https?:\/\//i.test(uri) && !/\.html?($|\?)/i.test(uri)) {
            onChange(uri);
            setError('');
            return;
          }
          setError('Không nhận được file. Anh kéo ảnh từ máy tính (Explorer), không kéo từ tab web khác.');
        }}
        onPaste={(e) => {
          const item = Array.from(e.clipboardData?.items || []).find((i) => i.kind === 'file');
          const file = item?.getAsFile();
          if (file) {
            e.preventDefault();
            takeFile(file);
          }
        }}
      >
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)' }}>
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin" /> {progressHint || 'Đang upload...'}
            </>
          ) : (
            '📎 Kéo thả ảnh/tài liệu hoặc click để chọn file'
          )}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Mọi định dạng (ảnh, video, PDF, Word, Excel...) · GIỮ NGUYÊN gốc, KHÔNG nén · tải thẳng Google Drive
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) takeFile(file);
            e.target.value = '';
          }}
        />
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <input
          className="form-control"
          placeholder="Hoặc dán link ảnh có sẵn (https://...)"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const u = urlDraft.trim();
              if (/^https?:\/\//i.test(u)) {
                onChange(u);
                setUrlDraft('');
                setError('');
              } else {
                setError('Link phải bắt đầu bằng http:// hoặc https://');
              }
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-light"
          disabled={!urlDraft.trim()}
          onClick={() => {
            const u = urlDraft.trim();
            if (/^https?:\/\//i.test(u)) {
              onChange(u);
              setUrlDraft('');
              setError('');
            } else {
              setError('Link phải bắt đầu bằng http:// hoặc https://');
            }
          }}
        >
          Dùng link
        </button>
      </div>

      <div className="preview-container" style={{ marginTop: 10 }}>
        {error && (
          <span className="text-danger" style={{ display: 'block', marginBottom: 8 }}>
            {error}
          </span>
        )}
        {!error && value && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              style={{
                width: 100,
                height: 100,
                objectFit: 'cover',
                borderRadius: 8,
                border: '2px solid rgba(255,255,255,0.1)',
                background: '#111',
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onChange('')}
            >
              Gỡ ảnh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
