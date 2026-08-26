'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Cổng mật khẩu TOÀN CỤC — CHỈ chặn link menu con của khối "Hoạt động phong trào".
 * Popup hiện CHÍNH GIỮA màn hình (nền mờ), tự tô kiểu bằng inline style nên không
 * phụ thuộc file CSS. Mount 1 lần trong app/layout.tsx.
 */
export default function ContentGate() {
  const [targets, setTargets] = useState<string[]>([]);
  const unlockedRef = useRef(false);
  const pendingRef = useRef<{ href: string; external: boolean } | null>(null);

  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/gate/context')
      .then((r) => r.json())
      .then((d) => {
        unlockedRef.current = !!d.unlocked;
        setTargets(Array.isArray(d.targets) ? d.targets : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!targets.length) return;
    function onClick(e: MouseEvent) {
      if (unlockedRef.current) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el) return;
      const raw = (el as HTMLAnchorElement).getAttribute('href') || '';
      if (!raw || !targets.includes(raw)) return;
      e.preventDefault();
      e.stopPropagation();
      pendingRef.current = { href: raw, external: /^https?:\/\//i.test(raw) };
      setErr('');
      setPw('');
      setOpen(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [targets]);

  function close() {
    setOpen(false);
  }

  async function submit() {
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.success === false) throw new Error(d.error || 'Mật khẩu không đúng');
      unlockedRef.current = true;
      setOpen(false);
      const p = pendingRef.current;
      if (p) {
        if (p.external) window.open(p.href, '_blank');
        else window.location.href = p.href;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.55)',
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  };
  const box: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    background: '#fff',
    borderTop: '4px solid #00A651',
    borderRadius: 14,
    boxShadow: '0 24px 60px rgba(0,0,0,.4)',
    padding: '22px 22px 24px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
  };
  const closeBtn: CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 12,
    border: 'none',
    background: 'transparent',
    fontSize: 24,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
  };
  const title: CSSProperties = {
    margin: '0 0 14px',
    fontSize: 17,
    fontWeight: 800,
    color: '#004000',
    textAlign: 'center',
  };
  const input: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    padding: '11px 13px',
    fontSize: 16,
    outline: 'none',
  };
  const note: CSSProperties = {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 1.55,
    color: '#64748b',
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: 9,
    padding: '11px 13px',
  };
  const submitBtn: CSSProperties = {
    width: '100%',
    marginTop: 14,
    background: busy ? '#5eb98a' : '#00A651',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '11px 0',
    fontSize: 15,
    fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
  };
  const errStyle: CSSProperties = {
    marginTop: 9,
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12.5,
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      <div style={box} role="dialog" aria-modal="true">
        <button style={closeBtn} onClick={close} aria-label="Đóng">
          &times;
        </button>
        <h3 style={title}>🔒 Vui lòng nhập Password để xem:</h3>
        <input
          style={input}
          type="password"
          value={pw}
          autoFocus
          placeholder="Nhập mật khẩu"
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {err && <div style={errStyle}>{err}</div>}
        <div style={note}>
          Nếu bạn đăng nhập tài khoản và lưu tài khoản vào trình duyệt + nhập password một lần đầu
          duy nhất - thì từ các lần xem sau trở đi bạn không phải đăng nhập tài khoản và nhập password
          mỗi lần xem nữa.
        </div>
        <button style={submitBtn} disabled={busy} onClick={submit}>
          {busy ? 'Đang kiểm tra...' : 'Xem nội dung'}
        </button>
      </div>
    </div>
  );
}
