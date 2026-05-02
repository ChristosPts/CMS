import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import NavbarEditor from '@/components/admin/NavbarEditor';

export const metadata = { title: 'Navbar' };

export default async function NavbarPage() {
  const session = await getServerSession(adminAuthOptions);
  if (session?.user?.role !== 'ADMIN') redirect('/admin/dashboard');

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [rawItems, pages] = await Promise.all([
    prisma.navbarItem.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { translations: true },
    }),
    prisma.page.findMany({
      where:   { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select:  {
        id: true, slug: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
  ]);

  // Build tree for the editor
  const topLevel = rawItems
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: rawItems
        .filter((c) => c.parentId === item.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const pageOptions = pages.map((p) => ({
    id:    p.id,
    slug:  p.slug,
    label: p.translations[0]?.title || p.slug,
  }));

  return (
    <div>
      <h4 className="mb-4">Navbar</h4>
      <NavbarEditor
        initialTree={topLevel}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        pageOptions={pageOptions}
      />
    </div>
  );
}
