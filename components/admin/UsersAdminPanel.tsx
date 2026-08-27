'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const swalDark = { background: '#1a1a2e', color: '#fff' };

interface Props { authHeader: string }
type MemberWebsite = {
  id: number;
  slug: string;
  title: string;
  url: string;
  is_active: boolean;
};
type U = {
  id: number;
  username: string | null;
  full_name: string;
  email: string;
  role: string;
  user_kind: string;
  unit_name: string | null;
  class_in_charge: string | null;
  zalo_phone: string | null;
  ward: string | null;
  dob: string | null;
  is_active: boolean;
  request_type: string | null;
  request_status: string | null;
  request_at: string | null;
  created_at: string;
  websites?: MemberWebsite[];
};

const ROLE_LABEL: Record<string, string> = { member: 'Thành viên', admin1: 'Admin cấp 1', superadmin: 'Super Admin' };

function formatDob(raw: string | null | undefined) {
  if (!raw) return '—';
  const m = String(raw).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

/** pending | approved | rejected | null — suy ra nếu chưa có cột request_status. */
function inferStatus(u: U): string | null {
  if (u.role === 'admin1' || u.role === 'superadmin') return 'approved';
  const s = String(u.request_status || '').toLowerCase();
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
  if (!u.request_type) return null;
  return 'pending';
}

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

  async function patch(id: number, body: { role?: string; is_active?: boolean; request_status?: string }) {
    const r = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!d.ok) return Swal.fire({ icon: 'error', title: 'Lỗi', text: d.error, ...swalDark });
    if (body.request_status === 'approved' || body.role === 'admin1') {
      Swal.fire({ icon: 'success', title: 'Đã phê duyệt & bổ nhiệm Admin cấp 1', timer: 1400, showConfirmButton: false, ...swalDark });
    } else if (body.request_status === 'rejected') {
      Swal.fire({ icon: 'success', title: 'Đã từ chối đề nghị', timer: 1200, showConfirmButton: false, ...swalDark });
    } else if (body.role) {
      Swal.fire({ icon: 'success', title: `Đã đặt vai trò: ${ROLE_LABEL[body.role]}`, timer: 1200, showConfirmButton: false, ...swalDark });
    }
    await load();
  }

  async function approveWebsite(u: U) {
    const isWeb = u.request_type === 'website';
    const r = await Swal.fire({
      icon: 'question',
      title: isWeb ? 'Phê duyệt đề nghị mở Website?' : 'Bổ nhiệm Admin cấp 1?',
      html: `Bổ nhiệm <b>${u.full_name || u.email}</b> làm <b>Admin cấp 1</b> để quản trị Trang con riêng.`,
      showCancelButton: true,
      confirmButtonText: 'Phê duyệt & bổ nhiệm',
      cancelButtonText: 'Huỷ',
      ...swalDark,
    });
    if (r.isConfirmed) await patch(u.id, { role: 'admin1', request_status: 'approved' });
  }

  async function rejectRequest(u: U) {
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Từ chối đề nghị?',
      text: `${u.full_name || u.email} vẫn là thành viên, chưa được quyền Admin cấp 1.`,
      showCancelButton: true,
      confirmButtonText: 'Từ chối',
      cancelButtonText: 'Huỷ',
      ...swalDark,
    });
    if (r.isConfirmed) await patch(u.id, { request_status: 'rejected' });
  }

  async function deleteWebsite(u: U, w: MemberWebsite) {
    const r = await Swal.fire({
      icon: 'warning',
      title: 'Xoá website con?',
      html: `Xoá <b>${w.title || w.slug}</b> của <b>${u.full_name || u.email}</b>.<br/><br/>Xoá cả khối + ảnh/video trên trang. <b>Tài khoản thành viên giữ nguyên.</b>`,
      showCancelButton: true,
      confirmButtonText: 'XOÁ WEBSITE',
      cancelButtonText: 'Huỷ',
      confirmButtonColor: '#dc3545',
      ...swalDark,
    });
    if (!r.isConfirmed) return;
    const res = await fetch(`/api/admin/users?pageId=${w.id}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const d = await res.json().catch(() => ({}));
    if (!d.ok) return Swal.fire({ icon: 'error', title: 'Lỗi', text: d.error || 'Xoá thất bại', ...swalDark });
    Swal.fire({ icon: 'success', title: 'Đã xoá website con', timer: 1200, showConfirmButton: false, ...swalDark });
    await load();
  }

  if (loading) return <div className="text-center p-5"><i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }} /></div>;

  const kw = q.trim().toLowerCase();
  const rows = kw
    ? users.filter((u) => {
        const sites = (u.websites || []).flatMap((w) => [w.url, w.slug, w.title]);
        return [u.full_name, u.email, u.username, u.unit_name, u.class_in_charge, u.zalo_phone, u.ward, u.dob, u.request_type, ...sites]
          .some((x) => String(x || '').toLowerCase().includes(kw));
      })
    : users;
  const pendingCount = users.filter((u) => inferStatus(u) === 'pending').length;

  return (
    <div className="card"><div className="card-body">
      <h5 className="mb-1"><i className="fas fa-users-cog text-success" /> Quản lý Users — danh sách thành viên toàn website</h5>
      <p className="text-muted" style={{ fontSize: 13.5 }}>
        Hồ sơ khai báo trên form (họ tên, ngày sinh, Zalo, trường, lớp, phường/xã…) đồng bộ vào bảng này.
        Cột <b>Đề nghị mở Website</b> để Super Admin biết, phê duyệt và bổ nhiệm <b>Admin cấp 1</b>.
        Cột <b>Link website</b> mở trang con đang hoạt động trên website mẹ (tab mới). Cột <b>Xóa website</b> chỉ Super Admin — tài khoản thành viên giữ nguyên.
        Tổng: <b>{users.length}</b> tài khoản{pendingCount ? <> · chờ duyệt: <b className="text-warning">{pendingCount}</b></> : null}.
      </p>
      <input className="form-control mb-2" style={{ maxWidth: 320 }} placeholder="🔎 Tìm tên / email / trường / lớp..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ overflowX: 'auto' }}>
        <table className="table table-sm table-hover align-middle" style={{ minWidth: 1680 }}>
          <thead>
            <tr style={{ fontSize: 12.5 }}>
              <th>Họ tên</th>
              <th>Ngày sinh</th>
              <th>Đăng nhập</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Loại</th>
              <th>Trường (đơn vị)</th>
              <th>Phụ trách lớp</th>
              <th>SĐT Zalo</th>
              <th>Phường/Xã</th>
              <th style={{ minWidth: 210 }}>Đề nghị mở Website</th>
              <th style={{ minWidth: 260 }}>Link website</th>
              <th style={{ minWidth: 120 }}>Xóa website</th>
              <th>Hoạt động</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 12.5 }}>
            {rows.map((u) => {
              const status = inferStatus(u);
              const isWebsite = u.request_type === 'website';
              const isInfo = u.request_type === 'admin';
              return (
                <tr key={u.id}>
                  <td><b>{u.full_name || '—'}</b></td>
                  <td>{formatDob(u.dob)}</td>
                  <td>{u.username || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    <select className="form-select form-select-sm" style={{ minWidth: 130 }} value={u.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        const extra = role === 'admin1' && status === 'pending' ? { request_status: 'approved' as const } : {};
                        patch(u.id, { role, ...extra });
                      }}>
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
                  <td>
                    {!u.request_type ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <span>{isWebsite ? '🌐 Mở Website' : isInfo ? '📋 Đăng ký thông tin' : u.request_type}</span>
                        {status === 'pending' && <span className="badge bg-warning text-dark">Chờ duyệt</span>}
                        {status === 'approved' && <span className="badge bg-success">Đã duyệt</span>}
                        {status === 'rejected' && <span className="badge bg-secondary">Từ chối</span>}
                        {u.request_at && (
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            Gửi: {new Date(u.request_at).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        {status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => approveWebsite(u)}>
                              Phê duyệt → Admin cấp 1
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => rejectRequest(u)}>
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    {(u.websites || []).length === 0 ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(u.websites || []).map((w) => (
                          <a
                            key={w.id}
                            className="user-site-link"
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={w.title || w.slug}
                          >
                            {w.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {(u.websites || []).length === 0 ? '—' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        {(u.websites || []).map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteWebsite(u, w)}
                            title={`Xoá ${w.title || w.slug}`}
                          >
                            <i className="fas fa-trash-alt" /> Xóa
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <button className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => patch(u.id, { is_active: !u.is_active })}>
                      {u.is_active ? '● Hoạt động' : '○ Khoá'}
                    </button>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={15} className="text-center text-muted py-3">Không có tài khoản nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div></div>
  );
}
