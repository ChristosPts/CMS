import Image from 'next/image';
import Breadcrumb from '@/components/site/Breadcrumb';

function pickTrans(translations, locale, defaultLocale) {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    translations[0]
  );
}

function GridCard({ item, itemTrans, isList }) {
  const isLink = Boolean(item.linkUrl);

  const inner = isList ? (
    <div className={`card border-0 shadow-sm d-flex flex-row overflow-hidden${isLink ? ' h-100' : ''}`}>
      {item.image && (
        <div className="flex-shrink-0">
          <Image
            src={`/uploads/${item.image}`}
            alt={itemTrans?.name ?? ''}
            width={160}
            height={120}
            style={{ objectFit: 'cover', width: 160, height: '100%', minHeight: 120 }}
            unoptimized
          />
        </div>
      )}
      <div className="card-body py-3">
        {itemTrans?.name     && <h5 className="card-title mb-1">{itemTrans.name}</h5>}
        {itemTrans?.subtitle && <p className="text-muted small mb-2">{itemTrans.subtitle}</p>}
        {itemTrans?.description && (
          <div className="card-text small rich-text" dangerouslySetInnerHTML={{ __html: itemTrans.description }} />
        )}
      </div>
    </div>
  ) : (
    <div className="card border-0 shadow-sm h-100">
      {item.image && (
        <Image
          src={`/uploads/${item.image}`}
          alt={itemTrans?.name ?? ''}
          width={400}
          height={300}
          className="card-img-top"
          style={{ objectFit: 'cover', height: 220 }}
          unoptimized
        />
      )}
      <div className="card-body">
        {itemTrans?.name     && <h5 className="card-title mb-1">{itemTrans.name}</h5>}
        {itemTrans?.subtitle && <p className="text-muted small mb-2">{itemTrans.subtitle}</p>}
        {itemTrans?.description && (
          <div className="card-text small rich-text" dangerouslySetInnerHTML={{ __html: itemTrans.description }} />
        )}
      </div>
    </div>
  );

  if (isLink) {
    return (
      <a
        href={item.linkUrl}
        className="d-block text-decoration-none text-reset h-100"
        {...(item.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {inner}
      </a>
    );
  }

  return inner;
}

export default function GridTemplate({ page, translation, locale, defaultLocale, breadcrumbItems }) {
  const items  = page.gridItems ?? [];
  const isList = page.viewStyle === 'LIST';

  return (
    <div className="container py-5">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="mb-3">{translation.title}</h1>

      {translation.summary && (
        <p className="lead text-muted mb-4">{translation.summary}</p>
      )}

      {translation.content && (
        <div className="rich-text mb-5" dangerouslySetInnerHTML={{ __html: translation.content }} />
      )}

      {items.length > 0 && (
        <div className={isList ? 'd-flex flex-column gap-3' : 'row g-4'}>
          {items.map((item) => {
            const itemTrans = pickTrans(item.translations, locale, defaultLocale);
            return (
              <div key={item.id} className={isList ? '' : 'col-12 col-sm-6 col-lg-4'}>
                <GridCard item={item} itemTrans={itemTrans} isList={isList} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
