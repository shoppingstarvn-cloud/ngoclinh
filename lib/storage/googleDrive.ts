// ================== GOOGLE DRIVE (kho lưu trữ không giới hạn) ==================
// Đẩy file THẲNG từ trình duyệt lên Google Drive, KHÔNG qua máy chủ Vercel
// (Vercel chặn body ~4.5MB/request). Dùng OAuth refresh token của tài khoản Drive.
// Port sang Next.js/TypeScript từ skill "google-drive-5tb-storage".

function driveOAuth() {
  const unquote = (v: string) => {
    const s = (v || '').trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  };
  return {
    clientId: unquote(process.env.GOOGLE_DRIVE_CLIENT_ID || ''),
    clientSecret: unquote(process.env.GOOGLE_DRIVE_CLIENT_SECRET || ''),
    refreshToken: unquote(process.env.GOOGLE_DRIVE_REFRESH_TOKEN || ''),
  };
}

// Tên thư mục trên Drive chứa toàn bộ media của web ngoclinh
const DRIVE_FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'ngoclinh - Media Website';

function looksLikeOAuthValue(v: string): boolean {
  const s = v.trim().replace(/^['"]|['"]$/g, '');
  if (s.length < 20) return false;
  if (/sensitive|placeholder|changeme|your_/i.test(s)) return false;
  return true;
}

export function isConfigured(): boolean {
  const { clientId, clientSecret, refreshToken } = driveOAuth();
  if (!looksLikeOAuthValue(clientId) || !looksLikeOAuthValue(clientSecret) || !looksLikeOAuthValue(refreshToken)) {
    return false;
  }
  return clientId.includes('.apps.googleusercontent.com') || clientId.length > 40;
}

let _token: string | null = null;
let _exp = 0;

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _exp - 60_000) return _token;
  const { clientId, clientSecret, refreshToken } = driveOAuth();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive chưa cấu hình (thiếu CLIENT_ID/SECRET/REFRESH_TOKEN)');
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await r.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!r.ok || !data.access_token) {
    throw new Error(
      'Google Drive xác thực lỗi: ' + (data.error_description || data.error || 'HTTP ' + r.status),
    );
  }
  _token = data.access_token;
  _exp = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  return _token;
}

/** Gọi Drive API kèm Bearer; 401 thì làm mới token rồi thử lại 1 lần. */
async function driveApi(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);
  const r = await fetch(url, { ...init, headers });
  if (r.status === 401 && !retried) {
    _token = null;
    _exp = 0;
    return driveApi(url, init, true);
  }
  return r;
}

export function isDriveFileId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{10,128}$/.test(id);
}

export type DriveFileMeta = {
  size: number;
  mimeType: string;
  name: string;
};

const VIDEO_FILE_NAME = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i;

/** Chỉ video. Ảnh Drive hay bị `application/octet-stream` — không được nhầm thành stream. */
export function isStreamableVideoMime(mime: string, name?: string): boolean {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return false;
  if (m.startsWith('video/')) return true;
  if (m === 'application/mp4') return true;
  if (m === 'application/octet-stream' || !m) {
    return VIDEO_FILE_NAME.test(name || '');
  }
  return false;
}

const metaCache = new Map<string, { at: number; data: DriveFileMeta }>();
const META_TTL_MS = 10 * 60_000;

export async function getDriveFileMeta(fileId: string): Promise<DriveFileMeta> {
  const hit = metaCache.get(fileId);
  if (hit && Date.now() - hit.at < META_TTL_MS) return hit.data;
  const r = await driveApi(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=size,mimeType,name&supportsAllDrives=true`,
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Drive meta HTTP ${r.status} ${t.slice(0, 180)}`);
  }
  const d = (await r.json()) as { size?: string; mimeType?: string; name?: string };
  const data: DriveFileMeta = {
    size: Number(d.size) || 0,
    mimeType: d.mimeType || '',
    name: d.name || '',
  };
  metaCache.set(fileId, { at: Date.now(), data });
  return data;
}

/**
 * URL media gốc trên Google (trình duyệt Range thẳng CDN, không qua Vercel 4.5MB).
 * Token nằm ở Location ~1h — file video vốn đã public "anyone". Không log URL này.
 */
