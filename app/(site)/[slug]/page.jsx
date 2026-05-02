import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale, pickTranslation } from '@/lib/locale';
import { getSiteSession, checkVisibility, visibilityFilter } from '@/lib/siteAuth';
import BasicTemplate       from '@/components/site/templates/BasicTemplate';
import GridTemplate        from '@/components/site/templates/GridTemplate';
import ArticleListTemplate from '@/components/site/templates/ArticleListTemplate';
import ContactTemplate     from '@/components/site/templates/ContactTemplate';

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
  const [page, session] = await Promise.all([fetchPage(slug), getSiteSession()]);

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

  const templateProps = { page, translation, locale, defaultLocale };

  // ── ARTICLE_LIST — session-aware article filter ────────────────────────
  if (page.template === 'ARTICLE_LIST') {
    const sp = await searchParams;
    const articlePage = Math.max(1, parseInt(sp?.page ?? '1', 10));
    const perPage     = 12;

    const articleWhere = {
      parentPageId: page.id,
      status:       'PUBLISHED',
      ...visibilityFilter(session),
    };

    const [articles, articleCount] = await Promise.all([
      prisma.article.findMany({
        where:   articleWhere,
        orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
        skip:    (articlePage - 1) * perPage,
        take:    perPage,
        include: { translations: true },
      }),
      prisma.article.count({ where: articleWhere }),
    ]);

    return (
      <ArticleListTemplate
        {...templateProps}
        articles={articles}
        articleCount={articleCount}
        articlePage={articlePage}
        perPage={perPage}
      />
    );
  }

  switch (page.template) {
    case 'BASIC':        return <BasicTemplate {...templateProps} />;
    case 'GRID':         return <GridTemplate {...templateProps} />;
    case 'ARTICLE_SINGLE': return <BasicTemplate {...templateProps} />;
    case 'CONTACT':      return <ContactTemplate {...templateProps} />;
    default:             notFound();
  }
}
