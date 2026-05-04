'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminShell({ role, articleSections, gridSections, contactPages, siteName, logo, unreadCount, username, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <AdminSidebar
        role={role}
        articleSections={articleSections}
        gridSections={gridSections}
        contactPages={contactPages}
        siteName={siteName}
        logo={logo}
        unreadCount={unreadCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <AdminTopbar
        username={username}
        role={role}
        unreadCount={unreadCount}
        onMenuToggle={() => setSidebarOpen((o) => !o)}
      />
      <main className="admin-main">{children}</main>
    </>
  );
}
