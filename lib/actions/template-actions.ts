'use server';

/**
 * Server Actions cho hệ thống MẪU (template) nội dung soạn thảo.
 * Chỉ Super Admin (requireAdminAction) mới được đọc/ghi. Ghi bằng service_role.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminAction } from '@/lib/auth/session';

export interface ContentTemplate {
  id: number;
  name: string;
  content: string;
  created_at?: string;
}

export interface TemplateResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function listTemplatesAction(): Promise<TemplateResult<ContentTemplate[]>> {
  try {
    await requireAdminAction();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('content_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { success: true, data: (data as ContentTemplate[]) ?? [] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Không tải được template' };
  }
}

export async function saveTemplateAction(
  name: string,
  content: string,
): Promise<TemplateResult<ContentTemplate>> {
  try {
    await requireAdminAction();
    const clean = String(name || '').trim();
    if (!clean) throw new Error('Chưa đặt tên template');
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('content_templates')
      .insert({ name: clean, content: String(content || '') })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { success: true, data: data as ContentTemplate };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Lưu template thất bại' };
  }
}

export async function deleteTemplateAction(id: number | string): Promise<TemplateResult> {
  try {
    await requireAdminAction();
    const supabase = createAdminClient();
    const { error } = await supabase.from('content_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Xoá template thất bại' };
  }
}
