'use client';

import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!password) {
      setError('Nhập mật khẩu!');
      return;
    }
    setLoading(true);
    setError('');
    const ok = await onLogin(password);
    setLoading(false);
    if (!ok) setError('Sai mật khẩu!');
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="mb-3">
          <i className="fas fa-crown" style={{ fontSize: 60, color: '#ffd700' }} />
        </div>
        <h3>SUPER ADMIN</h3>
        <p>Hệ thống quản trị CMS • API CRUD</p>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={{ paddingRight: 45 }}
          />
          <i
            className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
            }}
            onClick={() => setShowPassword((v) => !v)}
          />
        </div>
        {error && (
          <p style={{ color: '#ff6b6b', marginBottom: 12, fontSize: 13 }}>{error}</p>
        )}
        <button className="btn btn-primary w-100 py-3 fw-bold" onClick={submit} disabled={loading}>
          <i className="fas fa-rocket" /> {loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
        </button>
      </div>
    </div>
  );
}
