import { noAccent } from '@/lib/slug';

/**
 * Nhận diện khối/danh mục CẦN mật khẩu — khối "HOẠT ĐỘNG ..." (Phong trào /
 * Trọng tâm / ...). Khớp mọi tên bắt đầu bằng "Hoạt động" để đổi tên vẫn chạy.
 * So khớp không dấu, không phân biệt hoa thường.
 */
export function isGatedCategoryName(name: string): boolean {
  return noAccent(String(name || ''))
    .toLowerCase()
    .includes('hoat dong');
}
