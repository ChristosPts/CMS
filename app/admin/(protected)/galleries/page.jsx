import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import GalleriesList from '@/components/admin/GalleriesList';

export const metadata = { title: 'Galleries' };

export default async function GalleriesPage() {
  const session = await getServerSession(adminAuthOptions);

  const galleries = await prisma.gallery.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, createdAt: true,
      _count: { select: { images: true } },
      images: {
        where:   { hidden: false },
        orderBy: { sortOrder: 'asc' },
        take:    1,
        select:  { filename: true },
      },
    },
  });

  return (
    <div>
      <h4 className="mb-4">Galleries</h4>
      <GalleriesList galleries={galleries} role={session.user.role} />
    </div>
  );
}
