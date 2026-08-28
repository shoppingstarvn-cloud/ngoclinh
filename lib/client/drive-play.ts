import { drivePreviewUrl, driveStreamApiUrl } from '@/lib/media-url';
import { MAX_CHUNK } from '@/lib/storage/drive-range';

const MB = 1024 * 1024;
const POOL = 3;
const BLOB_CACHE_MAX = 4;
/** File vượt trần blob: nạp sẵn ~64MB (16×4MiB) trước khi gắn src. */
const STREAM_WARM_CHUNKS = 16;

/**
 * Clip ~1 phút 1080p thường 20–80MB. Ghép hết thành blob rồi phát local thì không giật.
 * Máy yếu / điện thoại: trần thấp hơn. Desktop: gần như luôn blob clip album.
 */
function blobBudgetBytes(): number {
  if (typeof navigator === 'undefined') return 192 * MB;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mobile = /iPhone|iPod|Android.+Mobile/i.test(navigator.userAgent);
  const gb = nav.deviceMemory;
  if (mobile && (gb == null || gb <= 2)) return 80 * MB;
  if (mobile) return 128 * MB;
  return 256 * MB;
}

export type DrivePlaySource = { kind: 'blob' | 'stream' | 'iframe'; url: string; size: number };

type CachedBlob = { url: string; size: number; mime: string; at: number };
type Inflight = {
  promise: Promise<DrivePlaySource>;
  listeners: Set<(done: number, total: number) => void>;
  last?: { done: number; total: number };
};

const blobCache = new Map<string, CachedBlob>();
const inflight = new Map<string, Inflight>();
/** HEVC mà trình duyệt không decode — khỏi tải lại đầu/đuôi mỗi lần mở. */
const iframeSkip = new Set<string>();

function evictBlobCache() {
  while (blobCache.size > BLOB_CACHE_MAX) {
    let oldestId: string | null = null;
    let oldestAt = Infinity;
    for (const [id, row] of blobCache) {
      if (row.at < oldestAt) {
        oldestAt = row.at;
        oldestId = id;
      }
    }
    if (!oldestId) break;
    const row = blobCache.get(oldestId);
    blobCache.delete(oldestId);
    if (row?.url.startsWith('blob:')) URL.revokeObjectURL(row.url);
  }
}

function rememberBlob(fileId: string, url: string, size: number, mime: string) {
  const prev = blobCache.get(fileId);
  if (prev && prev.url !== url && prev.url.startsWith('blob:')) {
    URL.revokeObjectURL(prev.url);
  }
  blobCache.set(fileId, { url, size, mime, at: Date.now() });
  evictBlobCache();
}

function browserCanPlayHevc(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const v = document.createElement('video');
    return (
      v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '' ||
      v.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '' ||
      v.canPlayType('video/mp4; codecs="hvc1"') !== '' ||
      v.canPlayType('video/mp4; codecs="hev1"') !== ''
    );
  } catch {
    return false;
  }
}

/** Blob đã ghép sẵn — phát ngay, không tải lại (Strict Mode / xem lại cùng clip). */
export function peekDrivePlaySource(fileId: string): DrivePlaySource | null {
  if (iframeSkip.has(fileId)) {
    return { kind: 'iframe', url: drivePreviewUrl(fileId), size: 0 };
  }
  const hit = blobCache.get(fileId);
  if (!hit) return null;
  hit.at = Date.now();
  return { kind: 'blob', url: hit.url, size: hit.size };
}

function chunkRanges(size: number): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < size; start += MAX_CHUNK) {
    out.push({ start, end: Math.min(start + MAX_CHUNK - 1, size - 1) });
  }
  return out;
}

async function poolMap<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function containsAscii(u8: Uint8Array, needle: string): boolean {
  const n = needle.length;
  if (u8.length < n) return false;
  outer: for (let i = 0; i <= u8.length - n; i++) {
    for (let j = 0; j < n; j++) {
      if (u8[i + j] !== needle.charCodeAt(j)) continue outer;
    }
    return true;
  }
  return false;
}

