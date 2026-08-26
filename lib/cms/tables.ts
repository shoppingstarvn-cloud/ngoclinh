export type ContentTable = 'posts' | 'products' | 'projects' | 'partners';

export interface CmsTableConfig {
  table: string;
  label: string;
  pk: string;
  publicRead: boolean;
}

export const CMS_TABLES: CmsTableConfig[] = [
  { table: 'site_settings', label: 'Cài đặt', pk: 'id', publicRead: true },
  { table: 'menus', label: 'Menu', pk: 'id', publicRead: true },
  { table: 'categories', label: 'Danh mục', pk: 'id', publicRead: true },
  { table: 'posts', label: 'Bài viết', pk: 'id', publicRead: true },
  { table: 'projects', label: 'Dự án', pk: 'id', publicRead: true },
  { table: 'products', label: 'Sản phẩm', pk: 'id', publicRead: true },
  { table: 'slides', label: 'Slide', pk: 'id', publicRead: true },
  { table: 'activity_images', label: 'Hình ảnh hoạt động', pk: 'id', publicRead: true },
  { table: 'category_submenus', label: 'Menu con (khối danh mục)', pk: 'id', publicRead: true },
  { table: 'images', label: 'Hình ảnh', pk: 'id', publicRead: true },
  // 'photos' là bảng thực tế được admin.html + realtime-data.js (loadPhotos) dùng
  // cho "Thư viện ảnh" — server.js CŨ thiếu bảng này trong CMS_TABLES (bug), khiến
  // API /api/admin/photos luôn 404. Bổ sung ở đây để CRUD hoạt động đúng như UI.
  { table: 'photos', label: 'Thư viện ảnh', pk: 'id', publicRead: true },
  { table: 'videos', label: 'Video', pk: 'id', publicRead: true },
  { table: 'partners', label: 'Đối tác', pk: 'id', publicRead: true },
  { table: 'testimonials', label: 'Đánh giá', pk: 'id', publicRead: true },
  { table: 'services', label: 'Các dịch vụ', pk: 'id', publicRead: true },
  { table: 'register_blocks', label: 'Khối form đăng ký', pk: 'id', publicRead: true },
  { table: 'links', label: 'Liên kết', pk: 'id', publicRead: true },
  { table: 'contact_submissions', label: 'Liên hệ', pk: 'id', publicRead: false },
  { table: 'registrations', label: 'Thông tin đăng ký', pk: 'id', publicRead: false },
];

export type CmsTableName = (typeof CMS_TABLES)[number]['table'];

export const ORDERED_TABLES = [
  'slides',
  'menus',
  'categories',
  'products',
  'partners',
  'testimonials',
  'services',
  'register_blocks',
  'links',
  'images',
  'photos',
  'videos',
] as const;

export function getTableConfig(table: string): CmsTableConfig | undefined {
  return CMS_TABLES.find((t) => t.table === table);
}

export function isPublicTable(table: string): boolean {
  return CMS_TABLES.some((t) => t.table === table && t.publicRead);
}

export function isValidTable(table: string): table is CmsTableName {
  return CMS_TABLES.some((t) => t.table === table);
}
