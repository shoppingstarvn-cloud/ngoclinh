/**
 * Đưa box `moov` lên trước `mdat` (faststart) — không nén, không đổi chất lượng.
 * HTML5 cần moov ở đầu file mới phát ngay; iPhone/máy quay thường để moov ở cuối → giật.
 */

const CONTAINERS = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'edts',
  'mvex',
  'moof',
  'traf',
  'udta',
]);

function fourcc(u8: Uint8Array, off: number): string {
  return String.fromCharCode(u8[off], u8[off + 1], u8[off + 2], u8[off + 3]);
}

type Box = { offset: number; size: number; type: string };

function readBox(view: DataView, u8: Uint8Array, off: number, fileEnd: number): Box | null {
  if (off + 8 > fileEnd) return null;
  let size = view.getUint32(off);
  const type = fourcc(u8, off + 4);
  if (size === 1) {
    if (off + 16 > fileEnd) return null;
    size = Number(view.getBigUint64(off + 8));
  } else if (size === 0) {
    size = fileEnd - off;
  }
  if (!Number.isFinite(size) || size < 8 || off + size > fileEnd) return null;
  return { offset: off, size, type };
}

function walkTopLevel(u8: Uint8Array): Box[] {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const boxes: Box[] = [];
  let off = 0;
  while (off + 8 <= u8.byteLength) {
    const b = readBox(view, u8, off, u8.byteLength);
    if (!b) break;
    boxes.push(b);
    off += b.size;
  }
  return boxes;
}

function patchChunkOffsets(u8: Uint8Array, start: number, end: number, delta: number) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let off = start;
  while (off + 8 <= end) {
    const b = readBox(view, u8, off, end);
    if (!b) break;
    const header = view.getUint32(off) === 1 ? 16 : 8;
    if (b.type === 'stco' && b.size >= 16) {
      const count = view.getUint32(off + 12);
      for (let i = 0; i < count; i++) {
        const p = off + 16 + i * 4;
        if (p + 4 > off + b.size) break;
        view.setUint32(p, (view.getUint32(p) + delta) >>> 0);
      }
    } else if (b.type === 'co64' && b.size >= 16) {
      const count = view.getUint32(off + 12);
      const d = BigInt(delta);
      for (let i = 0; i < count; i++) {
        const p = off + 16 + i * 8;
        if (p + 8 > off + b.size) break;
        view.setBigUint64(p, view.getBigUint64(p) + d);
      }
    } else if (CONTAINERS.has(b.type) && b.size > header) {
      patchChunkOffsets(u8, off + header, off + b.size, delta);
    }
    off += b.size;
  }
}

function looksLikeIsoBmff(u8: Uint8Array): boolean {
  if (u8.byteLength < 16) return false;
  const t = fourcc(u8, 4);
  return t === 'ftyp' || t === 'moov' || t === 'mdat' || t === 'wide' || t === 'free';
}

/** Trả file mới nếu đã dời moov; null nếu đã faststart hoặc không phải MP4. */
export function remuxMp4FaststartBuffer(input: Uint8Array): Uint8Array | null {
  if (!looksLikeIsoBmff(input)) return null;
  const boxes = walkTopLevel(input);
  const moov = boxes.find((b) => b.type === 'moov');
  const mdat = boxes.find((b) => b.type === 'mdat');
  if (!moov || !mdat) return null;
  if (moov.offset < mdat.offset) return null;

  const moovCopy = input.slice(moov.offset, moov.offset + moov.size);
  patchChunkOffsets(moovCopy, 0, moovCopy.byteLength, moov.size);

  const out = new Uint8Array(input.byteLength);
  let w = 0;
  for (const b of boxes) {
    if (b.type === 'moov') continue;
    if (b.offset === mdat.offset) {
      out.set(moovCopy, w);
      w += moovCopy.byteLength;
    }
    out.set(input.subarray(b.offset, b.offset + b.size), w);
    w += b.size;
  }
  return w === out.byteLength ? out : out.subarray(0, w);
}

const MAX_REMUX_BYTES = 80 * 1024 * 1024;

export async function remuxMp4Faststart(file: File): Promise<File> {
  const mime = (file.type || '').toLowerCase();
  const name = file.name || '';
  const isMp4 =
    mime === 'video/mp4' ||
    mime === 'video/quicktime' ||
    mime === 'video/x-m4v' ||
    /\.(mp4|m4v|mov)$/i.test(name);
  if (!isMp4 || file.size < 64 || file.size > MAX_REMUX_BYTES) return file;

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const remuxed = remuxMp4FaststartBuffer(buf);
    if (!remuxed) return file;
    const base = name.replace(/\.[^.]+$/, '') || 'video';
    const copy = new ArrayBuffer(remuxed.byteLength);
    new Uint8Array(copy).set(remuxed);
    return new File([copy], `${base}.mp4`, { type: 'video/mp4', lastModified: Date.now() });
  } catch {
    return file;
  }
}
