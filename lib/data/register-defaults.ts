export interface RegisterBlock {
  id?: number;
  block_key: string;
  title: string;
  subtitle?: string;
  body?: string;
  image_url?: string;
  link_url?: string;
  phone?: string;
  zalo?: string;
  display_order?: number;
  is_active?: boolean;
}

export const KNOWN_REGISTER_KEYS = ['form', 'community', 'qr', 'contact', 'commitment'] as const;

export const DEFAULT_REGISTER_BLOCKS: Record<(typeof KNOWN_REGISTER_KEYS)[number], RegisterBlock> = {
  form: {
    block_key: 'form',
    title: 'Form đăng ký',
    subtitle: 'Đăng Ký Ngay',
    display_order: 0,
    is_active: true,
  },
  community: {
    block_key: 'community',
    title: 'CỘNG ĐỒNG ZALO PHÁT TRIỂN HỆ SINH THÁI AI',
    link_url: 'https://zalo.me/0827416886',
    display_order: 1,
    is_active: true,
  },
  qr: {
    block_key: 'qr',
    title: 'HỆ SINH THÁI AI',
    image_url: '/images/register/he-sinh-thai-ai-qr.jpg',
    link_url: 'https://zalo.me/0827416886',
    display_order: 2,
    is_active: true,
  },
  contact: {
    block_key: 'contact',
    title: 'Liên hệ chốt Nhanh:',
    phone: '0827416886',
    zalo: '0827416886',
    display_order: 3,
    is_active: true,
  },
  commitment: {
    block_key: 'commitment',
    title: 'Cam kết',
    body: 'Cam kết nội dung và Sản phẩm thực chiến\nHỗ trợ sau khóa học\nHỗ trợ sản phẩm AI',
    display_order: 4,
    is_active: true,
  },
};

export function resolveRegisterContent(rows: RegisterBlock[]) {
  const byKey = new Map(rows.map((r) => [r.block_key, r]));

  function pick(key: (typeof KNOWN_REGISTER_KEYS)[number]): RegisterBlock | null {
    const dbRow = byKey.get(key);
    if (dbRow && dbRow.is_active === false) return null;
    if (dbRow) return { ...DEFAULT_REGISTER_BLOCKS[key], ...dbRow };
    return DEFAULT_REGISTER_BLOCKS[key];
  }

  const extras = rows
    .filter((r) => r.is_active !== false && !(KNOWN_REGISTER_KEYS as readonly string[]).includes(r.block_key))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  return {
    form: pick('form') ?? DEFAULT_REGISTER_BLOCKS.form,
    sidebar: [pick('community'), pick('qr'), pick('contact'), pick('commitment'), ...extras].filter(
      (b): b is RegisterBlock => Boolean(b),
    ),
  };
}
