import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import ArticleForm from '@/components/admin/ArticleForm';

export const metadata = { title: 'Edit Article' };

export default async function EditArticlePage({ params }) {
  const { section, id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [sectionPage, article] = await Promise.all([
    prisma.page.findFirst({
      where: { slug: section, template: 'ARTICLE_LIST' },
      include: { translations: { where: { locale: defaultLocale } } },
    }),
    prisma.article.findUnique({
      where: { id },
      include: {
        translations: true,
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
      },
    }),
  ]);

  if (!sectionPage || !article || article.parentPageId !== sectionPage.id) notFound();

  const sectionTitle = sectionPage.translations[0]?.title ?? section;

  const TYPE_LABELS = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  };
  const STATUS_CLS = { PUBLISHED: 'bg-success', DRAFT: 'bg-warning text-dark', HIDDEN: 'bg-secondary' };

  const initialConnections = {
    galleries: article.galleries.map(({ gallery, sortOrder }) => ({
      id:        gallery.id,
      sortOrder,
      label:     gallery.title,
      thumb:     gallery.images[0]?.filename ?? null,
      meta:      null,
    })),
    downloads: article.downloads.map(({ download, sortOrder }) => {
      const trans = download.translations.find((t) => t.locale === defaultLocale) ?? download.translations[0];
      return {
        id:        download.id,
        sortOrder,
        label:     trans?.title ?? download.originalName,
        thumb:     null,
        meta:      TYPE_LABELS[download.fileType] ?? 'FILE',
      };
    }),
  };

  const articleTitle =
  article.translations.find(t => t.locale === defaultLocale)?.title ||
  article.translations[0]?.title ||
  article.slug;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href={`/admin/${section}`} className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">Edit - {articleTitle}</h4>
        <a
          href={`/${section}/${article.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline-secondary ms-auto"
        >
          <i className="bi bi-box-arrow-up-right me-1" />View
        </a>
      </div>

      <ArticleForm
        initial={article}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        parentPageId={sectionPage.id}
        sectionSlug={section}
        articleId={id}
        initialConnections={initialConnections}
      />
    </div>
  );
}
