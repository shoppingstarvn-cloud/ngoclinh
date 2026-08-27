'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from './AuthModal';
import AuthPortal from './AuthPortal';
import {
  EMPTY_PROFILE_FORM,
  firstProfileError,
  normalizedProfile,
  validateProfileForm,
  type ProfileField,
  type ProfileForm,
} from '@/lib/auth/profile-form';

interface Props {
  open: boolean;
  requestType: 'website' | 'admin';
  loggedIn?: boolean;
  onClose: () => void;
  onAuthed: (user: AuthUser) => void;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={`authm-field${error ? ' is-invalid' : ''}`}>
      <label>{label}</label>
      {children}
      {error ? <p className="authm-field-err" role="alert">{error}</p> : null}
    </div>
  );
}

export default function RequestOpenModal({ open, requestType, loggedIn = false, onClose, onAuthed }: Props) {
  const [f, setF] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reveal, setReveal] = useState(false);

  function set(k: ProfileField, v: string) {
    setReveal(true);
    setF((p) => ({ ...p, [k]: v }));
  }

  function markReveal() {
    setReveal(true);
  }

  useEffect(() => {
    if (open) return;
    setF(EMPTY_PROFILE_FORM);
    setShowPw(false);
    setBusy(false);
    setErr('');
    setReveal(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setReveal(true);
    setErr('');
    if (!loggedIn) {
      setF(EMPTY_PROFILE_FORM);
      return;
    }
    fetch('/api/account/me')
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (!u) return;
        setF((p) => ({
          ...p,
          full_name: u.full_name || p.full_name,
          email: u.email || p.email,
          dob: u.dob ? String(u.dob).slice(0, 10) : p.dob,
          zalo_phone: u.zalo_phone || p.zalo_phone,
          user_kind: u.user_kind === 'student' ? 'student' : (u.user_kind === 'teacher' ? 'teacher' : p.user_kind),
          unit_name: u.unit_name || p.unit_name,
          ward: u.ward || p.ward,
          class_in_charge: u.class_in_charge || p.class_in_charge,
        }));
      })
      .catch(() => {});
  }, [open, loggedIn]);

  const errors = useMemo(
    () => validateProfileForm(f, { requireAccount: !loggedIn }),
    [f, loggedIn],
  );
  const shown = reveal ? errors : {};
  const canSubmit = Object.keys(errors).length === 0;

  async function submit() {
    setReveal(true);
    setErr('');
    if (!canSubmit) {
      setErr(firstProfileError(errors) || 'Anh điền đủ và đúng mọi trường rồi mới gửi.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...normalizedProfile(f), request_type: requestType };
      const r = await fetch('/api/account/request-open', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || 'Gửi thất bại');
      onAuthed(d.user);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Có lỗi'); }
    finally { setBusy(false); }
  }

  if (!open) return null;
  const title = requestType === 'admin' ? 'Đăng ký thông tin' : 'Đề nghị mở Website';
  const radioName = `uk-${requestType}`;

  return (
    <AuthPortal>
      <div className="authm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="authm-modal authm-request">
          <button className="authm-close" onClick={onClose} aria-label="Đóng">×</button>
          <h2 className="authm-title">📝 {title}</h2>
          {err && <div className="authm-err">{err}</div>}
          <div className="authm-form">
            {!loggedIn && (
              <div className="authm-grid-2">
                <Field label="Tên đăng nhập *" error={shown.username}>
                  <input
                    className={shown.username ? 'is-invalid' : undefined}
                    value={f.username}
                    onChange={(e) => set('username', e.target.value)}
                    onBlur={markReveal}
                    placeholder="vd superadminAL"
                    autoComplete="username"
                  />
                </Field>
                <Field label="Mật khẩu *" error={shown.password}>
                  <div className="authm-pw">
                    <input
                      className={shown.password ? 'is-invalid' : undefined}
                      type={showPw ? 'text' : 'password'}
                      value={f.password}
                      onChange={(e) => set('password', e.target.value)}
                      onBlur={markReveal}
                      placeholder="Ít nhất 6 ký tự"
                      autoComplete="new-password"
                    />
                    <button type="button" className="authm-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </Field>
              </div>
            )}
            <div className="authm-grid-2">
              <Field label="Họ và tên *" error={shown.full_name}>
                <input
                  className={shown.full_name ? 'is-invalid' : undefined}
                  value={f.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  onBlur={markReveal}
                  placeholder="Nguyễn Văn A"
                />
              </Field>
              <Field label="Ngày sinh *" error={shown.dob}>
                <input
                  className={shown.dob ? 'is-invalid' : undefined}
                  type="date"
                  value={f.dob}
                  onChange={(e) => set('dob', e.target.value)}
                  onBlur={markReveal}
                />
              </Field>
            </div>
            <div className="authm-grid-2">
              <Field label="Số điện thoại Zalo *" error={shown.zalo_phone}>
                <input
                  className={shown.zalo_phone ? 'is-invalid' : undefined}
                  value={f.zalo_phone}
                  onChange={(e) => set('zalo_phone', e.target.value)}
                  onBlur={markReveal}
                  placeholder="09xxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Email *" error={shown.email}>
                <input
                  className={shown.email ? 'is-invalid' : undefined}
                  type="email"
                  value={f.email}
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={markReveal}
                  placeholder="email@gmail.com"
                  autoComplete="email"
                />
              </Field>
            </div>
            <Field label="Bạn là *" error={shown.user_kind}>
              <div className="authm-kind">
                <label>
                  <input type="radio" name={radioName} checked={f.user_kind === 'teacher'} onChange={() => set('user_kind', 'teacher')} /> 👩‍🏫 Giáo viên
                </label>
                <label>
                  <input type="radio" name={radioName} checked={f.user_kind === 'student'} onChange={() => set('user_kind', 'student')} /> 🎓 Học sinh
                </label>
              </div>
            </Field>
            <div className="authm-grid-2">
              <Field label="Đơn vị công tác / học tập *" error={shown.unit_name}>
                <input
                  className={shown.unit_name ? 'is-invalid' : undefined}
                  value={f.unit_name}
                  onChange={(e) => set('unit_name', e.target.value)}
                  onBlur={markReveal}
                  placeholder="VD: Trường THCS Lê Lợi"
                />
              </Field>
              <Field label="Phường / Xã *" error={shown.ward}>
                <input
                  className={shown.ward ? 'is-invalid' : undefined}
                  value={f.ward}
                  onChange={(e) => set('ward', e.target.value)}
                  onBlur={markReveal}
                  placeholder="VD: Phường Hồng Bàng"
                />
              </Field>
            </div>
            <Field label="Phụ trách lớp *" error={shown.class_in_charge}>
              <input
                className={shown.class_in_charge ? 'is-invalid' : undefined}
                value={f.class_in_charge}
                onChange={(e) => set('class_in_charge', e.target.value)}
                onBlur={markReveal}
                placeholder="VD: 1A5"
              />
            </Field>
            {!canSubmit ? (
              <p className="authm-field-hint">Nút gửi chỉ bật khi anh đã nhập hết mọi trường và đúng quy cách.</p>
            ) : null}
            <div
              className="authm-submit-wrap"
              onClick={() => { if (!canSubmit) setReveal(true); }}
            >
              <button
                type="button"
                className="authm-submit"
                disabled={busy || !canSubmit}
                onClick={submit}
              >
                {busy ? 'Đang gửi...' : `Gửi ${title}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthPortal>
  );
}
