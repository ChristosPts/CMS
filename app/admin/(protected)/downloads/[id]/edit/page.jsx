import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import DownloadForm from '@/components/admin/DownloadForm';

export const metadata = { title: 'Edit Download' };

export default async function EditDownloadPage({ params }) {
  const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  if (isNaN(id)) notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const download = await prisma.download.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!download) notFound();
  
  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/downloads" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">Edit Download</h4>
      </div>
      <DownloadForm
        initial={download}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        downloadId={id}
      />
    </div>
  );
}
