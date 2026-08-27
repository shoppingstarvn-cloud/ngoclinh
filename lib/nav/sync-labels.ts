export type NavMenuLabel = {
  label?: string | null;
  url?: string | null;
};

export type NavCategoryLabel = {
  name?: string | null;
  slug?: string | null;
  link_url?: string | null;
};

/**
 * Khối sandwich + footer NĂNG LỰC lấy đúng `categories.name` từ tab
 * “Danh mục (MENU trang chủ)”. Header vẫn đọc `menus.label` riêng.
 *
 * Trước đây hàm này đè tên khối bằng chữ tab Menu khi trùng URL .html /
 * họ slug / HOẠT ĐỘNG…. Hàng 3 (THƯƠNG MẠI ĐIỆN TỬ, THƯ VIỆN SỐ, KALIN)
 * đang trỏ cùng link hàng 1 → trang chủ hiện trùng 3 ô đầu. Không đè nữa.
 */
export function applyMenuLabelsToCategories<T extends NavCategoryLabel>(
  categories: T[],
  _menus?: NavMenuLabel[],
): T[] {
  return categories;
}
