'use client';

import { useEffect, useState } from 'react';
import { AdminRow, SITE_SETTINGS_FIXED_KEYS } from '@/lib/cms/admin-schema';
import ImageUploadField from './ImageUploadField';
import { saveSiteSettingsAction } from '@/lib/actions/admin-actions';

const LABELS: Record<(typeof SITE_SETTINGS_FIXED_KEYS)[number], string> = {
  site_name: 'Tên website',
  logo_url: 'Logo website',
  favicon_url: 'Favicon (icon tab trình duyệt)',
  hotline: 'Hotline',
  address: 'Địa chỉ',
  email: 'Email',
  facebook_url: 'Facebook URL',
  website_url: 'Website URL',
  footer_copyright: 'Copyright footer',
  meta_description: 'Meta description (SEO)',
  meta_keywords: 'Meta keywords (SEO)',
  intro_text: 'Đoạn giới thiệu trang chủ',
};

interface SiteSettingsPanelProps {
  rows: AdminRow[];
  onSaved: () => void;
}

export default function SiteSettingsPanel({ rows, onSaved }: SiteSettingsPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next: Record<string, string> = {};
    SITE_SETTINGS_FIXED_KEYS.forEach((key) => {
      const row = rows.find((r) => r.key === key);
      next[key] = row ? String(row.value ?? '') : '';
    });
    setValues(next);
  }, [rows]);

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function saveAll() {
    setSaving(true);
    setError('');
    try {
      const result = await saveSiteSettingsAction(values);
      if (!result.success) throw new Error(result.error || 'Lưu cài đặt thất bại');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu cài đặt thất bại');
    } finally {
      setSaving(false);
    }
  }

  const textFields: (typeof SITE_SETTINGS_FIXED_KEYS)[number][] = [
    'site_name',
    'hotline',
    'address',
    'email',
    'facebook_url',
    'website_url',
  ];

  return (
    <div className="card">
      <div className="card-header">
        <i className="fas fa-cog text-primary" /> Cài đặt Website
      </div>
      <div className="card-body">
        <p className="text-muted mb-3">
          Sửa tận gốc toàn bộ thông tin chung của website. Bấm <b>&quot;Lưu tất cả&quot;</b> để áp dụng ngay lập tức.
        </p>
        <div className="row">
          {textFields.map((key) => (
            <div className="col-md-6 mb-3" key={key}>
              <label className="form-label fw-bold">{LABELS[key]}</label>
              <input className="form-control" value={values[key] || ''} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}

          <div className="col-md-6 mb-3">
            <label className="form-label fw-bold">{LABELS.logo_url}</label>
            <ImageUploadField value={values.logo_url || ''} onChange={(url) => set('logo_url', url)} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label fw-bold">{LABELS.favicon_url}</label>
            <ImageUploadField value={values.favicon_url || ''} onChange={(url) => set('favicon_url', url)} />
          </div>

          <div className="col-md-12 mb-3">
            <label className="form-label fw-bold">{LABELS.footer_copyright}</label>
            <input className="form-control" value={values.footer_copyright || ''} onChange={(e) => set('footer_copyright', e.target.value)} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label fw-bold">{LABELS.meta_description}</label>
            <textarea className="form-control" value={values.meta_description || ''} onChange={(e) => set('meta_description', e.target.value)} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label fw-bold">{LABELS.meta_keywords}</label>
            <textarea className="form-control" value={values.meta_keywords || ''} onChange={(e) => set('meta_keywords', e.target.value)} />
          </div>
          <div className="col-md-12 mb-3">
            <label className="form-label fw-bold">{LABELS.intro_text}</label>
            <textarea className="form-control" rows={5} value={values.intro_text || ''} onChange={(e) => set('intro_text', e.target.value)} />
          </div>
        </div>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
          <i className="fas fa-save" /> {saving ? 'Đang lưu...' : 'Lưu tất cả'}
        </button>
      </div>
    </div>
  );
}
