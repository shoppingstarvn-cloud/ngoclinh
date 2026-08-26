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
  onSeedHomeMenu?: () => void;
}

export default function Dashboard({ allData, onSelectTab, onQuickAdd, onDataReload, onSeedHomeMenu }: DashboardProps) {
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

  const homeCats = (allData.categories || []).filter((c) => {
    const p = c.parent_id;
    return p == null || p === '' || Number(p) === 0;
  });
  const homeClones = homeCats.filter((c) => String(c.slug || '').endsWith('-r2'));
  const needHomeMenuSeed = homeClones.length < 3;

  return (
    <div>
      {needHomeMenuSeed ? (
        <div className="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            Trang chủ đang hiện <strong>9 khối MENU</strong> (hàng 3 đang đắp ảo từ hàng 1),
            còn tab <strong>Danh mục (MENU trang chủ)</strong> mới có{' '}
            <strong>{homeCats.length}</strong> dòng thật.
            Bấm nút để tạo 3 dòng độc lập — sửa/xóa hàng 3 không đụng hàng 1.
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-light" onClick={() => onSelectTab('categories')}>
              Mở tab Danh mục
            </button>
            {onSeedHomeMenu ? (
              <button type="button" className="btn btn-sm btn-info" onClick={onSeedHomeMenu}>
                Bổ sung 3 khối hàng 3
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="alert alert-success mb-3">
          Tab Danh mục đã khớp trang chủ: <strong>{homeCats.length}</strong> khối gốc
          (trong đó <strong>{homeClones.length}</strong> khối hàng 3 độc lập). Thêm / sửa / xóa / tắt Active
          đồng bộ realtime với trang chủ.
        </div>
      )}
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
                <button className="btn btn-outline-primary" onClick={() => onQuickAdd('categories')}>
                  <i className="fas fa-th" /> Thêm khối MENU trang chủ
                </button>
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
