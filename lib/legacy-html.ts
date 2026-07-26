import fs from 'fs';
import path from 'path';

/** Đọc file HTML tĩnh còn sót trong public/ — giai đoạn chuyển đổi dần */
export function readLegacyHtml(relativePath: string): string | null {
  const normalized = relativePath.replace(/^\/+/, '');
  const candidates = [
    path.join(process.cwd(), 'public', normalized),
    path.join(process.cwd(), 'public', `${normalized}.html`),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return fs.readFileSync(file, 'utf8');
      }
    } catch {
      /* bỏ qua */
    }
  }
  return null;
}

/** Trích xuất nội dung trong <body> từ HTML legacy */
export function extractBodyHtml(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : fullHtml;
}

export function extractTitle(fullHtml: string): string {
  const match = fullHtml.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

/**
 * Trích <h1> — CÙNG nguồn tiêu đề mà scripts/build-detail-map.js và
 * detail-sync.js dùng để sinh slug so khớp bản ghi Supabase. Bắt buộc
 * dùng hàm này (không phải <title>) khi tra cứu nội dung động cho
 * trang legacy, nếu không sẽ không bao giờ khớp được bản ghi.
 */
export function extractH1(fullHtml: string): string {
  const match = fullHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}
