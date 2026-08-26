'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const swalDark = { background: '#1a1a2e', color: '#fff' };

interface Props { authHeader: string }
type U = {
  id: number; username: string | null; full_name: string; email: string; role: string;
  user_kind: string; unit_name: string | null; class_in_charge: string | null;
  zalo_phone: string | null; ward: string | null; is_active: boolean;
  request_type: string | null; created_at: string;
};

const ROLE_LABEL: Record<string, string> = { member: 'Thành viên', admin1: 'Admin cấp 1', superadmin: 'Super Admin' };

export default function UsersAdminPanel({ authHeader }: Props) {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/users', { headers: { Authorization: authHeader } });
    const d = await r.json();
    if (d.ok) setUsers(d.users || []);
    setLoading(false);
  }, [authHeader]);
  useEffect(() => { load(); }, [load]);

  async function patch(id: number, body: { role?: string; is_active?: boolean }) {
    const r = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!d.ok) return Swal.fire({ icon: 'error', title: 'Lỗi', text: d.error, ...swalDark });
    if (body.role) Swal.fire({ icon: 'success', title: `Đã đặt vai trò: ${ROLE_LABEL[body.role]}`, timer: 1200, showConfirmButton: false, ...swalDark });
    await load();
  }

  if (loading) return <div className="text-center p-5"><i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }} /></div>;

  const kw = q.trim().toLowerCase();
  const rows = kw
    ? users.filter((u) => [u.full_name, u.email, u.username, u.unit_name, u.class_in_charge].some((x) => String(x || '').toLowerCase().includes(kw)))
    : users;

  return (
    <div className="card"><div className="card-body">
      <h5 className="mb-1"><i className="fas fa-users-cog text-success" /> Quản lý Users — danh sách thành viên toàn website</h5>
      <p className="text-muted" style={{ fontSize: 13.5 }}>Bổ nhiệm <b>Admin cấp 1</b> để người dùng được quản trị Trang con riêng của mình. Tổng: <b>{users.length}</b> tài khoản.</p>
      <input className="form-control mb-2" style={{ maxWidth: 320 }} placeholder="🔎 Tìm tên / email / trường / lớp..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ overflowX: 'auto' }}>
        <table className="table table-sm table-hover align-middle" style={{ minWidth: 980 }}>
          <thead>
            <tr style={{ fontSize: 12.5 }}>
              <th>Họ tên</th><th>Đăng nhập</th><th>Email</th><th>Vai trò</th><th>Loại</th>
              <th>Trường (đơn vị)</th><th>Phụ trách lớp</th><th>SĐT Zalo</th><th>Phường/Xã</th>
              <th>Nguồn</th><th>Hoạt động</th><th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 12.5 }}>
            {rows.map((u) => (
              <tr key={u.id}>
                <td><b>{u.full_name || '—'}</b></td>
                <td>{u.username || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <select className="form-select form-select-sm" style={{ minWidth: 130 }} value={u.role}
                    onChange={(e) => patch(u.id, { role: e.target.value })}>
                    <option value="member">Thành viên</option>
                    <option value="admin1">Admin cấp 1</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </td>
                <td>{u.user_kind === 'student' ? '🎓 Học sinh' : '👩‍🏫 Giáo viên'}</td>
                <td>{u.unit_name || '—'}</td>
                <td>{u.class_in_charge || '—'}</td>
                <td>{u.zalo_phone || '—'}</td>
                <td>{u.ward || '—'}</td>
                <td>{u.request_type === 'admin' ? 'Quản trị' : u.request_type === 'website' ? 'Mở web' : '—'}</td>
                <td>
                  <button className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => patch(u.id, { is_active: !u.is_active })}>
                    {u.is_active ? '● Hoạt động' : '○ Khoá'}
                  </button>
                </td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={12} className="text-center text-muted py-3">Không có tài khoản nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div></div>
  );
}
