import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

const patchSchema = z.object({
  alt:    z.string().optional(),
  hidden: z.boolean().optional(),
});

export async function PATCH(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const imageId = parseInt(params.imageId, 10);

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid data' }, { status: 400 });
  }

  const image = await prisma.galleryImage.update({
    where: { id: imageId },
    data:  parsed.data,
  });

  return Response.json({ success: true, data: image });
}

export async function DELETE(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const imageId = parseInt(params.imageId, 10);
  const image   = await prisma.galleryImage.findUnique({ where: { id: imageId } });
  if (!image) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  await deleteUpload(image.filename);
  await prisma.galleryImage.delete({ where: { id: imageId } });

  return Response.json({ success: true });
}
