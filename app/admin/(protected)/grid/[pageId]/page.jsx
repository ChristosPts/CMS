import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDefaultLocale } from '@/lib/settings';
import Link from 'next/link';
import Image from 'next/image';
import GridItemsListClient from '@/components/admin/GridItemsListClient';

export async function generateMetadata({ params }) {
  const { pageId } = await params;
  const page = await prisma.page.findFirst({
    where: { id: parseInt(pageId, 10), template: 'GRID' },
    include: { translations: { take: 1 } },
  });
  if (!page) return {};
  return { title: page.translations[0]?.title ?? 'Grid Items' };
}

export default async function GridSectionPage({ params, searchParams }) {
  const { pageId: rawId } = await params;
  const pageId = parseInt(rawId, 10);
  if (isNaN(pageId)) notFound();

  const session       = await getServerSession(adminAuthOptions);
  const defaultLocale = await getDefaultLocale();

  const gridPage = await prisma.page.findUnique({
    where: { id: pageId, template: 'GRID' },
    include: { translations: { where: { locale: defaultLocale } } },
  });
  if (!gridPage) notFound();

  const pageTitle = gridPage.translations[0]?.title ?? `Grid #${pageId}`;

  const sp     = await searchParams;
  const search = sp.search ?? '';
  const page   = Math.max(1, parseInt(sp.page ?? '1', 10));
  const perPage = 20;

  const where = {
    pageId,
    ...(search ? { translations: { some: { name: { contains: search } } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.gridItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { translations: { where: { locale: defaultLocale } } },
    }),
    prisma.gridItem.count({ where }),
  ]);

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <h4 className="mb-0">{pageTitle}</h4>
        <Link href={`/admin/pages/${pageId}/edit`} className="btn btn-sm btn-outline-secondary ms-auto">
          <i className="bi bi-gear me-1" />Page settings
        </Link>
        <Link href={`/admin/grid/${pageId}/new`} className="btn btn-sm btn-primary">
          <i className="bi bi-plus-lg me-1" />New Item
        </Link>
      </div>

      <GridItemsListClient
        items={items}
        total={total}
        page={page}
        perPage={perPage}
        search={search}
        pageId={pageId}
        role={session.user.role}
      />
    </div>
  );
}