/** Máy quay hay ghi HEVC — Chrome Win không decode; khỏi ghép blob 80MB rồi mới lỗi. */
function looksLikeHevc(parts: Uint8Array[]): boolean {
  for (const u8 of parts) {
    if (
      containsAscii(u8, 'hvc1') ||
      containsAscii(u8, 'hev1') ||
      containsAscii(u8, 'dvh1') ||
      containsAscii(u8, 'hvcC')
    ) {
      return true;
    }
  }
  return false;
}

async function fetchChunk(url: string, start: number, end: number): Promise<ArrayBuffer> {
  const expected = end - start + 1;
  const once = async () => {
    const r = await fetch(url, {
      headers: { Range: `bytes=${start}-${end}` },
      cache: 'force-cache',
    });
    if (!r.ok && r.status !== 206) {
      throw new Error(`chunk ${r.status}`);
    }
    return r.arrayBuffer();
  };
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let buf = await once();
      if (buf.byteLength !== expected) buf = await once();
      if (buf.byteLength !== expected) {
        throw new Error(`chunk size ${buf.byteLength} != ${expected}`);
      }
      return buf;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr || new Error('chunk failed');
}

/** Nạp sẵn khúc đầu + khúc cuối (thường chứa moov) vào HTTP cache. */
export function prefetchDriveEnds(fileId: string, size: number) {
  if (size <= 0) return;
  const url = driveStreamApiUrl(fileId);
  const firstEnd = Math.min(MAX_CHUNK - 1, size - 1);
  void fetch(url, { headers: { Range: `bytes=0-${firstEnd}` }, cache: 'force-cache' }).catch(() => {});
  if (size > MAX_CHUNK) {
    const tail = Math.max(0, size - MAX_CHUNK);
    void fetch(url, {
      headers: { Range: `bytes=${tail}-${size - 1}` },
      cache: 'force-cache',
    }).catch(() => {});
  }
}

async function assemble(fileId: string, onTick: (done: number, total: number) => void): Promise<DrivePlaySource> {
  const url = driveStreamApiUrl(fileId);
  const probe = await fetch(url, {
    headers: { Range: 'bytes=0-0' },
    cache: 'no-store',
  });
  if (!probe.ok && probe.status !== 206) {
    if (probe.body) await probe.body.cancel().catch(() => {});
    return { kind: 'stream', url, size: 0 };
  }
  const cr = probe.headers.get('content-range') || '';
  const totalFromRange = /\/(\d+)\s*$/.exec(cr);
  const size = totalFromRange ? Number(totalFromRange[1]) : Number(probe.headers.get('content-length') || 0);
  const mime = probe.headers.get('content-type') || 'video/mp4';
  if (probe.body) await probe.body.cancel().catch(() => {});

  const budget = blobBudgetBytes();
  if (size <= 0 || size > budget) {
    prefetchDriveEnds(fileId, size);
    if (size > 0) await warmStreamHead(fileId, size, onTick);
    return { kind: 'stream', url, size };
  }

  const ranges = chunkRanges(size);
  const parts: ArrayBuffer[] = new Array(ranges.length);
  let done = 0;
  onTick(0, size);

  const fetchAt = async (i: number) => {
    const rg = ranges[i];
    const buf = await fetchChunk(url, rg.start, rg.end);
    parts[i] = buf;
    done += buf.byteLength;
    onTick(Math.min(done, size), size);
    return buf;
  };

  const lastIdx = ranges.length - 1;
  if (lastIdx === 0) {
    await fetchAt(0);
  } else {
    await Promise.all([fetchAt(0), fetchAt(lastIdx)]);
  }

  const sniff = [new Uint8Array(parts[0])];
  if (lastIdx > 0 && parts[lastIdx]) sniff.push(new Uint8Array(parts[lastIdx]));
  if (looksLikeHevc(sniff) && !browserCanPlayHevc()) {
    iframeSkip.add(fileId);
    return { kind: 'iframe', url: drivePreviewUrl(fileId), size };
  }

  const middle = ranges.map((_, i) => i).filter((i) => parts[i] == null);
  if (middle.length) {
    await poolMap(middle, POOL, async (i) => {
      await fetchAt(i);
    });
  }

  const blob = new Blob(parts, { type: mime.startsWith('video/') ? mime : 'video/mp4' });
  onTick(size, size);
  const objectUrl = URL.createObjectURL(blob);
  rememberBlob(fileId, objectUrl, size, mime);
  return { kind: 'blob', url: objectUrl, size };
}

