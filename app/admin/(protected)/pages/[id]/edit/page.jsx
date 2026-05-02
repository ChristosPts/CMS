import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import PageForm from '@/components/admin/PageForm';

export const metadata = { title: 'Edit Page' };

export default async function EditPagePage({ params }) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  console.log(id)
  if (isNaN(id)) notFound();

  const session = await getServerSession(adminAuthOptions);
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [page, allPages] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        translations: true,
        gridItems: {
          orderBy: { sortOrder: 'asc' },
          include: { translations: true },
        },
        galleries: {
          orderBy: { sortOrder: 'asc' },
          include: {
            gallery: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { filename: true } } } },
          },
        },
        downloads: {
          orderBy: { sortOrder: 'asc' },
          include: { download: { include: { translations: true } } },
        },
        featuredArticles: {
          orderBy: { sortOrder: 'asc' },
          include: { article: { include: { translations: { select: { locale: true, title: true } } } } },
        },
      },
    }),
    prisma.page.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        translations: { where: { locale: defaultLocale }, select: { title: true } },
      },
    }),
  ]);

  if (!page) notFound();

  const parentOptions = allPages.map((p) => ({
    id: p.id,
    label: p.translations[0]?.title || `Page #${p.id}`,
  }));

  // Normalise connections into the picker's expected format
  const initialConnections = {
    galleries: page.galleries.map(({ gallery, sortOrder }) => ({
      id:        gallery.id,
      sortOrder,
      label:     gallery.title,
      thumb:     gallery.images[0]?.filename ?? null,
      meta:      null,
    })),
    downloads: page.downloads.map(({ download, sortOrder }) => {
      const trans = download.translations.find((t) => t.locale === defaultLocale) ?? download.translations[0];
      return {
        id:        download.id,
        sortOrder,
        label:     trans?.title ?? download.originalName,
        thumb:     null,
        meta:      { 'application/pdf': 'PDF', 'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' }[download.fileType] ?? 'FILE',
      };
    }),
    articles: page.featuredArticles.map(({ article, sortOrder }) => {
      const trans = article.translations.find((t) => t.locale === defaultLocale) ?? article.translations[0];
      return {
        id:        article.id,
        sortOrder,
        label:     trans?.title ?? article.slug,
        thumb:     null,
        meta:      article.status,
        metaCls:   { PUBLISHED: 'bg-success', DRAFT: 'bg-warning text-dark', HIDDEN: 'bg-secondary' }[article.status],
      };
    }),
  };

  const pageTitle =
  page.translations.find(t => t.locale === defaultLocale)?.title ||
  page.translations[0]?.title ||
  page.slug;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/pages" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">Edit {pageTitle}</h4>
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline-secondary ms-auto"
        >
          <i className="bi bi-box-arrow-up-right me-1" />View
        </a>
      </div>

      <PageForm
        initial={page}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        parentPages={parentOptions}
        role={session.user.role}
        pageId={id}
        initialConnections={initialConnections}
      />
    </div>
  );
}
