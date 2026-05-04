import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale, pickTranslation } from '@/lib/locale';
import { getSiteSession, checkVisibility, visibilityFilter } from '@/lib/siteAuth';
import BasicTemplate       from '@/components/site/templates/BasicTemplate';
import GridTemplate        from '@/components/site/templates/GridTemplate';
import ArticleListTemplate from '@/components/site/templates/ArticleListTemplate';
import ContactTemplate     from '@/components/site/templates/ContactTemplate';
import Breadcrumb          from '@/components/site/Breadcrumb';

// ── Data fetcher ───────────────────────────────────────────────────────────

async function fetchPage(slug) {
  return prisma.page.findUnique({
    where:   { slug, status: 'PUBLISHED' },
    include: {
      translations: true,
      gridItems: {
        orderBy: { sortOrder: 'asc' },
        include: { translations: true },
      },
      galleries: {
        orderBy: { sortOrder: 'asc' },
        include: {
          gallery: {
            include: {
              images: { where: { hidden: false }, orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      },
      downloads: {
        orderBy: { sortOrder: 'asc' },
        include: { download: { include: { translations: true } } },
      },
      formFields: { orderBy: { sortOrder: 'asc' } },
      featuredArticles: {
        orderBy: { sortOrder: 'asc' },
        include: {
          article: {
            include: {
              translations: true,
              parentPage: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
}

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return {};

  // Don't expose metadata for restricted pages to unauthenticated crawlers
  const session = await getSiteSession();
  const access  = checkVisibility(page.visibility, page.restrictedRole, session);
  if (access !== 'allowed') return { title: 'Access Restricted' };

  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale      = await getRequestLocale(activeLocales, defaultLocale);
  const translation = pickTranslation(page.translations, locale, defaultLocale);
  const siteSetting = await prisma.setting.findUnique({ where: { key: 'site_name' } });
  const siteName    = siteSetting?.value || 'Site';

  const siteUrl     = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  const title       = translation?.metaTitle || translation?.title || siteName;
  const description = translation?.metaDescription || translation?.summary || '';
  const canonicalUrl = `${siteUrl}/${slug}`;
  const ogImages    = page.featuredImage
    ? [{ url: `${siteUrl}/uploads/${page.featuredImage}`, width: 1200, height: 630 }]
    : [];

  return {
    title,
    description,
    openGraph: {
      type:        'website',
      url:         canonicalUrl,
      title,
      description,
      siteName,
      ...(ogImages.length ? { images: ogImages } : {}),
    },
    twitter: {
      card:        ogImages.length ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImages.length ? { images: [ogImages[0].url] } : {}),
    },
    alternates: { canonical: canonicalUrl },
  };
}

// ── Page component ─────────────────────────────────────────────────────────

export default async function SlugPage({ params, searchParams }) {
  const { slug } = await params;
  const [page, session, breadcrumbSetting] = await Promise.all([
    fetchPage(slug),
    getSiteSession(),
    prisma.setting.findUnique({ where: { key: 'breadcrumb_enabled' } }),
  ]);

  if (!page) notFound();

  if (page.template === 'HOME') redirect('/');

  // ── Visibility enforcement ─────────────────────────────────────────────
  const access = checkVisibility(page.visibility, page.restrictedRole, session);
  if (access === 'unauthenticated') {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/${slug}`)}`);
  }
  if (access === 'forbidden') notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale      = await getRequestLocale(activeLocales, defaultLocale);
  const translation = pickTranslation(page.translations, locale, defaultLocale);

  if (!translation) notFound();

  const showBreadcrumb  = breadcrumbSetting?.value !== 'false';
  const breadcrumbItems = showBreadcrumb
    ? [{ label: 'Home', href: '/' }, { label: translation.title }]
    : null;

  const templateProps = { page, translation, locale, defaultLocale, breadcrumbItems };

  // ── ARTICLE_LIST — session-aware article filter + search/category/sort ──
  if (page.template === 'ARTICLE_LIST') {
    const sp          = await searchParams;
    const articlePage = Math.max(1, parseInt(sp?.page ?? '1', 10));
    const perPage     = 12;
    const searchQuery = sp?.q ?? '';
    const activeCategory = sp?.cat ?? '';
    const sortDir     = sp?.sort === 'asc' ? 'asc' : 'desc';

    // Resolve category slug → id
    let categoryId = null;
    if (activeCategory) {
      const cat = await prisma.articleCategory.findUnique({ where: { slug: activeCategory } });
      categoryId = cat?.id ?? null;
    }

    const articleWhere = {
      parentPageId: page.id,
      status:       'PUBLISHED',
      ...visibilityFilter(session),
      ...(searchQuery ? { translations: { some: { title: { contains: searchQuery } } } } : {}),
      ...(categoryId  ? { categories: { some: { categoryId } } } : {}),
    };

    const [articles, articleCount, allCategories] = await Promise.all([
      prisma.article.findMany({
        where:   articleWhere,
        orderBy: [{ publishDate: sortDir }, { createdAt: sortDir }],
        skip:    (articlePage - 1) * perPage,
        take:    perPage,
        include: {
          translations: true,
          categories: { include: { category: { include: { translations: true } } } },
        },
      }),
      prisma.article.count({ where: articleWhere }),
      prisma.articleCategory.findMany({
        orderBy:  { sortOrder: 'asc' },
        include:  { translations: true },
      }),
    ]);

    return (
      <ArticleListTemplate
        {...templateProps}
        articles={articles}
        articleCount={articleCount}
        articlePage={articlePage}
        perPage={perPage}
        categories={allCategories}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        sortDir={sortDir}
      />
    );
  }

  if (page.template === 'BASIC') {
    const featuredArticles = (page.featuredArticles ?? [])
      .filter(({ article }) =>
        article.status === 'PUBLISHED' &&
        checkVisibility(article.visibility, article.restrictedRole, session) === 'allowed'
      )
      .map(({ article }) => article);
    return <BasicTemplate {...templateProps} featuredArticles={featuredArticles} />;
  }

  switch (page.template) {
    case 'GRID':           return <GridTemplate {...templateProps} />;
    case 'ARTICLE_SINGLE': return <BasicTemplate {...templateProps} featuredArticles={[]} />;
    case 'CONTACT':        return <ContactTemplate {...templateProps} locale={locale} defaultLocale={defaultLocale} />;
    default:               notFound();
  }
}
