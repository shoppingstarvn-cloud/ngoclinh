import { NextRequest, NextResponse } from 'next/server';
import { rangeHeaderValue, resolveByteRange, MAX_CHUNK } from '@/lib/storage/drive-range';
import {
  fetchDriveMedia,
  getDriveFileMeta,
  isConfigured,
  isDriveFileId,
  isStreamableVideoMime,
} from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Singapore — gần VN, Range 4MB. */
export const preferredRegion = 'sin1';
export const maxDuration = 60;

const NO_STORE = 'private, no-store, no-cache, must-revalidate';
/** Trình duyệt giữ khúc đã nạp; Vary Range để không lẫn khúc. */
const CACHE_VIDEO = 'public, max-age=86400, stale-while-revalidate=604800';

/** Local-only: Range-serve H.264 nhỏ để kiểm HTML5+blob khi OAuth Drive chưa có. */
export const LOCAL_SAMPLE_ID = 'localsample00';
const SAMPLE_MP4 = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
let sampleCache: { buf: Buffer; size: number } | null = null;

async function getLocalSample(): Promise<{ buf: Buffer; size: number }> {
  if (sampleCache) return sampleCache;
  const r = await fetch(SAMPLE_MP4);
  if (!r.ok) throw new Error(`sample ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  sampleCache = { buf, size: buf.byteLength };
  return sampleCache;
}

function sampleHeaders(size: number, extra: Record<string, string> = {}): Headers {
  const h = new Headers();
  h.set('Content-Type', 'video/mp4');
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', CACHE_VIDEO);
  h.set('CDN-Cache-Control', CACHE_VIDEO);
  h.set('Vary', 'Range');
  h.set('Content-Disposition', 'inline');
  h.set('X-Accel-Buffering', 'no');
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
  if (size > 0) h.set('Content-Length', String(size));
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

async function handleLocalSample(req: NextRequest, method: 'GET' | 'HEAD') {
  const { buf, size } = await getLocalSample();
  if (method === 'HEAD') {
    return new NextResponse(null, { status: 200, headers: sampleHeaders(size) });
  }
  const resolved = resolveByteRange(req.headers.get('range'), size);
  if (!resolved.satisfiable) {
    const h = new Headers({ 'Cache-Control': NO_STORE, 'Accept-Ranges': 'bytes' });
    h.set('Content-Range', `bytes */${size}`);
    return new NextResponse(null, { status: 416, headers: h });
  }
  const slice = buf.subarray(resolved.start, resolved.end + 1);
  const h = sampleHeaders(slice.length, {
    'Content-Range': `bytes ${resolved.start}-${resolved.end}/${size}`,
  });
  return new NextResponse(slice, { status: 206, headers: h });
}

function videoContentType(upstream: string | null, fallback: string): string {
  const t = (upstream || '').toLowerCase();
  if (t.startsWith('image/')) return fallback || 'video/mp4';
  if (t.startsWith('video/')) return upstream as string;
  if (t === 'application/mp4') return 'video/mp4';
  if (!t || t === 'application/octet-stream' || t.includes('binary')) return fallback || 'video/mp4';
  return fallback || 'video/mp4';
}

function badId() {
  return new NextResponse('Invalid file id', { status: 400, headers: { 'Cache-Control': NO_STORE } });
}

function isHtmlType(ct: string | null): boolean {
  const t = (ct || '').toLowerCase();
  return t.includes('text/html') || t.includes('application/json') || t.includes('text/plain');
}

function passthroughHeaders(upstream: Response, mimeHint: string, extra: Record<string, string> = {}): Headers {
  const h = new Headers();
  h.set('Content-Type', videoContentType(upstream.headers.get('content-type'), mimeHint));
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', CACHE_VIDEO);
  h.set('CDN-Cache-Control', CACHE_VIDEO);
  h.set('Vary', 'Range');
  h.set('Content-Disposition', 'inline');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Accel-Buffering', 'no');
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
  const cr = upstream.headers.get('content-range');
  if (cr) h.set('Content-Range', cr);
  const cl = upstream.headers.get('content-length');
  if (cl) h.set('Content-Length', cl);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

async function streamPublicDownload(
  fileId: string,
  range: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const url = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  return fetch(url, {
    headers: { Range: range },
    signal,
    redirect: 'follow',
  });
}

async function probeSize(fileId: string, signal: AbortSignal | undefined): Promise<number> {
  const probe = isConfigured()
    ? await fetchDriveMedia(fileId, 'bytes=0-0', signal)
    : await streamPublicDownload(fileId, 'bytes=0-0', signal);
  const cr = probe.headers.get('content-range');
  const total = /\/(\d+)\s*$/.exec(cr || '');
  if (probe.body) await probe.body.cancel().catch(() => {});
  return total ? Number(total[1]) || 0 : 0;
}

async function handle(req: NextRequest, fileId: string, method: 'GET' | 'HEAD') {
  if (process.env.NODE_ENV === 'development' && fileId === LOCAL_SAMPLE_ID) {
    try {
      return await handleLocalSample(req, method);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'sample error';
      return new NextResponse(msg, { status: 502, headers: { 'Cache-Control': NO_STORE } });
    }
  }
  if (!isDriveFileId(fileId)) return badId();

  try {
    let size = 0;
    let mime = 'video/mp4';

    if (isConfigured()) {
      const meta = await getDriveFileMeta(fileId);
      size = meta.size;
      mime = meta.mimeType || mime;
      if (!isStreamableVideoMime(mime, meta.name)) {
        return new NextResponse('Not a video', {
          status: 415,
          headers: { 'Cache-Control': NO_STORE },
        });
      }
    } else {
      size = await probeSize(fileId, req.signal);
    }

    if (method === 'HEAD') {
      const h = new Headers();
      h.set('Accept-Ranges', 'bytes');
      h.set('Content-Type', videoContentType(null, mime));
      h.set('Cache-Control', CACHE_VIDEO);
      h.set('CDN-Cache-Control', CACHE_VIDEO);
      h.set('Vary', 'Range');
      h.set('Content-Disposition', 'inline');
      h.set('X-Accel-Buffering', 'no');
      h.set('Access-Control-Allow-Origin', '*');
      h.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Type');
      if (size > 0) h.set('Content-Length', String(size));
      return new NextResponse(null, { status: 200, headers: h });
    }

    const resolved = resolveByteRange(req.headers.get('range'), size);
    if (!resolved.satisfiable) {
      const h = new Headers({
        'Cache-Control': NO_STORE,
        'Accept-Ranges': 'bytes',
      });
      if (size > 0) h.set('Content-Range', `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers: h });
    }

    const range = rangeHeaderValue(resolved.start, resolved.end);

    let upstream: Response;
    if (isConfigured()) {
      upstream = await fetchDriveMedia(fileId, range, req.signal);
    } else {
      upstream = await streamPublicDownload(fileId, range, req.signal);
    }

    const ct = upstream.headers.get('content-type');
    if (!upstream.ok && upstream.status !== 206) {
      const snippet = await upstream.text().catch(() => '');
      return new NextResponse(snippet.slice(0, 240) || `Drive ${upstream.status}`, {
        status: upstream.status === 404 ? 404 : 502,
        headers: { 'Cache-Control': NO_STORE },
      });
    }
    if ((ct || '').toLowerCase().startsWith('image/')) {
      if (upstream.body) await upstream.body.cancel().catch(() => {});
      return new NextResponse('Not a video', {
        status: 415,
        headers: { 'Cache-Control': NO_STORE },
      });
    }
    if (isHtmlType(ct)) {
      if (upstream.body) await upstream.body.cancel().catch(() => {});
      return new NextResponse('Drive returned HTML instead of video', {
        status: 502,
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    const cl = Number(upstream.headers.get('content-length') || 0);
    if (size <= 0) {
      const cr = upstream.headers.get('content-range');
      const total = /\/(\d+)\s*$/.exec(cr || '');
      if (total) size = Number(total[1]) || 0;
    }
    if (upstream.status === 200 && cl > MAX_CHUNK) {
      if (upstream.body) await upstream.body.cancel().catch(() => {});
      return new NextResponse('Drive ignored Range', {
        status: 502,
        headers: { 'Cache-Control': NO_STORE },
      });
    }

    if (!upstream.body) {
      return new NextResponse('Empty body', { status: 502, headers: { 'Cache-Control': NO_STORE } });
    }

    const coversFile = size > 0 && resolved.start === 0 && resolved.end >= size - 1;
    const headers = passthroughHeaders(upstream, mime);
    if (!headers.has('Content-Range')) {
      const total = size > 0 ? String(size) : '*';
      headers.set('Content-Range', `bytes ${resolved.start}-${resolved.end}/${total}`);
      if (!headers.has('Content-Length')) {
        headers.set('Content-Length', String(resolved.end - resolved.start + 1));
      }
    }

    const clientRange = req.headers.get('range');
    const status = coversFile && !clientRange && upstream.status === 200 ? 200 : 206;
    if (status === 200) {
      headers.delete('Content-Range');
    }

    return new Response(upstream.body, { status, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'stream error';
    return new NextResponse(msg, { status: 502, headers: { 'Cache-Control': NO_STORE } });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, id, 'GET');
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(req, id, 'HEAD');
}
