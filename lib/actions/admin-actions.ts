'use server';

/**
 * Server Actions cho toàn bộ Super Admin — thay thế lời gọi fetch() tới
 * /api/admin/* từ phía Client Component. Đây là lớp ghi dữ liệu DUY NHẤT
 * mà giao diện Admin sử dụng.
 *
 * Cơ chế "Instant Sync": mọi action ghi (create/update/delete/upload) sau
 * khi ghi Supabase thành công đều gọi revalidatePath('/', 'layout') —
 * xoá Next.js Cache của TOÀN BỘ site (mọi route dưới root layout: trang
 * chủ, trang chi tiết, trang legacy...). Lần request kế tiếp (kể cả F5
 * ngay sau khi bấm Lưu) sẽ luôn lấy dữ liệu mới nhất từ Supabase — không
 * cần rebuild hay redeploy.
 */

import path from 'path';
import { revalidatePath } from 'next/cache';
import { createAdminClient, BUCKET_NAME } from '@/lib/supabase/admin';
import { stripSystemFields } from '@/lib/cms/crud';
import { getTableConfig, isValidTable } from '@/lib/cms/tables';
import { requireAdminAction } from '@/lib/auth/session';
import { SITE_SETTINGS_FIXED_KEYS } from '@/lib/cms/admin-schema';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function syncSite() {
  // 'layout' áp dụng cho mọi segment con của root layout (toàn bộ trang public).
  revalidatePath('/', 'layout');
  // Admin dashboard tự fetch lại qua loadAllData() sau mỗi thao tác nên
  // không bắt buộc, nhưng revalidate luôn cho nhất quán nếu sau này có
  // trang admin server-rendered.
  revalidatePath('/admin', 'layout');
}

export async function createRecordAction(
  table: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdminAction();
    if (!isValidTable(table)) throw new Error('Bảng không hợp lệ');

    const body = stripSystemFields(payload, 'create');
    const supabase = createAdminClient();
    const { data, error } = await supabase.from(table).insert(body).select();
    if (error) throw new Error(error.message);

    syncSite();
    return { success: true, data: data?.[0] ?? data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Tạo thất bại' };
  }
}

export async function updateRecordAction(
  table: string,
  id: string | number,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await requireAdminAction();
    if (!isValidTable(table)) throw new Error('Bảng không hợp lệ');

    const body = stripSystemFields(payload, 'update');
    const supabase = createAdminClient();
    const pk = getTableConfig(table)!.pk;
    const { data, error } = await supabase.from(table).update(body).eq(pk, id).select();
    if (error) throw new Error(error.message);

    syncSite();
    return { success: true, data: data?.[0] ?? data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Cập nhật thất bại' };
  }
}

export async function deleteRecordAction(
  table: string,
  id: string | number,
): Promise<ActionResult> {
  try {
    await requireAdminAction();
    if (!isValidTable(table)) throw new Error('Bảng không hợp lệ');

    const supabase = createAdminClient();
    const pk = getTableConfig(table)!.pk;
    const { error } = await supabase.from(table).delete().eq(pk, id);
    if (error) throw new Error(error.message);

    syncSite();
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Xóa thất bại' };
  }
}

/** Lưu toàn bộ site_settings (global_settings) trong 1 lượt — insert nếu key chưa tồn tại, update nếu đã có. */
export async function saveSiteSettingsAction(
  values: Partial<Record<(typeof SITE_SETTINGS_FIXED_KEYS)[number], string>>,
): Promise<ActionResult> {
  try {
    await requireAdminAction();
    const supabase = createAdminClient();

    const { data: existingRows, error: fetchError } = await supabase
      .from('site_settings')
      .select('id,key');
    if (fetchError) throw new Error(fetchError.message);

    const existingByKey = new Map((existingRows || []).map((r) => [r.key as string, r.id]));

    for (const key of SITE_SETTINGS_FIXED_KEYS) {
      if (!(key in values)) continue;
      const value = values[key] ?? '';
      const existingId = existingByKey.get(key);

      if (existingId != null) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('id', existingId);
        if (error) throw new Error(error.message);
      } else if (value) {
        const { error } = await supabase.from('site_settings').insert({
          key,
          value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
    }

    syncSite();
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lưu cài đặt thất bại' };
  }
}

export interface UploadResult extends ActionResult {
  url?: string;
}

/** Upload ảnh/video lên Supabase Storage — thay thế /api/upload. */
export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdminAction();
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('Không có file!');

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    const supabase = createAdminClient();
    const { data: sbData, error: sbError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (sbError || !sbData) throw new Error(sbError?.message || 'Upload lên Storage thất bại');

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return { success: true, url: urlData.publicUrl };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Upload thất bại' };
  }
}
