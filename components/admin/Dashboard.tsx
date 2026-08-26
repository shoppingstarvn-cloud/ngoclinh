'use client';

import { ADMIN_TABLES, AdminRow } from '@/lib/cms/admin-schema';
import { repairPartnersAndSyncAction, revalidateSiteAction } from '@/lib/actions/admin-actions';
import { useState } from 'react';
import Swal from 'sweetalert2';

const COLORS = ['#0d6efd', '#198754', '#0dcaf0', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#17a2b8', '#6610f2', '#d63384', '#0d6efd'];
const swalDark = { background: '#1a1a2e', color: '#fff' };

interface DashboardProps {
  allData: Record<string, AdminRow[]>;
  onSelectTab: (tab: string) => void;
  onQuickAdd: (tab: string) => void;
  onDataReload: () => void;
}

export default function Dashboard({ allData, onSelectTab, onQuickAdd, onDataReload }: DashboardProps) {
  const [syncing, setSyncing] = useState(false);

  async function handleRepairSync() {
    setSyncing(true);
    try {
      const result = await repairPartnersAndSyncAction();
      if (!result.success) throw new Error(result.error || 'Đồng bộ thất bại');
      await revalidateSiteAction();
      onDataReload();
      const d = result.data;
      await Swal.fire({
        icon: 'success',
        title: 'Đã đồng bộ!',
        html: `Sửa logo đối tác: <b>${d?.fixed ?? 0}</b><br/>Tắt bản ghi không logo: <b>${d?.deactivated ?? 0}</b><br/>Tổng đối tác: <b>${d?.total ?? 0}</b><br/><br/>Website đã revalidate — F5 trang chủ sẽ thấy đúng số dự án.`,
        ...swalDark,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: e instanceof Error ? e.message : 'Đồng bộ thất bại',
        ...swalDark,
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="stats-grid">
        {ADMIN_TABLES.map((t, idx) => (
          <div className="stat-card" style={{ cursor: 'pointer' }} key={t.name} onClick={() => onSelectTab(t.name)}>
            <div style={{ fontSize: 24, marginBottom: 5, color: COLORS[idx % COLORS.length] }}>
              <i className={`fas fa-${t.icon}`} />
            </div>
            <p className="num">{(allData[t.name] || []).length}</p>
            <p className="lbl">{t.label}</p>
          </div>
        ))}
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <i className="fas fa-bolt text-warning" /> Hành động nhanh
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button className="btn btn-primary" onClick={() => onQuickAdd('slides')}>
                  <i className="fas fa-images" /> Thêm Slide
                </button>
                <button className="btn btn-success" onClick={() => onQuickAdd('products')}>
                  <i className="fas fa-box" /> Thêm Sản phẩm
                </button>
                <button className="btn btn-info" onClick={() => onQuickAdd('posts')}>
                  <i className="fas fa-newspaper" /> Thêm Bài viết
                </button>
                <button className="btn btn-warning" onClick={() => onQuickAdd('partners')}>
                  <i className="fas fa-handshake" /> Thêm Đối tác
                </button>
                <button className="btn btn-outline-success" onClick={() => onQuickAdd('services')}>
                  <i className="fas fa-th-large" /> Thêm Dịch vụ
                </button>
                <button className="btn btn-outline-info" onClick={() => onQuickAdd('register_blocks')}>
                  <i className="fas fa-id-card" /> Thêm khối form đăng ký
                </button>
                <button className="btn btn-outline-warning" onClick={() => onSelectTab('registrations')}>
                  <i className="fas fa-clipboard-list" /> Thông tin đăng ký
                </button>
                <button className="btn btn-outline-light" disabled={syncing} onClick={handleRepairSync}>
                  <i className={`fas fa-${syncing ? 'spinner fa-spin' : 'sync-alt'}`} />{' '}
                  {syncing ? 'Đang đồng bộ…' : 'Sửa logo đối tác + Đồng bộ site'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <i className="fas fa-info-circle text-info" /> Trạng thái Instant Sync
            </div>
            <div className="card-body">
              <p>
                <strong>API:</strong>{' '}
                <span className="text-success">
                  <i className="fas fa-circle" /> Server Actions + revalidatePath
                </span>
              </p>
              <p>
                <strong>Realtime:</strong>{' '}
                <span className="text-success">
                  <i className="fas fa-circle" /> LiveSiteSync (postgres_changes)
                </span>
              </p>
              <p>
                <strong>Supabase:</strong>{' '}
                <span className="text-success">
                  <i className="fas fa-circle" /> Đã kết nối
                </span>
              </p>
              <p className="mb-0" style={{ opacity: 0.8, fontSize: 13 }}>
                Thêm/sửa/xóa ở Super Admin → bảng Supabase + website cập nhật ngay. Khối “Những dự án”
                chỉ lấy từ bảng <code>projects</code> — không lẫn đối tác.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
