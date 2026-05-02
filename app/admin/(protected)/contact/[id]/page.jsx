import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import PageForm from '@/components/admin/PageForm';

export const metadata = { title: 'Edit Contact Page' };

export default async function ContactEditPage({ params }) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const session = await getServerSession(adminAuthOptions);
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const page = await prisma.page.findUnique({
    where: { id, template: 'CONTACT' },
    include: {
      translations: true,
      galleries: {
        orderBy: { sortOrder: 'asc' },
        include: {
          gallery: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { filename: true } } } },
        },
      },
      downloads: {
        orderBy: { sortOrder: 'asc' },
        include: { download: { include: { translations: true } } },
      },
      formFields: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!page) notFound();

  const initialConnections = {
    galleries: page.galleries.map(({ gallery, sortOrder }) => ({
      id: gallery.id, sortOrder, label: gallery.title,
      thumb: gallery.images[0]?.filename ?? null, meta: null,
    })),
    downloads: page.downloads.map(({ download, sortOrder }) => {
      const trans = download.translations.find((t) => t.locale === defaultLocale) ?? download.translations[0];
      return {
        id: download.id, sortOrder,
        label: trans?.title ?? download.originalName,
        thumb: null,
        meta: { 'application/pdf': 'PDF', 'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' }[download.fileType] ?? 'FILE',
      };
    }),
    articles: [],
  };

  const pageTitle =
    page.translations.find((t) => t.locale === defaultLocale)?.title ||
    page.translations[0]?.title ||
    page.slug;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/pages" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">Contact: {pageTitle}</h4>
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline-secondary ms-auto"
        >
          <i className="bi bi-box-arrow-up-right me-1" />View
        </a>
      </div>

      <PageForm
        initial={page}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        role={session.user.role}
        pageId={id}
        initialConnections={initialConnections}
        initialFormFields={page.formFields ?? []}
      />
    </div>
  );
}
