'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Trang quản lý MẬT KHẨU XEM NỘI DUNG (khối Hoạt động phong trào).
 * Truy cập: /admin/mat-khau-noi-dung — dùng cookie admin (đăng nhập ở /admin trước).
 * Đứng riêng để KHÔNG đụng dashboard chính (đang được Cursor sửa).
 */
export default function ContentGateAdminPage() {
  const [pw, setPw] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [authed, setAuthed] = useState(true);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content-gate')
      .then(async (r) => {
        if (r.status === 401) {
          setAuthed(false);
          return;
        }
        const d = await r.json();
        setPw(d.password || '');
        setNote(d.note || '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setMsg('');
    setSaving(true);
    try {
      const r = await fetch('/api/admin/content-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.status === 401) {
        setAuthed(false);
        return;
      }
      if (!r.ok) throw new Error('Lưu thất bại');
      setMsg('✅ Đã lưu mật khẩu mới.');
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setSaving(false);
    }
  }

  const wrap: CSSProperties = {
    maxWidth: 520,
    margin: '40px auto',
    padding: 24,
    fontFamily: 'Arial, sans-serif',
  };
  const card: CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 24,
    boxShadow: '0 10px 30px rgba(0,0,0,.08)',
  };
  const input: CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    fontSize: 15,
    border: '1px solid #cbd5e1',
    borderRadius: 9,
    boxSizing: 'border-box',
  };
  const btn: CSSProperties = {
    marginTop: 16,
    background: '#00A651',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 20px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  };

  if (!loaded) return <div style={wrap}>Đang tải...</div>;

  if (!authed) {
    return (
      <div style={wrap}>
        <div style={card}>
          <h2 style={{ color: '#004000', marginTop: 0 }}>🔒 Mật khẩu xem nội dung</h2>
          <p>
            Bạn cần đăng nhập Super Admin trước. Hãy mở{' '}
            <a href="/admin" style={{ color: '#00A651' }}>
              /admin
            </a>{' '}
            đăng nhập, rồi quay lại trang này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{ color: '#004000', marginTop: 0 }}>🔒 Mật khẩu xem nội dung</h2>
        <p style={{ color: '#555', fontSize: 14 }}>
          Mật khẩu này áp dụng cho các menu con của khối <b>“Hoạt động phong trào”</b>. Người xem
          bấm vào menu con sẽ phải nhập đúng mật khẩu mới xem được.
        </p>
        {note ? <p style={{ color: '#94a3b8', fontSize: 13 }}>{note}</p> : null}
        <label style={{ fontWeight: 700, fontSize: 14, display: 'block', margin: '12px 0 6px' }}>
          Mật khẩu
        </label>
        <input
          style={input}
          type="text"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Nhập mật khẩu mới"
        />
        {msg && <div style={{ marginTop: 12, fontSize: 14 }}>{msg}</div>}
        <button style={btn} disabled={saving} onClick={save}>
          {saving ? 'Đang lưu...' : 'Lưu mật khẩu'}
        </button>
      </div>
    </div>
  );
}
