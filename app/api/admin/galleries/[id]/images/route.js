import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { processImage } from '@/lib/upload';

// POST — upload one or more images to a gallery
export async function POST(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;
  const { id: rawId } = await params;
  const galleryId = parseInt(rawId, 10);
  const gallery   = await prisma.gallery.findUnique({ where: { id: galleryId } });
  if (!gallery) return Response.json({ success: false, error: 'Gallery not found' }, { status: 404 });

  let formData;
  try { formData = await req.formData(); } catch {
    return Response.json({ success: false, error: 'Invalid form data' }, { status: 400 });
  }

  const files = formData.getAll('files');
  if (!files.length) {
    return Response.json({ success: false, error: 'No files provided' }, { status: 400 });
  }

  // Current max sortOrder so new images append at end
  const maxSort = await prisma.galleryImage.aggregate({
    where: { galleryId },
    _max:  { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const results = [];
  const errors  = [];

  for (const file of files) {
    if (typeof file === 'string') continue;
    try {
      const { filename } = await processImage(file);
      const image = await prisma.galleryImage.create({
        data: { galleryId, filename, alt: '', sortOrder: sortOrder++ },
      });
      results.push(image);
    } catch (err) {
      errors.push({ name: file.name, error: err.message });
    }
  }

  return Response.json({ success: true, data: { uploaded: results, errors } });
}
