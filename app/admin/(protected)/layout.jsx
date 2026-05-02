import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import BootstrapInit from '@/components/admin/BootstrapInit';
import '@/styles/admin.css';

export default async function ProtectedAdminLayout({ children }) {
  const session = await getServerSession(adminAuthOptions);

  if (!session) {
    redirect('/admin/login');
  }

  // Fetch data for sidebar and topbar
  const [articleSections, unreadCount, siteSetting] = await Promise.all([
    prisma.page.findMany({
      where: { template: 'ARTICLE_LIST', status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        translations: {
          where: { locale: 'en' },
          select: { title: true },
        },
      },
    }),
    prisma.message.count({ where: { read: false } }),
    prisma.setting.findUnique({ where: { key: 'site_name' } }),
  ]);

  const sections = articleSections.map((p) => ({
    id: p.id,
    slug: p.slug,
    label: p.translations[0]?.title || p.slug,
  }));

  const siteName = siteSetting?.value || 'CMS Admin';

  return (
    <>
      <BootstrapInit />
      <AdminSidebar
        role={session.user.role}
        articleSections={sections}
        siteName={siteName}
        unreadCount={unreadCount}
      />
      <AdminTopbar
        username={session.user.username}
        role={session.user.role}
        unreadCount={unreadCount}
      />
      <main className="admin-main">{children}</main>
    </>
  );
}
