import type { ReactNode } from 'react';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'checkbox'
  | 'select'
  | 'number'
  | 'parentselect'
  | 'image'
  | 'attachments';

export interface AdminField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

export type AdminRow = Record<string, unknown>;

export interface AdminColumn {
  key: string;
  label: string;
  render?: (value: unknown, row: AdminRow, allData: Record<string, AdminRow[]>) => ReactNode;
}

export interface AdminTableDef {
  name: string;
  label: string;
  icon: string;
  pk: string;
  fields: AdminField[];
  cols: AdminColumn[];
}

/** Trường được coi là ảnh/media — tự động hiện widget upload kéo-thả */
export const IMAGE_FIELD_KEYS = new Set([
  'image_url',
  'thumbnail_url',
  'logo_url',
  'avatar_url',
  'file_path',
  'favicon_url',
]);

function boolBadge(v: unknown) {
  return v ? (
    <span className="text-success">✓</span>
  ) : (
    <span className="text-danger">✗</span>
  );
}

function thumb(v: unknown) {
  return typeof v === 'string' && v ? <img src={v} className="thumb-img" alt="" /> : null;
}

/**
 * Cấu hình 13 bảng CMS cho dashboard — port 1:1 từ TABLES trong admin.html cũ.
 *
 * LƯU Ý QUAN TRỌNG: bảng "Thư viện ảnh" dùng tên thật `photos` (không phải
 * `images` như link điều hướng cũ trỏ nhầm tới — đây là bug có sẵn trong
 * admin.html gốc, đã sửa ở đây và trong lib/cms/tables.ts).
 */
