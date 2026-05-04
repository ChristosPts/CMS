import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDefaultLocale } from '@/lib/settings';
import AdminShell from '@/components/admin/AdminShell';
import BootstrapInit from '@/components/admin/BootstrapInit';
import '@/styles/admin.css';

export default async function ProtectedAdminLayout({ children }) {
  const session = await getServerSession(adminAuthOptions);

  if (!session) {
    redirect('/admin/login');
  }

  const defaultLocale = await getDefaultLocale();

  const [articleSections, gridSections, contactPages, unreadCount, settings] = await Promise.all([
    prisma.page.findMany({
      where: { template: 'ARTICLE_LIST', status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
    prisma.page.findMany({
      where: { template: 'GRID', status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
    prisma.page.findMany({
      where: { template: 'CONTACT' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
    prisma.message.count({ where: { read: false } }),
    prisma.setting.findMany({ where: { key: { in: ['site_name', 'logo'] } } }),
  ]);

  const getSetting = (key) => settings.find((s) => s.key === key)?.value ?? '';

  return (
    <>
      <BootstrapInit />
      <AdminShell
        role={session.user.role}
        username={session.user.username}
        articleSections={articleSections.map((p) => ({ id: p.id, slug: p.slug, label: p.translations[0]?.title || p.slug }))}
        gridSections={gridSections.map((p) => ({ id: p.id, slug: p.slug, label: p.translations[0]?.title || p.slug }))}
        contactPages={contactPages.map((p) => ({ id: p.id, label: p.translations[0]?.title || `Contact #${p.id}` }))}
        siteName={getSetting('site_name')}
        logo={getSetting('logo')}
        unreadCount={unreadCount}
      >
        {children}
      </AdminShell>
    </>
  );
}
