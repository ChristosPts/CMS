import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { slugify } from '@/lib/slugify';

const schema = z.object({
  translations: z.array(z.object({
    locale: z.string().min(2).max(10),
    name:   z.string().default(''),
  })).min(1),
  sortOrder: z.number().int().optional().default(0),
});

export async function PUT(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.articleCategory.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const d = parsed.data;
  const category = await prisma.articleCategory.update({
    where: { id },
    data: {
      sortOrder: d.sortOrder,
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({ locale: t.locale, name: t.name })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: category });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required' }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const existing = await prisma.articleCategory.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.articleCategory.delete({ where: { id } });
  return Response.json({ success: true });
}
