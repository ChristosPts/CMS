'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

function SidebarGroup({ id, label, links, pathname, openId, onToggle, onNavClick }) {
  const isOpen = openId === id;

  return (
    <div>
      <button
        type="button"
        className={`sidebar-group-btn ${isOpen ? '' : 'collapsed'}`}
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={`sg-${id}`}
      >
        {label}
        <i className="bi bi-chevron-down sg-chevron" />
      </button>

      <div id={`sg-${id}`} className={`sidebar-group-body collapse ${isOpen ? 'show' : ''}`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname.startsWith(link.href) ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <i className={`bi bi-${link.icon}`} />
            {link.label}
            {link.badge > 0 && (
              <span className="badge bg-danger ms-auto" style={{ fontSize: '0.65rem' }}>
                {link.badge > 99 ? '99+' : link.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminSidebar({ role, articleSections, contactPages, siteName, logo, unreadCount, open, onClose }) {
  const pathname = usePathname();

  const groups = [
    {
      id: 'content',
      label: 'Content',
      links: [
        { href: '/admin/pages', icon: 'layout-text-sidebar-reverse', label: 'Pages', badge: 0 },
        ...articleSections.map((p) => ({
          href:  `/admin/${p.slug}`,
          icon:  'file-earmark-text',
          label: p.label,
          badge: 0,
        })),
      ],
    },
    {
      id: 'media',
      label: 'Media',
      links: [
        { href: '/admin/galleries', icon: 'images',   label: 'Galleries', badge: 0 },
        { href: '/admin/downloads', icon: 'download', label: 'Downloads', badge: 0 },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      links: [
        ...contactPages.map((p) => ({
          href:  `/admin/contact/${p.id}`,
          icon:  'envelope-paper',
          label: p.label,
          badge: 0,
        })),
        { href: '/admin/messages', icon: 'envelope', label: 'Messages', badge: unreadCount },
      ],
    },
  ];

  if (role === 'ADMIN') {
    groups.push({
      id: 'admin',
      label: 'Admin',
      links: [
        { href: '/admin/users',    icon: 'people',             label: 'Users',    badge: 0 },
        { href: '/admin/navbar',   icon: 'menu-button-wide',   label: 'Navbar',   badge: 0 },
        { href: '/admin/footer',   icon: 'layout-text-window', label: 'Footer',   badge: 0 },
        { href: '/admin/settings', icon: 'gear',               label: 'Settings', badge: 0 },
      ],
    });
  }

  function getActiveGroup() {
    return groups.find((g) => g.links.some((l) => pathname.startsWith(l.href)))?.id ?? 'content';
  }

  const [openId, setOpenId] = useState(() => getActiveGroup());

  useEffect(() => {
    setOpenId(getActiveGroup());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggle(id) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'active' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`admin-sidebar ${open ? 'sidebar-open' : ''}`}>
        <Link href="/admin/dashboard" className="sidebar-brand" onClick={onClose}>
          {logo ? (
            <Image
              src={`/uploads/${logo}`}
              alt={siteName || 'CMS'}
              width={120}
              height={28}
              style={{ objectFit: 'contain', maxHeight: 28, width: 'auto' }}
              unoptimized
            />
          ) : (
            siteName || 'CMS Admin'
          )}
        </Link>

        <nav className="flex-grow-1 py-1">
          <Link
            href="/admin/dashboard"
            className={`sidebar-standalone ${pathname === '/admin/dashboard' ? 'active' : ''}`}
            onClick={onClose}
          >
            <i className="bi bi-speedometer2" />
            Dashboard
          </Link>

          {groups.map((g) => (
            <SidebarGroup
              key={g.id}
              id={g.id}
              label={g.label}
              links={g.links}
              pathname={pathname}
              openId={openId}
              onToggle={toggle}
              onNavClick={onClose}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
