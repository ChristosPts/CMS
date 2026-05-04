import ContactForm from '@/components/site/ContactForm';
import Breadcrumb from '@/components/site/Breadcrumb';

export default function ContactTemplate({ page, translation, locale, defaultLocale, breadcrumbItems }) {
  const hasMap     = Boolean(page.mapEmbedUrl);
  const hasContact = page.contactPhone || page.contactEmail || page.contactAddress;

  return (
    <div className="container py-5">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="mb-4">{translation.title}</h1>

      {/* Map + Form row */}
      <div className="row g-4 mb-5">
        {/* Left — map + contact details */}
        {(hasMap || hasContact) && (
          <div className="col-12 col-lg-5">
            {hasMap && (
              <div className="mb-4" style={{ borderRadius: '0.5rem', overflow: 'hidden' }}>
                <iframe
                  src={page.mapEmbedUrl}
                  style={{ border: 0, width: '100%', height: 300 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Map"
                />
              </div>
            )}

            {hasContact && (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                {page.contactPhone && (
                  <li className="d-flex gap-3 align-items-start">
                    <i className="bi bi-telephone-fill text-primary mt-1" />
                    <div>
                      <div className="small text-muted fw-medium">Phone</div>
                      <a href={`tel:${page.contactPhone}`} className="text-decoration-none">{page.contactPhone}</a>
                    </div>
                  </li>
                )}
                {page.contactEmail && (
                  <li className="d-flex gap-3 align-items-start">
                    <i className="bi bi-envelope-fill text-primary mt-1" />
                    <div>
                      <div className="small text-muted fw-medium">Email</div>
                      <a href={`mailto:${page.contactEmail}`} className="text-decoration-none">{page.contactEmail}</a>
                    </div>
                  </li>
                )}
                {page.contactAddress && (
                  <li className="d-flex gap-3 align-items-start">
                    <i className="bi bi-geo-alt-fill text-primary mt-1" />
                    <div>
                      <div className="small text-muted fw-medium">Address</div>
                      <address className="mb-0" style={{ whiteSpace: 'pre-line' }}>{page.contactAddress}</address>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Right — form */}
        <div className={`col-12 ${hasMap || hasContact ? 'col-lg-7' : ''}`}>
          {translation.summary && (
            <p className="text-muted mb-3">{translation.summary}</p>
          )}
          <ContactForm
            pageId={page.id}
            formFields={page.formFields ?? []}
            locale={locale}
            defaultLocale={defaultLocale}
          />
        </div>
      </div>

      {/* Rich text content — full width below */}
      {translation.content && (
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: translation.content }} />
      )}
    </div>
  );
}
