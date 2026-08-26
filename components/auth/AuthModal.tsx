'use client';

import { useEffect, useRef, useState } from 'react';
import { detectInApp, openInExternalBrowser, type InAppInfo } from '@/lib/utils/inapp';

export interface AuthUser {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

type Mode = 'login' | 'register' | 'forgot';

interface Props {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onAuthed: (user: AuthUser) => void;
}

declare global {
  interface Window {
    google?: any;
    __gisLoaded?: boolean;
  }
}

export default function AuthModal({ open, initialMode = 'login', onClose, onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Forgot-password 2 bước
  const [fpStep, setFpStep] = useState<1 | 2>(1);
  const [fpCode, setFpCode] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');

  const googleDivRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [inApp, setInApp] = useState<InAppInfo>({ inApp: false, name: '', os: 'other' });
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    setInApp(detectInApp());
  }, []);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErr('');
      setMsg('');
      setFpStep(1);
    }
  }, [open, initialMode]);

  // Nạp Google Identity Services + render nút.
  // Bỏ qua khi đang trong trình duyệt in-app (Zalo/FB) vì Google chặn OAuth ở đó.
  useEffect(() => {
    if (!open || mode === 'forgot' || !clientId || inApp.inApp) return;
    let cancelled = false;

    const renderBtn = () => {
      if (cancelled || !window.google || !googleDivRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          await handleGoogle(resp.credential);
        },
      });
      googleDivRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleDivRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: mode === 'register' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'center',
      });
    };

    if (window.google) {
      renderBtn();
    } else if (!window.__gisLoaded) {
      window.__gisLoaded = true;
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = renderBtn;
      document.head.appendChild(s);
    } else {
      const t = setInterval(() => {
        if (window.google) {
          clearInterval(t);
          renderBtn();
        }
      }, 200);
      return () => clearInterval(t);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, clientId, inApp.inApp]);

  function openExternal() {
    const opened = openInExternalBrowser(inApp);
    if (!opened) setShowIosHint(true); // iOS không có Chrome → hướng dẫn tay
  }

  if (!open) return null;

  async function postJson(url: string, payload: unknown) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.success === false) throw new Error(d.error || 'Có lỗi xảy ra');
    return d;
  }

  async function handleGoogle(credential: string) {
    setErr('');
    setBusy(true);
    try {
      const d = await postJson('/api/account/google', { credential });
      onAuthed(d.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Đăng nhập Google thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin() {
    setErr('');
    if (!email || !password) return setErr('Nhập email và mật khẩu');
    setBusy(true);
    try {
      const d = await postJson('/api/account/login', { email, password });
      onAuthed(d.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister() {
    setErr('');
    if (!email || !password) return setErr('Nhập email và mật khẩu');
    if (password.length < 6) return setErr('Mật khẩu phải từ 6 ký tự');
    setBusy(true);
    try {
      const d = await postJson('/api/account/register', {
        email,
        password,
        full_name: fullName,
      });
      onAuthed(d.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Đăng ký thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function fpSendCode() {
    setErr('');
    setMsg('');
    if (!email) return setErr('Vui lòng nhập email');
    setBusy(true);
    try {
      const d = await postJson('/api/account/forgot-password', { email });
      setMsg(d.message || 'Đã gửi mã (nếu email tồn tại). Kiểm tra hộp thư & Spam.');
      setFpStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không gửi được mã');
    } finally {
      setBusy(false);
    }
  }

  async function fpReset() {
    setErr('');
    if (!fpCode) return setErr('Nhập mã xác minh');
    if (fpNewPw.length < 6) return setErr('Mật khẩu mới phải từ 6 ký tự');
    setBusy(true);
    try {
      const d = await postJson('/api/account/reset-password', {
        email,
        code: fpCode,
        new_password: fpNewPw,
      });
      setMsg('');
      setErr('');
      setMode('login');
      setPassword('');
      alert('✅ ' + (d.message || 'Đổi mật khẩu thành công!'));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không đổi được mật khẩu');
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký tài khoản' : 'Quên mật khẩu';

  return (
    <div className="authm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="authm-box" role="dialog" aria-modal="true">
        <button className="authm-close" onClick={onClose} aria-label="Đóng">
          &times;
        </button>
        <h2 className="authm-title">{title}</h2>

        {mode !== 'forgot' && (
          <div className="authm-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login');
                setErr('');
              }}
            >
              Đăng nhập
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => {
                setMode('register');
                setErr('');
              }}
            >
              Đăng ký
            </button>
          </div>
        )}

        {err && <div className="authm-err">{err}</div>}
        {msg && <div className="authm-msg">{msg}</div>}

        {/* ĐĂNG NHẬP */}
        {mode === 'login' && (
          <div className="authm-form">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" />
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" onKeyDown={(e) => e.key === 'Enter' && submitLogin()} />
            <div className="authm-row-right">
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('forgot'); setErr(''); setMsg(''); setFpStep(1); }}>
                🔑 Quên mật khẩu?
              </a>
            </div>
            <button className="authm-submit" disabled={busy} onClick={submitLogin}>
              {busy ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </div>
        )}

        {/* ĐĂNG KÝ */}
        {mode === 'register' && (
          <div className="authm-form">
            <label>Họ và tên</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" />
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" onKeyDown={(e) => e.key === 'Enter' && submitRegister()} />
            <button className="authm-submit" disabled={busy} onClick={submitRegister}>
              {busy ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </div>
        )}

        {/* QUÊN MẬT KHẨU */}
        {mode === 'forgot' && (
          <div className="authm-form">
            {fpStep === 1 ? (
              <>
                <p className="authm-note">Nhập email đã đăng ký để nhận <b>mã 6 số</b>.</p>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" />
                <button className="authm-submit" disabled={busy} onClick={fpSendCode}>
                  {busy ? 'Đang gửi...' : 'Gửi mã xác minh'}
                </button>
              </>
            ) : (
              <>
                <p className="authm-note">Nhập <b>mã 6 số</b> gửi tới <b>{email}</b> và mật khẩu mới.</p>
                <label>Mã xác minh</label>
                <input type="text" inputMode="numeric" maxLength={6} value={fpCode} onChange={(e) => setFpCode(e.target.value)} placeholder="______" />
                <label>Mật khẩu mới</label>
                <input type="password" value={fpNewPw} onChange={(e) => setFpNewPw(e.target.value)} placeholder="Ít nhất 6 ký tự" />
                <button className="authm-submit" disabled={busy} onClick={fpReset}>
                  {busy ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </button>
                <div className="authm-row-center">
                  <a href="#" onClick={(e) => { e.preventDefault(); fpSendCode(); }}>Gửi lại mã</a>
                </div>
              </>
            )}
            <div className="authm-row-center">
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setErr(''); setMsg(''); }}>← Quay lại đăng nhập</a>
            </div>
          </div>
        )}

        {/* GOOGLE */}
        {mode !== 'forgot' && (
          <>
            <div className="authm-divider"><span>hoặc</span></div>

            {inApp.inApp ? (
              /* Đang trong Zalo/Facebook → Google chặn OAuth. Mở trình duyệt ngoài. */
              <div className="authm-inapp">
                <p>
                  Bạn đang mở trong <b>{inApp.name}</b>. Để <b>đăng nhập bằng Google</b>, hãy mở
                  website bằng trình duyệt ngoài (Chrome/Safari).
                </p>
                <button type="button" className="authm-inapp-btn" onClick={openExternal}>
                  🌐 Mở bằng trình duyệt ngoài để đăng nhập Google
                </button>
                {(inApp.os === 'ios' || showIosHint) && (
                  <p className="authm-inapp-hint">
                    Trên iPhone: bấm nút <b>•••</b> (góc trên) của {inApp.name} → chọn
                    <b> “Mở trong Safari”</b>. Hoặc dùng <b>Email &amp; mật khẩu</b> ngay bên trên —
                    vẫn đăng nhập bình thường trong {inApp.name}.
                  </p>
                )}
              </div>
            ) : clientId ? (
              <div className="authm-google" ref={googleDivRef} />
            ) : (
              <div className="authm-note" style={{ textAlign: 'center' }}>
                (Chưa cấu hình <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> — đăng nhập Google tạm ẩn)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
