'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar({ role, articleSections, siteName, unreadCount }) {
  const pathname = usePathname();

  function isActive(href) {
    if (href === '/admin/dashboard') return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="admin-sidebar">
      <Link href="/admin/dashboard" className="sidebar-brand">
        {siteName || 'CMS Admin'}
      </Link>

      <nav className="flex-grow-1 py-2">
        {/* ── Main ───────────────────────────────────────────── */}
        <div className="sidebar-section">Main</div>

        <Link
          href="/admin/dashboard"
          className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
        >
          <i className="bi bi-speedometer2" />
          Dashboard
        </Link>

        {/* ── Content ────────────────────────────────────────── */}
        {articleSections.length > 0 && (
          <>
            <div className="sidebar-section">Content</div>
            {articleSections.map((page) => (
              <Link
                key={page.id}
                href={`/admin/${page.slug}`}
                className={`nav-link ${isActive(`/admin/${page.slug}`) ? 'active' : ''}`}
              >
                <i className="bi bi-file-earmark-text" />
                {page.label}
              </Link>
            ))}
          </>
        )}

        {/* ── Media & Files ───────────────────────────────────── */}
        <div className="sidebar-section">Media &amp; Files</div>

        <Link
          href="/admin/galleries"
          className={`nav-link ${isActive('/admin/galleries') ? 'active' : ''}`}
        >
          <i className="bi bi-images" />
          Galleries
        </Link>

        <Link
          href="/admin/downloads"
          className={`nav-link ${isActive('/admin/downloads') ? 'active' : ''}`}
        >
          <i className="bi bi-download" />
          Downloads
        </Link>

        {/* ── Management ──────────────────────────────────────── */}
        <div className="sidebar-section">Management</div>

        <Link
          href="/admin/pages"
          className={`nav-link ${isActive('/admin/pages') ? 'active' : ''}`}
        >
          <i className="bi bi-layout-text-sidebar-reverse" />
          Pages
        </Link>

        <Link
          href="/admin/users"
          className={`nav-link ${isActive('/admin/users') ? 'active' : ''}`}
        >
          <i className="bi bi-people" />
          Users
        </Link>

        <Link
          href="/admin/messages"
          className={`nav-link ${isActive('/admin/messages') ? 'active' : ''}`}
        >
          <i className="bi bi-envelope" />
          Messages
          {unreadCount > 0 && (
            <span className="badge bg-danger ms-auto" style={{ fontSize: '0.65rem' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* ── Admin only ──────────────────────────────────────── */}
        {role === 'ADMIN' && (
          <>
            <div className="sidebar-section">Admin</div>

            <Link
              href="/admin/navbar"
              className={`nav-link ${isActive('/admin/navbar') ? 'active' : ''}`}
            >
              <i className="bi bi-menu-button-wide" />
              Navbar
            </Link>

            <Link
              href="/admin/settings"
              className={`nav-link ${isActive('/admin/settings') ? 'active' : ''}`}
            >
              <i className="bi bi-gear" />
              Settings
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
