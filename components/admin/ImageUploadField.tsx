'use client';

import BulkImageDrop, { type BulkImageItem, type BulkImageTheme } from './BulkImageDrop';

interface ImageUploadFieldProps {
  /** Ảnh đơn — lưu 1 URL (logo, ảnh đại diện, ảnh nền, ảnh bìa). Chọn nhiều thì ảnh cuối là ảnh dùng. */
  value?: string;
  onChange?: (url: string) => void;
  /** Nhiều ảnh không giới hạn — slide, gallery. */
  mode?: 'single' | 'many';
  values?: string[];
  onChangeUrls?: (urls: string[]) => void;
  uploadFile?: (file: File) => Promise<string>;
  theme?: BulkImageTheme;
  showLabel?: boolean;
}

function toItems(urls: string[]): BulkImageItem[] {
  return urls.filter(Boolean).map((url, i) => ({
    url,
    name: `ảnh ${i + 1}`,
    type: 'image/*',
  }));
}

/**
 * Ô ảnh Super Admin / album: cùng module kéo-thả hàng loạt không giới hạn
 * (BulkImageDrop / Ảnh gửi kèm). Không còn dán link/URL.
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
    />
  );
}
