'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const swalDark = { background: '#1a1a2e', color: '#fff' };

interface ContentGatePanelProps {
  authHeader: string;
}

/**
 * Tab "Mật khẩu nội dung" NGAY TRONG dashboard Super Admin.
 * Đọc/ghi mật khẩu khối "Hoạt động trọng tâm" qua /api/admin/content-gate
 * (gửi Authorization: Bearer <token> — requireAdmin chấp nhận cả Bearer).
 */
export default function ContentGatePanel({ authHeader }: ContentGatePanelProps) {
  const [pw, setPw] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content-gate', { headers: { Authorization: authHeader } })
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setPw(d.password || '');
        setNote(d.note || '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [authHeader]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/content-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ password: pw }),
      });
      if (!r.ok) throw new Error('Lưu thất bại');
      Swal.fire({ icon: 'success', title: 'Đã lưu mật khẩu!', timer: 1200, showConfirmButton: false, ...swalDark });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: e instanceof Error ? e.message : 'Lưu thất bại', ...swalDark });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="text-center p-5">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="card-body">
        <h5 className="mb-2">
          <i className="fas fa-lock text-success" /> Mật khẩu xem nội dung
        </h5>
        <p className="text-muted" style={{ fontSize: 14, marginBottom: 6 }}>
          Áp dụng cho các menu con của khối <b>“Hoạt động trọng tâm”</b>. Người xem bấm vào menu con
          sẽ phải nhập đúng mật khẩu này mới xem được.
        </p>
        {note ? (
          <p className="text-muted" style={{ fontSize: 12.5 }}>
            {note}
          </p>
        ) : null}

        <label className="form-label fw-bold mt-2">Mật khẩu</label>
        <input
          className="form-control"
          type="text"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Nhập mật khẩu mới"
          style={{ maxWidth: 320 }}
        />

        <div className="mt-3">
          <button className="btn btn-success" disabled={saving} onClick={save}>
            <i className="fas fa-save" /> {saving ? 'Đang lưu...' : 'Lưu mật khẩu'}
          </button>
        </div>
      </div>
    </div>
  );
}
