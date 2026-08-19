'use client';

import { ADMIN_TABLES } from '@/lib/cms/admin-schema';

interface SidebarProps {
  activeTab: string;
  unreadCount: number;
  onSelect: (tab: string) => void;
  onLogout: () => void;
}

const SECTIONS: { title: string; tables: string[] }[] = [
  { title: 'Cấu Hình', tables: ['site_settings'] },
  { title: 'Nội Dung', tables: ['slides', 'activity_images', 'menus', 'categories', 'category_submenus', 'posts', 'projects', 'products', 'partners', 'testimonials', 'videos', 'photos'] },
  { title: 'Liên Hệ', tables: ['contact_submissions'] },
  { title: 'Hệ Thống', tables: ['links'] },
];

export default function Sidebar({ activeTab, unreadCount, onSelect, onLogout }: SidebarProps) {
  const byName = new Map(ADMIN_TABLES.map((t) => [t.name, t]));

  return (
    <nav className="sidebar">
      <div className="brand">
        <h5>
          <i className="fas fa-crown" /> ADMIN
        </h5>
        <small>Bê Tông Cửa Âu</small>
      </div>
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
                </span>
              </a>
            );
          })}
        </div>
      ))}
      <a
        className="nav-link"
        role="button"
        tabIndex={0}
        style={{ color: '#dc3545' }}
        onClick={onLogout}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onLogout()}
      >
        <i className="fas fa-sign-out-alt" />
        <span>Đăng xuất</span>
      </a>
    </nav>
  );
}
