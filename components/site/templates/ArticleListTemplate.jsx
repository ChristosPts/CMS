import Image from 'next/image';
import Link from 'next/link';

export default function ArticleListTemplate({
  page, translation, locale, defaultLocale,
  articles, articleCount, articlePage, perPage,
}) {
  const totalPages = Math.ceil((articleCount ?? 0) / (perPage ?? 12));

  return (
    <div className="container py-5">
      <h1 className="mb-3">{translation.title}</h1>

      {translation.summary && (
        <p className="lead text-muted mb-4">{translation.summary}</p>
      )}

      {translation.content && (
        <div
          className="rich-text mb-5"
          dangerouslySetInnerHTML={{ __html: translation.content }}
        />
      )}

      {/* Article grid */}
      {articles?.length > 0 ? (
        <div className="row g-4">
          {articles.map((article) => {
            const artTrans =
              article.translations.find((t) => t.locale === locale) ??
              article.translations.find((t) => t.locale === defaultLocale) ??
              article.translations[0];

            const date = article.publishDate
              ? new Date(article.publishDate).toLocaleDateString(locale, {
                  year: 'numeric', month: 'short', day: 'numeric',
                })
              : null;

            return (
              <div key={article.id} className="col-12 col-sm-6 col-lg-4">
                <Link href={`/${page.slug}/${article.slug}`} className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm">
                    {article.featuredImage ? (
                      <Image
                        src={`/uploads/thumbnails/thumb_${article.featuredImage}`}
                        alt={artTrans?.title ?? ''}
                        width={400}
                        height={220}
                        className="card-img-top"
                        style={{ objectFit: 'cover', height: 200 }}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted"
                        style={{ height: 200 }}
                      >
                        <i className="bi bi-file-earmark-text fs-1" />
                      </div>
                    )}
                    <div className="card-body">
                      {date && <p className="text-muted small mb-1">{date}</p>}
                      <h5 className="card-title mb-2">{artTrans?.title}</h5>
                      {artTrans?.summary && (
                        <p className="card-text text-muted small line-clamp-3">{artTrans.summary}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted">Nothing published yet.</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-5 d-flex justify-content-center">
          <ul className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === articlePage ? 'active' : ''}`}>
                <a href={`?page=${p}`} className="page-link">{p}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
