// ================== GOOGLE DRIVE (kho lưu trữ không giới hạn) ==================
// Đẩy file THẲNG từ trình duyệt lên Google Drive, KHÔNG qua máy chủ Vercel
// (Vercel chặn body ~4.5MB/request). Dùng OAuth refresh token của tài khoản Drive.
// Port sang Next.js/TypeScript từ skill "google-drive-5tb-storage".

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

// Tên thư mục trên Drive chứa toàn bộ media của web ngoclinh
const DRIVE_FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'ngoclinh - Media Website';

export function isConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

let _token: string | null = null;
let _exp = 0;

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _exp - 60_000) return _token;
  if (!isConfigured()) {
    throw new Error('Google Drive chưa cấu hình (thiếu CLIENT_ID/SECRET/REFRESH_TOKEN)');
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
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
