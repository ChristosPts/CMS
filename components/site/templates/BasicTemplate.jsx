import Image from 'next/image';
import GalleryCarousel from '@/components/site/GalleryCarousel';
import DownloadList from '@/components/site/DownloadList';

export default function BasicTemplate({ page, translation, locale, defaultLocale }) {
  return (
    <article className="container py-5">
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

      {/* Featured Articles connected in Step 12 */}
    </article>
  );
}
