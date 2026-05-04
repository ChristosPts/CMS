import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import ArticleForm from '@/components/admin/ArticleForm';

export const metadata = { title: 'New Article' };

export default async function NewArticlePage({ params }) {
  const { section } = await params;
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const [sectionPage, allCategories] = await Promise.all([
    prisma.page.findFirst({
      where: { slug: section, template: 'ARTICLE_LIST' },
      include: { translations: { where: { locale: defaultLocale } } },
    }),
    prisma.articleCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: true } }),
  ]);
  if (!sectionPage) notFound();

  const sectionTitle = sectionPage.translations[0]?.title ?? section;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href={`/admin/${section}`} className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">New {sectionTitle}</h4>
      </div>

      <ArticleForm
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        parentPageId={sectionPage.id}
        sectionSlug={section}
        availableCategories={allCategories}
      />
    </div>
  );
}
