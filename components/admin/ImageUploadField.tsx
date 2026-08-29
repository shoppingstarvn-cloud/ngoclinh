'use client';

import BulkImageDrop, { type BulkAcceptMode, type BulkImageItem, type BulkImageTheme } from './BulkImageDrop';
import { isVideoAsset } from '@/lib/media-url';

interface ImageUploadFieldProps {
  /** Ảnh/video đơn — lưu 1 URL. Chọn nhiều thì file cuối là file dùng. */
  value?: string;
  onChange?: (url: string) => void;
  /** Nhiều file không giới hạn — slide, gallery. */
  mode?: 'single' | 'many';
  values?: string[];
  onChangeUrls?: (urls: string[]) => void;
  uploadFile?: (file: File) => Promise<string>;
  theme?: BulkImageTheme;
  showLabel?: boolean;
  acceptMode?: BulkAcceptMode;
  heading?: string;
  hint?: string;
  /** Tiêu đề ngoài ô kéo-thả (form-label) — dễ thấy hơn heading trong ô. */
  label?: string;
  /** Chú thích ngắn ngay dưới label, ngoài ô kéo-thả. */
  fieldHint?: string;
}

function toItems(urls: string[]): BulkImageItem[] {
  return urls.filter(Boolean).map((url, i) => ({
    url,
    name: isVideoAsset(url) ? `video ${i + 1}` : `ảnh ${i + 1}`,
    type: isVideoAsset(url) ? 'video/*' : 'image/*',
  }));
}

/**
 * Ô media Super Admin / album: cùng module kéo-thả hàng loạt không giới hạn
 * (BulkImageDrop). Logo/favicon/QR truyền acceptMode="image".
 */
export default function ImageUploadField({
  value = '',
  onChange,
  mode = 'single',
  values,
  onChangeUrls,
  uploadFile,
  theme = 'dark',
  showLabel = false,
  acceptMode = 'media',
  heading,
  hint,
  label,
  fieldHint,
}: ImageUploadFieldProps) {
  /** Hiển thị cả ngoài ô (label) lẫn trong ô (heading) để admin luôn thấy mục đích upload. */
  const dropHeading = heading ?? label;
  const dropHint = hint ?? fieldHint;

  const drop = mode === 'many' ? (
    <BulkImageDrop
      items={toItems(values || [])}
      onChange={(items) => onChangeUrls?.(items.map((it) => it.url))}
      uploadFile={uploadFile}
      theme={theme}
      showLabel={showLabel}
      acceptMode={acceptMode}
      heading={dropHeading}
      hint={dropHint}
    />
  ) : (
    <BulkImageDrop
      items={(value || '').trim() ? toItems([(value || '').trim()]) : []}
      onChange={(items) => onChange?.(items[items.length - 1]?.url || '')}
      uploadFile={uploadFile}
      theme={theme}
      showLabel={showLabel}
      acceptMode={acceptMode}
      heading={dropHeading}
      hint={dropHint}
    />
  );

  if (!label && !fieldHint) return drop;

  return (
    <div className="nl-upload-field">
      {label && (
        <label className="nl-upload-field-label form-label fw-bold mb-1" style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
          {label}
        </label>
      )}
      {fieldHint && (
        <div className="nl-upload-field-hint text-muted small mb-2" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.45, marginBottom: 8 }}>
          {fieldHint}
        </div>
      )}
      {drop}
    </div>
  );
}