async function warmStreamHead(
  fileId: string,
  size: number,
  onTick: (done: number, total: number) => void,
): Promise<void> {
  const url = driveStreamApiUrl(fileId);
  const ranges: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < STREAM_WARM_CHUNKS; i++) {
    const start = i * MAX_CHUNK;
    if (start >= size) break;
    ranges.push({ start, end: Math.min(start + MAX_CHUNK - 1, size - 1) });
  }
  if (!ranges.length) return;
  let done = 0;
  onTick(0, size);
  await poolMap(ranges, POOL, async (rg) => {
    await fetchChunk(url, rg.start, rg.end);
    done += rg.end - rg.start + 1;
    onTick(Math.min(done, size), size);
  });
}

/** Nạp sẵn khúc đang xem + vài khúc tiếp (file vượt trần blob vẫn Range qua Vercel). */
export function prefetchDriveWindow(fileId: string, size: number, fromByte: number) {
  void prefetchDriveWindowAsync(fileId, size, fromByte);
}

export async function prefetchDriveWindowAsync(fileId: string, size: number, fromByte: number) {
  if (size <= 0 || fromByte < 0) return;
  const url = driveStreamApiUrl(fileId);
  const aligned = Math.floor(fromByte / MAX_CHUNK) * MAX_CHUNK;
  const jobs: Promise<unknown>[] = [];
  for (let i = 0; i < STREAM_WARM_CHUNKS; i++) {
    const start = aligned + i * MAX_CHUNK;
    if (start >= size) break;
    const end = Math.min(start + MAX_CHUNK - 1, size - 1);
    jobs.push(fetchChunk(url, start, end).catch(() => {}));
  }
  await Promise.all(jobs);
}

/**
 * Video ngắn/vừa: tải đủ file (nhiều Range ≤4MB) rồi phát blob — liền mạch.
 * Video lớn: URL stream + prefetch đầu/đuôi (moov thường nằm cuối file điện thoại).
 * Không abort mạng khi React Strict Mode unmount — tránh tải 2 lần / revoke nhầm blob.
 */
export async function resolveDrivePlayUrl(
  fileId: string,
  signal: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<DrivePlaySource> {
  const cached = peekDrivePlaySource(fileId);
  if (cached) {
    onProgress?.(cached.size, cached.size);
    return cached;
  }

  let slot = inflight.get(fileId);
  if (!slot) {
    const listeners = new Set<(done: number, total: number) => void>();
    const row: Inflight = {
      listeners,
      promise: null as unknown as Promise<DrivePlaySource>,
    };
    row.promise = assemble(fileId, (done, total) => {
      row.last = { done, total };
      for (const fn of listeners) fn(done, total);
    }).finally(() => {
      if (inflight.get(fileId) === row) inflight.delete(fileId);
    });
    inflight.set(fileId, row);
    slot = row;
  }

  if (onProgress) {
    if (slot.last) onProgress(slot.last.done, slot.last.total);
    slot.listeners.add(onProgress);
  }

  try {
    void signal;
    return await slot.promise;
  } finally {
    if (onProgress) slot.listeners.delete(onProgress);
  }
}
