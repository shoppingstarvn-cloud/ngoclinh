'use client';

import { useEffect, useState } from 'react';
import AuthModal, { type AuthUser } from './AuthModal';
import RequestOpenModal from './RequestOpenModal';

export default function AuthArea({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqType, setReqType] = useState<'website' | 'admin'>('website');

  function openReq(t: 'website' | 'admin') { setReqType(t); setReqOpen(true); }

  useEffect(() => {
    fetch('/api/account/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await fetch('/api/account/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setMenuOpen(false);
  }

  function openModal(m: 'login' | 'register') {
    setMode(m);
    setOpen(true);
  }

  if (!ready) return <span className="autharea" />;

  return (
    <span className={`autharea${compact ? ' autharea-compact' : ''}`}>
      {user ? (
        <span className="autharea-user">
          <button className="autharea-userbtn" onClick={() => setMenuOpen((v) => !v)}>
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="autharea-avatar" />
            ) : (
              <span className="autharea-avatar autharea-avatar-fallback">
                {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="autharea-name">{user.full_name || user.email}</span>
            <i className="fa fa-angle-down" />
          </button>
          {menuOpen && (
            <div className="autharea-menu">
              <div className="autharea-menu-email">{user.email}</div>
              <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                <i className="fa fa-sign-out" /> Đăng xuất
              </a>
            </div>
          )}
        </span>
      ) : (
        <span className="autharea-guest">
          <button className="autharea-login" onClick={() => openModal('login')}>
            Đăng nhập
          </button>
          <button className="autharea-register" onClick={() => openReq('website')}>
            Đề nghị mở Website
          </button>
          <button className="autharea-register" onClick={() => openReq('admin')}>
            Quản Trị
          </button>
        </span>
      )}

      <AuthModal
        open={open}
        initialMode={mode}
        onClose={() => setOpen(false)}
        onAuthed={(u) => {
          setUser(u);
          setOpen(false);
        }}
      />

      <RequestOpenModal
        open={reqOpen}
        requestType={reqType}
        onClose={() => setReqOpen(false)}
        onAuthed={(u) => {
          setUser(u);
          setReqOpen(false);
        }}
      />
    </span>
  );
}
