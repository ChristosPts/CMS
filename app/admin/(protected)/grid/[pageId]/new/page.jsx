import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import GridItemForm from '@/components/admin/GridItemForm';

export const metadata = { title: 'New Grid Item' };

export default async function NewGridItemPage({ params }) {
  const { pageId: rawId } = await params;
  const pageId = parseInt(rawId, 10);
  if (isNaN(pageId)) notFound();

  const gridPage = await prisma.page.findUnique({ where: { id: pageId, template: 'GRID' } });
  if (!gridPage) notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href={`/admin/grid/${pageId}`} className="btn btn-sm btn-outline-secondary"><i className="bi bi-arrow-left" /></a>
        <h4 className="mb-0">New Item</h4>
      </div>
      <GridItemForm
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        pageId={pageId}
      />
    </div>
  );
}
