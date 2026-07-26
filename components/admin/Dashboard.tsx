'use client';

import { ADMIN_TABLES, AdminRow } from '@/lib/cms/admin-schema';

const COLORS = ['#0d6efd', '#198754', '#0dcaf0', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#17a2b8', '#6610f2', '#d63384', '#0d6efd'];

interface DashboardProps {
  allData: Record<string, AdminRow[]>;
  onSelectTab: (tab: string) => void;
  onQuickAdd: (tab: string) => void;
}

export default function Dashboard({ allData, onSelectTab, onQuickAdd }: DashboardProps) {
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
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <div className="card">
            <div className="card-header">
              <i className="fas fa-info-circle text-info" /> Trạng thái
            </div>
            <div className="card-body">
              <p>
                <strong>API:</strong> <span className="text-success"><i className="fas fa-circle" /> Next.js Route Handlers</span>
              </p>
              <p>
                <strong>Supabase:</strong> <span className="text-success"><i className="fas fa-circle" /> Đã kết nối</span>
              </p>
              <p>
                <strong>Xác thực:</strong> <span className="text-success"><i className="fas fa-circle" /> JWT (HS256)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
