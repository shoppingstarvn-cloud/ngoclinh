'use client';

import { useCallback, useRef, useState } from 'react';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  token: string;
}

export default function ImageUploadField({ value, onChange, token }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError('');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: token },
          body: formData,
        });
        const result = await resp.json();
        if (result.success && result.url) {
          onChange(result.url);
        } else {
          setError(result.error || 'Không nhận được URL từ server!');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lỗi khi upload file!');
      } finally {
        setUploading(false);
      }
    },
    [onChange, token],
  );

  return (
    <div className="upload-zone">
      <div
        className={`upload-drop-area${dragOver ? ' dragover' : ''}`}
        style={{
          border: '2px dashed #0d6efd',
          padding: 20,
          textAlign: 'center',
          cursor: 'pointer',
          borderRadius: 8,
          background: dragOver ? 'rgba(13,202,240,0.15)' : 'rgba(13,110,253,0.05)',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
      >
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin" /> Đang upload...
            </>
          ) : (
            '📷 Kéo thả ảnh hoặc click để chọn file'
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = '';
          }}
        />
      </div>
      <div className="preview-container" style={{ marginTop: 10 }}>
        {error && <span className="text-danger">{error}</span>}
        {!error && value && (
          <img
            src={value}
            alt=""
            style={{
              width: 100,
              height: 100,
              objectFit: 'cover',
              borderRadius: 8,
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        )}
      </div>
    </div>
  );
}
