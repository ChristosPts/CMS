import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import GridItemForm from '@/components/admin/GridItemForm';

export const metadata = { title: 'Edit Grid Item' };

export default async function EditGridItemPage({ params }) {
  const { pageId: rawPageId, itemId: rawItemId } = await params;
  const pageId = parseInt(rawPageId, 10);
  const itemId = parseInt(rawItemId, 10);
  if (isNaN(pageId) || isNaN(itemId)) notFound();

  const [item] = await Promise.all([
    prisma.gridItem.findUnique({
      where: { id: itemId, pageId },
      include: { translations: true },
    }),
  ]);
  if (!item) notFound();

  const { activeLocales, defaultLocale } = await getLocaleConfig();

  const nameTrans = item.translations.find((t) => t.locale === defaultLocale) ?? item.translations[0];

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href={`/admin/grid/${pageId}`} className="btn btn-sm btn-outline-secondary"><i className="bi bi-arrow-left" /></a>
        <h4 className="mb-0">Edit: {nameTrans?.name || `Item #${itemId}`}</h4>
      </div>
      <GridItemForm
        initial={item}
        activeLocales={activeLocales}
        defaultLocale={defaultLocale}
        pageId={pageId}
        itemId={itemId}
      />
    </div>
  );
}
