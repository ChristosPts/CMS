import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import FooterEditor from '@/components/admin/FooterEditor';

export const metadata = { title: 'Footer' };

export default async function FooterPage() {
  const session = await getServerSession(adminAuthOptions);
  if (session?.user?.role !== 'ADMIN') redirect('/admin/dashboard');

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [settings, navItems, socials, pages] = await Promise.all([
    prisma.setting.findMany({
      where: { key: { in: ['footer_description', 'footer_copyright', 'footer_privacy_url', 'footer_terms_url', 'footer_email', 'footer_phone', 'footer_address'] } },
    }),
    prisma.footerNavItem.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { translations: true },
    }),
    prisma.footerSocial.findMany({ orderBy: [{ sortOrder: 'asc' }] }),
    prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const topLevel = navItems
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      labelJson: Object.fromEntries(item.translations.map((t) => [t.locale, t.label])),
      children:  navItems
        .filter((c) => c.parentId === item.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({
          ...c,
          labelJson: Object.fromEntries(c.translations.map((t) => [t.locale, t.label])),
          children:  [],
        })),
    }));

  const pageOptions = pages.map((p) => ({
    id:    p.id,
    slug:  p.slug,
    label: p.translations[0]?.title || p.slug,
  }));

  return (
    <div>
      <h4 className="mb-4">Footer</h4>
      <FooterEditor
        initial={{ settings: settingsMap, navTree: topLevel, socials }}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        pageOptions={pageOptions}
      />
    </div>
  );
}
