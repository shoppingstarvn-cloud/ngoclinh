/**
 * Chrome gửi `bytes=0-` (cả file). Không được kéo hết file qua function.
 * Khúc 4MB: moov + vài giây đầu, dưới trần buffer Hobby ~4.5MB.
 */
export const FIRST_CHUNK = 4 * 1024 * 1024;
export const DEFAULT_CHUNK = 4 * 1024 * 1024;
export const MAX_CHUNK = 4 * 1024 * 1024;

export type ByteRange = {
  start: number;
  end: number;
  satisfiable: boolean;
};

/**
 * Nếu thiếu Range hoặc Range mở (`bytes=0-`) thì cắt thành một khúc vừa đủ
 * cho HTML5 nạp moov + vài giây đầu, rồi trình phát tự xin khúc tiếp.
 */
export function resolveByteRange(rangeHeader: string | null, fileSize: number): ByteRange {
  const known = fileSize > 0;
  const last = known ? fileSize - 1 : Number.MAX_SAFE_INTEGER;

  const fallbackEnd = (start: number) => {
    const chunk = start === 0 ? FIRST_CHUNK : DEFAULT_CHUNK;
    const raw = start + chunk - 1;
    return known ? Math.min(last, raw) : raw;
  };

  if (!rangeHeader) {
    return { start: 0, end: fallbackEnd(0), satisfiable: true };
  }

  const m = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!m) {
    return { start: 0, end: fallbackEnd(0), satisfiable: true };
  }

  const hasStart = m[1] !== '';
  const hasEnd = m[2] !== '';

  if (!hasStart && hasEnd) {
    const suffix = parseInt(m[2], 10);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return { start: 0, end: fallbackEnd(0), satisfiable: true };
    }
    const len = Math.min(suffix, MAX_CHUNK);
    if (!known) {
      return { start: 0, end: len - 1, satisfiable: true };
    }
    const start = Math.max(0, fileSize - len);
    return { start, end: last, satisfiable: start <= last };
  }

  const start = hasStart ? parseInt(m[1], 10) : 0;
  if (!Number.isFinite(start) || start < 0) {
    return { start: 0, end: fallbackEnd(0), satisfiable: true };
  }
  if (known && start > last) {
    return { start, end: last, satisfiable: false };
  }

  let end: number;
  if (hasEnd) {
    end = parseInt(m[2], 10);
    if (!Number.isFinite(end)) end = fallbackEnd(start);
    if (end - start + 1 > MAX_CHUNK) end = start + MAX_CHUNK - 1;
  } else {
    end = fallbackEnd(start);
  }

  if (known) end = Math.min(end, last);
  if (end < start) {
    return { start, end: start, satisfiable: false };
  }
  return { start, end, satisfiable: true };
}

export function rangeHeaderValue(start: number, end: number): string {
  return `bytes=${start}-${end}`;
}
