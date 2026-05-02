import Image from 'next/image';

export default function GridTemplate({ page, translation, locale, defaultLocale }) {
  const items = page.gridItems ?? [];

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

      {items.length > 0 && (
        <div className="row g-4">
          {items.map((item) => {
            const itemTrans =
              item.translations.find((t) => t.locale === locale) ??
              item.translations.find((t) => t.locale === defaultLocale) ??
              item.translations[0];

            return (
              <div key={item.id} className="col-12 col-sm-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm">
                  {item.image && (
                    <Image
                      src={`/uploads/${item.image}`}
                      alt={itemTrans?.name ?? ''}
                      width={400}
                      height={300}
                      className="card-img-top"
                      style={{ objectFit: 'cover', height: 220 }}
                    />
                  )}
                  <div className="card-body">
                    {itemTrans?.name && (
                      <h5 className="card-title mb-1">{itemTrans.name}</h5>
                    )}
                    {itemTrans?.subtitle && (
                      <p className="text-muted small mb-2">{itemTrans.subtitle}</p>
                    )}
                    {itemTrans?.description && (
                      <p className="card-text small">{itemTrans.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
