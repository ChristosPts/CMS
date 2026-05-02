import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const galleries = await prisma.gallery.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, createdAt: true, updatedAt: true,
      _count: { select: { images: true } },
      images: {
        where:   { hidden: false },
        orderBy: { sortOrder: 'asc' },
        take:    1,
        select:  { filename: true },
      },
    },
  });

  return Response.json({ success: true, data: galleries });
}

export async function POST(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const gallery = await prisma.gallery.create({ data: { title: parsed.data.title } });
  return Response.json({ success: true, data: gallery }, { status: 201 });
}
