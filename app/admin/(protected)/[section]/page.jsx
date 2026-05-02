import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDefaultLocale } from '@/lib/settings';
import ArticlesTable from '@/components/admin/ArticlesTable';

export async function generateMetadata({ params }) {
  const { section } = await params;
  const page = await prisma.page.findFirst({
    where: { slug: section, template: 'ARTICLE_LIST' },
    include: { translations: { take: 1 } },
  });
  if (!page) return {};
  return { title: page.translations[0]?.title ?? section };
}

export default async function SectionPage({ params, searchParams }) {
  const { section } = await params;
  const session     = await getServerSession(adminAuthOptions);
  const defaultLocale = await getDefaultLocale();

  const sectionPage = await prisma.page.findFirst({
    where: { slug: section, template: 'ARTICLE_LIST' },
    include: { translations: { where: { locale: defaultLocale } } },
  });
  if (!sectionPage) notFound();

  const sectionTitle = sectionPage.translations[0]?.title ?? section;
  const sp = await searchParams;
  const search   = sp.search   ?? '';
  const status   = sp.status   ?? '';
  const page     = Math.max(1, parseInt(sp.page ?? '1', 10));
  const perPage  = 20;
  const sortBy   = sp.sortBy  ?? 'publishDate';
  const sortDir  = sp.sortDir ?? 'desc';

  const allowedSort = ['publishDate', 'createdAt', 'updatedAt', 'status'];
  const orderField  = allowedSort.includes(sortBy) ? sortBy : 'publishDate';

  const where = {
    parentPageId: sectionPage.id,
    ...(status ? { status } : {}),
    ...(search ? { translations: { some: { title: { contains: search } } } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, slug: true, status: true, featuredImage: true,
        publishDate: true, updatedAt: true,
        author: { select: { id: true, name: true, username: true } },
        translations: { select: { locale: true, title: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return (
    <div>
      <h4 className="mb-4">{sectionTitle}</h4>
      <ArticlesTable
        articles={articles}
        total={total}
        page={page}
        perPage={perPage}
        sortBy={sortBy}
        sortDir={sortDir}
        search={search}
        status={status}
        sectionSlug={section}
        role={session.user.role}
      />
    </div>
  );
}
