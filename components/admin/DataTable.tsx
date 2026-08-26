'use client';

import { AdminRow, AdminTableDef } from '@/lib/cms/admin-schema';

interface DataTableProps {
  table: AdminTableDef;
  rows: AdminRow[];
  allData: Record<string, AdminRow[]>;
  onAdd: () => void;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
  onToggleActive?: (row: AdminRow, value: boolean) => void;
  onSetOrder?: (row: AdminRow, value: number) => void;
  onSeedHomeMenu?: () => void;
}

function renderCell(value: unknown, full = false): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  const str = String(value);
  return full || str.length <= 80 ? str : `${str.slice(0, 80)}...`;
}

function isRootCategory(row: AdminRow) {
  const p = row.parent_id;
  return p == null || p === '' || Number(p) === 0;
}

export default function DataTable({ table, rows, allData, onAdd, onEdit, onDelete, onToggleActive, onSetOrder, onSeedHomeMenu }: DataTableProps) {
  const rootCats = table.name === 'categories' ? rows.filter(isRootCategory) : [];
  const cloneCats = rootCats.filter((r) => String(r.slug || '').endsWith('-r2'));
  const needHomeMenuSeed = table.name === 'categories' && cloneCats.length < 3;

  return (
    <div className="card">
      <div className="card-header">
        <span>
          <i className={`fas fa-${table.icon} text-primary`} /> {table.label}
        </span>
      </div>
      <div className="card-body">
        {table.hint ? (
          <p className="text-muted small mb-3" style={{ lineHeight: 1.45 }}>
            {table.hint}
          </p>
        ) : null}
        {table.name === 'categories' ? (
          <p className="small mb-3" style={{ lineHeight: 1.45 }}>
            Đang có <strong>{rootCats.length}</strong> khối gốc trên trang chủ
            {' '}(<strong>{cloneCats.length}</strong> khối hàng 3 độc lập).
            {needHomeMenuSeed
              ? ' Trang chủ đang đắp ảo 3 ô hàng 3 — bấm nút bên dưới để tạo 3 dòng thật, sửa được riêng.'
              : ' Hàng 3 đã là dòng thật — sửa/xóa từng ô không đụng hàng 1.'}
          </p>
        ) : null}
        <button className="btn btn-primary btn-sm mb-3 me-2" onClick={onAdd}>
          <i className="fas fa-plus" /> Thêm
        </button>
        {table.name === 'categories' && onSeedHomeMenu ? (
          <button
            className="btn btn-outline-info btn-sm mb-3"
            onClick={onSeedHomeMenu}
            disabled={!needHomeMenuSeed}
            title={
              needHomeMenuSeed
                ? 'Tạo 3 dòng TRUYỀN THÔNG / TỔ CHỨC SỰ KIỆN / ĐÀO TẠO AI cho hàng 3'
                : 'Đã đủ 3 khối hàng 3'
            }
          >
            <i className="fas fa-clone" /> Bổ sung 3 khối hàng 3
          </button>
        ) : null}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                {table.cols.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th style={{ width: 100 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={table.cols.length + 1} className="text-center py-4 text-muted">
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  {table.cols.map((c) => (
                    <td
                      key={c.key}
                      className={c.key === 'id' ? 'text-muted' : undefined}
                      style={
                        table.name === 'registrations'
                          ? { whiteSpace: 'pre-wrap', maxWidth: 280 }
                          : !c.render && typeof row[c.key] === 'string' && (row[c.key] as string).length > 80
                            ? { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                            : undefined
                      }
                    >
                      {c.key === 'is_active' && onToggleActive ? (
                        <input
                          type="checkbox"
                          className="form-check-input"
                          style={{ width: 22, height: 22, cursor: 'pointer' }}
                          checked={Boolean(row[c.key])}
                          onChange={(e) => onToggleActive(row, e.target.checked)}
                          title={
                            Boolean(row[c.key])
                              ? 'Đang hiển thị trên web — bỏ tích để ẩn'
                              : 'Đang ẩn — tích để hiển thị trên web'
                          }
                        />
                      ) : c.key === 'display_order' && onSetOrder ? (
                        <input
                          key={String(row[c.key] ?? 0)}
                          type="number"
                          className="form-control form-control-sm"
                          style={{ width: 72 }}
                          defaultValue={Number(row[c.key] ?? 0)}
                          title="Nhập số thứ tự (1, 2, 3...) rồi Enter hoặc click ra ngoài — trang chủ sắp theo số này (nhỏ hiện trước)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          onBlur={(e) => {
                            const n = parseInt(e.target.value, 10);
                            const val = Number.isFinite(n) ? n : 0;
                            if (val !== Number(row[c.key] ?? 0)) onSetOrder(row, val);
                          }}
                        />
                      ) : c.render ? (
                        c.render(row[c.key], row, allData)
                      ) : (
                        renderCell(row[c.key], table.name === 'registrations')
                      )}
                    </td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-primary btn-sm me-1" onClick={() => onEdit(row)}>
                      <i className="fas fa-edit" />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(row)}>
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
