import type { ReactNode } from 'react';
import { isVideoAsset } from '@/lib/media-url';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'checkbox'
  | 'select'
  | 'number'
  | 'parentselect'
  | 'refselect'
  | 'selfparentselect'
  | 'image'
  | 'attachments';

export interface AdminField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  /** refselect: bảng nguồn để đổ dropdown (VD 'categories') */
  refTable?: string;
  /** refselect: cột hiển thị nhãn (VD 'name' | 'label' | 'title') */
  refLabel?: string;
  /** selfparentselect: lọc menu cấp 1 cùng khối theo cột này (VD 'category_id') */
  scopeKey?: string;
  /** image = chỉ ảnh (logo/favicon/QR). Mặc định media = ảnh + video. */
  acceptMode?: 'image' | 'media';
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
  /** Ghi chú ngay dưới tiêu đề bảng — tránh nhầm tab Menu vs khối MENU trang chủ */
  hint?: string;
  fields: AdminField[];
  cols: AdminColumn[];
}

export function categoryAdminLabel(row: AdminRow): string {
  const name = String(row.name ?? row.title ?? row.label ?? row.id ?? '');
  const slug = String(row.slug ?? '');
  const hang3 = slug.endsWith('-r2') ? ' · hàng 3' : '';
  return slug ? `${name} · ${slug}${hang3}` : name;
}

/** Trường được coi là ảnh/media — tự động hiện widget upload kéo-thả */
export const IMAGE_FIELD_KEYS = new Set([
  'image_url',
  'thumbnail_url',
  'logo_url',
  'avatar_url',
  'file_path',
  'favicon_url',
  'embed_url',
]);

/** Logo / favicon / avatar / QR — không nhận video. */
export const IMAGE_ONLY_FIELD_KEYS = new Set(['logo_url', 'favicon_url', 'avatar_url']);

function boolBadge(v: unknown) {
  return v ? (
    <span className="text-success">✓</span>
  ) : (
    <span className="text-danger">✗</span>
  );
}

function thumb(v: unknown) {
  if (typeof v !== 'string' || !v) return null;
  if (isVideoAsset(v)) {
    return <video src={v} className="thumb-img" muted playsInline preload="metadata" />;
  }
  return <img src={v} className="thumb-img" alt="" />;
}

