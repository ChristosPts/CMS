import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import NavbarEditor from '@/components/admin/NavbarEditor';
import LogoUploader from '@/components/admin/LogoUploader';

export const metadata = { title: 'Navbar' };

export default async function NavbarPage() {
  const session = await getServerSession(adminAuthOptions);
  if (session?.user?.role !== 'ADMIN') redirect('/admin/dashboard');

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [rawItems, pages, logoSetting] = await Promise.all([
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
    prisma.setting.findUnique({ where: { key: 'logo' } }),
  ]);

  function buildTree(items, parentId = null, depth = 0) {
    if (depth >= 3) return [];
    return items
      .filter((i) => (i.parentId ?? null) === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ ...item, children: buildTree(items, item.id, depth + 1) }));
  }
  const topLevel = buildTree(rawItems);

  const pageOptions = pages.map((p) => ({
    id:    p.id,
    slug:  p.slug,
    label: p.translations[0]?.title || p.slug,
  }));

  return (
    <div>
      <h4 className="mb-4">Navbar</h4>

      {/* Site logo */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header fw-semibold">Site Logo</div>
        <div className="card-body">
          <p className="text-muted small mb-3">Used in the navbar, footer, and admin sidebar.</p>
          <LogoUploader currentLogo={logoSetting?.value ?? ''} />
        </div>
      </div>

      <NavbarEditor
        initialTree={topLevel}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        pageOptions={pageOptions}
      />
    </div>
  );
}
