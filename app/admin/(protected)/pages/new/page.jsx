import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import PageForm from '@/components/admin/PageForm';

export const metadata = { title: 'New Page' };

export default async function NewPagePage() {
  const session = await getServerSession(adminAuthOptions);
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const parentPages = await prisma.page.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      translations: { where: { locale: defaultLocale }, select: { title: true } },
    },
  });

  const parentOptions = parentPages.map((p) => ({
    id: p.id,
    label: p.translations[0]?.title || `Page #${p.id}`,
  }));

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/pages" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">New Page</h4>
      </div>

      <PageForm
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        parentPages={parentOptions}
        role={session.user.role}
      />
    </div>
  );
}
