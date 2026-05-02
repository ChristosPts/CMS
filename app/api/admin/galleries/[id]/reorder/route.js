import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const schema = z.object({
  imageIds: z.array(z.number().int()).min(1),
});

export async function PUT(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid data' }, { status: 400 });
  }

  const { imageIds } = parsed.data;

  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.galleryImage.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return Response.json({ success: true });
}
