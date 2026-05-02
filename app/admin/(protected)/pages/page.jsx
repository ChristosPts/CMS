import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PagesTable from '@/components/admin/PagesTable';

export const metadata = { title: 'Pages' };

export default async function PagesListPage({ searchParams }) {
  const session  = await getServerSession(adminAuthOptions);
  const sp = await searchParams;
  const search   = sp.search   ?? '';
  const status   = sp.status   ?? '';
  const template = sp.template ?? '';
  const page     = Math.max(1, parseInt(sp.page ?? '1', 10));
  const perPage  = 20;
  const sortBy   = sp.sortBy  ?? 'sortOrder';
  const sortDir  = sp.sortDir ?? 'asc';

  const allowedSortFields = ['sortOrder', 'createdAt', 'updatedAt', 'status', 'template'];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';

  const where = {
    ...(status   ? { status }   : {}),
    ...(template ? { template } : {}),
    ...(search   ? { translations: { some: { title: { contains: search } } } } : {}),
  };

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, slug: true, template: true, status: true,
        sortOrder: true, updatedAt: true,
        translations: { select: { locale: true, title: true } },
      },
    }),
    prisma.page.count({ where }),
  ]);

  return (
    <div>
      <h4 className="mb-4">Pages</h4>
      <PagesTable
        pages={pages}
        total={total}
        page={page}
        perPage={perPage}
        sortBy={sortBy}
        sortDir={sortDir}
        search={search}
        status={status}
        template={template}
        role={session.user.role}
      />
    </div>
  );
}
