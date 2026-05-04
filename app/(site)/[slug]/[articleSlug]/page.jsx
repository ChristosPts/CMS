import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale, pickTranslation } from '@/lib/locale';
import { getSiteSession, checkVisibility } from '@/lib/siteAuth';
import GalleryCarousel from '@/components/site/GalleryCarousel';
import DownloadList from '@/components/site/DownloadList';
import Breadcrumb from '@/components/site/Breadcrumb';

// Parse article ID from the slug format: "{id}-{rest}"
function parseArticleId(articleSlug) {
  const id = parseInt(articleSlug.split('-')[0], 10);
  return isNaN(id) ? null : id;
}

async function fetchArticle(parentSlug, articleSlug) {
  const id = parseArticleId(articleSlug);
  if (!id) return null;

  return prisma.article.findFirst({
    where: {
      id,
      status: 'PUBLISHED',
      parentPage: { slug: parentSlug },
    },
    include: {
      translations: true,
      parentPage: {
        select: { slug: true, translations: { select: { locale: true, title: true } } },
      },
      author: { select: { name: true, username: true } },
      categories: {
        include: { category: { include: { translations: true } } },
      },
      galleries: {
        orderBy: { sortOrder: 'asc' },
        include: {
          gallery: { include: { images: { where: { hidden: false }, orderBy: { sortOrder: 'asc' } } } },
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
  const { slug, articleSlug } = await params;
  const article = await fetchArticle(slug, articleSlug);
  if (!article) return {};

  const session = await getSiteSession();
  const access  = checkVisibility(article.visibility, article.restrictedRole, session);
  if (access !== 'allowed') return { title: 'Access Restricted' };

  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale      = await getRequestLocale(activeLocales, defaultLocale);
  const translation = pickTranslation(article.translations, locale, defaultLocale);
  const siteSetting = await prisma.setting.findUnique({ where: { key: 'site_name' } });
  const siteName    = siteSetting?.value || 'Site';

  const siteUrl      = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  const title        = translation?.metaTitle || translation?.title || siteName;
  const description  = translation?.metaDescription || translation?.summary || '';
  const canonicalUrl = `${siteUrl}/${slug}/${articleSlug}`;
  const ogImages     = article.featuredImage
    ? [{ url: `${siteUrl}/uploads/${article.featuredImage}`, width: 1200, height: 630 }]
    : [];

  const publishedTime = (article.publishDate ?? article.createdAt).toISOString();
  const modifiedTime  = article.updatedAt.toISOString();

  return {
    title,
    description,
    openGraph: {
      type:          'article',
      url:           canonicalUrl,
      title,
      description,
      siteName,
      publishedTime,
      modifiedTime,
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

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }) {
  const { slug, articleSlug } = await params;
  const [article, session, breadcrumbSetting] = await Promise.all([
    fetchArticle(slug, articleSlug),
    getSiteSession(),
    prisma.setting.findUnique({ where: { key: 'breadcrumb_enabled' } }),
  ]);

  if (!article) notFound();

  // ── Visibility enforcement ───────────────────────────────────────────────
  const access = checkVisibility(article.visibility, article.restrictedRole, session);
  if (access === 'unauthenticated') {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/${slug}/${articleSlug}`)}`);
  }
  if (access === 'forbidden') notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale      = await getRequestLocale(activeLocales, defaultLocale);
  const translation = pickTranslation(article.translations, locale, defaultLocale);
  if (!translation) notFound();

  const parentTitle = pickTranslation(article.parentPage.translations, locale, defaultLocale)?.title
    ?? article.parentPage.slug;

  // JSON-LD Article structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: translation.title,
    description: translation.summary || '',
    datePublished: article.publishDate?.toISOString() ?? article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: article.author?.name || article.author?.username || 'Author',
    },
    ...(article.featuredImage
      ? { image: `${process.env.NEXTAUTH_URL}/uploads/${article.featuredImage}` }
      : {}),
  };

  const publishDate = article.publishDate
    ? new Date(article.publishDate).toLocaleDateString(locale, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            {breadcrumbSetting?.value !== 'false' && (
              <Breadcrumb items={[
                { label: 'Home', href: '/' },
                { label: parentTitle, href: `/${slug}` },
                { label: translation.title },
              ]} />
            )}

            {/* Featured image */}
            {article.featuredImage && (
              <div className="mb-4">
                <Image
                  src={`/uploads/${article.featuredImage}`}
                  alt={translation.title}
                  width={800}
                  height={400}
                  className="img-fluid rounded"
                  style={{ objectFit: 'cover', width: '100%', height: 360 }}
                  priority
                />
              </div>
            )}

            <h1 className="mb-3">{translation.title}</h1>

            {/* Meta */}
            <div className="d-flex align-items-center gap-3 text-muted small mb-4">
              {publishDate && (
                <span><i className="bi bi-calendar3 me-1" />{publishDate}</span>
              )}
              {article.author && (
                <span>
                  <i className="bi bi-person me-1" />
                  {article.author.name || article.author.username}
                </span>
              )}
            </div>

            {/* Category chips — click goes back to section with filter */}
            {article.categories?.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mb-4">
                {article.categories.map(({ category }) => {
                  const catTrans = pickTranslation(category.translations, locale, defaultLocale);
                  return (
                    <a
                      key={category.id}
                      href={`/${slug}?cat=${category.slug}`}
                      className="badge bg-light text-dark border text-decoration-none fw-normal px-3 py-2"
                    >
                      {catTrans?.name ?? category.slug}
                    </a>
                  );
                })}
              </div>
            )}

            {translation.summary && (
              <p className="lead text-muted mb-4">{translation.summary}</p>
            )}

            {translation.content && (
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{ __html: translation.content }}
              />
            )}

            {/* Galleries */}
            {article.galleries?.length > 0 && (
              <div className="mt-4 row g-3">
                {article.galleries.map(({ gallery }) => (
                  <div key={gallery.id} className="col-12 col-md-6">
                    <GalleryCarousel images={gallery.images} title={gallery.title} displayMode="thumbnail" />
                  </div>
                ))}
              </div>
            )}

            {/* Downloads */}
            {article.downloads?.length > 0 && (
              <DownloadList
                heading="Downloads"
                items={article.downloads.map(({ download }) => {
                  const trans = pickTranslation(download.translations, locale, defaultLocale);
                  return { download, title: trans?.title ?? download.originalName, description: trans?.description ?? '' };
                })}
              />
            )}

            <div className="mt-5">
              <a href={`/${slug}`} className="btn btn-outline-secondary btn-sm">
                <i className="bi bi-arrow-left me-1" />Back to {parentTitle}
              </a>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
