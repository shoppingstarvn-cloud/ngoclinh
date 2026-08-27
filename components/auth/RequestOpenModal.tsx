'use client';

import { useEffect, useState, type CSSProperties } from 'react';
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

  useEffect(() => {
    if (!open || !loggedIn) return;
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

  async function submit() {
    setErr('');
    if (!f.full_name.trim()) { setErr('Nhập họ và tên'); return; }
    if (!f.dob) { setErr('Chọn ngày tháng năm sinh'); return; }
    if (!f.zalo_phone.trim()) { setErr('Nhập số điện thoại Zalo'); return; }
    if (!f.email.trim()) { setErr('Nhập email'); return; }
    if (!f.unit_name.trim()) { setErr('Nhập đơn vị công tác / học tập'); return; }
    if (!f.ward.trim()) { setErr('Nhập phường / xã'); return; }
    if (!f.class_in_charge.trim()) { setErr('Nhập lớp phụ trách'); return; }
    setBusy(true);
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
  const half: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <AuthPortal>
      <div className="authm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="authm-modal" style={{ maxWidth: 560 }}>
          <button className="authm-close" onClick={onClose} aria-label="Đóng">×</button>
          <h2 className="authm-title">📝 {title}</h2>
          {err && <div className="authm-err">{err}</div>}
          <div className="authm-form">
            {!loggedIn && (
              <div style={half}>
                <div><label>Tên đăng nhập *</label><input value={f.username} onChange={(e) => set('username', e.target.value)} placeholder="vd superadminAL" /></div>
                <div><label>Mật khẩu *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Ít nhất 6 ký tự" style={{ paddingRight: 42 }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="Hiện/ẩn mật khẩu"
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={half}>
              <div><label>Họ và tên *</label><input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nguyễn Văn A" /></div>
              <div><label>Ngày sinh *</label><input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></div>
            </div>
            <div style={half}>
              <div><label>Số điện thoại Zalo *</label><input value={f.zalo_phone} onChange={(e) => set('zalo_phone', e.target.value)} placeholder="09xxxxxxxx" /></div>
              <div><label>Email *</label><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="email@gmail.com" /></div>
            </div>
            <label>Bạn là *</label>
            <div style={{ display: 'flex', gap: 18, margin: '2px 0 6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                <input type="radio" name="uk" checked={f.user_kind === 'teacher'} onChange={() => set('user_kind', 'teacher')} /> 👩‍🏫 Giáo viên
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                <input type="radio" name="uk" checked={f.user_kind === 'student'} onChange={() => set('user_kind', 'student')} /> 🎓 Học sinh
              </label>
            </div>
            <div style={half}>
              <div><label>Đơn vị công tác / học tập *</label><input value={f.unit_name} onChange={(e) => set('unit_name', e.target.value)} placeholder="VD: Trường THCS Lê Lợi" /></div>
              <div><label>Phường / Xã *</label><input value={f.ward} onChange={(e) => set('ward', e.target.value)} placeholder="VD: Phường Hồng Bàng" /></div>
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
