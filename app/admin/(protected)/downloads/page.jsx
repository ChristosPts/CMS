import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getDefaultLocale } from '@/lib/settings';
import DownloadsList from '@/components/admin/DownloadsList';

export const metadata = { title: 'Downloads' };

export default async function DownloadsPage({ searchParams }) {
  const session       = await getServerSession(adminAuthOptions);
  const defaultLocale = await getDefaultLocale();
  const sp = await sp;
  const search  = sp.search ?? '';
  const page    = Math.max(1, parseInt(sp.page ?? '1', 10));
  const perPage = 20;

  const where = search
    ? { translations: { some: { title: { contains: search } } } }
    : {};

  const [downloads, total] = await Promise.all([
    prisma.download.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { translations: true },
    }),
    prisma.download.count({ where }),
  ]);

  return (
    <div>
      <h4 className="mb-4">Downloads</h4>
      <DownloadsList
        downloads={downloads}
        total={total}
        page={page}
        perPage={perPage}
        search={search}
        defaultLocale={defaultLocale}
        role={session.user.role}
      />
    </div>
  );
}
