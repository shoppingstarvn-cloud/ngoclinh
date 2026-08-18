'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import ImageUploadField from './ImageUploadField';
import RichTextEditor from './RichTextEditor';
import { AdminField, AdminRow, AdminTableDef, isImageField } from '@/lib/cms/admin-schema';
import { slugify } from '@/lib/slug';
import { createRecordAction, updateRecordAction } from '@/lib/actions/admin-actions';

interface MenuOption {
  id: number;
  label: string;
  depth: number;
}

function buildMenuOptions(menus: AdminRow[], excludeId: number | null): MenuOption[] {
  const byParent = new Map<number, AdminRow[]>();
  menus.forEach((m) => {
    const p = (m.parent_id as number | null) || 0;
    const arr = byParent.get(p) || [];
    arr.push(m);
    byParent.set(p, arr);
  });
  byParent.forEach((arr) => arr.sort((a, b) => ((a.display_order as number) || 0) - ((b.display_order as number) || 0)));

  const out: MenuOption[] = [];
  function walk(parent: number, depth: number) {
    if (depth > 2) return;
    (byParent.get(parent) || []).forEach((m) => {
      const id = m.id as number;
      if (id === excludeId) return;
      out.push({ id, label: String(m.label ?? ''), depth });
      walk(id, depth + 1);
    });
  }
  walk(0, 1);
  return out;
}

function defaultValueFor(field: AdminField): unknown {
  if (field.type === 'checkbox') return false;
  if (field.type === 'number') return 0;
  if (field.type === 'select') return field.options?.[0] ?? '';
  return '';
}

interface RecordFormModalProps {
  open: boolean;
  table: AdminTableDef;
  item: AdminRow | null;
  menus: AdminRow[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RecordFormModal({ open, table, item, menus, onClose, onSaved }: RecordFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, unknown> = {};
    table.fields.forEach((f) => {
      if (item) {
        initial[f.key] = item[f.key] ?? defaultValueFor(f);
      } else {
        // Thêm mới: mặc định TÍCH SẴN "Kích hoạt" (is_active) → ảnh/bản ghi tự hiển thị.
        initial[f.key] = f.key === 'is_active' ? true : defaultValueFor(f);
      }
    });
    setFormData(initial);
    setAutoSlug(!item);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, table.name]);

  const hasSlugField = table.fields.some((f) => f.key === 'slug');
  const nameField = table.fields.find((f) => f.key === 'name' || f.key === 'title');

  const menuOptions = useMemo(
    () => (table.name === 'menus' ? buildMenuOptions(menus, item ? (item.id as number) : null) : []),
    [table.name, menus, item],
  );

  function setField(key: string, value: unknown) {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (hasSlugField && nameField && key === nameField.key && autoSlug) {
        next.slug = slugify(String(value ?? ''));
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = {};
    for (const f of table.fields) {
      let v = formData[f.key];
      if (f.type === 'number') v = Number(v) || 0;
      if (f.type === 'checkbox') v = Boolean(v);
      if (f.type === 'parentselect') v = v === '' || v == null ? null : Number(v);
      payload[f.key] = v;
    }
    if (table.name === 'posts' && !item) {
      if (!payload.tags || !String(payload.tags).trim()) payload.tags = 'tin-tuc';
      if (!payload.status || !String(payload.status).trim()) payload.status = 'published';
      if (payload.is_active === undefined) payload.is_active = true;
    }

    try {
      const result = item
        ? await updateRecordAction(table.name, item.id as string | number, payload)
        : await createRecordAction(table.name, payload);
      if (!result.success) throw new Error(result.error || 'Lưu thất bại');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`${item ? 'Sửa' : 'Thêm'} ${table.label}`}
      onClose={onClose}
      onSave={saving ? undefined : handleSave}
      saveLabel={saving ? 'Đang lưu...' : 'Lưu'}
    >
      {error && (
        <div className="alert alert-danger" role="alert">
          Server từ chối ghi: <b>{error}</b>
          <br />
          Kiểm tra <b>SUPABASE_SERVICE_KEY</b> trên Vercel (Production) phải là service_role key hợp lệ, rồi Redeploy.
        </div>
      )}
      {table.fields.map((f) => {
        const value = formData[f.key];
        const isImg = isImageField(f);
        return (
          <div className="mb-3" key={f.key}>
            <label className="form-label fw-bold text-white">
              {f.label}
              {f.required && <span className="text-danger"> *</span>}
            </label>
            {isImg ? (
              <ImageUploadField value={String(value ?? '')} onChange={(url) => setField(f.key, url)} />
            ) : f.type === 'richtext' ? (
              <RichTextEditor initialValue={String(value ?? '')} onChange={(html) => setField(f.key, html)} />
            ) : f.type === 'textarea' ? (
              <textarea
                className="form-control"
                rows={f.key === 'content' ? 6 : 3}
                required={f.required}
                value={String(value ?? '')}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : f.type === 'checkbox' ? (
              <input
                type="checkbox"
                className="form-check-input"
                style={{ width: 20, height: 20 }}
                checked={Boolean(value)}
                onChange={(e) => setField(f.key, e.target.checked)}
              />
            ) : f.type === 'select' ? (
              <select className="form-select" value={String(value ?? '')} onChange={(e) => setField(f.key, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === 'parentselect' ? (
              <select
                className="form-select"
                value={value == null ? '' : String(value)}
                onChange={(e) => setField(f.key, e.target.value)}
              >
                <option value="">— Menu gốc (cấp 1) —</option>
                {menuOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.depth > 1 ? '\u00A0\u00A0\u00A0\u00A0└ '.repeat(1) : ''}
                    {m.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <input
                type="number"
                className="form-control"
                value={Number(value ?? 0)}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : (
              <input
                className="form-control"
                required={f.required}
                placeholder={`Nhập ${f.label.toLowerCase()}`}
                value={String(value ?? '')}
                onChange={(e) => {
                  setField(f.key, e.target.value);
                  if (f.key === 'slug') setAutoSlug(false);
                }}
              />
            )}
          </div>
        );
      })}
    </Modal>
  );
}