function formatVnTime(v: unknown) {
  if (v == null || v === '') return '';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function readBadge(v: unknown) {
  return v ? (
    <span className="badge-dot bg-success">Đã xem</span>
  ) : (
    <span className="badge-dot bg-warning">Mới</span>
  );
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
    label: 'Menu (thanh điều hướng)',
    icon: 'bars',
    pk: 'id',
    hint: 'Thanh điều hướng header LIVE (ngoclinh.shopmartai.com) — KHÔNG phải 9 khối sandwich. Đổi tên ở đây chỉ đổi chữ trên header. 9 khối trang chủ + footer NĂNG LỰC lấy tên từ tab “Danh mục (MENU trang chủ)”. Cây Cửa Âu thay bằng node scripts/replace-header-menus-ngoclinh.js hoặc sql/07_THAY_MENU_HEADER_NGOCLINH.sql trên kho pglbhoitmcflpvoasewr rồi F5 tab này.',
    fields: [
      { key: 'label', label: 'Tên menu', type: 'text', required: true },
      { key: 'url', label: 'URL (VD: /#gioi-thieu, /dao-tao-ai.html, hoặc # nếu chỉ là nhóm)', type: 'text' },
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
    label: 'Danh mục (MENU trang chủ)',
    icon: 'sitemap',
    pk: 'id',
    hint: 'Đây là các khối MENU sandwich trên trang chủ (thường 9 ô). Tên / ảnh / thứ tự / Active sửa ở đây thì trang chủ hiện ĐÚNG chữ này (không lấy chữ tab Menu header). Badge “hàng 3” = slug đuôi -r2. Nếu bảng mới có 6 dòng: bấm “Bổ sung 3 khối hàng 3”.',
    fields: [
      { key: 'name', label: 'Tên danh mục', type: 'text', required: true },
      { key: 'slug', label: 'Slug (hàng 3 dùng đuôi -r2, VD: truyen-thong-r2)', type: 'text', required: true },
      { key: 'link_url', label: 'Link đích khi bấm vào (VD: /dao-tao-ai.html). Để trống = tự dùng slug', type: 'text' },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'thumbnail_url', label: 'Ảnh / video danh mục', type: 'image' },
      { key: 'type', label: 'Loại', type: 'select', options: ['product', 'post', 'project', 'gallery'] },
      { key: 'parent_id', label: 'Danh mục cha (ID) — 0 / trống = khối gốc trang chủ', type: 'number' },
      { key: 'display_order', label: 'Thứ tự (số nhỏ hiện trước trên trang chủ)', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'thumbnail_url', label: 'Ảnh', render: thumb },
      {
        key: 'name',
        label: 'Tên',
        render: (v, row) => (
          <>
            {String(v ?? '')}
            {String(row.slug || '').endsWith('-r2') ? (
              <span className="badge bg-info ms-2">hàng 3</span>
            ) : null}
          </>
        ),
      },
      { key: 'slug', label: 'Slug' },
      { key: 'link_url', label: 'Link đích', render: (v, row) => String(v || (row.slug ? `/${row.slug}.html` : '')) },
      { key: 'type', label: 'Loại' },
      { key: 'display_order', label: 'Thứ tự' },
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
      { key: 'attachments', label: 'Ảnh, video & File đính kèm', type: 'attachments' },
      { key: 'thumbnail_url', label: 'Ảnh / video đại diện', type: 'image' },
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
      { key: 'attachments', label: 'Ảnh, video & File đính kèm', type: 'attachments' },
      { key: 'thumbnail_url', label: 'Ảnh / video đại diện', type: 'image' },
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
      { key: 'link_url', label: 'Link đích khi bấm vào (VD: /dao-tao-ai.html). Để trống = tự dùng slug', type: 'text' },
      { key: 'category_id', label: 'Danh mục (ID)', type: 'number' },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'content', label: 'Nội dung chi tiết', type: 'richtext' },
      { key: 'attachments', label: 'Ảnh, video & File đính kèm', type: 'attachments' },
      { key: 'price', label: 'Giá', type: 'text' },
      { key: 'thumbnail_url', label: 'Ảnh / video đại diện', type: 'image' },
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
      { key: 'image_url', label: 'Hình ảnh / video', type: 'image', required: true },
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
      { key: 'file_path', label: 'Ảnh / video', type: 'image', required: true },
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
      { key: 'youtube_url', label: 'YouTube URL (dán link, tuỳ chọn)', type: 'text' },
      { key: 'embed_url', label: 'Video tải lên (kéo-thả, không giới hạn)', type: 'image' },
      { key: 'thumbnail_url', label: 'Ảnh / video thumbnail', type: 'image' },
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
      { key: 'logo_url', label: 'Logo', type: 'image', acceptMode: 'image' },
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
      { key: 'avatar_url', label: 'Ảnh đại diện', type: 'image', acceptMode: 'image' },
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
    name: 'services',
    label: 'Các dịch vụ',
    icon: 'th-large',
    pk: 'id',
    fields: [
      { key: 'title_top', label: 'Tên dịch vụ (thanh trắng dưới ảnh)', type: 'text', required: true },
      { key: 'link_top', label: 'Link khi bấm khối (để trống = chưa gắn link)', type: 'text' },
      { key: 'image_url', label: 'Ảnh / video khối', type: 'image' },
      { key: 'title_bottom', label: 'Mô tả ngắn dưới tên (để trống = ẩn)', type: 'text' },
      { key: 'link_bottom', label: 'Link phụ (nếu không có link khối)', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'image_url', label: 'Ảnh', render: thumb },
      { key: 'title_top', label: 'Tên dịch vụ' },
      { key: 'title_bottom', label: 'Mô tả' },
      { key: 'display_order', label: 'Thứ tự' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'register_blocks',
    label: 'Khối form đăng ký',
    icon: 'id-card',
    pk: 'id',
    fields: [
      {
        key: 'block_key',
        label: 'Mã khối (form / community / qr / contact / commitment hoặc mã mới)',
        type: 'text',
        required: true,
      },
      { key: 'title', label: 'Tiêu đề khối', type: 'text', required: true },
      { key: 'subtitle', label: 'Phụ đề / chữ nút Đăng Ký Ngay (khối form)', type: 'text' },
      { key: 'body', label: 'Nội dung (Cam kết: mỗi dòng 1 ý)', type: 'textarea' },
      { key: 'image_url', label: 'Ảnh QR / ảnh khối', type: 'image', acceptMode: 'image' },
      { key: 'link_url', label: 'Link (Zalo cộng đồng / QR)', type: 'text' },
      { key: 'phone', label: 'Số điện thoại (khối liên hệ)', type: 'text' },
      { key: 'zalo', label: 'Zalo (khối liên hệ)', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'block_key', label: 'Mã khối' },
      { key: 'title', label: 'Tiêu đề' },
      { key: 'image_url', label: 'Ảnh', render: thumb },
      { key: 'display_order', label: 'Thứ tự' },
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
      { key: 'is_read', label: 'Đã đọc', render: readBadge },
    ],
  },
  {
    name: 'registrations',
    label: 'Thông tin đăng ký',
    icon: 'clipboard-list',
    pk: 'id',
    fields: [
      { key: 'full_name', label: 'Họ tên', type: 'text', required: true },
      { key: 'phone', label: 'Số điện thoại', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'occupation', label: 'Ngành nghề công tác', type: 'text', required: true },
      { key: 'service', label: 'Muốn đăng ký (dịch vụ)', type: 'text', required: true },
      {
        key: 'service_id',
        label: 'Khớp khối dịch vụ (nếu có)',
        type: 'refselect',
        refTable: 'services',
        refLabel: 'title_top',
      },
      { key: 'needs', label: 'Mô tả nhu cầu cụ thể', type: 'textarea' },
      { key: 'is_read', label: 'Đã đọc', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'created_at', label: 'Thời gian', render: formatVnTime },
      { key: 'full_name', label: 'Họ tên' },
      { key: 'phone', label: 'SĐT' },
      { key: 'email', label: 'Email' },
      { key: 'occupation', label: 'Ngành nghề' },
      { key: 'service', label: 'Muốn đăng ký' },
      { key: 'needs', label: 'Nhu cầu' },
      { key: 'is_read', label: 'Đã đọc', render: readBadge },
    ],
  },
  {
    name: 'category_submenus',
    label: 'Menu con (khối MENU trang chủ)',
    icon: 'list-ul',
    pk: 'id',
    hint: 'Menu xổ xuống khi rê chuột vào từng khối MENU trang chủ. Chọn đúng khối gốc (hàng 3 có đuôi -r2).',
    fields: [
      {
        key: 'category_id',
        label: 'Thuộc khối/danh mục GỐC',
        type: 'refselect',
        required: true,
        refTable: 'categories',
        refLabel: 'name',
      },
      {
        key: 'parent_id',
        label: 'Menu CẤP 1 cha (để trống nếu đây LÀ menu cấp 1)',
        type: 'selfparentselect',
        scopeKey: 'category_id',
      },
      { key: 'label', label: 'Tên menu con', type: 'text', required: true },
      { key: 'link_url', label: 'Link đích khi bấm (VD: /dao-tao-ai.html)', type: 'text' },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      {
        key: 'category_id',
        label: 'Khối gốc',
        render: (v, _row, allData) => {
          const cat = (allData.categories || []).find((c) => c.id === v);
          return cat ? categoryAdminLabel(cat) : `#${String(v ?? '')}`;
        },
      },
      {
        key: 'label',
        label: 'Menu con',
        render: (v, row, allData) => {
          const pid = row.parent_id as number | null;
          if (!pid) return <>{String(v ?? '')}</>;
          const par = (allData.category_submenus || []).find((s) => s.id === pid);
          return (
            <>
              {'    └ '}
              {String(v ?? '')}
              <span className="text-secondary"> (cấp 2 · thuộc “{String(par?.label ?? pid)}”)</span>
            </>
          );
        },
      },
      { key: 'link_url', label: 'Link đích' },
      { key: 'display_order', label: 'Thứ tự' },
      { key: 'is_active', label: 'Active', render: boolBadge },
    ],
  },
  {
    name: 'activity_images',
    label: 'Hình ảnh hoạt động',
    icon: 'images',
    pk: 'id',
    fields: [
      { key: 'title', label: 'Chú thích (không bắt buộc)', type: 'text' },
      { key: 'image_url', label: 'Hình ảnh / video', type: 'image', required: true },
      { key: 'display_order', label: 'Thứ tự', type: 'number' },
      { key: 'is_active', label: 'Kích hoạt', type: 'checkbox' },
    ],
    cols: [
      { key: 'id', label: 'ID' },
      { key: 'image_url', label: 'Ảnh', render: thumb },
      { key: 'title', label: 'Chú thích' },
      { key: 'display_order', label: 'Thứ tự' },
      { key: 'is_active', label: 'Active', render: boolBadge },
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

export function fieldAcceptMode(field: AdminField): 'image' | 'media' {
  if (field.acceptMode) return field.acceptMode;
  return IMAGE_ONLY_FIELD_KEYS.has(field.key) ? 'image' : 'media';
}
