import ContactForm from '@/components/site/ContactForm';

export default function ContactTemplate({ page, translation }) {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-7">
          <h1 className="mb-3">{translation.title}</h1>

          {translation.summary && (
            <p className="lead text-muted mb-2">{translation.summary}</p>
          )}

          {translation.content && (
            <div
              className="rich-text mb-2"
              dangerouslySetInnerHTML={{ __html: translation.content }}
            />
          )}

          <ContactForm pageId={page.id} />
        </div>
      </div>
    </div>
  );
}
