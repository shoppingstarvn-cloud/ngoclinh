'use client';

import { ADMIN_TABLES } from '@/lib/cms/admin-schema';

interface SidebarProps {
  activeTab: string;
  unreadCount: number;
  registerUnreadCount?: number;
  onSelect: (tab: string) => void;
  onLogout: () => void;
}

const SECTIONS: { title: string; tables: string[] }[] = [
  { title: 'Cấu Hình', tables: ['site_settings'] },
  {
    title: 'Nội Dung',
    tables: [
      'registrations',
      'slides',
      'activity_images',
      'menus',
      'categories',
      'category_submenus',
      'posts',
      'projects',
      'products',
      'partners',
      'testimonials',
      'services',
      'register_blocks',
      'videos',
      'photos',
    ],
  },
  { title: 'Liên Hệ', tables: ['contact_submissions'] },
  { title: 'Hệ Thống', tables: ['links'] },
];

export default function Sidebar({ activeTab, unreadCount, registerUnreadCount = 0, onSelect, onLogout }: SidebarProps) {
  const byName = new Map(ADMIN_TABLES.map((t) => [t.name, t]));

  return (
    <nav className="sidebar">
      <div className="brand">
        <h5>
          <i className="fas fa-crown" /> ADMIN
        </h5>
        <small>Ngọc Linh · Hệ Sinh Thái AI</small>
      </div>
      <div className="sidebar-nav">
        <div className="nav-section">Tổng Quan</div>
        <a
          className={`nav-link${activeTab === 'dashboard' ? ' active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect('dashboard')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect('dashboard')}
        >
          <i className="fas fa-tachometer-alt" />
          <span>Dashboard</span>
        </a>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>
            {section.tables.map((name) => {
              const t = byName.get(name);
              if (!t) return null;
              return (
                <a
                  key={name}
                  className={`nav-link${activeTab === name ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(name)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(name)}
                >
                  <i className={`fas fa-${t.icon}`} />
                  <span>
                    {t.label}
                    {name === 'contact_submissions' && unreadCount > 0 && (
                      <span className="badge bg-danger ms-1">{unreadCount}</span>
                    )}
                    {name === 'registrations' && registerUnreadCount > 0 && (
                      <span className="badge bg-danger ms-1">{registerUnreadCount}</span>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        ))}
        <div className="nav-section">Thành Viên</div>
        <a
          className={`nav-link${activeTab === 'users_mgmt' ? ' active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect('users_mgmt')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect('users_mgmt')}
        >
          <i className="fas fa-users-cog" />
          <span>Quản lý Users</span>
        </a>
        <div className="nav-section">Trang Con (Album)</div>
        <a
          className={`nav-link${activeTab === 'album' ? ' active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect('album')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect('album')}
        >
          <i className="fas fa-images" />
          <span>Trang con / Nhật ký</span>
        </a>
        <div className="nav-section">Bảo Mật</div>
        <a
          className={`nav-link${activeTab === 'content_gate' ? ' active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelect('content_gate')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect('content_gate')}
        >
          <i className="fas fa-lock" />
          <span>Mật khẩu nội dung</span>
        </a>
        <a
          className="nav-link"
          role="button"
          tabIndex={0}
          onClick={onLogout}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onLogout()}
        >
          <i className="fas fa-sign-out-alt" />
          <span>Đăng xuất</span>
        </a>
      </div>
    </nav>
  );
}
