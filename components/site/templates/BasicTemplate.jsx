import Image from 'next/image';
import Link from 'next/link';
import GalleryCarousel from '@/components/site/GalleryCarousel';
import DownloadList from '@/components/site/DownloadList';
import Breadcrumb from '@/components/site/Breadcrumb';

function pickTrans(translations, locale, defaultLocale) {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    translations[0]
  );
}

export default function BasicTemplate({ page, translation, locale, defaultLocale, featuredArticles = [], breadcrumbItems }) {
  return (
    <article className="container py-5">
      <Breadcrumb items={breadcrumbItems} />
      {/* Featured image */}
      {page.featuredImage && (
        <div className="mb-4">
          <Image
            src={`/uploads/${page.featuredImage}`}
            alt={translation.title}
            width={1200}
            height={500}
            className="img-fluid rounded"
            style={{ objectFit: 'cover', maxHeight: 400, width: '100%' }}
            priority
          />
        </div>
      )}

      <h1 className="mb-3">{translation.title}</h1>

      {translation.summary && (
        <p className="lead text-muted mb-4">{translation.summary}</p>
      )}

      {translation.content && (
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: translation.content }}
        />
      )}

      {/* Galleries — connected via Step 12 many-to-many UI */}
      {page.galleries?.length > 0 && (
        <div className="mt-5">
          <div className="row g-4">
            {page.galleries.map(({ gallery }) => (
              <div key={gallery.id} className="col-12 col-md-6">
                <GalleryCarousel
                  images={gallery.images}
                  title={gallery.title}
                  displayMode="thumbnail"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloads — connected via Step 12 many-to-many UI */}
      {page.downloads?.length > 0 && (
        <DownloadList
          heading="Downloads"
          items={page.downloads.map(({ download }) => {
            const trans =
              download.translations.find((t) => t.locale === locale) ??
              download.translations.find((t) => t.locale === defaultLocale) ??
              download.translations[0];
            return {
              download,
              title:       trans?.title       ?? download.originalName,
              description: trans?.description ?? '',
            };
          })}
        />
      )}


      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <div className="mt-5">
          <div className="row g-4">
            {featuredArticles.map((article) => {
              const trans = pickTrans(article.translations, locale, defaultLocale);
              const articleHref = `/${article.parentPage.slug}/${article.slug}`;
              return (
                <div key={article.id} className="col-12 col-sm-6 col-lg-4">
                  <div className="card h-100 border-0 shadow-sm">
                    {article.featuredImage && (
                      <Link href={articleHref}>
                        <Image
                          src={`/uploads/thumbnails/thumb_${article.featuredImage}`}
                          alt={trans?.title ?? ''}
                          width={400}
                          height={220}
                          className="card-img-top"
                          style={{ objectFit: 'cover', height: 180 }}
                          unoptimized
                        />
                      </Link>
                    )}
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title fs-6 fw-semibold mb-1">
                        <Link href={articleHref} className="text-decoration-none text-dark stretched-link">
                          {trans?.title}
                        </Link>
                      </h5>
                      {trans?.summary && (
                        <p className="card-text text-muted small mt-1 mb-0 flex-grow-1">
                          {trans.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
