import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import GalleryEditor from '@/components/admin/GalleryEditor';

export const metadata = { title: 'Edit Gallery' };

export default async function GalleryEditorPage({ params }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const session = await getServerSession(adminAuthOptions);

  const gallery = await prisma.gallery.findUnique({
    where:   { id },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!gallery) notFound();

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <a href="/admin/galleries" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" />
        </a>
        <h4 className="mb-0">Edit Gallery</h4>
      </div>
      <GalleryEditor
        galleryId={id}
        initialTitle={gallery.title}
        initialImages={gallery.images}
        role={session.user.role}
      />
    </div>
  );
}
