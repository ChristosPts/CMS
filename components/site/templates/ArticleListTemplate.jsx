import Image from 'next/image';
import Link from 'next/link';

function pickTrans(translations, locale, defaultLocale) {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    translations[0]
  );
}

function ArticleCard({ article, pageSlug, locale, defaultLocale, isList }) {
  const artTrans = pickTrans(article.translations, locale, defaultLocale);
  const date     = article.publishDate
    ? new Date(article.publishDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const categoryBadges = article.categories?.length > 0 && (
    <div className="d-flex flex-wrap gap-1 mt-2">
      {article.categories.map(({ category }) => {
        const catTrans = pickTrans(category.translations, locale, defaultLocale);
        return (
          <span key={category.id} className="badge bg-light text-dark border small fw-normal">
            {catTrans?.name}
          </span>
        );
      })}
    </div>
  );

  if (isList) {
    return (
      <Link href={`/${pageSlug}/${article.slug}`} className="text-decoration-none">
        <div className="card border-0 shadow-sm d-flex flex-row overflow-hidden">
          {article.featuredImage ? (
            <div className="flex-shrink-0">
              <Image
                src={`/uploads/thumbnails/thumb_${article.featuredImage}`}
                alt={artTrans?.title ?? ''}
                width={200}
                height={140}
                style={{ objectFit: 'cover', width: 200, height: '100%', minHeight: 140 }}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex-shrink-0 bg-light d-flex align-items-center justify-content-center text-muted" style={{ width: 200, minHeight: 140 }}>
              <i className="bi bi-file-earmark-text fs-2" />
            </div>
          )}
          <div className="card-body py-3">
            {date && <p className="text-muted small mb-1">{date}</p>}
            <h5 className="card-title mb-2 text-dark">{artTrans?.title}</h5>
            {artTrans?.summary && <p className="card-text text-muted small mb-0">{artTrans.summary}</p>}
            {categoryBadges}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/${pageSlug}/${article.slug}`} className="text-decoration-none">
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
          <div className="card-img-top bg-light d-flex align-items-center justify-content-center text-muted" style={{ height: 200 }}>
            <i className="bi bi-file-earmark-text fs-1" />
          </div>
        )}
        <div className="card-body">
          {date && <p className="text-muted small mb-1">{date}</p>}
          <h5 className="card-title mb-2 text-dark">{artTrans?.title}</h5>
          {artTrans?.summary && <p className="card-text text-muted small">{artTrans.summary}</p>}
          {categoryBadges}
        </div>
      </div>
    </Link>
  );
}

export default function ArticleListTemplate({
  page, translation, locale, defaultLocale,
  articles, articleCount, articlePage, perPage,
  categories = [], activeCategory = '', searchQuery = '', sortDir = 'desc',
}) {
  const totalPages = Math.ceil((articleCount ?? 0) / (perPage ?? 12));
  const isList     = page.viewStyle === 'LIST';

  function buildUrl(overrides = {}) {
    const params = new URLSearchParams();
    const q   = overrides.q    !== undefined ? overrides.q    : searchQuery;
    const cat = overrides.cat  !== undefined ? overrides.cat  : activeCategory;
    const dir = overrides.dir  !== undefined ? overrides.dir  : sortDir;
    const pg  = overrides.page !== undefined ? overrides.page : 1;
    if (q)             params.set('q', q);
    if (cat)           params.set('cat', cat);
    if (dir !== 'desc') params.set('sort', dir);
    if (pg > 1)        params.set('page', String(pg));
    const qs = params.toString();
    return qs ? `?${qs}` : '?';
  }

  return (
    <div className="container py-5">
      <h1 className="mb-3">{translation.title}</h1>

      {translation.summary && (
        <p className="lead text-muted mb-4">{translation.summary}</p>
      )}

      {translation.content && (
        <div className="rich-text mb-5" dangerouslySetInnerHTML={{ __html: translation.content }} />
      )}

      {/* Search + sort */}
      <form method="get" className="d-flex flex-wrap gap-2 mb-4">
        <div className="input-group" style={{ maxWidth: 320 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input type="search" name="q" className="form-control" placeholder="Search…" defaultValue={searchQuery} />
        </div>
        <select name="sort" className="form-select" style={{ maxWidth: 180 }} defaultValue={sortDir}>
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        {activeCategory && <input type="hidden" name="cat" value={activeCategory} />}
        <button type="submit" className="btn btn-outline-secondary">Apply</button>
        {(searchQuery || activeCategory || sortDir === 'asc') && (
          <a href="?" className="btn btn-outline-secondary">Clear</a>
        )}
      </form>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          <a href={buildUrl({ cat: '' })} className={`badge text-decoration-none fw-normal px-3 py-2 ${!activeCategory ? 'bg-primary text-white' : 'bg-light text-dark border'}`}>All</a>
          {categories.map((cat) => {
            const catTrans = pickTrans(cat.translations, locale, defaultLocale);
            const isActive = activeCategory === cat.slug;
            return (
              <a
                key={cat.id}
                href={buildUrl({ cat: isActive ? '' : cat.slug, page: 1 })}
                className={`badge text-decoration-none fw-normal px-3 py-2 ${isActive ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
              >
                {catTrans?.name}
              </a>
            );
          })}
        </div>
      )}

      {/* Articles */}
      {articles?.length > 0 ? (
        <div className={isList ? 'd-flex flex-column gap-3' : 'row g-4'}>
          {articles.map((article) => (
            <div key={article.id} className={isList ? '' : 'col-12 col-sm-6 col-lg-4'}>
              <ArticleCard article={article} pageSlug={page.slug} locale={locale} defaultLocale={defaultLocale} isList={isList} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">{searchQuery || activeCategory ? 'No articles match your search.' : 'Nothing published yet.'}</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-5 d-flex justify-content-center">
          <ul className="pagination">
            <li className={`page-item ${articlePage <= 1 ? 'disabled' : ''}`}>
              <a href={buildUrl({ page: articlePage - 1 })} className="page-link">&laquo;</a>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === articlePage ? 'active' : ''}`}>
                <a href={buildUrl({ page: p })} className="page-link">{p}</a>
              </li>
            ))}
            <li className={`page-item ${articlePage >= totalPages ? 'disabled' : ''}`}>
              <a href={buildUrl({ page: articlePage + 1 })} className="page-link">&raquo;</a>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
