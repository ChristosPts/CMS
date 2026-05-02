import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import { getLocaleConfig } from '@/lib/settings';
import PageForm from '@/components/admin/PageForm';

export const metadata = { title: 'New Page' };

export default async function NewPagePage() {
  const session = await getServerSession(adminAuthOptions);
  const { activeLocales, defaultLocale } = await getLocaleConfig();

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/pages" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">New Page</h4>
      </div>

      <PageForm
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        role={session.user.role}
      />
    </div>
  );
}
