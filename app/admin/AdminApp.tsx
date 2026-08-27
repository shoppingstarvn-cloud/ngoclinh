'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import LoginScreen from '@/components/admin/LoginScreen';
import Sidebar from '@/components/admin/Sidebar';
import Dashboard from '@/components/admin/Dashboard';
import DataTable from '@/components/admin/DataTable';
import SiteSettingsPanel from '@/components/admin/SiteSettingsPanel';
import ContentGatePanel from '@/components/admin/ContentGatePanel';
import AlbumAdminPanel from '@/components/admin/AlbumAdminPanel';
import UsersAdminPanel from '@/components/admin/UsersAdminPanel';
import RecordFormModal from '@/components/admin/RecordFormModal';
import { ADMIN_TABLES, AdminRow } from '@/lib/cms/admin-schema';
import { deleteRecordAction, seedHomeMenuAction, updateRecordAction } from '@/lib/actions/admin-actions';

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
  const [userStats, setUserStats] = useState({ registered: 0, online: 0, pendingWebsite: 0 });
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

  const loadUserStats = useCallback(async (authHeader: string) => {
    try {
      const resp = await fetch('/api/admin/users/stats', { headers: { Authorization: authHeader } });
      const result = await resp.json();
      if (result.ok) {
        setUserStats({
          registered: Number(result.registered) || 0,
          online: Number(result.online) || 0,
          pendingWebsite: Number(result.pendingWebsite) || 0,
        });
      }
    } catch {
      /* giữ số cũ */
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
          loadUserStats(authHeader);
        } else {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => sessionStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setCheckingSession(false));
  }, [loadAllData, loadUserStats]);

  useEffect(() => {
    if (!token) return;
    const ms = activeTab === 'registrations' ? 5000 : 15000;
    const id = window.setInterval(() => {
      loadAllData(`Bearer ${token}`);
    }, ms);
    return () => window.clearInterval(id);
  }, [token, activeTab, loadAllData]);

  useEffect(() => {
    if (!token) return;
    const header = `Bearer ${token}`;
    loadUserStats(header);
    const id = window.setInterval(() => loadUserStats(header), 10_000);
    return () => window.clearInterval(id);
  }, [token, loadUserStats]);

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
        loadUserStats(`Bearer ${result.token}`);
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

  async function handleToggleActive(tableName: string, row: AdminRow, value: boolean) {
    // Cập nhật ngay trên giao diện cho mượt (optimistic), rồi lưu lên server.
    setAllData((prev) => {
      const list = prev[tableName] || [];
      return { ...prev, [tableName]: list.map((r) => (r.id === row.id ? { ...r, is_active: value } : r)) };
    });
    try {
      const result = await updateRecordAction(tableName, row.id as string | number, { is_active: value });
      if (!result.success) throw new Error(result.error || 'Cập nhật thất bại');
      loadAllData(authHeader);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: e instanceof Error ? e.message : 'Cập nhật thất bại', ...swalDark });
      loadAllData(authHeader);
    }
  }

  async function handleSeedHomeMenu() {
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Bổ sung 3 khối hàng 3?',
      html: 'Tạo 3 dòng độc lập (TRUYỀN THÔNG, TỔ CHỨC SỰ KIỆN, ĐÀO TẠO AI) cho hàng 3 trên trang chủ. Sửa/xóa hàng 3 <b>không</b> đụng 3 khối hàng 1.',
      showCancelButton: true,
      confirmButtonText: 'Tạo 3 khối',
      cancelButtonText: 'Hủy',
      ...swalDark,
    });
    if (!confirm.isConfirmed) return;
    try {
      const result = await seedHomeMenuAction();
      if (!result.success) throw new Error(result.error || 'Bổ sung thất bại');
      const created = result.data?.created ?? 0;
      const cloneCount = result.data?.cloneCount ?? 0;
      await Swal.fire({
        icon: 'success',
        title: created > 0 ? 'Đã tạo khối hàng 3!' : 'Hàng 3 đã đủ',
        html: `Vừa tạo <b>${created}</b> dòng mới. Hiện có <b>${cloneCount}</b> khối hàng 3 độc lập. Tab Danh mục và trang chủ đã đồng bộ.`,
        ...swalDark,
      });
      loadAllData(authHeader);
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: e instanceof Error ? e.message : 'Bổ sung thất bại',
        ...swalDark,
      });
    }
  }

  async function handleSetOrder(tableName: string, row: AdminRow, value: number) {
    setAllData((prev) => {
      const list = prev[tableName] || [];
      return { ...prev, [tableName]: list.map((r) => (r.id === row.id ? { ...r, display_order: value } : r)) };
    });
    try {
      const result = await updateRecordAction(tableName, row.id as string | number, { display_order: value });
      if (!result.success) throw new Error(result.error || 'Cập nhật thất bại');
      loadAllData(authHeader);
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: e instanceof Error ? e.message : 'Cập nhật thất bại', ...swalDark });
      loadAllData(authHeader);
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
  const registerUnreadCount = (allData.registrations || []).filter((c) => !c.is_read).length;

  return (
    <div className="wrapper">
      <Sidebar
        activeTab={activeTab}
        unreadCount={unreadCount}
        registerUnreadCount={registerUnreadCount}
        userStats={userStats}
        onSelect={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="main-content">
        <div className="top-bar">
          <h4>
            <i
              className={`fas fa-${
                activeTab === 'content_gate' ? 'lock' : activeTab === 'album' ? 'images' : activeTab === 'users_mgmt' ? 'users-cog' : activeTableDef ? activeTableDef.icon : 'tachometer-alt'
              } text-primary`}
            />{' '}
            {activeTab === 'dashboard'
              ? 'Dashboard'
              : activeTab === 'content_gate'
                ? 'Mật khẩu nội dung'
                : activeTab === 'album'
                  ? 'Trang con / Nhật ký'
                  : activeTab === 'users_mgmt'
                    ? 'Quản lý Users'
                    : activeTableDef?.label || activeTab}
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
          <Dashboard
            allData={allData}
            onSelectTab={setActiveTab}
            onQuickAdd={openAddForm}
            onDataReload={() => loadAllData(authHeader)}
            onSeedHomeMenu={handleSeedHomeMenu}
          />
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

        {activeTab === 'content_gate' && <ContentGatePanel authHeader={authHeader} />}

        {activeTab === 'album' && <AlbumAdminPanel authHeader={authHeader} />}

        {activeTab === 'users_mgmt' && <UsersAdminPanel authHeader={authHeader} />}

        {activeTableDef && activeTab !== 'site_settings' && (
          <DataTable
            table={activeTableDef}
            rows={allData[activeTableDef.name] || []}
            allData={allData}
            onAdd={() => openAddForm(activeTableDef.name)}
            onEdit={(row) => openEditForm(activeTableDef.name, row)}
            onDelete={(row) => handleDelete(activeTableDef.name, row)}
            onToggleActive={(row, value) => handleToggleActive(activeTableDef.name, row, value)}
            onSetOrder={(row, value) => handleSetOrder(activeTableDef.name, row, value)}
            onSeedHomeMenu={activeTableDef.name === 'categories' ? handleSeedHomeMenu : undefined}
          />
        )}
      </div>

      {modalState && (
        <RecordFormModal
          open
          table={modalState.table}
          item={modalState.item}
          menus={allData.menus || []}
          allData={allData}
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
