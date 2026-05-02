import { getLocaleConfig } from '@/lib/settings';
import DownloadForm from '@/components/admin/DownloadForm';

export const metadata = { title: 'New Download' };

export default async function NewDownloadPage() {
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/downloads" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">New Download</h4>
      </div>
      <DownloadForm activeLocales={activeLocales} defaultLocale={defaultLocale} />
    </div>
  );
}
