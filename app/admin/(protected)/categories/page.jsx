import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import CategoriesManager from '@/components/admin/CategoriesManager';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const session = await getServerSession(adminAuthOptions);
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const categories = await prisma.articleCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: true,
      _count: { select: { articles: true } },
    },
  });

  return (
    <div>
      <h4 className="mb-2">Article Categories</h4>
      <p className="text-muted small mb-4">Global categories applied across all article sections.</p>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <CategoriesManager
            initialCategories={categories}
            activeLocales={activeLocales}
            defaultLocale={defaultLocale}
            role={session.user.role}
          />
        </div>
      </div>
    </div>
  );
}
