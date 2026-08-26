'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Cổng mật khẩu TOÀN CỤC — CHỈ chặn link menu con của khối "Hoạt động phong trào".
 * Popup NEO NGAY DƯỚI menu vừa bấm (không phải cuối trang). Tự tô kiểu bằng inline
 * style nên không phụ thuộc file CSS. Mount 1 lần trong app/layout.tsx.
 */
export default function ContentGate() {
  const [targets, setTargets] = useState<string[]>([]);
  const unlockedRef = useRef(false);
  const pendingRef = useRef<{ href: string; external: boolean } | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
      const a = el as HTMLAnchorElement;
      const raw = a.getAttribute('href') || '';
      if (!raw || !targets.includes(raw)) return;
      e.preventDefault();
      e.stopPropagation();
      pendingRef.current = { href: raw, external: /^https?:\/\//i.test(raw) };

      // Neo popup ngay DƯỚI menu vừa bấm.
      const rect = a.getBoundingClientRect();
      const W = 320;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - W - 10));
      const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 250));
      setErr('');
      setPw('');
      setPos({ top, left });
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [targets]);

  function close() {
    setPos(null);
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
      setPos(null);
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

  if (!pos) return null;

  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'transparent',
    zIndex: 99998,
  };
  const box: CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: 320,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderTop: '3px solid #00A651',
    borderRadius: 10,
    boxShadow: '0 16px 40px rgba(0,0,0,.28)',
    padding: '16px 16px 18px',
    zIndex: 99999,
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
  };
  const closeBtn: CSSProperties = {
    position: 'absolute',
    top: 6,
    right: 10,
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
  };
  const title: CSSProperties = { margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: '#004000' };
  const input: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 15,
    outline: 'none',
  };
  const note: CSSProperties = {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#64748b',
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: 8,
    padding: '9px 11px',
  };
  const submitBtn: CSSProperties = {
    width: '100%',
    marginTop: 12,
    background: busy ? '#5eb98a' : '#00A651',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    fontSize: 14,
    fontWeight: 700,
    cursor: busy ? 'default' : 'pointer',
  };
  const errStyle: CSSProperties = {
    marginTop: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 11px',
    fontSize: 12,
  };

  return (
    <>
      <div style={backdrop} onClick={close} />
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
    </>
  );
}
