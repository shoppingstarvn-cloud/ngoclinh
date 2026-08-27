'use client';

import { useState } from 'react';
import type { AuthUser } from './AuthModal';
import AuthPortal from './AuthPortal';

interface Props {
  open: boolean;
  requestType: 'website' | 'admin';
  loggedIn?: boolean;
  onClose: () => void;
  onAuthed: (user: AuthUser) => void;
}

export default function RequestOpenModal({ open, requestType, loggedIn = false, onClose, onAuthed }: Props) {
  const [f, setF] = useState({
    username: '', password: '', full_name: '', dob: '', zalo_phone: '',
    email: '', user_kind: 'teacher', unit_name: '', ward: '', class_in_charge: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function set(k: string, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/account/request-open', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, request_type: requestType }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || 'Gửi thất bại');
      onAuthed(d.user);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Có lỗi'); }
    finally { setBusy(false); }
  }

  if (!open) return null;
  const title = requestType === 'admin' ? 'Đăng ký thông tin' : 'Đề nghị mở Website';

  return (
    <AuthPortal>
      <div className="authm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="authm-box authm-request" role="dialog" aria-modal="true">
          <button className="authm-close" onClick={onClose} aria-label="Đóng">×</button>
          <h2 className="authm-title">📝 {title}</h2>
          {err && <div className="authm-err">{err}</div>}
          <div className="authm-form">
            {!loggedIn && (
              <div className="authm-grid-2">
                <div>
                  <label>Tên đăng nhập *</label>
                  <input value={f.username} onChange={(e) => set('username', e.target.value)} placeholder="vd superadminAL" />
                </div>
                <div>
                  <label>Mật khẩu *</label>
                  <div className="authm-pw">
                    <input type={showPw ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Ít nhất 6 ký tự" />
                    <button type="button" className="authm-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="authm-grid-2">
              <div>
                <label>Họ và tên *</label>
                <input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label>Ngày sinh *</label>
                <input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} />
              </div>
            </div>
            <div className="authm-grid-2">
              <div>
                <label>Số điện thoại Zalo *</label>
                <input value={f.zalo_phone} onChange={(e) => set('zalo_phone', e.target.value)} placeholder="09xxxxxxxx" />
              </div>
              <div>
                <label>Email *</label>
                <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="email@gmail.com" />
              </div>
            </div>
            <label>Bạn là *</label>
            <div className="authm-kind">
              <label>
                <input type="radio" name="uk" checked={f.user_kind === 'teacher'} onChange={() => set('user_kind', 'teacher')} /> 👩‍🏫 Giáo viên
              </label>
              <label>
                <input type="radio" name="uk" checked={f.user_kind === 'student'} onChange={() => set('user_kind', 'student')} /> 🎓 Học sinh
              </label>
            </div>
            <div className="authm-grid-2">
              <div>
                <label>Đơn vị công tác / học tập *</label>
                <input value={f.unit_name} onChange={(e) => set('unit_name', e.target.value)} placeholder="VD: Trường THCS Lê Lợi" />
              </div>
              <div>
                <label>Phường / Xã *</label>
                <input value={f.ward} onChange={(e) => set('ward', e.target.value)} placeholder="VD: Phường Hồng Bàng" />
              </div>
            </div>
            <label>Phụ trách lớp *</label>
            <input value={f.class_in_charge} onChange={(e) => set('class_in_charge', e.target.value)} placeholder="VD: 1A5" />
            <button className="authm-submit" disabled={busy} onClick={submit}>{busy ? 'Đang gửi...' : `Gửi ${title}`}</button>
          </div>
        </div>
      </div>
    </AuthPortal>
  );
}
