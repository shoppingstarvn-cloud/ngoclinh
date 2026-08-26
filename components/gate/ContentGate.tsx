'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cổng mật khẩu TOÀN CỤC — CHỈ chặn các link menu con của khối
 * "Hoạt động phong trào". Bắt sự kiện click trên toàn trang: nếu link đích
 * nằm trong danh sách "targets" (lấy từ /api/gate/context) và CHƯA mở khoá,
 * hiện ô nhập mật khẩu; nhập đúng mới cho đi tiếp.
 *
 * Đã mở khoá 1 lần (cookie đã ký, hoặc thành viên đăng nhập) -> vào thẳng.
 * KHÔNG đụng các file khác — mount 1 lần trong app/layout.tsx.
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

  return (
    <div className="gate-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="gate-box" role="dialog" aria-modal="true">
        <button className="gate-close" onClick={() => setOpen(false)} aria-label="Đóng">
          &times;
        </button>
        <h3 className="gate-title">🔒 Vui lòng nhập Password để xem:</h3>
        <input
          className="gate-input"
          type="password"
          value={pw}
          autoFocus
          placeholder="Nhập mật khẩu"
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {err && <div className="gate-err">{err}</div>}
        <div className="gate-note">
          Nếu bạn đăng nhập tài khoản và lưu tài khoản vào trình duyệt + nhập password một lần đầu
          duy nhất - thì từ các lần xem sau trở đi bạn không phải đăng nhập tài khoản và nhập password
          mỗi lần xem nữa.
        </div>
        <button className="gate-submit" disabled={busy} onClick={submit}>
          {busy ? 'Đang kiểm tra...' : 'Xem nội dung'}
        </button>
      </div>
    </div>
  );
}
