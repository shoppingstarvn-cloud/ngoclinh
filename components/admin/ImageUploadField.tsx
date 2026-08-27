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
}: ImageUploadFieldProps) {
  if (mode === 'many') {
    const urls = values || [];
    return (
      <BulkImageDrop
        items={toItems(urls)}
        onChange={(items) => onChangeUrls?.(items.map((it) => it.url))}
        uploadFile={uploadFile}
        theme={theme}
        showLabel={showLabel}
        acceptMode={acceptMode}
      />
    );
  }

  const current = (value || '').trim();
  return (
    <BulkImageDrop
      items={current ? toItems([current]) : []}
      onChange={(items) => onChange?.(items[items.length - 1]?.url || '')}
      uploadFile={uploadFile}
      theme={theme}
      showLabel={showLabel}
      acceptMode={acceptMode}
    />
  );
}
