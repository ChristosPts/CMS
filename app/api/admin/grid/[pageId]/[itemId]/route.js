import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

const updateSchema = z.object({
  image:        z.string().nullable().optional(),
  linkUrl:      z.string().nullable().optional(),
  openInNewTab: z.boolean().optional().default(false),
  translations: z.array(z.object({
    locale:      z.string().min(2).max(10),
    name:        z.string().default(''),
    subtitle:    z.string().optional().default(''),
    description: z.string().optional().default(''),
  })).min(1),
});

export async function PUT(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { itemId: rawId } = await params;
  const id = parseInt(rawId, 10);

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const existing = await prisma.gridItem.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const item = await prisma.gridItem.update({
    where: { id },
    data: {
      image:       d.image    !== undefined ? d.image    : existing.image,
      linkUrl:     d.linkUrl  !== undefined ? d.linkUrl  : existing.linkUrl,
      openInNewTab: d.openInNewTab,
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({
          locale: t.locale, name: t.name, subtitle: t.subtitle ?? '', description: t.description ?? '',
        })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: item });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required to delete' }, { status: 403 });
  }

  const { itemId: rawId } = await params;
  const id = parseInt(rawId, 10);

  const existing = await prisma.gridItem.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  if (existing.image) await deleteUpload(existing.image).catch(() => {});
  await prisma.gridItem.delete({ where: { id } });

  return Response.json({ success: true });
}