export const ADMIN_TABLES: AdminTableDef[] = [
  {
    name: 'site_settings',
    label: 'Cài đặt',
    icon: 'cog',
    pk: 'id',
    fields: [
      { key: 'key', label: 'Key', type: 'text', required: true },
      { key: 'value', label: 'Value', type: 'textarea' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'key', label: 'Key' },
      { key: 'value', label: 'Value' },
    ],
  },
  {
    name: 'menus',
    label: 'Menu',
    icon: 'bars',
    pk: 'id',
    fields: [
      { key: 'label', label: 'Tên menu', type: 'text', required: true },
      { key: 'url', label: 'URL (VD: cong-tron-c53.html hoặc # nếu chỉ là nhóm)', type: 'text' },
      { key: 'parent_id', label: 'Menu cha (để trống = menu cấp 1)', type: 'parentselect' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      {
        key: 'label',
        label: 'Tên',
        render: (v, row, allData) => {
          const menus = allData.menus || [];
          let depth = 0;
          let p = row.parent_id as number | null;
          while (p) {
            depth++;
            const par = menus.find((m) => m.id === p);
            p = (par?.parent_id as number | null) ?? null;
            if (depth > 5) break;
          }
          return (
            <>
              {depth > 0 && '\u00A0\u00A0\u00A0\u00A0'.repeat(depth) + '└ '}
              {String(v ?? '')}
            </>
          );
        },
      },
      {
        key: 'parent_id',
        label: 'Menu cha',
        render: (v, _row, allData) => {
          if (!v) return <span className="badge bg-primary">Cấp 1 (gốc)</span>;
          const par = (allData.menus || []).find((m) => m.id === v);
          return par ? String(par.label) : `#${String(v)}`;
        },
      },
      { key: 'url', label: 'URL' },
      { key: 'display_order', label: 'Thứ tự' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'categories',
    label: 'Danh mục',
    icon: 'sitemap',
    pk: 'id',
    fields: [
      { key: 'name', label: 'Tên danh mục', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'link_url', label: 'Link đích khi bấm vào (VD: /cong-tron-c53.html). Để trống = tự dùng slug', type: 'text' },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'thumbnail_url', label: 'Ảnh danh mục', type: 'image' },
      { key: 'type', label: 'Loại', type: 'select', options: ['product', 'post', 'project', 'gallery'] },
      { key: 'parent_id', label: 'Danh mục cha (ID)', type: 'number' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Ảnh', render: thumb },
      { key: 'name', label: 'Tên' },
      { key: 'link_url', label: 'Link đích', render: (v, row) => String(v || (row.slug ? `/${row.slug}.html` : '')) },
      { key: 'type', label: 'Loại' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'posts',
    label: 'Bài viết',
    icon: 'newspaper',
    pk: 'id',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'category_id', label: 'Danh mục (ID)', type: 'number' },
      { key: 'excerpt', label: 'Mô tả ngắn', type: 'textarea' },
      { key: 'content', label: 'Nội dung (soạn thảo + chèn ảnh)', type: 'richtext' },
      { key: 'attachments', label: 'Ảnh & File đính kèm (tách riêng)', type: 'attachments' },
      { key: 'thumbnail_url', label: 'Ảnh đại diện', type: 'image' },
      { key: 'tags', label: 'Tags (phân cách bằng dấu phẩy)', type: 'text' },
      { key: 'status', label: 'Trạng thái', type: 'select', options: ['draft', 'published', 'archived'] },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Ảnh', render: thumb },
      { key: 'title', label: 'Tiêu đề' },
      { key: 'status', label: 'Trạng thái' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'projects',
    label: 'Dự án',
    icon: 'building',
    pk: 'id',
    fields: [
      { key: 'title', label: 'Tên dự án', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'link_url', label: 'Link đích khi bấm vào (để trống = tự dùng slug)', type: 'text' },
      { key: 'excerpt', label: 'Mô tả ngắn', type: 'textarea' },
      { key: 'content', label: 'Nội dung (soạn thảo + chèn ảnh)', type: 'richtext' },
      { key: 'attachments', label: 'Ảnh & File đính kèm (tách riêng)', type: 'attachments' },
      { key: 'thumbnail_url', label: 'Ảnh đại diện', type: 'image' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Ảnh', render: thumb },
      { key: 'title', label: 'Tên dự án' },
      { key: 'link_url', label: 'Link đích', render: (v, row) => String(v || (row.slug ? `/${row.slug}.html` : '')) },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'products',
    label: 'Sản phẩm',
    icon: 'box',
    pk: 'id',
    fields: [
      { key: 'name', label: 'Tên sản phẩm', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'link_url', label: 'Link đích khi bấm vào (VD: /cong-tron-c53.html). Để trống = tự dùng slug', type: 'text' },
      { key: 'category_id', label: 'Danh mục (ID)', type: 'number' },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'content', label: 'Nội dung chi tiết', type: 'richtext' },
      { key: 'attachments', label: 'Ảnh & File đính kèm (tách riêng)', type: 'attachments' },
      { key: 'price', label: 'Giá', type: 'text' },
      { key: 'thumbnail_url', label: 'Ảnh đại diện', type: 'image' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Ảnh', render: thumb },
      { key: 'name', label: 'Tên SP' },
      { key: 'link_url', label: 'Link đích', render: (v, row) => String(v || (row.slug ? `/${row.slug}.html` : '')) },
      { key: 'price', label: 'Giá' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'slides',
    label: 'Slide',
    icon: 'images',
    pk: 'id',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text' },
      { key: 'subtitle', label: 'Phụ đề', type: 'text' },
      { key: 'image_url', label: 'Hình ảnh', type: 'image', required: true },
      { key: 'link_url', label: 'Link URL', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'image_url', label: 'Ảnh', render: thumb },
      { key: 'title', label: 'Tiêu đề' },
      { key: 'display_order', label: 'Thứ tự' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'photos',
    label: 'Thư viện ảnh',
    icon: 'images',
    pk: 'id',
    fields: [
      { key: 'file_path', label: 'Ảnh', type: 'image', required: true },
      { key: 'title', label: 'Tiêu đề', type: 'text' },
      { key: 'description', label: 'Chú thích', type: 'text' },
      { key: 'album_id', label: 'Album ID', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'file_path', label: 'Ảnh', render: thumb },
      { key: 'title', label: 'Tiêu đề' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'videos',
    label: 'Video',
    icon: 'video',
    pk: 'id',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text' },
      { key: 'youtube_url', label: 'Youtube URL', type: 'text' },
      { key: 'embed_url', label: 'Embed URL', type: 'text' },
      { key: 'thumbnail_url', label: 'Thumbnail', type: 'image' },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Thumb', render: thumb },
      { key: 'title', label: 'Tiêu đề' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'partners',
    label: 'Đối tác',
    icon: 'handshake',
    pk: 'id',
    fields: [
      { key: 'name', label: 'Tên đối tác', type: 'text', required: true },
      { key: 'logo_url', label: 'Logo', type: 'image' },
      { key: 'website_url', label: 'Website', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'logo_url', label: 'Logo', render: thumb },
      { key: 'name', label: 'Tên' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'testimonials',
    label: 'Slide liên hệ KD',
    icon: 'comment-dots',
    pk: 'id',
    fields: [
      {
        key: 'name',
        label: 'Họ tên - Chức vụ - SĐT',
        type: 'text',
        required: true,
      },
      { key: 'avatar_url', label: 'Ảnh đại diện', type: 'image' },
      { key: 'content', label: 'Nội dung giới thiệu', type: 'textarea', required: true },
      { key: 'rating', label: 'Đánh giá (1-5)', type: 'number' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      {
        key: 'avatar_url',
        label: 'Avatar',
        render: (v) =>
          typeof v === 'string' && v ? (
            <img src={v} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          ) : null,
      },
      { key: 'name', label: 'Họ tên / chức vụ / SĐT' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'links',
    label: 'Liên kết',
    icon: 'link',
    pk: 'id',
    fields: [
      { key: 'label', label: 'Tên', type: 'text', required: true },
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'icon', label: 'Icon class (VD: fa fa-facebook)', type: 'text' },
      { key: 'link_group', label: 'Nhóm', type: 'select', options: ['social', 'footer', 'quick'] },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'label', label: 'Tên' },
      { key: 'url', label: 'URL' },
      { key: 'link_group', label: 'Nhóm' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'contact_submissions',
    label: 'Liên hệ',
    icon: 'inbox',
    pk: 'id',
    fields: [
      { key: 'full_name', label: 'Họ tên', type: 'text' },
      { key: 'phone', label: 'SĐT', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'subject', label: 'Chủ đề', type: 'text' },
      { key: 'message', label: 'Nội dung', type: 'textarea' },
      { key: 'is_read', label: 'Đã đọc', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'full_name', label: 'Họ tên' },
      { key: 'phone', label: 'SĐT' },
      { key: 'email', label: 'Email' },
      {
        key: 'is_read',
        label: 'Đã đọc',
        render: (v) =>
          v ? (
            <span className="badge-dot bg-success">Đã xem</span>
          ) : (
            <span className="badge-dot bg-warning">Mới</span>
          ),
      },
    ],
  },
];

export const SITE_SETTINGS_FIXED_KEYS = [
  'site_name',
  'logo_url',
  'favicon_url',
  'hotline',
  'address',
  'email',
  'facebook_url',
  'website_url',
  'footer_copyright',
  'meta_description',
  'meta_keywords',
  'intro_text',
] as const;

export function isImageField(field: AdminField): boolean {
  return field.type === 'image' || IMAGE_FIELD_KEYS.has(field.key);
}
