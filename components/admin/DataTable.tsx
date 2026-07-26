'use client';

import { AdminRow, AdminTableDef } from '@/lib/cms/admin-schema';

interface DataTableProps {
  table: AdminTableDef;
  rows: AdminRow[];
  allData: Record<string, AdminRow[]>;
  onAdd: () => void;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
}

function renderCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  const str = String(value);
  return str.length > 80 ? `${str.slice(0, 80)}...` : str;
}

export default function DataTable({ table, rows, allData, onAdd, onEdit, onDelete }: DataTableProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span>
          <i className={`fas fa-${table.icon} text-primary`} /> {table.label}
        </span>
      </div>
      <div className="card-body">
        <button className="btn btn-primary btn-sm mb-3" onClick={onAdd}>
          <i className="fas fa-plus" /> Thêm
        </button>
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
                        !c.render && typeof row[c.key] === 'string' && (row[c.key] as string).length > 80
                          ? { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                          : undefined
                      }
                    >
                      {c.render ? c.render(row[c.key], row, allData) : renderCell(row[c.key])}
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