export async function getDriveMediaRedirectUrl(fileId: string): Promise<string> {
  const meta = await getDriveFileMeta(fileId);
  if (!isStreamableVideoMime(meta.mimeType, meta.name)) {
    throw new Error('Not a video');
  }
  const token = await getAccessToken();
  const q = new URLSearchParams({
    alt: 'media',
    supportsAllDrives: 'true',
    acknowledgeAbuse: 'true',
    access_token: token,
  });
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${q.toString()}`;
}

/** Liệt kê video gần đây (chỉ dùng local debug — không gọi từ production). */
export async function listRecentVideoFiles(limit = 8): Promise<Array<DriveFileMeta & { id: string }>> {
  const n = Math.min(Math.max(limit, 1), 20);
  const fields = 'files(id,name,mimeType,size)';
  const videoQ = `(mimeType contains 'video/' or mimeType = 'application/mp4')`;
  const urlFor = (q: string) =>
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=${n}&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const folderId = await getFolderId();
  const inFolder = `'${folderId}' in parents and trashed=false and ${videoQ}`;
  let r = await driveApi(urlFor(inFolder));
  let d = (await r.json().catch(() => ({}))) as {
    files?: Array<{ id?: string; name?: string; mimeType?: string; size?: string }>;
  };
  if (!d.files?.length) {
    r = await driveApi(urlFor(`trashed=false and ${videoQ}`));
    d = (await r.json().catch(() => ({}))) as {
      files?: Array<{ id?: string; name?: string; mimeType?: string; size?: string }>;
    };
  }
  return (d.files || [])
    .filter((f) => f.id && isStreamableVideoMime(f.mimeType || '', f.name))
    .map((f) => ({
      id: f.id as string,
      name: f.name || '',
      mimeType: f.mimeType || '',
      size: Number(f.size) || 0,
    }));
}

/** Tải byte gốc (không transcode). Drive tôn trọng header Range → phát HTML5 mượt. */
export async function fetchDriveMedia(
  fileId: string,
  range: string,
  signal?: AbortSignal,
): Promise<Response> {
  return driveApi(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true`,
    {
      headers: { Range: range },
      signal,
      redirect: 'follow',
    },
  );
}

// Cache id thư mục trong bộ nhớ tiến trình. Nếu chưa có, tìm theo tên rồi tạo mới.
let _folderId: string | null = null;

async function getFolderId(): Promise<string> {
  if (_folderId) return _folderId;
  const token = await getAccessToken();

  // Tìm thư mục sẵn có theo tên (tránh tạo trùng qua nhiều lần cold-start)
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME.replace(/'/g, "\\'")}' and trashed=false`,
  );
  const findRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: 'Bearer ' + token } },
  );
  const found = (await findRes.json().catch(() => ({}))) as { files?: Array<{ id: string }> };
  if (found.files && found.files.length > 0) {
    _folderId = found.files[0].id;
    return _folderId;
  }

  // Chưa có → tạo mới
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const d = (await createRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!createRes.ok || !d.id) {
    throw new Error('Tạo thư mục Drive lỗi: ' + (d.error?.message || 'HTTP ' + createRes.status));
  }
  _folderId = d.id;
  return _folderId;
}

// QUAN TRỌNG: truyền `origin` = tên miền web, nếu không trình duyệt PUT sẽ lỗi CORS "Failed to fetch".
export async function createResumableSession(
  name: string,
  mimeType: string,
  origin: string,
): Promise<string> {
  const token = await getAccessToken();
  const parentId = await getFolderId();
  const metadata: { name: string; parents?: string[] } = { name };
  if (parentId) metadata.parents = [parentId];

  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': mimeType || 'application/octet-stream',
  };
  if (origin) headers['Origin'] = origin; // <-- chìa khóa chống lỗi CORS

  const r = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    { method: 'POST', headers, body: JSON.stringify(metadata) },
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Tạo phiên upload Drive lỗi: ' + (t || 'HTTP ' + r.status));
  }
  const uploadUrl = r.headers.get('location');
  if (!uploadUrl) throw new Error('Google không trả về địa chỉ phiên upload (Location)');
  return uploadUrl;
}

// Link hiển thị/tải, GIỮ NGUYÊN chất lượng gốc.
// - Ảnh: lh3 với "=s0" → nhúng <img> inline ổn định Ở ĐỘ PHÂN GIẢI GỐC (không thu nhỏ, không nén).
// - File khác (PDF/Office/zip/video...): link tải trực tiếp, đúng file gốc.
export function buildFileUrl(fileId: string, mimeType?: string): string {
  if (mimeType && mimeType.startsWith('image/')) {
    return `https://lh3.googleusercontent.com/d/${fileId}=s0`;
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
}

// Sau khi trình duyệt tải xong: đổi tên chuẩn + đặt công khai. Trả link dùng được.
export async function finalizeFile(
  fileId: string,
  newName?: string,
  mimeType?: string,
): Promise<{ fileId: string; url: string }> {
  const token = await getAccessToken();
  if (newName) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch(() => {});
  }
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    },
  ).catch(() => {});
  return { fileId, url: buildFileUrl(fileId, mimeType) };
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!fileId) return;
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  }).catch(() => {});
}
