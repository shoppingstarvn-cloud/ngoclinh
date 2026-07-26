'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LoginScreen from '@/components/admin/LoginScreen';
import Sidebar from '@/components/admin/Sidebar';
import Dashboard from '@/components/admin/Dashboard';
import DataTable from '@/components/admin/DataTable';
import SiteSettingsPanel from '@/components/admin/SiteSettingsPanel';
import RecordFormModal from '@/components/admin/RecordFormModal';
import { ADMIN_TABLES, AdminRow } from '@/lib/cms/admin-schema';
import { deleteRecordAction } from '@/lib/actions/admin-actions';

const swalDark = { background: '#1a1a2e', color: '#fff' };
const TOKEN_STORAGE_KEY = 'admin_token';

interface AuthUser {
  username: string;
  role: string;
  full_name: string;
}

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [allData, setAllData] = useState<Record<string, AdminRow[]>>({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [modalState, setModalState] = useState<{ table: (typeof ADMIN_TABLES)[number]; item: AdminRow | null } | null>(null);

  const loadAllData = useCallback(async (authHeader: string) => {
    try {
      const resp = await fetch('/api/admin/all-data', { headers: { Authorization: authHeader } });
      const result = await resp.json();
      if (result.success) setAllData(result.data);
    } catch {
      // Giữ dữ liệu cũ nếu tải lại thất bại (mất mạng tạm thời)
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
    if (!saved) {
      setCheckingSession(false);
      return;
    }
    const authHeader = `Bearer ${saved}`;
    fetch('/api/auth/verify', { method: 'POST', headers: { Authorization: authHeader } })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setToken(saved);
          setUser(result.user);
          loadAllData(authHeader);
        } else {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => sessionStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setCheckingSession(false));
  }, [loadAllData]);

  const authHeader = token ? `Bearer ${token}` : '';

  async function handleLogin(password: string): Promise<boolean> {
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await resp.json();
      if (result.success) {
        setToken(result.token);
        setUser(result.user || { username: 'admin', role: 'superadmin', full_name: 'Super Admin' });
        sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token);
        Swal.fire({ icon: 'success', title: 'Chào mừng!', text: 'Hệ thống đã sẵn sàng', timer: 1500, showConfirmButton: false, ...swalDark });
        loadAllData(`Bearer ${result.token}`);
        return true;
      }
    } catch {
      // rơi xuống return false bên dưới
    }
    return false;
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  function openAddForm(tableName: string) {
    const table = ADMIN_TABLES.find((t) => t.name === tableName);
    if (!table) return;
    setActiveTab(tableName);
    setModalState({ table, item: null });
  }

  function openEditForm(tableName: string, row: AdminRow) {
    const table = ADMIN_TABLES.find((t) => t.name === tableName);
    if (!table) return;
    setModalState({ table, item: row });
  }

  async function handleDelete(tableName: string, row: AdminRow) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Xóa bản ghi?',
      text: 'Hành động này không thể hoàn tác!',
      showCancelButton: true,
      confirmButtonText: 'XÓA',
      cancelButtonText: 'Hủy',
      ...swalDark,
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await deleteRecordAction(tableName, row.id as string | number);
      if (!result.success) throw new Error(result.error || 'Xóa thất bại');
      Swal.fire({ icon: 'success', title: 'Đã xóa!', timer: 1000, showConfirmButton: false, ...swalDark });
      loadAllData(authHeader);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: e instanceof Error ? e.message : 'Xóa thất bại', ...swalDark });
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32 }} />
      </div>
    );
  }

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const activeTableDef = ADMIN_TABLES.find((t) => t.name === activeTab);
  const unreadCount = (allData.contact_submissions || []).filter((c) => !c.is_read).length;

  return (
    <div className="wrapper">
      <Sidebar activeTab={activeTab} unreadCount={unreadCount} onSelect={setActiveTab} onLogout={handleLogout} />

      <div className="main-content">
        <div className="top-bar">
          <h4>
            <i className={`fas fa-${activeTableDef ? activeTableDef.icon : 'tachometer-alt'} text-primary`} />{' '}
            {activeTab === 'dashboard' ? 'Dashboard' : activeTableDef?.label || activeTab}
          </h4>
          <div>
            <span className="badge bg-success me-2">
              <i className="fas fa-circle" /> LIVE
            </span>
            <span className="badge bg-secondary me-2">{(user?.role || 'admin').toUpperCase()}</span>
            <button className="btn btn-primary btn-sm" onClick={() => loadAllData(authHeader)}>
              <i className="fas fa-sync" /> Tải lại
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard allData={allData} onSelectTab={setActiveTab} onQuickAdd={openAddForm} />
        )}

        {activeTab === 'site_settings' && (
          <SiteSettingsPanel
            rows={allData.site_settings || []}
            onSaved={() => {
              Swal.fire({ icon: 'success', title: 'Đã lưu toàn bộ cài đặt!', timer: 1200, showConfirmButton: false, ...swalDark });
              loadAllData(authHeader);
            }}
          />
        )}

        {activeTableDef && activeTab !== 'site_settings' && (
          <DataTable
            table={activeTableDef}
            rows={allData[activeTableDef.name] || []}
            allData={allData}
            onAdd={() => openAddForm(activeTableDef.name)}
            onEdit={(row) => openEditForm(activeTableDef.name, row)}
            onDelete={(row) => handleDelete(activeTableDef.name, row)}
          />
        )}
      </div>

      {modalState && (
        <RecordFormModal
          open
          table={modalState.table}
          item={modalState.item}
          menus={allData.menus || []}
          onClose={() => setModalState(null)}
          onSaved={() => {
            Swal.fire({ icon: 'success', title: 'Đã lưu!', timer: 1000, showConfirmButton: false, ...swalDark });
            loadAllData(authHeader);
          }}
        />
      )}
    </div>
  );
}
